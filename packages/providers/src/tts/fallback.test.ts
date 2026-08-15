import { describe, expect, it, vi } from "vitest";
import { FallbackTTS } from "./fallback.js";
import type { TTSProvider } from "./types.js";

function provider(result: { audio: string } | Error): TTSProvider {
  const generate = vi.fn();
  if (result instanceof Error) generate.mockRejectedValue(result);
  else generate.mockResolvedValue({ audio: Buffer.from(result.audio), words: [] });
  return { generate };
}

describe("FallbackTTS", () => {
  it("uses the primary result when it succeeds, never calling the fallback", async () => {
    const primary = provider({ audio: "primary" });
    const fallback = provider({ audio: "fallback" });
    const tts = new FallbackTTS(primary, fallback);

    const result = await tts.generate("text");

    expect(result.audio.toString()).toBe("primary");
    expect(fallback.generate).not.toHaveBeenCalled();
  });

  it("falls back to the secondary provider when the primary throws", async () => {
    const primary = provider(new Error("Premature close"));
    const fallback = provider({ audio: "fallback" });
    const tts = new FallbackTTS(primary, fallback);

    const result = await tts.generate("text");

    expect(result.audio.toString()).toBe("fallback");
  });

  it("propagates the fallback's error when both fail", async () => {
    const primary = provider(new Error("Premature close"));
    const fallback = provider(new Error("fallback also down"));
    const tts = new FallbackTTS(primary, fallback);

    await expect(tts.generate("text")).rejects.toThrow("fallback also down");
  });
});
