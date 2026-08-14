import type { Scene } from "@clickplay/domain";
import type { LLMUsage } from "../llm/types";
import {
  AI_VIDEO_ESTIMATE_DURATION_SECONDS,
  IMAGE_PRICING_PER_IMAGE,
  LLM_CALL_TOKEN_ESTIMATES,
  LLM_PRICING_PER_MODEL,
  MUSIC_PRICING_PER_TRACK,
  TTS_PRICING_PER_CHAR,
  VIDEO_PRICING_PER_SECOND,
} from "./pricing";
import { type CostAmount, type CostBreakdown, knownUsd, sumCostAmounts, unknownCost } from "./types";

export interface CostEstimateOptions {
  llmModel: string;
  ttsProvider: string;
  imageProvider: string;
  /** Só obrigatório se alguma cena tiver elemento ai_video_clip. */
  videoProvider?: string;
  musicProvider: string;
}

interface SceneCounts {
  aiImages: number;
  aiVideos: number;
  ttsCharacters: number;
}

function countScenes(scenes: Scene[]): SceneCounts {
  let aiImages = 0;
  let aiVideos = 0;
  let ttsCharacters = 0;

  for (const scene of scenes) {
    ttsCharacters += scene.scriptLine.length;
    for (const element of scene.elements) {
      if (element.type === "ai_image") aiImages++;
      if (element.type === "ai_video_clip") {
        aiVideos++;
        if (element.sourceImagePrompt) aiImages++;
      }
    }
  }

  return { aiImages, aiVideos, ttsCharacters };
}

function estimateLlmCost(model: string, counts: SceneCounts): { cost: CostAmount; calls: number } {
  const pricing = LLM_PRICING_PER_MODEL[model];
  if (!pricing) return { cost: unknownCost(`sem preço listado pro modelo "${model}"`), calls: 0 };

  // 1 chamada cada de research/creative-director/critic + 1 por imagem gerada
  // (prompt optimization) + 1 por vídeo gerado (motion prompt).
  const calls = 3 + counts.aiImages + counts.aiVideos;
  const usd =
    (LLM_CALL_TOKEN_ESTIMATES.research.input * pricing.perInputToken +
      LLM_CALL_TOKEN_ESTIMATES.research.output * pricing.perOutputToken) +
    (LLM_CALL_TOKEN_ESTIMATES.creativeDirector.input * pricing.perInputToken +
      LLM_CALL_TOKEN_ESTIMATES.creativeDirector.output * pricing.perOutputToken) +
    (LLM_CALL_TOKEN_ESTIMATES.critic.input * pricing.perInputToken +
      LLM_CALL_TOKEN_ESTIMATES.critic.output * pricing.perOutputToken) +
    (counts.aiImages + counts.aiVideos) *
      (LLM_CALL_TOKEN_ESTIMATES.imagePrompter.input * pricing.perInputToken +
        LLM_CALL_TOKEN_ESTIMATES.imagePrompter.output * pricing.perOutputToken);

  return { cost: knownUsd(usd), calls };
}

/** Estimativa pré-run, a partir das cenas planejadas (docs/IMPLEMENTATION-PLAN.md §Fase 10, 10A). */
export function estimateCost(scenes: Scene[], opts: CostEstimateOptions): CostBreakdown {
  const counts = countScenes(scenes);

  const { cost: llm, calls: llmCalls } = estimateLlmCost(opts.llmModel, counts);

  const ttsPerChar = TTS_PRICING_PER_CHAR[opts.ttsProvider];
  const tts =
    ttsPerChar === undefined
      ? unknownCost(`sem preço listado pro TTS provider "${opts.ttsProvider}"`)
      : knownUsd(counts.ttsCharacters * ttsPerChar);

  const imagePerUnit = IMAGE_PRICING_PER_IMAGE[opts.imageProvider];
  const image =
    imagePerUnit === undefined
      ? unknownCost(`sem preço listado pro image provider "${opts.imageProvider}"`)
      : knownUsd(counts.aiImages * imagePerUnit);

  let video: CostAmount;
  if (counts.aiVideos === 0) {
    video = knownUsd(0);
  } else if (!opts.videoProvider) {
    video = unknownCost("cenas com ai_video_clip mas nenhum videoProvider informado");
  } else {
    const perSecond = VIDEO_PRICING_PER_SECOND[opts.videoProvider];
    video =
      perSecond === undefined
        ? unknownCost(`sem preço listado pro video provider "${opts.videoProvider}"`)
        : knownUsd(counts.aiVideos * AI_VIDEO_ESTIMATE_DURATION_SECONDS * perSecond);
  }

  const musicPerTrack = MUSIC_PRICING_PER_TRACK[opts.musicProvider];
  const music =
    musicPerTrack === undefined
      ? unknownCost(`sem preço listado pro music provider "${opts.musicProvider}"`)
      : knownUsd(musicPerTrack);

  return {
    llm,
    tts,
    image,
    video,
    music,
    total: sumCostAmounts([llm, tts, image, video, music]),
    details: { llmCalls, ttsCharacters: counts.ttsCharacters, aiImages: counts.aiImages, aiVideos: counts.aiVideos },
  };
}

