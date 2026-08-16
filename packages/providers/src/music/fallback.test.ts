import { describe, expect, it, vi } from "vitest";
import { FallbackMusic } from "./fallback.js";
import type { MusicProvider } from "./types.js";

function provider(result: string | Error): MusicProvider {
  const generate = vi.fn();
  if (result instanceof Error) generate.mockRejectedValue(result);
  else generate.mockResolvedValue({ filePath: result });
  return { generate };
}

describe("FallbackMusic", () => {
  it("uses the primary result when it succeeds, never calling the fallback", async () => {
    const primary = provider("/primary.mp3");
    const fallback = provider("/fallback.mp3");
    const music = new FallbackMusic(primary, fallback);

    const result = await music.generate("upbeat synth", "uplifting_pop");

    expect(result.filePath).toBe("/primary.mp3");
    expect(fallback.generate).not.toHaveBeenCalled();
  });

  it("falls back to the secondary provider when the primary throws", async () => {
    const primary = provider(new Error("Lyria prompt blocked"));
    const fallback = provider("/fallback.mp3");
    const music = new FallbackMusic(primary, fallback);

    const result = await music.generate("upbeat synth", "uplifting_pop");

    expect(result.filePath).toBe("/fallback.mp3");
  });

  it("propagates the fallback's error when both fail", async () => {
    const primary = provider(new Error("Lyria prompt blocked"));
    const fallback = provider(new Error("No bundled tracks available"));
    const music = new FallbackMusic(primary, fallback);

    await expect(music.generate("upbeat synth", "uplifting_pop")).rejects.toThrow("No bundled tracks available");
  });
});
