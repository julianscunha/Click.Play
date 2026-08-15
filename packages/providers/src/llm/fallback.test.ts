import { z } from "zod";
import { describe, expect, it, vi } from "vitest";
import { FallbackLLM } from "./fallback.js";
import type { LLMProvider } from "./types.js";

const schema = z.object({ x: z.number() });
const opts = { systemPrompt: "sys", userMessage: "msg", schema };

function provider(result: unknown | Error): LLMProvider {
  const generate = vi.fn();
  if (result instanceof Error) generate.mockRejectedValue(result);
  else generate.mockResolvedValue({ data: result, usage: { inputTokens: 1, outputTokens: 1 } });
  return { id: "openrouter", generate };
}

describe("FallbackLLM", () => {
  it("uses the primary result when it succeeds, never calling the fallback", async () => {
    const primary = provider({ x: 1 });
    const fallback = provider({ x: 2 });
    const llm = new FallbackLLM(primary, fallback);

    const result = await llm.generate(opts);

    expect(result.data).toEqual({ x: 1 });
    expect(fallback.generate).not.toHaveBeenCalled();
  });

  it("falls back to the secondary model when the primary throws", async () => {
    const primary = provider(new Error("quota exceeded"));
    const fallback = provider({ x: 2 });
    const llm = new FallbackLLM(primary, fallback);

    const result = await llm.generate(opts);

    expect(result.data).toEqual({ x: 2 });
  });

  it("propagates the fallback's error when both fail", async () => {
    const primary = provider(new Error("quota exceeded"));
    const fallback = provider(new Error("fallback also down"));
    const llm = new FallbackLLM(primary, fallback);

    await expect(llm.generate(opts)).rejects.toThrow("fallback also down");
  });
});
