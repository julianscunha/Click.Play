import type { VideoGenerationProvider, VideoResult } from "./types.js";

/** Mesma ideia de llm/fallback.ts, tts/fallback.ts, image/fallback.ts e music/fallback.ts —
 * aqui usado pra encadear um 2º modelo OpenRouter antes do fallback cross-provider
 * (Gemini/Fal) já resolvido por visual/resolve-element.ts via o mapa videoProviders. */
export class FallbackVideo implements VideoGenerationProvider {
  readonly supportedDurations: number[];

  constructor(
    private primary: VideoGenerationProvider,
    private fallback: VideoGenerationProvider,
  ) {
    this.supportedDurations = primary.supportedDurations;
  }

  async generate(opts: {
    sourceImage: Buffer;
    prompt: string;
    durationSeconds?: number;
    aspectRatio?: string;
    negativePrompt?: string;
  }): Promise<VideoResult> {
    try {
      return await this.primary.generate(opts);
    } catch (primaryErr) {
      const primaryMsg = primaryErr instanceof Error ? primaryErr.message : String(primaryErr);
      console.warn(`[video-fallback] primary failed (${primaryMsg}), trying fallback provider`);
      try {
        return await this.fallback.generate(opts);
      } catch (fallbackErr) {
        const fallbackMsg = fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr);
        throw new Error(`${primaryMsg} → ${fallbackMsg}`);
      }
    }
  }
}
