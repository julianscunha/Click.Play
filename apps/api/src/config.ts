import { getArchetype, listArchetypes, LLM_PRICING_PER_MODEL, PACING_CONFIG } from "@clickplay/providers";

/** Fixo — mesmo `ScenePacing` de packages/providers/src/config/archetype.ts. */
export const PACING_TIERS = ["fast", "moderate", "cinematic"] as const;

export interface ArchetypePreview {
  mood: string;
  artStyle: string;
  scenePacing: string;
  colorPalette: { background: string; accent: string; text: string };
}

/** Preview pra tela de roteiro (§ arquétipo/ritmo) — o usuário só via o nome
 * do arquétipo sem saber o que muda na prática. Reaproveita o mesmo
 * ArchetypeConfig já usado pra gerar o roteiro (não duplica dado). */
export function getArchetypePreviews(): Record<string, ArchetypePreview> {
  const result: Record<string, ArchetypePreview> = {};
  for (const name of listArchetypes()) {
    const config = getArchetype(name);
    result[name] = {
      mood: config.mood,
      artStyle: config.artStyle,
      scenePacing: config.scenePacing,
      colorPalette: config.colorPalette,
    };
  }
  return result;
}

/** Mesma tabela usada pra instruir o LLM (creative-director.ts) — o usuário vê
 * o mesmo número de cenas/palavras que o roteiro vai de fato usar. */
export function getPacingPreviews(): Record<string, { scenes: string; wordsPerScene: string }> {
  const result: Record<string, { scenes: string; wordsPerScene: string }> = {};
  for (const [tier, cfg] of Object.entries(PACING_CONFIG)) {
    result[tier] = { scenes: `${cfg.min}-${cfg.max}`, wordsPerScene: cfg.wordsPerScene };
  }
  return result;
}

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
    archetypePreviews: getArchetypePreviews(),
    pacingPreviews: getPacingPreviews(),
  };
}
