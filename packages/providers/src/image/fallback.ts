import type { ImageProvider } from "./types.js";

/** Mesma ideia de llm/fallback.ts e tts/fallback.ts. */
export class FallbackImage implements ImageProvider {
  constructor(
    private primary: ImageProvider,
    private fallback: ImageProvider,
  ) {}

  async generate(prompt: string, style?: string): Promise<Buffer> {
    try {
      return await this.primary.generate(prompt, style);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[image-fallback] primary failed (${msg}), trying fallback provider`);
      return await this.fallback.generate(prompt, style);
    }
  }
}
