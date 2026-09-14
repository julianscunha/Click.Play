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
import { AI_VIDEO_ESTIMATE_DURATION_SECONDS } from "../cost/pricing.js";
import { parseSuggestedRetryDelayMs } from "../http/retry.js";
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
    // Teto real por job é dinâmico (targetDurationSeconds) — imposto depois via
    // assertSceneCountCap, não no schema. min(3) continua fixo (piso narrativo).
    scenes: z.array(Scene).min(3),
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

/** Prompt visual a reaproveitar pro ai_video_clip injetado — pega de outro
 * elemento com prompt (ai_image/stock_image/stock_video) já presente na
 * cena; sem isso (cena só com animated_text, por ex.), cai pro scriptLine. */
function extractVisualPrompt(scene: z.infer<typeof SceneRaw>): string {
  const withPrompt = scene.elements.find((e): e is Extract<VisualElement, { prompt: string }> => "prompt" in e);
  return withPrompt?.prompt ?? scene.scriptLine;
}

/**
 * Atribui id sequencial (a LLM não produz ids únicos de forma confiável) e
 * repara visualStrategy "ai_video" sem elemento "ai_video_clip" injetando um
 * — mesmo com o prompt explícito sobre a exigência, modelos erram essa
 * combinação (achado em teste manual, reproduzido 3/3 em dois modelos
 * diferentes). Rebaixar pra "motion_graphics" (comportamento anterior)
 * quebrava VideoMode "ai_video_only" de vez: o piso exige TODA cena com
 * clip, então qualquer rebaixamento garantia falha nas 3 tentativas — visto
 * em produção (8/8 cenas rebaixadas, job sempre falhando). Injetar o
 * elemento faltante honra a intenção original do LLM e sempre atinge o piso.
 */
