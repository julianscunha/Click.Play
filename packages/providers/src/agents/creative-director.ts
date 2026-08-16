import * as fs from "node:fs";
import * as path from "node:path";
import { z } from "zod";
import {
  MusicMood,
  Scene,
  TransitionType,
  VideoMode,
  VisualElement,
  VisualStrategy,
  minAiVideoScenes,
  violatesSlideshowRule,
  violatesVideoModeRule,
} from "@clickplay/domain";
import { getArchetype, listArchetypes } from "../config/archetype-registry.js";
import type { ScenePacing } from "../config/archetype.js";
import type { LLMProvider, LLMUsage } from "../llm/types.js";
import type { ResearchResult } from "./research.js";
import type { CritiqueResult } from "./critic.js";

const SYSTEM_PROMPT_PATH = path.join(process.cwd(), "prompts", "creative-director.md");

/**
 * Adaptado de OpenReels src/agents/creative-director.ts (MIT). Mudança
 * estrutural (docs/IMPLEMENTATION-PLAN.md §0.2): o schema de saída pede
 * `visualStrategy`+`elements[]` por cena em vez de `visual_type`+`visual_prompt`
 * único — o Creative Director decide COMO produzir a cena (motion graphics,
 * vídeo por IA, ou híbrido), não só qual imagem buscar.
 *
 * min/max omitidos no array de scenes: a API de structured-output do Gemini
 * rejeita minItems > 1 em JSON Schema (achado original do OpenReels, ainda
 * válido). Contagem de cenas é guiada pelo prompt de pacing e reforçada pelo
 * `DirectorScore.parse()` abaixo (mantém .min(3).max(16)).
 */
const SceneRaw = z.object({
  visualStrategy: VisualStrategy,
  elements: z.array(VisualElement).min(1),
  scriptLine: z.string().min(1),
  transition: TransitionType.nullable(),
});

const DirectorScoreRaw = z.object({
  emotional_arc: z.string(),
  archetype: z.enum(listArchetypes() as [string, ...string[]]),
  music_mood: MusicMood,
  scenes: z.array(SceneRaw),
});

export const DirectorScore = z
  .object({
    emotional_arc: z.string().min(1),
    archetype: z.string().min(1),
    music_mood: MusicMood,
    scenes: z.array(Scene).min(3).max(16),
  })
  .refine((score) => !violatesSlideshowRule(score.scenes), {
    message:
      'Regra anti-slideshow violada: mais de 2 cenas consecutivas com único elemento estático (ver docs/IMPLEMENTATION-PLAN.md §0.2)',
  });
export type DirectorScore = z.infer<typeof DirectorScore>;

export interface DirectorScoreOutput {
  data: DirectorScore;
  usage: LLMUsage;
}

/**
 * Atribui id sequencial (a LLM não produz ids únicos de forma confiável) e
 * corrige visualStrategy "ai_video" sem elemento "ai_video_clip" rebaixando
 * pra "motion_graphics" — mesmo com o prompt explícito sobre a exigência,
 * modelos erram essa combinação (achado em teste manual, reproduzido 3/3
 * em dois modelos diferentes); reparar é mais confiável que reprompt.
 */
function toScenes(raw: z.infer<typeof SceneRaw>[]): Scene[] {
  return raw.map((scene, i) => {
    const hasAiVideoClip = scene.elements.some((e) => e.type === "ai_video_clip");
    const visualStrategy = scene.visualStrategy === "ai_video" && !hasAiVideoClip ? "motion_graphics" : scene.visualStrategy;
    return Scene.parse({ id: String(i + 1), ...scene, visualStrategy });
  });
}

/** Backoff antes de cada retry — achado em teste manual: rate limit do provider
 * (ex. "Google AI Studio... Please retry in ~7s") derruba o job porque as 3
 * tentativas disparavam sem espera, todas dentro da mesma janela de limite. */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function loadDirectorSystemPrompt(): string {
  try {
    return fs.readFileSync(SYSTEM_PROMPT_PATH, "utf-8");
  } catch {
    return buildDefaultPrompt();
  }
}

