import type { VideoGenerationProviderKey } from "./types.js";

/**
 * Resolve `"auto"` (usado pelo Creative Director em `VisualElement` do tipo
 * `ai_video_clip`, ver docs/IMPLEMENTATION-PLAN.md §0.2) para um provider
 * concreto: usa o que tiver API key configurada, Gemini/Veo primeiro (mesmo
 * provider já usado para imagem, evita depender de mais uma conta).
 */
export function resolveVideoGenerationProvider(
  requested: VideoGenerationProviderKey | "auto",
  available: { hasGoogleKey: boolean; hasFalKey: boolean },
): VideoGenerationProviderKey {
  if (requested !== "auto") return requested;

  if (available.hasGoogleKey) return "gemini";
  if (available.hasFalKey) return "fal";

  throw new Error(
    'No video generation provider available for "auto": set GOOGLE_API_KEY (Veo) or FAL_API_KEY (Kling).',
  );
}