export interface ActualCostInput {
  llmUsages: LLMUsage[];
  llmModel: string;
  ttsCharacters: number;
  ttsProvider: string;
  aiImages: number;
  imageProvider: string;
  aiVideos: number;
  videoSeconds: number;
  videoProvider?: string;
  musicGenerated: boolean;
  musicProvider: string;
}

/** Custo pós-run, a partir do uso real coletado durante o pipeline (10C). Mesmo shape de estimateCost — permite comparar. */
export function computeActualCost(input: ActualCostInput): CostBreakdown {
  const pricing = LLM_PRICING_PER_MODEL[input.llmModel];
  const llm = !pricing
    ? unknownCost(`sem preço listado pro modelo "${input.llmModel}"`)
    : knownUsd(
        input.llmUsages.reduce(
          (sum, u) => sum + u.inputTokens * pricing.perInputToken + u.outputTokens * pricing.perOutputToken,
          0,
        ),
      );

  const ttsPerChar = TTS_PRICING_PER_CHAR[input.ttsProvider];
  const tts =
    ttsPerChar === undefined
      ? unknownCost(`sem preço listado pro TTS provider "${input.ttsProvider}"`)
      : knownUsd(input.ttsCharacters * ttsPerChar);

  const imagePerUnit = IMAGE_PRICING_PER_IMAGE[input.imageProvider];
  const image =
    imagePerUnit === undefined
      ? unknownCost(`sem preço listado pro image provider "${input.imageProvider}"`)
      : knownUsd(input.aiImages * imagePerUnit);

  let video: CostAmount;
  if (input.aiVideos === 0) {
    video = knownUsd(0);
  } else if (!input.videoProvider) {
    video = unknownCost("vídeos gerados mas nenhum videoProvider informado");
  } else {
    const perSecond = VIDEO_PRICING_PER_SECOND[input.videoProvider];
    video =
      perSecond === undefined
        ? unknownCost(`sem preço listado pro video provider "${input.videoProvider}"`)
        : knownUsd(input.videoSeconds * perSecond);
  }

  const musicPerTrack = MUSIC_PRICING_PER_TRACK[input.musicProvider];
  const music = !input.musicGenerated
    ? knownUsd(0)
    : musicPerTrack === undefined
      ? unknownCost(`sem preço listado pro music provider "${input.musicProvider}"`)
      : knownUsd(musicPerTrack);

  return {
    llm,
    tts,
    image,
    video,
    music,
    total: sumCostAmounts([llm, tts, image, video, music]),
    details: {
      llmCalls: input.llmUsages.length,
      ttsCharacters: input.ttsCharacters,
      aiImages: input.aiImages,
      aiVideos: input.aiVideos,
    },
  };
}

/** Diferença entre estimado e realizado, componente a componente. unknown se qualquer lado for unknown. */
export function compareCost(estimated: CostBreakdown, actual: CostBreakdown): CostAmount {
  if (estimated.total.status === "unknown") return estimated.total;
  if (actual.total.status === "unknown") return actual.total;
  return knownUsd(actual.total.usd - estimated.total.usd);
}
