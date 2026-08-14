export type VideoGenerationProviderKey = "gemini" | "fal";

export interface VideoResult {
  filePath: string;
  durationSeconds: number;
}

/**
 * Contrato de geração de vídeo por IA (docs/IMPLEMENTATION-PLAN.md §0.2).
 * Renomeação formalizada do `VideoProvider` já existente no OpenReels
 * (`gemini.ts`=Veo, `fal.ts`=Kling) — não é componente novo do zero, o shape
 * é mantido quase 1:1.
 */
export interface VideoGenerationProvider {
  readonly supportedDurations: number[];
  generate(opts: {
    sourceImage: Buffer;
    prompt: string;
    durationSeconds?: number;
    aspectRatio?: string;
    negativePrompt?: string;
  }): Promise<VideoResult>;
}