/**
 * Instrução de prompt por VideoMode (docs/IMPLEMENTATION-PLAN.md §11A Bloco 1).
 * O piso mínimo de cenas em vídeo é IMPOSTO depois (assertVideoMode), não só
 * sugerido — o booleano `videoEnabled` antigo permitia 0 cenas em vídeo mesmo
 * "habilitado", porque era só texto de prompt sem validação.
 */
function buildVideoModeGuidance(mode: VideoMode): string {
  const noPlaceholders =
    "do NOT use svg/shape/icon/particle_system/diagram, they have no renderer yet and render as blank";
  if (mode === "motion_graphics_only") {
    return `Use visualStrategy "motion_graphics" for every scene (composed elements: animated_text, ai_image, stock_image/stock_video — ${noPlaceholders}). ai_video is disabled for this project.`;
  }
  if (mode === "ai_video_only") {
    return `Use visualStrategy "ai_video" for every scene — every scene REQUIRES at least one element of type "ai_video_clip" in the elements array, no exceptions. This project has real motion video in every scene, not motion graphics.`;
  }
  return `Use visualStrategy "motion_graphics" for most scenes (composed elements: animated_text, ai_image, stock_image/stock_video — ${noPlaceholders}). Use "ai_video" or "hybrid" for at least 30% of scenes where MOTION is the story (explosions, flowing water, launches, transformations) — BOTH require at least one element of type "ai_video_clip" in the elements array (a scene with visualStrategy "ai_video" and no "ai_video_clip" element is INVALID and will be rejected). ai_video_clip costs ~$0.30/scene vs ~$0.04 for ai_image — use selectively, but the 30% floor is mandatory.`;
}

/** Lança se o roteiro não atinge o piso de vídeo do VideoMode — pego pelo mesmo retry-with-feedback dos outros erros de validação. */
function assertVideoMode(scenes: Scene[], mode: VideoMode): void {
  if (violatesVideoModeRule(scenes, mode)) {
    const needed = minAiVideoScenes(scenes.length, mode);
    throw new Error(
      `VideoMode "${mode}" requer ao menos ${needed} cena(s) com elemento "ai_video_clip" em ${scenes.length} cena(s) totais — roteiro não atinge o piso.`,
    );
  }
}

export async function generateDirectorScore(
  llm: LLMProvider,
  topic: string,
  researchContext: ResearchResult,
  options?: { archetype?: string; pacing?: string; videoMode?: VideoMode; direction?: string },
): Promise<DirectorScoreOutput> {
  const systemPrompt = loadDirectorSystemPrompt();

  const archetypes = listArchetypes();
  const archetypeInstruction = options?.archetype
    ? `Use the "${options.archetype}" archetype.`
    : `Choose from: ${archetypes.join(", ")}`;

  const videoMode = options?.videoMode ?? "hybrid";
  const strategyGuidance = buildVideoModeGuidance(videoMode);

  const pacingInstruction = buildPacingInstruction(options?.archetype, options?.pacing);

  const directionSection = options?.direction?.trim()
    ? `\n## Creative Direction (from the producer)\n\n${options.direction}\n\nHonor these creative constraints while exercising your judgment on anything not specified.\n`
    : "";

  const userMessage = `Topic: ${topic}

Research context:
${researchContext.summary}

Key facts:
${researchContext.key_facts.map((f) => `- ${f}`).join("\n")}

Mood: ${researchContext.mood}

${archetypeInstruction}

${pacingInstruction}
${strategyGuidance}
${directionSection}CRITICAL RULE: A scene must never be reduced to a single static image/stock clip more than 2 times in a row — compose scenes with multiple elements (e.g. animated_text over an ai_image) instead of a plain image slideshow. Plan your visualStrategy sequence BEFORE writing scenes to ensure variety.
Every scene MUST have a scriptLine (the voiceover text).
The first scene should be a strong hook.
If over budget, cut a scene rather than cramming.`;

  const maxRetries = 3;
  let lastError: Error | null = null;
  const totalUsage: LLMUsage = { inputTokens: 0, outputTokens: 0 };

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    if (attempt > 0) await sleep(attempt * 4000);
    try {
      const result = await llm.generate({
        systemPrompt,
        userMessage:
          attempt > 0
            ? `${userMessage}\n\nPREVIOUS ATTEMPT FAILED: ${lastError?.message}. Fix the issue.`
            : userMessage,
        schema: DirectorScoreRaw,
      });

      totalUsage.inputTokens += result.usage.inputTokens;
      totalUsage.outputTokens += result.usage.outputTokens;

      const validated = DirectorScore.parse({
        ...result.data,
        scenes: toScenes(result.data.scenes),
      });
      assertVideoMode(validated.scenes, videoMode);
      return { data: validated, usage: totalUsage };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(`[creative-director] Attempt ${attempt + 1} failed: ${lastError.message}`);
    }
  }

  throw new Error(`Creative Director failed after ${maxRetries} attempts: ${lastError?.message}`);
}

