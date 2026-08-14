import type { CaptionStyleKey } from "@clickplay/domain";
import type React from "react";
import type { CaptionStyleProps, SpringConfig } from "../CaptionWrapper";
import { BlockImpact } from "./BlockImpact";
import { BoldOutline } from "./BoldOutline";
import { BoxHighlight } from "./BoxHighlight";
import { Clean } from "./Clean";
import { ColorHighlight } from "./ColorHighlight";
import { GradientRise } from "./GradientRise";
import { KaraokeSweep } from "./KaraokeSweep";

export { BlockImpact, BoldOutline, BoxHighlight, Clean, ColorHighlight, GradientRise, KaraokeSweep };

/** Mapeia cada CaptionStyleKey do domínio ao componente de estilo correspondente. */
export const CAPTION_STYLE_COMPONENTS: Record<CaptionStyleKey, React.FC<CaptionStyleProps>> = {
  bold_outline: BoldOutline,
  clean: Clean,
  gradient_rise: GradientRise,
  karaoke_sweep: KaraokeSweep,
  color_highlight: ColorHighlight,
  block_impact: BlockImpact,
  box_highlight: BoxHighlight,
};

/** Física de spring por estilo (usada pelo CaptionWrapper). KaraokeSweep usa interpolate linear, não spring — valor mantido só por uniformidade do registry. */
export const CAPTION_STYLE_SPRING_CONFIGS: Record<CaptionStyleKey, SpringConfig> = {
  bold_outline: { damping: 15, stiffness: 250, mass: 0.5 },
  clean: { damping: 12, stiffness: 200, mass: 0.5 },
  gradient_rise: { damping: 8, stiffness: 150, mass: 0.5 },
  karaoke_sweep: { damping: 14, stiffness: 220, mass: 0.5 },
  color_highlight: { damping: 12, stiffness: 200, mass: 0.5 },
  block_impact: { damping: 18, stiffness: 300, mass: 0.5 },
  box_highlight: { damping: 10, stiffness: 180, mass: 0.5 },
};
