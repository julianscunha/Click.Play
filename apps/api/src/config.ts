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

export function getFormConfig() {
  return {
    archetypes: listArchetypes(),
    pacingTiers: PACING_TIERS,
    captionStyles: CAPTION_STYLES,
    recommendedModels: getRecommendedModels(),
  };
}
