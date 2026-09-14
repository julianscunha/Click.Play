import { withFallback } from "../http/with-fallback.js";
import type { TTSProvider, TTSResult, TTSSegment } from "./types.js";

/** Mesma ideia de llm/fallback.ts — se o primário (já com seu próprio retry
 * interno) falhar de vez, tenta o secundário antes de propagar o erro. */
export class FallbackTTS implements TTSProvider {
  constructor(
    private primary: TTSProvider,
    private fallback: TTSProvider,
  ) {}

  generate(input: string | TTSSegment[]): Promise<TTSResult> {
    return withFallback(
      "tts-fallback",
      () => this.primary.generate(input),
      () => this.fallback.generate(input),
    );
  }
}
