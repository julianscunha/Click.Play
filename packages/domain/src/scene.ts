import { z } from "zod";

/**
 * Modelo de composição visual (docs/IMPLEMENTATION-PLAN.md §0.2).
 * Uma Scene NÃO é "1 imagem/vídeo com Ken Burns" — é uma composição de
 * 1+ VisualElement (motion graphics e/ou clipe gerado por IA), narração,
 * música e legenda combinados na timeline.
 */

export const TransitionType = z.enum(["none", "crossfade", "slide_left", "slide_right", "wipe", "flip"]);
export type TransitionType = z.infer<typeof TransitionType>;

export const CameraMotion = z.enum(["zoom_in", "zoom_out", "pan_right", "pan_left", "static"]);
export type CameraMotion = z.infer<typeof CameraMotion>;

export const VisualStrategy = z.enum(["motion_graphics", "ai_video", "hybrid"]);
export type VisualStrategy = z.infer<typeof VisualStrategy>;

/**
 * Modo de vídeo do projeto inteiro (docs/IMPLEMENTATION-PLAN.md §11A Bloco 1)
 * — substitui o antigo booleano `videoEnabled`, que era só sugestão textual
 * pro LLM sem piso imposto (resultado real: 0 cenas em vídeo mesmo com
 * "permitir vídeo" marcado). `motion_graphics_only` = sem vídeo por IA,
 * `ai_video_only` = toda cena precisa de `ai_video_clip`, `hybrid` = piso
 * mínimo de cenas em vídeo, resto livre.
 */
export const VideoMode = z.enum(["motion_graphics_only", "ai_video_only", "hybrid"]);
export type VideoMode = z.infer<typeof VideoMode>;

export const VideoGenerationProviderKey = z.enum(["gemini", "fal", "openrouter", "auto"]);
export type VideoGenerationProviderKey = z.infer<typeof VideoGenerationProviderKey>;

/** Dial de qualidade por job (docs/IMPLEMENTATION-PLAN.md §11A Bloco 2 item 3) — seleciona modelo mais barato/caro dentro do catálogo já suportado por provider, não é modelo novo. Default "standard". */
export const QualityTier = z.enum(["draft", "standard", "high"]);
export type QualityTier = z.infer<typeof QualityTier>;

/** "upload" só registrado no schema — resolução fica pra Fase 15 (precisa endpoint de upload de arquivo, ainda não existe). */
export const IntroOutroMode = z.enum(["generated", "upload"]);
export type IntroOutroMode = z.infer<typeof IntroOutroMode>;

/** Abertura/encerramento (docs/IMPLEMENTATION-PLAN.md §11A Bloco 5). Modo "generated" vira uma Scene sintética (animated_text + transition) prependada/appendada ao roteiro — text explícito do usuário tem prioridade, senão o pipeline gera via LLM a partir do research. */
export const IntroOutroConfig = z.object({
  mode: IntroOutroMode,
  text: z.string().optional(),
  transition: TransitionType.optional(),
});
export type IntroOutroConfig = z.infer<typeof IntroOutroConfig>;

/** Elemento composto dentro de uma Scene. Múltiplos podem coexistir (visualStrategy: "hybrid"). */
export const VisualElement = z.discriminatedUnion("type", [
  z.object({
    type: z.enum(["ai_image", "stock_image", "stock_video"]),
    prompt: z.string().min(1),
    motion: CameraMotion.optional(),
  }),
  z.object({
    type: z.literal("ai_video_clip"),
    provider: VideoGenerationProviderKey,
    prompt: z.string().min(1),
    sourceImagePrompt: z.string().optional(),
  }),
  z.object({
    type: z.literal("animated_text"),
    text: z.string().min(1),
    style: z.string().optional(),
    position: z.enum(["top", "bottom", "center", "random"]).optional(),
  }),
  z.object({
    type: z.enum(["svg", "shape", "icon"]),
    asset: z.string().min(1),
  }),
  z.object({
    type: z.literal("particle_system"),
    preset: z.string().min(1),
  }),
  z.object({
    type: z.enum(["diagram", "map"]),
    spec: z.unknown(),
  }),
]);
export type VisualElement = z.infer<typeof VisualElement>;

export const Scene = z
  .object({
    id: z.string().min(1),
    // Duração real vem do alinhamento de TTS (Fase 5), não é autorada pelo Creative Director.
    durationSeconds: z.number().positive().optional(),
    visualStrategy: VisualStrategy,
    elements: z.array(VisualElement).min(1),
    scriptLine: z.string().min(1),
    transition: TransitionType.nullable(),
  })
  .refine(
    (scene) => scene.visualStrategy !== "ai_video" || scene.elements.some((e) => e.type === "ai_video_clip"),
    { message: 'visualStrategy "ai_video" requer ao menos 1 elemento do tipo "ai_video_clip"' },
  );
export type Scene = z.infer<typeof Scene>;

/**
 * Regra contra slideshow (docs/IMPLEMENTATION-PLAN.md §0.2): não permitir mais de
 * 2 cenas consecutivas usando exclusivamente o mesmo tipo de elemento estático
 * (imagem/vídeo de banco), o que reproduziria o padrão "imagem → imagem → imagem".
 */
export function violatesSlideshowRule(scenes: Scene[]): boolean {
  const staticTypes = new Set(["ai_image", "stock_image", "stock_video"]);
  const isStaticOnly = (scene: Scene) => scene.elements.length === 1 && staticTypes.has(scene.elements[0]!.type);

  let streak = 0;
  for (const scene of scenes) {
    streak = isStaticOnly(scene) ? streak + 1 : 0;
    if (streak > 2) return true;
  }
  return false;
}

/** Quantas cenas com `ai_video_clip` o VideoMode exige no total (docs/IMPLEMENTATION-PLAN.md §11A Bloco 1). */
export function minAiVideoScenes(totalScenes: number, mode: VideoMode): number {
  if (mode === "motion_graphics_only") return 0;
  if (mode === "ai_video_only") return totalScenes;
  return Math.ceil(totalScenes * 0.3); // hybrid: piso de 30% das cenas em vídeo
}

/** Verdadeiro se o roteiro não atinge o piso de cenas em vídeo exigido pelo VideoMode escolhido. */
export function violatesVideoModeRule(scenes: Scene[], mode: VideoMode): boolean {
  const aiVideoScenes = scenes.filter((s) => s.elements.some((e) => e.type === "ai_video_clip")).length;
  return aiVideoScenes < minAiVideoScenes(scenes.length, mode);
}
