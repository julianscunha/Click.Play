import { withFallback } from "../http/with-fallback.js";
import type { MusicMood, MusicProvider, MusicResult } from "./types.js";

/** Mesma ideia de llm/fallback.ts, tts/fallback.ts e image/fallback.ts. */
export class FallbackMusic implements MusicProvider {
  constructor(
    private primary: MusicProvider,
    private fallback: MusicProvider,
  ) {}

  generate(prompt: string, mood: MusicMood): Promise<MusicResult> {
    return withFallback(
      "music-fallback",
      () => this.primary.generate(prompt, mood),
      () => this.fallback.generate(prompt, mood),
    );
  }
}