function buildDefaultPrompt(): string {
  return `You are a Creative Director for short-form video content. Your job is to create a detailed per-scene production plan (DirectorScore) that will drive the entire video creation pipeline.

Click.Play generates VIDEO — composition with movement, animation, and visual dynamics. It is NOT a slideshow of static images narrated over. Every scene is a COMPOSITION of 1+ visual elements (motion graphics and/or AI-generated video clips), never just "one image for N seconds".

You must output a DirectorScore with:
- emotional_arc: A journey descriptor (e.g., "curiosity-to-wisdom", "shock-to-understanding")
- archetype: Visual style that drives transitions, colors, and captions
- music_mood: MUST be exactly one of: "epic_cinematic", "tense_electronic", "chill_lofi", "uplifting_pop", "mysterious_ambient", "warm_acoustic", "dark_cinematic", "dreamy_ethereal", "playful_kids"
- scenes: Array of scenes following the archetype's recommended pacing tier. Each scene has visualStrategy ("motion_graphics" | "ai_video" | "hybrid") and elements (1+ composed visual elements). visualStrategy "ai_video" or "hybrid" REQUIRES at least one element of type "ai_video_clip" in elements — without it, the scene is invalid.

GOLDEN RULE: Never reduce more than 2 consecutive scenes to a single static image/stock clip. Compose with animated_text over ai_image/stock elements for visual variety and movement — do NOT use svg/shape/icon/particle_system/diagram, they have no renderer yet and render as blank.

Think like a YouTube Shorts producer. The hook must grab in 1-2 seconds. Every scene should move the story forward. The FINAL scene MUST be a call-to-action (e.g. "What would you have done? Comment below."), not a story conclusion.

Keep total script under 140 words — verbose scripts create rushed, unwatchable videos.`;
}

const PACING_CONFIG: Record<ScenePacing, { min: number; max: number; wordsPerScene: string; totalWords: string }> = {
  fast: { min: 8, max: 12, wordsPerScene: "8-12", totalWords: "90-120" },
  moderate: { min: 7, max: 10, wordsPerScene: "10-16", totalWords: "100-140" },
  cinematic: { min: 5, max: 8, wordsPerScene: "15-22", totalWords: "90-130" },
};

const PACING_TIER_TABLE = `After choosing your archetype, use the matching pacing tier from this table:
- fast (8-12 scenes, 8-12 words/scene, 90-120 words total): infographic, bold_illustration, comic_book, kids_cartoon, edu_explainer, musical_singalong
- moderate (7-10 scenes, 10-16 words/scene, 100-140 words total): warm_editorial, editorial_caricature, anime_illustration, vintage_snapshot, surreal_dreamscape, gothic_fantasy, storybook_picturebook, claymation_playful
- cinematic (5-8 scenes, 15-22 words/scene, 90-130 words total): cinematic_documentary, moody_cinematic, studio_realism, warm_narrative, pastoral_watercolor`;

