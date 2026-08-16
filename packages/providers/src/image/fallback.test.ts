import { describe, expect, it, vi } from "vitest";
import { FallbackImage } from "./fallback.js";
import type { ImageProvider } from "./types.js";

function provider(result: string | Error): ImageProvider {
  const generate = vi.fn();
  if (result instanceof Error) generate.mockRejectedValue(result);
  else generate.mockResolvedValue(Buffer.from(result));
  return { generate };
}

describe("FallbackImage", () => {
  it("uses the primary result when it succeeds, never calling the fallback", async () => {
    const primary = provider("primary");
    const fallback = provider("fallback");
    const image = new FallbackImage(primary, fallback);

    const result = await image.generate("a cat");

    expect(result.toString()).toBe("primary");
    expect(fallback.generate).not.toHaveBeenCalled();
  });

  it("falls back to the secondary provider when the primary throws", async () => {
    const primary = provider(new Error("quota exceeded"));
    const fallback = provider("fallback");
    const image = new FallbackImage(primary, fallback);

    const result = await image.generate("a cat");

    expect(result.toString()).toBe("fallback");
  });

  it("propagates the fallback's error when both fail", async () => {
    const primary = provider(new Error("quota exceeded"));
    const fallback = provider(new Error("fallback also down"));
    const image = new FallbackImage(primary, fallback);

    await expect(image.generate("a cat")).rejects.toThrow("fallback also down");
  });
});
