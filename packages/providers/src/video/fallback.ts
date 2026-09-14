import { withFallback } from "../http/with-fallback.js";
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

  generate(opts: {
    sourceImage: Buffer;
    prompt: string;
    durationSeconds?: number;
    aspectRatio?: string;
    negativePrompt?: string;
  }): Promise<VideoResult> {
    return withFallback(
      "video-fallback",
      () => this.primary.generate(opts),
      () => this.fallback.generate(opts),
    );
  }
}
