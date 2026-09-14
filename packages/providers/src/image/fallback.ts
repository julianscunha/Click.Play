import { withFallback } from "../http/with-fallback.js";
import type { ImageProvider } from "./types.js";

/** Mesma ideia de llm/fallback.ts e tts/fallback.ts. */
export class FallbackImage implements ImageProvider {
  constructor(
    private primary: ImageProvider,
    private fallback: ImageProvider,
  ) {}

  generate(prompt: string, style?: string): Promise<Buffer> {
    return withFallback(
      "image-fallback",
      () => this.primary.generate(prompt, style),
      () => this.fallback.generate(prompt, style),
    );
  }
}
