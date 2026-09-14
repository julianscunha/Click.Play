import { describe, expect, it, vi } from "vitest";
import { FallbackVideo } from "./fallback.js";
import type { VideoGenerationProvider } from "./types.js";

function provider(result: string | Error): VideoGenerationProvider {
  const generate = vi.fn();
  if (result instanceof Error) generate.mockRejectedValue(result);
  else generate.mockResolvedValue({ filePath: result, durationSeconds: 6 });
  return { supportedDurations: [4, 6, 8], generate };
}

const OPTS = { sourceImage: Buffer.from(""), prompt: "a cat running" };

describe("FallbackVideo", () => {
  it("uses the primary result when it succeeds, never calling the fallback", async () => {
    const primary = provider("/primary.mp4");
    const fallback = provider("/fallback.mp4");
    const video = new FallbackVideo(primary, fallback);

    const result = await video.generate(OPTS);

    expect(result.filePath).toBe("/primary.mp4");
    expect(fallback.generate).not.toHaveBeenCalled();
  });

  it("falls back to the secondary provider when the primary throws", async () => {
    const primary = provider(new Error("429 rate limited"));
    const fallback = provider("/fallback.mp4");
    const video = new FallbackVideo(primary, fallback);

    const result = await video.generate(OPTS);

    expect(result.filePath).toBe("/fallback.mp4");
  });

  it("chains both errors when both fail, not just the fallback's", async () => {
    const primary = provider(new Error("429 rate limited"));
    const fallback = provider(new Error("fallback also down"));
    const video = new FallbackVideo(primary, fallback);

    await expect(video.generate(OPTS)).rejects.toThrow("429 rate limited → fallback also down");
  });
});
