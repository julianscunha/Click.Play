import { listArchetypes } from "@clickplay/providers";

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

export function getFormConfig() {
  return {
    archetypes: listArchetypes(),
    pacingTiers: PACING_TIERS,
    captionStyles: CAPTION_STYLES,
  };
}
