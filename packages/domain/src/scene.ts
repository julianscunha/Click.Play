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

export const VideoGenerationProviderKey = z.enum(["gemini", "fal", "auto"]);
export type VideoGenerationProviderKey = z.infer<typeof VideoGenerationProviderKey>;

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
    durationSeconds: z.number().positive(),
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
