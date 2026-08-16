import type { VideoGenerationProviderKey } from "./types.js";

/**
 * Resolve `"auto"` (usado pelo Creative Director em `VisualElement` do tipo
 * `ai_video_clip`, ver docs/IMPLEMENTATION-PLAN.md §0.2) para um provider
 * concreto. OpenRouter é o default — mesma OPENROUTER_API_KEY já obrigatória
 * pro LLM, sem exigir conta separada (Gemini/Fal direto entram só como
 * fallback em runtime, ver resolve-element.ts).
 */
export function resolveVideoGenerationProvider(requested: VideoGenerationProviderKey | "auto"): VideoGenerationProviderKey {
  return requested === "auto" ? "openrouter" : requested;
}
