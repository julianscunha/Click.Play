import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import type { LanguageModel } from "ai";

const generateTextMock = vi.hoisted(() => vi.fn());
vi.mock("ai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("ai")>();
  return { ...actual, generateText: generateTextMock };
});

import { BaseLLM } from "./base.js";

class FakeLLM extends BaseLLM {
  readonly id = "openrouter" as const;
  protected createLanguageModel(): LanguageModel {
    return {} as LanguageModel;
  }
}

describe("BaseLLM.generate", () => {
  it("returns structured data and normalized usage on success", async () => {
    generateTextMock.mockResolvedValueOnce({
      output: { title: "hello" },
      usage: { inputTokens: 10, outputTokens: 5 },
    });

    const result = await new FakeLLM().generate({
      systemPrompt: "sys",
      userMessage: "hi",
      schema: z.object({ title: z.string() }),
    });

    expect(result).toEqual({ data: { title: "hello" }, usage: { inputTokens: 10, outputTokens: 5 } });
  });

  it("throws when the model returns no structured output", async () => {
    generateTextMock.mockResolvedValueOnce({ output: null, usage: {} });

    await expect(
      new FakeLLM().generate({ systemPrompt: "sys", userMessage: "hi", schema: z.object({ title: z.string() }) }),
    ).rejects.toThrow("did not return structured output");
  });
});
