import type { CaptionStyleKey } from "@clickplay/domain";
import type React from "react";
import type { CaptionStyleProps } from "../CaptionWrapper";
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
