import { z } from "zod";

/** 7 estilos do motor de captions do OpenReels, reaproveitado (docs/IMPLEMENTATION-PLAN.md §0.1). */
export const CaptionStyleKey = z.enum([
  "bold_outline",
  "clean",
  "gradient_rise",
  "karaoke_sweep",
  "color_highlight",
  "block_impact",
  "box_highlight",
]);
export type CaptionStyleKey = z.infer<typeof CaptionStyleKey>;

/** Campos herdados do MoneyPrinterTurbo (referência de UX), sobrepostos ao preset do arquétipo. */
export const Caption = z.object({
  style: CaptionStyleKey,
  font: z.string().optional(),
  color: z.string().optional(),
  fontSize: z.number().positive().optional(),
  outlineColor: z.string().optional(),
  backgroundColor: z.string().optional(),
});
export type Caption = z.infer<typeof Caption>;
