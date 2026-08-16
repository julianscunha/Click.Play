import * as fs from "node:fs";
import * as path from "node:path";
import type { WordTimestamp } from "@clickplay/domain";
import type { RenderInput, ResolvedScene } from "@clickplay/video-engine";
import type { DirectorScore } from "../agents/creative-director.js";
import { generateDirectorScore, reviseDirectorScore } from "../agents/creative-director.js";
import { evaluate } from "../agents/critic.js";
import { research } from "../agents/research.js";
import { getArchetype } from "../config/archetype-registry.js";
import type { CostBreakdown } from "../cost/index.js";
import { computeActualCost, estimateCost } from "../cost/index.js";
import type { LLMUsage } from "../llm/types.js";
import { resolveElement } from "../visual/index.js";
import { splitWordsIntoScenes } from "./scene-timing.js";
import type {
  PipelineCallbacks,
  PipelineCheckpoint,
  PipelineOptions,
  PipelineResult,
  PipelineStage,
  RevisionLogEntry,
} from "./types.js";

const MAX_REVISION_ROUNDS = 2;

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

    let researchOut;
    if (opts.resume?.research) {
      researchOut = opts.resume.research;
    } else {
      await callbacks.onStageStart?.(stage);
      researchOut = await research(opts.llm, opts.topic);
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
      };

      let directorOut = await generateDirectorScore(opts.llm, opts.topic, researchOut.data, directorOpts);
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

      costEstimate = estimateCost(score.scenes, opts.cost);
      const approved = await callbacks.onCostEstimate(costEstimate);
      if (!approved) {
        return { status: "cancelled_cost", directorScore: score, costEstimate, revisions };
      }
    }
    checkpoint.director = { score, revisions, costEstimate };
    await callbacks.onCheckpoint?.(checkpoint);

    if (callbacks.isCancelled?.()) return { status: "cancelled" };

    stage = "tts";
    const fullScript = score.scenes.map((s) => s.scriptLine).join(" ");
    let ttsWords: WordTimestamp[];
    let voiceoverPath: string;

    if (opts.resume?.tts) {
      ttsWords = opts.resume.tts.words;
      voiceoverPath = opts.resume.tts.voiceoverPath;
    } else {
      await callbacks.onStageStart?.(stage);
      const ttsResult = await opts.ttsProvider.generate(fullScript);
      const audioDir = path.join(opts.runDir, "audio");
      await fs.promises.mkdir(audioDir, { recursive: true });
      voiceoverPath = path.join(audioDir, "voiceover.mp3");
      await fs.promises.writeFile(voiceoverPath, ttsResult.audio);
      ttsWords = ttsResult.words;
      await callbacks.onStageComplete?.(stage);
    }
    checkpoint.tts = { words: ttsWords, voiceoverPath, fullScript };
    await callbacks.onCheckpoint?.(checkpoint);

    if (callbacks.isCancelled?.()) return { status: "cancelled" };

    stage = "visuals";
    let resolvedScenes: ResolvedScene[];
    let musicPath: string;

    if (opts.resume?.visuals) {
      resolvedScenes = opts.resume.visuals.resolvedScenes;
      musicPath = opts.resume.visuals.musicPath;
    } else {
      await callbacks.onStageStart?.(stage);
      const assetsDir = path.join(opts.runDir, "assets");
      const durationsInFrames = splitWordsIntoScenes(score.scenes, ttsWords, fps);
      const transitionDurationFrames = opts.transitionDurationFrames ?? Math.round(fps * 0.4);

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
            assetId: `${scene.id}-${j}`,
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
          transition: scene.transition ?? "none",
          transitionDurationFrames,
        });
      }
      await callbacks.onStageComplete?.(stage);

      const musicResult = await opts.musicProvider.generate(researchOut.data.mood, score.music_mood);
      musicPath = musicResult.filePath;
    }
    checkpoint.visuals = { resolvedScenes, musicPath };
    await callbacks.onCheckpoint?.(checkpoint);

    if (callbacks.isCancelled?.()) return { status: "cancelled" };

    stage = "render";
    await callbacks.onStageStart?.(stage);
    // Fallback de legenda vinha hardcoded aqui (3 palavras/0.15s) em vez do
    // valor curado por arquétipo (docs/IMPLEMENTATION-PLAN.md §11A Bloco 4) —
    // override explícito do usuário (opts.*) sempre vence, arquétipo é o
    // default, hardcode só entra se nem um nem outro existir.
    const archetypeConfig = getArchetype(score.archetype);
    const renderInput: RenderInput = {
      scenes: resolvedScenes,
      fps,
      width,
      height,
      voiceoverPath,
      musicPath,
      words: ttsWords,
      captionStyle: opts.captionStyle ?? archetypeConfig.captionStyle,
      captionAccentColor: opts.captionAccentColor ?? "#ffffff",
      captionChunkSize: opts.captionChunkSize ?? archetypeConfig.captionChunkSize ?? 3,
      captionLingerS: opts.captionLingerS ?? archetypeConfig.captionLingerS ?? 0.15,
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
      ttsCharacters: fullScript.length,
      ttsProvider: opts.cost.ttsProvider,
      aiImages,
      imageProvider: opts.cost.imageProvider,
      aiVideos,
      videoSeconds: aiVideos * 6,
      videoProvider: opts.cost.videoProvider,
      musicGenerated: true,
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
    };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    await callbacks.onStageError?.(stage, error);
    return { status: "failed", stage, error };
  }
}
