import { listArchetypes, LLM_PRICING_PER_MODEL } from "@clickplay/providers";

/** Fixo — mesmo `ScenePacing` de packages/providers/src/config/archetype.ts. */
export const PACING_TIERS = ["fast", "moderate", "cinematic"] as const;

/** Fixo — mesmas chaves de CAPTION_STYLE_COMPONENTS em packages/video-engine/src/captions/styles/index.ts. */
export const CAPTION_STYLES = [
  "bold_outline",
  "clean",
  "gradient_rise",
  "karaoke_sweep",
  "color_highlight",
  "block_impact",
  "box_highlight",
] as const;

/** Modelos com preço tabelado (cost/pricing.ts) — mesma fonte usada na estimativa de custo,
 * então "sugerido" aqui sempre significa "custo conhecido" e testado com structured output. */
export function getRecommendedModels(): string[] {
  // "openrouter/free" primeiro — roteador gratuito, default do README/.env.example.
  return ["openrouter/free", ...Object.keys(LLM_PRICING_PER_MODEL)];
}

/** Modelos de imagem via OpenRouter (endpoint /v1/images) já testados manualmente com o pipeline. */
export const RECOMMENDED_IMAGE_MODELS = [
  "google/gemini-3.1-flash-lite-image",
  "google/gemini-3.1-flash-image",
  "google/gemini-2.5-flash-image",
];

/** Modelos de vídeo via OpenRouter (endpoint /v1/videos, image-to-video) já testados manualmente. */
export const RECOMMENDED_VIDEO_MODELS = ["google/veo-3.1-lite", "google/veo-3.1-fast", "google/veo-3.1"];

/** Modelos de TTS via OpenRouter pro fallback do Edge — restrito à família Gemini
 * (mesmo formato PCM 24kHz e mesmo conjunto de vozes tipo "Kore"; outro modelo do
 * catálogo TTS do OpenRouter usa parâmetro "voice" incompatível e quebraria). */
export const RECOMMENDED_TTS_FALLBACK_MODELS = ["google/gemini-3.1-flash-tts-preview", "google/gemini-2.5-flash-preview-tts"];

export function getFormConfig() {
  return {
    archetypes: listArchetypes(),
    pacingTiers: PACING_TIERS,
    captionStyles: CAPTION_STYLES,
    recommendedModels: getRecommendedModels(),
    recommendedImageModels: RECOMMENDED_IMAGE_MODELS,
    recommendedVideoModels: RECOMMENDED_VIDEO_MODELS,
    recommendedTtsFallbackModels: RECOMMENDED_TTS_FALLBACK_MODELS,
  };
}