function toScenes(raw: z.infer<typeof SceneRaw>[]): { scenes: Scene[]; repaired: number[] } {
  const repaired: number[] = [];
  const scenes = raw.map((scene, i) => {
    const hasAiVideoClip = scene.elements.some((e) => e.type === "ai_video_clip");
    const needsRepair = scene.visualStrategy === "ai_video" && !hasAiVideoClip;
    if (needsRepair) repaired.push(i + 1);
    const elements = needsRepair
      ? [...scene.elements, { type: "ai_video_clip" as const, provider: "auto" as const, prompt: extractVisualPrompt(scene) }]
      : scene.elements;
    return Scene.parse({ id: String(i + 1), ...scene, elements });
  });
  return { scenes, repaired };
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
function buildVideoModeGuidance(mode: VideoMode, showTextOverlays = false): string {
  const noPlaceholders =
    "do NOT use svg/shape/icon/particle_system/diagram, they have no renderer yet and render as blank";
  const noTextOverlays = showTextOverlays
    ? ""
    : ` do NOT use "animated_text" elements in this project — the producer disabled text overlays.`;
  if (mode === "motion_graphics_only") {
    return `Use visualStrategy "motion_graphics" for every scene (composed elements: animated_text, ai_image, stock_image/stock_video — ${noPlaceholders}).${noTextOverlays} ai_video is disabled for this project.`;
  }
  if (mode === "ai_video_only") {
    return `Use visualStrategy "ai_video" for every scene — every scene REQUIRES at least one element of type "ai_video_clip" in the elements array, no exceptions. This project has real motion video in every scene, not motion graphics.${noTextOverlays}`;
  }
  return `Use visualStrategy "motion_graphics" for most scenes (composed elements: animated_text, ai_image, stock_image/stock_video — ${noPlaceholders}). Use "ai_video" or "hybrid" for at least 30% of scenes where MOTION is the story (explosions, flowing water, launches, transformations) — BOTH require at least one element of type "ai_video_clip" in the elements array (a scene with visualStrategy "ai_video" and no "ai_video_clip" element is INVALID and will be rejected). ai_video_clip costs ~$0.30/scene vs ~$0.04 for ai_image — use selectively, but the 30% floor is mandatory.${noTextOverlays}`;
}

/**
 * Erro de validação com dica de correção em inglês separada da mensagem
 * pt-BR — achado em teste manual real: a mensagem pt-BR (usada também como
 * erro final pro usuário) virava o texto de feedback pro retry ("PREVIOUS
 * ATTEMPT FAILED: <mensagem>"), misturando português dentro de um prompt
 * 100% em inglês. Suspeita de que isso reduz a chance do modelo corrigir de
 * verdade (ex. persistiu 3 tentativas estourando o teto de cenas mesmo com
 * a contagem exata na mensagem). `retryHint` é opcional — só os validadores
 * onde vale a pena ser mais diretivo ganham um.
 */
class DirectorValidationError extends Error {
  constructor(
    message: string,
    public readonly retryHint?: string,
  ) {
    super(message);
    this.name = "DirectorValidationError";
  }
}

function retryFeedback(error: Error | null): string {
  if (error instanceof DirectorValidationError && error.retryHint) return error.retryHint;
  return error?.message ?? "unknown error";
}

/** Instrui o LLM a sempre setar `motion` em elementos estáticos (ai_image/stock_image/
 * stock_video) — antes o campo existia no schema mas nunca era citado em nenhum prompt,
 * resultando em imagens paradas mesmo quando a cena não tinha ai_video_clip (achado do
 * especialista de composição/edição). Reforça a mesma regra anti-slideshow acima. */
const MOTION_INSTRUCTION = `For every element of type "ai_image", "stock_image", or "stock_video", you MUST set the "motion" field to one of: "zoom_in", "zoom_out", "pan_left", "pan_right". Only use "static" (or omit motion) when the shot is intentionally still for dramatic effect (rare — at most once per video). A static image with no camera motion reads as a dead slideshow frame. Vary the motion direction across consecutive scenes — do not repeat the same motion value more than 2 scenes in a row.`;

/** Critério de escolha de transição — antes o LLM só via a lista de valores do enum, sem
 * nenhuma orientação de quando usar cada um (achado do especialista de composição/edição). */
const TRANSITION_INSTRUCTION = `For each scene's "transition" field, default to "none" (hard cut) — hard cuts keep pacing tight and are the professional default for short-form video. Only use "crossfade" when the topic/subject changes meaningfully between scenes (a real beat change, not just a new shot of the same subject). Never use the same non-"none" transition value on more than 2 consecutive scene boundaries — vary it, or fall back to "none". Transitions with heavy visual effect ("zoom", "whip_pan", "flash", "wipe", "flip") should be rare — at most 1-2 per video, used only at a genuine emotional or narrative turn.`;

/** Injeta os campos de arte do arquétipo (quando já conhecido de antemão) no prompt, pra
 * o LLM escrever prompts de ai_image/ai_video_clip que já refletem o estilo — complementa
 * (não substitui) o prefixo determinístico aplicado depois em resolve-element.ts, que cobre
 * o caso do LLM esquecer de citar o estilo. */
function buildArchetypeStyleSection(archetype?: string): string {
  if (!archetype) {
    return `Whichever archetype you choose, write ai_image/ai_video_clip prompts that explicitly describe art style, lighting and mood consistent with that archetype's visual identity.`;
  }
  try {
    const cfg = getArchetype(archetype);
    return `## Visual style for this archetype ("${archetype}")
Art style: ${cfg.artStyle}
Lighting: ${cfg.lighting}
Mood: ${cfg.mood}
Composition rules: ${cfg.compositionRules}
Cultural markers: ${cfg.culturalMarkers}
Color palette: ${cfg.visualColorPalette.join(", ")}
Avoid: ${cfg.antiArtifactGuidance}

Every "prompt" field you write for ai_image/ai_video_clip elements MUST reflect this visual style explicitly (mention lighting/mood/art style in the prompt text itself, not just rely on post-processing).`;
  } catch {
    // Arquétipo inválido — não quebra a geração, cai na instrução genérica.
    return `Whichever archetype you choose, write ai_image/ai_video_clip prompts that explicitly describe art style, lighting and mood consistent with that archetype's visual identity.`;
  }
}

/** Lança se o roteiro não atinge o piso de vídeo do VideoMode — pego pelo mesmo retry-with-feedback dos outros erros de validação. */
function assertVideoMode(scenes: Scene[], mode: VideoMode): void {
  if (violatesVideoModeRule(scenes, mode)) {
    const needed = minAiVideoScenes(scenes.length, mode);
    throw new DirectorValidationError(
      `VideoMode "${mode}" requer ao menos ${needed} cena(s) com elemento "ai_video_clip" em ${scenes.length} cena(s) totais — roteiro não atinge o piso.`,
      `CRITICAL: VideoMode "${mode}" requires AT LEAST ${needed} scene(s) with an "ai_video_clip" element. Your last response only had ${needed - 1} or fewer. Add "ai_video_clip" elements to enough scenes to satisfy this floor — do not remove scenes to work around it.`,
    );
  }
}

const DEFAULT_MAX_SCENES = 16;

/**
 * Teto de cenas a partir da duração-alvo (§11A Bloco 2 item 4) — reusa
 * `AI_VIDEO_ESTIMATE_DURATION_SECONDS` (~6s/cena, já assumido pro custo de
 * ai_video_clip) como proxy de duração média de cena em geral; não existe
 * constante melhor no código hoje (duração real só se sabe após o TTS
 * alinhar palavra-por-cena). Sem targetDurationSeconds, mantém o teto fixo
 * anterior (16) — comportamento antigo preservado por default.
 */
export function sceneCapForDuration(targetDurationSeconds?: number): number {
  if (!targetDurationSeconds) return DEFAULT_MAX_SCENES;
  return Math.max(3, Math.ceil(targetDurationSeconds / AI_VIDEO_ESTIMATE_DURATION_SECONDS));
}

/** Lança se o roteiro estourou o teto de cenas orçado pela duração-alvo — pego pelo mesmo retry-with-feedback dos outros erros de validação. */
function assertSceneCountCap(scenes: Scene[], targetDurationSeconds?: number): void {
  const cap = sceneCapForDuration(targetDurationSeconds);
  if (scenes.length > cap) {
    throw new DirectorValidationError(
      `${scenes.length} cena(s) estoura o teto de ${cap} orçado pra duração-alvo${targetDurationSeconds ? ` de ${targetDurationSeconds}s` : ""} (~${AI_VIDEO_ESTIMATE_DURATION_SECONDS}s/cena).`,
      `CRITICAL: your response had ${scenes.length} scenes, but the HARD LIMIT is ${cap} scenes total. You MUST cut or merge scenes down to AT MOST ${cap} — actually remove entries from the scenes array, do not just shorten scriptLine text. Prioritize keeping the hook (scene 1) and the CTA (last scene); merge or drop the least essential scenes in between.`,
    );
  }
}

export async function generateDirectorScore(
  llm: LLMProvider,
  topic: string,
  researchContext: ResearchResult,
  options?: {
    archetype?: string;
    pacing?: string;
    videoMode?: VideoMode;
    direction?: string;
    showTextOverlays?: boolean;
    targetDurationSeconds?: number;
    language?: string;
  },
): Promise<DirectorScoreOutput> {
  const systemPrompt = loadDirectorSystemPrompt();

  const archetypes = listArchetypes();
  const archetypeInstruction = options?.archetype
    ? `Use the "${options.archetype}" archetype.`
    : `Choose from: ${archetypes.join(", ")}`;
  const archetypeStyleSection = buildArchetypeStyleSection(options?.archetype);

  const videoMode = options?.videoMode ?? "hybrid";
  const strategyGuidance = buildVideoModeGuidance(videoMode, options?.showTextOverlays);

  const pacingInstruction = buildPacingInstruction(options?.archetype, options?.pacing);
  const durationInstruction = options?.targetDurationSeconds
    ? `\nTarget total duration: ${options.targetDurationSeconds}s. Budget your scene count and script length accordingly (max ${sceneCapForDuration(options.targetDurationSeconds)} scenes at ~${AI_VIDEO_ESTIMATE_DURATION_SECONDS}s/scene).`
    : "";
  const languageInstruction = options?.language
    ? `\nWrite every scriptLine (voiceover text) in ${options.language}. Other fields (archetype, emotional_arc, music_mood) stay in English as usual.`
    : "";

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
${durationInstruction}
${languageInstruction}
${strategyGuidance}
${archetypeStyleSection}
${directionSection}CRITICAL RULE: A scene must never be reduced to a single static image/stock clip more than 2 times in a row — compose scenes with multiple elements (e.g. animated_text over an ai_image) instead of a plain image slideshow. Plan your visualStrategy sequence BEFORE writing scenes to ensure variety.
${MOTION_INSTRUCTION}
${TRANSITION_INSTRUCTION}
Every scene MUST have a scriptLine (the voiceover text).
The first scene should be a strong hook.
If over budget, cut a scene rather than cramming.`;

  const maxRetries = 3;
  let lastError: Error | null = null;
  const totalUsage: LLMUsage = { inputTokens: 0, outputTokens: 0 };

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    if (attempt > 0) await sleep(parseSuggestedRetryDelayMs(lastError?.message ?? "") ?? attempt * 4000);
    try {
      const result = await llm.generate({
        systemPrompt,
        userMessage:
          attempt > 0
            ? `${userMessage}\n\nPREVIOUS ATTEMPT FAILED: ${retryFeedback(lastError)}. Fix the issue.`
            : userMessage,
        schema: DirectorScoreRaw,
      });

      totalUsage.inputTokens += result.usage.inputTokens;
      totalUsage.outputTokens += result.usage.outputTokens;

      const { scenes } = toScenes(result.data.scenes);
      const validated = DirectorScore.parse({ ...result.data, scenes });
      assertVideoMode(validated.scenes, videoMode);
      assertSceneCountCap(validated.scenes, options?.targetDurationSeconds);
      return { data: validated, usage: totalUsage };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(`[creative-director] Attempt ${attempt + 1} failed: ${lastError.message}`);
    }
  }

  throw new Error(`Creative Director failed after ${maxRetries} attempts: ${lastError?.message}`);
}

/** Fallback usado só se prompts/creative-director.md não existir no cwd — MANTER
 * sincronizado com esse arquivo manualmente; qualquer instrução nova (hook/CTA/
 * motion/transição/estilo de arquétipo) entra nos dois lugares. */
function buildDefaultPrompt(): string {
  return `You are a Creative Director for short-form video content. Your job is to create a detailed per-scene production plan (DirectorScore) that will drive the entire video creation pipeline.

Click.Play generates VIDEO — composition with movement, animation, and visual dynamics. It is NOT a slideshow of static images narrated over. Every scene is a COMPOSITION of 1+ visual elements (motion graphics and/or AI-generated video clips), never just "one image for N seconds".

You must output a DirectorScore with:
- emotional_arc: A journey descriptor (e.g., "curiosity-to-wisdom", "shock-to-understanding")
- archetype: Visual style that drives transitions, colors, and captions
- music_mood: MUST be exactly one of: "epic_cinematic", "tense_electronic", "chill_lofi", "uplifting_pop", "mysterious_ambient", "warm_acoustic", "dark_cinematic", "dreamy_ethereal", "playful_kids"
- scenes: Array of scenes following the archetype's recommended pacing tier. Each scene has visualStrategy ("motion_graphics" | "ai_video" | "hybrid") and elements (1+ composed visual elements). visualStrategy "ai_video" or "hybrid" REQUIRES at least one element of type "ai_video_clip" in elements — without it, the scene is invalid.

GOLDEN RULE: Never reduce more than 2 consecutive scenes to a single static image/stock clip. Compose with animated_text over ai_image/stock elements for visual variety and movement — do NOT use svg/shape/icon/particle_system/diagram, they have no renderer yet and render as blank.

${MOTION_INSTRUCTION}

${TRANSITION_INSTRUCTION}

Whichever archetype you choose, write ai_image/ai_video_clip prompts that explicitly describe art style, lighting and mood consistent with that archetype's visual identity.

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
  options?: {
    archetype?: string;
    pacing?: string;
    videoMode?: VideoMode;
    direction?: string;
    showTextOverlays?: boolean;
    targetDurationSeconds?: number;
    language?: string;
  },
): Promise<DirectorScoreOutput> {
  const systemPrompt = loadDirectorSystemPrompt();
  const videoMode = options?.videoMode ?? "hybrid";
  const archetypeStyleSection = buildArchetypeStyleSection(options?.archetype ?? originalScore.archetype);
  const revisionGuidance = critique.revision_instructions ?? `Address these weaknesses: ${critique.weaknesses.join("; ")}`;
  const pacingInstruction = buildPacingInstruction(options?.archetype, options?.pacing);
  const durationInstruction = options?.targetDurationSeconds
    ? `\nTarget total duration: ${options.targetDurationSeconds}s. Budget your scene count and script length accordingly (max ${sceneCapForDuration(options.targetDurationSeconds)} scenes at ~${AI_VIDEO_ESTIMATE_DURATION_SECONDS}s/scene).`
    : "";
  const languageInstruction = options?.language
    ? `\nWrite every scriptLine (voiceover text) in ${options.language}.`
    : "";

  const directionSection = options?.direction?.trim()
    ? `\n## Creative Direction (from the producer)\n\n${options.direction}\n\nHonor these creative constraints while exercising your judgment on anything not specified.\n`
    : "";
  const noTextOverlaysSection =
    options?.showTextOverlays === false
      ? `\ndo NOT use "animated_text" elements in this revision — the producer disabled text overlays.\n`
      : "";

  const userMessage = `Topic: ${topic}

Research context:
${researchContext.summary}

Key facts:
${researchContext.key_facts.map((f) => `- ${f}`).join("\n")}

Mood: ${researchContext.mood}

${pacingInstruction}
${durationInstruction}
${languageInstruction}
${archetypeStyleSection}
${directionSection}${noTextOverlaysSection}
## Current Plan (score: ${critique.score}/10)

${JSON.stringify(originalScore, null, 2)}

## Critic Feedback

Strengths: ${critique.strengths.join(", ")}
Weaknesses: ${critique.weaknesses.join(", ")}
${critique.weakest_scene_index != null ? `Weakest scene: Scene ${critique.weakest_scene_index}` : ""}

## Revision Instructions

${revisionGuidance}

Revise the DirectorScore to address the weaknesses while preserving the strengths.
Keep the same archetype. Maintain the GOLDEN RULE: never reduce more than 2 consecutive scenes to a single static image/stock clip.
${MOTION_INSTRUCTION}
${TRANSITION_INSTRUCTION}`;

  // Mesma resiliência de generateDirectorScore (3 tentativas) — achado em teste
  // manual real: revisão tem prompt maior (ecoa o plano inteiro + crítica) e
  // falhava mais fácil em "No object generated", 2 tentativas não bastavam.
  const maxRetries = 3;
  let lastError: Error | null = null;
  const totalUsage: LLMUsage = { inputTokens: 0, outputTokens: 0 };

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    if (attempt > 0) await sleep(parseSuggestedRetryDelayMs(lastError?.message ?? "") ?? attempt * 4000);
    try {
      const result = await llm.generate({
        systemPrompt,
        userMessage:
          attempt > 0
            ? `${userMessage}\n\nPREVIOUS ATTEMPT FAILED: ${retryFeedback(lastError)}. Fix the issue.`
            : userMessage,
        schema: DirectorScoreRaw,
      });

      totalUsage.inputTokens += result.usage.inputTokens;
      totalUsage.outputTokens += result.usage.outputTokens;

      const { scenes } = toScenes(result.data.scenes);
      const validated = DirectorScore.parse({ ...result.data, scenes });

      // Prevent archetype drift: the LLM may change the archetype during revision
      // despite prompt instructions. Force it back to the original.
      if (validated.archetype !== originalScore.archetype) {
        (validated as { archetype: string }).archetype = originalScore.archetype;
      }

      assertVideoMode(validated.scenes, videoMode);
      assertSceneCountCap(validated.scenes, options?.targetDurationSeconds);
      return { data: validated, usage: totalUsage };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(`[creative-director] Revision attempt ${attempt + 1} failed: ${lastError.message}`);
    }
  }

  throw new Error(`Revision failed after ${maxRetries} attempts: ${lastError?.message}`);
}
