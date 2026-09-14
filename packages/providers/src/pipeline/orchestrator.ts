import * as fs from "node:fs";
import * as path from "node:path";
import type { Scene, WordTimestamp } from "@clickplay/domain";
import type { RenderInput, ResolvedScene } from "@clickplay/video-engine";
import type { DirectorScore } from "../agents/creative-director.js";
import { generateDirectorScore, reviseDirectorScore } from "../agents/creative-director.js";
import { evaluate } from "../agents/critic.js";
import { research } from "../agents/research.js";
import type { ArchetypeConfig } from "../config/archetype.js";
import { getArchetype } from "../config/archetype-registry.js";
import type { CostBreakdown } from "../cost/index.js";
import { computeActualCost, estimateCost } from "../cost/index.js";
import type { LLMUsage } from "../llm/types.js";
import { normalizeForSpeech } from "../tts/normalize-text.js";
import type { TTSSegment } from "../tts/types.js";
import { inferAspectRatio, resolveElement } from "../visual/index.js";
import { resolveIntroOutroScene } from "./intro-outro.js";
import { resolveEmphasisIndices, splitWordsIntoScenes, synthesizeWordTimestamps } from "./scene-timing.js";
import type {
  PipelineCallbacks,
  PipelineCheckpoint,
  PipelineOptions,
  PipelineResult,
  PipelineStage,
  RevisionLogEntry,
} from "./types.js";

const MAX_REVISION_ROUNDS = 2;

const PAUSE_BETWEEN_SCENES_MS = 250;
/** Pausa maior antes da última cena — normalmente o CTA (buildDefaultPrompt força isso). */
const PAUSE_BEFORE_LAST_SCENE_MS = 700;

/** Rate SSML por tier de pacing do arquétipo — arquétipo "fast" fala um pouco mais
 * rápido, "cinematic" mais devagar, sem exigir um campo novo por arquétipo (o pacing
 * já existe e já reflete a intenção de ritmo). */
const PACING_RATE: Record<ArchetypeConfig["scenePacing"], string | undefined> = {
  fast: "+8%",
  moderate: undefined,
  cinematic: "-8%",
};

/** Monta os segmentos de TTS por cena — pausas (maior antes da última/CTA), prosódia
 * por pacing do arquétipo, ênfase vocal (emphasisWords) e texto normalizado pra fala
 * (números/moeda por extenso, não afeta scriptLine/legenda). */
export function buildTtsSegments(scenes: Scene[], archetypeConfig: ArchetypeConfig, language?: string): TTSSegment[] {
  const rate = PACING_RATE[archetypeConfig.scenePacing];
  return scenes.map((scene, i) => {
    const isLast = i === scenes.length - 1;
    return {
      text: normalizeForSpeech(scene.scriptLine, language),
      pauseAfterMs: isLast ? 0 : i === scenes.length - 2 ? PAUSE_BEFORE_LAST_SCENE_MS : PAUSE_BETWEEN_SCENES_MS,
      rate,
      emphasisWords: scene.emphasisWords,
    };
  });
}

/**
 * Orquestra research → creative director (com loop de revisão via critic) →
 * TTS → resolução de visuais (10B) → render (Fase 9), como sequência de
 * funções assíncronas — sem @mastra/core (docs/IMPLEMENTATION-PLAN.md §Fase 10, 10C).
 * Sem persistência: o caller fornece runDir e decide a política de aprovação
 * de custo via callbacks.onCostEstimate. Persistência/state machine = 10D.
 */
