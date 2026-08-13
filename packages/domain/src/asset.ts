import { z } from "zod";

/**
 * Asset = recurso bruto (matéria-prima). NÃO é uma cena, NÃO é o vídeo final
 * — ver docs/IMPLEMENTATION-PLAN.md §0.2 (terminologia).
 */
export const AssetType = z.enum(["image", "video", "svg", "icon", "font", "audio"]);
export type AssetType = z.infer<typeof AssetType>;

export const Asset = z.object({
  id: z.string().min(1),
  type: AssetType,
  filePath: z.string().min(1),
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
  durationSeconds: z.number().positive().optional(),
  sourceProvider: z.string().optional(),
});
export type Asset = z.infer<typeof Asset>;