export function buildPacingInstruction(archetype?: string, pacingOverride?: string): string {
  if (pacingOverride && pacingOverride in PACING_CONFIG) {
    const tier = pacingOverride as ScenePacing;
    const cfg = PACING_CONFIG[tier];
    return `Use ${tier} pacing. Create a DirectorScore with ${cfg.min}-${cfg.max} scenes.
Per-scene word budget: ${cfg.wordsPerScene} words. Total word budget: ${cfg.totalWords} words.`;
  }

  if (archetype) {
    try {
      const config = getArchetype(archetype);
      const tier = config.scenePacing;
      const cfg = PACING_CONFIG[tier];
      return `This archetype uses ${tier} pacing. Create a DirectorScore with ${cfg.min}-${cfg.max} scenes.
Per-scene word budget: ${cfg.wordsPerScene} words. Total word budget: ${cfg.totalWords} words.`;
    } catch {
      // Unknown archetype — fall through to table
    }
  }

  return PACING_TIER_TABLE;
}

export { PACING_CONFIG };

// ── Revision ─────────────────────────────────────────────────────────────────

export async function reviseDirectorScore(
  llm: LLMProvider,
  topic: string,
  researchContext: ResearchResult,
  originalScore: DirectorScore,
  critique: CritiqueResult,
  options?: { archetype?: string; pacing?: string; videoMode?: VideoMode; direction?: string },
): Promise<DirectorScoreOutput> {
  const systemPrompt = loadDirectorSystemPrompt();
  const videoMode = options?.videoMode ?? "hybrid";
  const revisionGuidance = critique.revision_instructions ?? `Address these weaknesses: ${critique.weaknesses.join("; ")}`;
  const pacingInstruction = buildPacingInstruction(options?.archetype, options?.pacing);

  const directionSection = options?.direction?.trim()
    ? `\n## Creative Direction (from the producer)\n\n${options.direction}\n\nHonor these creative constraints while exercising your judgment on anything not specified.\n`
    : "";

  const userMessage = `Topic: ${topic}

Research context:
${researchContext.summary}

Key facts:
${researchContext.key_facts.map((f) => `- ${f}`).join("\n")}

Mood: ${researchContext.mood}

${pacingInstruction}
${directionSection}
## Current Plan (score: ${critique.score}/10)

${JSON.stringify(originalScore, null, 2)}

## Critic Feedback

Strengths: ${critique.strengths.join(", ")}
Weaknesses: ${critique.weaknesses.join(", ")}
${critique.weakest_scene_index != null ? `Weakest scene: Scene ${critique.weakest_scene_index}` : ""}

## Revision Instructions

${revisionGuidance}

Revise the DirectorScore to address the weaknesses while preserving the strengths.
Keep the same archetype. Maintain the GOLDEN RULE: never reduce more than 2 consecutive scenes to a single static image/stock clip.`;

  const maxRetries = 2;
  let lastError: Error | null = null;
  const totalUsage: LLMUsage = { inputTokens: 0, outputTokens: 0 };

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    if (attempt > 0) await sleep(attempt * 4000);
    try {
      const result = await llm.generate({
        systemPrompt,
        userMessage:
          attempt > 0
            ? `${userMessage}\n\nPREVIOUS ATTEMPT FAILED: ${lastError?.message}. Fix the issue.`
            : userMessage,
        schema: DirectorScoreRaw,
      });

      totalUsage.inputTokens += result.usage.inputTokens;
      totalUsage.outputTokens += result.usage.outputTokens;

      const validated = DirectorScore.parse({
        ...result.data,
        scenes: toScenes(result.data.scenes),
      });

      // Prevent archetype drift: the LLM may change the archetype during revision
      // despite prompt instructions. Force it back to the original.
      if (validated.archetype !== originalScore.archetype) {
        (validated as { archetype: string }).archetype = originalScore.archetype;
      }

      assertVideoMode(validated.scenes, videoMode);
      return { data: validated, usage: totalUsage };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(`[creative-director] Revision attempt ${attempt + 1} failed: ${lastError.message}`);
    }
  }

  throw new Error(`Revision failed after ${maxRetries} attempts: ${lastError?.message}`);
}