export async function runPipeline(opts: PipelineOptions, callbacks: PipelineCallbacks): Promise<PipelineResult> {
  const fps = opts.fps ?? 30;
  const width = opts.width ?? 1080;
  const height = opts.height ?? 1920;
  const usages: LLMUsage[] = [];
  const checkpoint: PipelineCheckpoint = {};
  let stage: PipelineStage = "research";

  try {
    if (callbacks.isCancelled?.()) return { status: "cancelled" };

    let researchOut: Awaited<ReturnType<typeof research>>;
    if (opts.resume?.research) {
      researchOut = opts.resume.research;
    } else {
      await callbacks.onStageStart?.(stage);
      researchOut = await research(opts.llm, opts.topic, opts.language);
      await callbacks.onStageComplete?.(stage);
    }
    usages.push(researchOut.usage);
    checkpoint.research = researchOut;
    await callbacks.onCheckpoint?.(checkpoint);

    if (callbacks.isCancelled?.()) return { status: "cancelled" };

    stage = "director";
    let score: DirectorScore;
    let revisions: RevisionLogEntry[];
    let costEstimate: CostBreakdown;

    if (opts.resume?.director) {
      ({ score, revisions, costEstimate } = opts.resume.director);
    } else {
      await callbacks.onStageStart?.(stage);
      revisions = [];
      const directorOpts = {
        archetype: opts.archetype,
        pacing: opts.pacing,
        videoMode: opts.videoMode,
        direction: opts.direction,
        showTextOverlays: opts.showTextOverlays,
        targetDurationSeconds: opts.targetDurationSeconds,
        language: opts.language,
      };

      const directorOut = await generateDirectorScore(opts.llm, opts.topic, researchOut.data, directorOpts);
      usages.push(directorOut.usage);
      score = directorOut.data;

      let critiqueOut = await evaluate(opts.llm, score, opts.topic, opts.pacing);
      usages.push(critiqueOut.usage);
      revisions.push({ round: 0, score: critiqueOut.data.score, critique: critiqueOut.data });
      await callbacks.onRevision?.(revisions[0]!);

      let round = 0;
      while (critiqueOut.data.score < 7 && round < MAX_REVISION_ROUNDS) {
        round++;
        const revised = await reviseDirectorScore(
          opts.llm,
          opts.topic,
          researchOut.data,
          score,
          critiqueOut.data,
          directorOpts,
        );
        usages.push(revised.usage);
        score = revised.data;

        critiqueOut = await evaluate(opts.llm, score, opts.topic, opts.pacing);
        usages.push(critiqueOut.usage);
        const entry: RevisionLogEntry = { round, score: critiqueOut.data.score, critique: critiqueOut.data };
        revisions.push(entry);
        await callbacks.onRevision?.(entry);
      }
      await callbacks.onStageComplete?.(stage);

      const introScene = await resolveIntroOutroScene(opts.intro, "intro", opts.llm, opts.topic, researchOut.data, opts.language);
      const outroScene = await resolveIntroOutroScene(opts.outro, "outro", opts.llm, opts.topic, researchOut.data, opts.language);
      if (introScene) score.scenes = [introScene, ...score.scenes];
      if (outroScene) score.scenes = [...score.scenes, outroScene];

      // Não recebe opts.musicEnabled — mesmo com música desligada, a estimativa
      // pré-aprovação segue somando custo de música (over-estimate conservador,
      // nunca cobra a mais no real: computeActualCost abaixo já reflete o toggle).
      costEstimate = estimateCost(score.scenes, opts.cost);
      const approved = await callbacks.onCostEstimate(costEstimate);
      if (!approved) {
        return { status: "cancelled_cost", directorScore: score, costEstimate, revisions };
      }
    }
    checkpoint.director = { score, revisions, costEstimate };
    await callbacks.onCheckpoint?.(checkpoint);

    if (callbacks.isCancelled?.()) return { status: "cancelled" };

    // Resolvido uma vez, usado no TTS (prosódia por pacing), na resolução de
    // elementos (transição/prompt determinístico) e no stage "render" abaixo —
    // mesma config vale pro vídeo inteiro, não é por cena.
    const archetypeConfig = getArchetype(score.archetype);

    stage = "tts";
    const fullScript = score.scenes.map((s) => s.scriptLine).join(" ");
    let ttsWords: WordTimestamp[];
    let voiceoverPath: string | undefined;
    let narrationTimingEstimated = false;

    if (opts.resume?.tts) {
      ttsWords = opts.resume.tts.words;
      voiceoverPath = opts.resume.tts.voiceoverPath;
    } else if (opts.narrationEnabled === false) {
      ttsWords = synthesizeWordTimestamps(score.scenes);
      voiceoverPath = undefined;
    } else {
      await callbacks.onStageStart?.(stage);
      const ttsSegments = buildTtsSegments(score.scenes, archetypeConfig, opts.language);
      const ttsResult = await opts.ttsProvider.generate(ttsSegments);
      const audioDir = path.join(opts.runDir, "audio");
      await fs.promises.mkdir(audioDir, { recursive: true });
      voiceoverPath = path.join(audioDir, "voiceover.mp3");
      await fs.promises.writeFile(voiceoverPath, ttsResult.audio);
      ttsWords = ttsResult.words;
      narrationTimingEstimated = ttsResult.estimatedTiming ?? false;
      await callbacks.onStageComplete?.(stage);
    }
    checkpoint.tts = { words: ttsWords, voiceoverPath, fullScript };
    await callbacks.onCheckpoint?.(checkpoint);

    if (callbacks.isCancelled?.()) return { status: "cancelled" };

    stage = "visuals";
    let resolvedScenes: ResolvedScene[];
    let musicPath: string | undefined;

    if (opts.resume?.visuals) {
      resolvedScenes = opts.resume.visuals.resolvedScenes;
      musicPath = opts.resume.visuals.musicPath;
    } else {
      await callbacks.onStageStart?.(stage);
      const assetsDir = path.join(opts.runDir, "assets");
      const durationsInFrames = splitWordsIntoScenes(score.scenes, ttsWords, fps);
      // override explícito do usuário sempre vence, arquétipo é o default, hardcode
      // só entra se nem um nem outro existir — mesma convenção do captionStyle/etc
      // no stage "render" abaixo, estendida aqui pra transição (§ achado especialista).
      const transitionDurationFrames =
        opts.transitionDurationFrames ?? archetypeConfig.transitionDurationFrames ?? Math.round(fps * 0.4);
      const aspectRatio = inferAspectRatio(width, height);

      resolvedScenes = [];
      const totalElements = score.scenes.reduce((sum, s) => sum + s.elements.length, 0);
      let doneElements = 0;
      for (let i = 0; i < score.scenes.length; i++) {
        const scene = score.scenes[i]!;
        const elements = [];
        for (let j = 0; j < scene.elements.length; j++) {
          const element = scene.elements[j]!;
          callbacks.onLog?.(`Gerando cena ${i + 1}/${score.scenes.length} (${element.type})`);
          const resolved = await resolveElement(element, {
            ...opts.resolveElementCtx,
            archetypeConfig,
            assetId: `${scene.id}-${j}`,
            sceneDurationSeconds: durationsInFrames[i]! / fps,
            aspectRatio,
            writeAsset: async (buffer, filename) => {
              await fs.promises.mkdir(assetsDir, { recursive: true });
              const filePath = path.join(assetsDir, filename);
              await fs.promises.writeFile(filePath, buffer);
              return filePath;
            },
          });
          elements.push(resolved);
          doneElements++;
          callbacks.onProgress?.(doneElements / totalElements);
        }
        resolvedScenes.push({
          id: scene.id,
          durationInFrames: durationsInFrames[i]!,
          elements,
          transition: scene.transition ?? archetypeConfig.defaultTransition ?? "none",
          transitionDurationFrames,
        });
      }
      await callbacks.onStageComplete?.(stage);

      if (opts.musicEnabled !== false) {
        const musicResult = await opts.musicProvider.generate(researchOut.data.mood, score.music_mood);
        musicPath = musicResult.filePath;
      }
    }
    checkpoint.visuals = { resolvedScenes, musicPath };
    await callbacks.onCheckpoint?.(checkpoint);

    if (callbacks.isCancelled?.()) return { status: "cancelled" };

    stage = "render";
    await callbacks.onStageStart?.(stage);
    // archetypeConfig já resolvido antes do stage "tts" (reaproveitado aqui — mesma
    // config vale pro vídeo inteiro, não é por cena).
    const baseCaptionChunkSize = opts.captionChunkSize ?? archetypeConfig.captionChunkSize ?? 3;
    // Timing estimado (fallback Gemini/OpenRouter, sem WordBoundary real) erra um
    // pouco por palavra — chunk maior deixa a TROCA de bloco (o que mais salta aos
    // olhos) mais estável, mesmo sem corrigir o erro de timing por palavra em si.
    const captionChunkSize = narrationTimingEstimated ? Math.max(baseCaptionChunkSize, 5) : baseCaptionChunkSize;
    const renderInput: RenderInput = {
      scenes: resolvedScenes,
      fps,
      width,
      height,
      voiceoverPath,
      musicPath,
      musicVolume: opts.musicVolume,
      words: opts.captionsEnabled === false ? [] : ttsWords,
      captionStyle: opts.captionStyle ?? archetypeConfig.captionStyle,
      captionAccentColor: opts.captionAccentColor ?? "#ffffff",
      captionChunkSize,
      captionLingerS: opts.captionLingerS ?? archetypeConfig.captionLingerS ?? 0.15,
      archetypeVisuals: {
        motionIntensity: archetypeConfig.motionIntensity,
        colorPalette: archetypeConfig.colorPalette,
        textCardFont: archetypeConfig.textCardFont,
      },
      emphasisIndices: opts.captionsEnabled === false ? undefined : Array.from(resolveEmphasisIndices(score.scenes)),
    };
    const outputDir = path.join(opts.runDir, "output");
    await fs.promises.mkdir(outputDir, { recursive: true });
    const outputPath = path.join(outputDir, "output.mp4");
    const renderResult = await opts.videoRenderer.render(renderInput, outputPath);
    await callbacks.onStageComplete?.(stage);

    let aiImages = 0;
    let aiVideos = 0;
    for (const scene of score.scenes) {
      for (const element of scene.elements) {
        if (element.type === "ai_image") aiImages++;
        if (element.type === "ai_video_clip") {
          aiVideos++;
          if (element.sourceImagePrompt) aiImages++;
        }
      }
    }

    const costActual = computeActualCost({
      llmUsages: usages,
      llmModel: opts.cost.llmModel,
      ttsCharacters: opts.narrationEnabled === false ? 0 : fullScript.length,
      ttsProvider: opts.cost.ttsProvider,
      aiImages,
      imageProvider: opts.cost.imageProvider,
      aiVideos,
      videoSeconds: aiVideos * 6,
      videoProvider: opts.cost.videoProvider,
      musicGenerated: opts.musicEnabled !== false,
      musicProvider: opts.cost.musicProvider,
    });

    return {
      status: "completed",
      outputPath: renderResult.outputPath,
      durationInFrames: renderResult.durationInFrames,
      directorScore: score,
      costEstimate,
      costActual,
      revisions,
      scriptWordCount: fullScript.trim().split(/\s+/).filter(Boolean).length,
      coveredWordCount: ttsWords.length,
      fps,
      width,
      height,
      imageCount: aiImages,
      videoClipCount: aiVideos,
      audioSeconds: voiceoverPath && ttsWords.length > 0 ? Math.max(...ttsWords.map((w) => w.end)) : 0,
      narrationTimingEstimated,
    };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    await callbacks.onStageError?.(stage, error);
    return { status: "failed", stage, error };
  }
}
