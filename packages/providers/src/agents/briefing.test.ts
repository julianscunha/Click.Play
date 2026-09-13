import { describe, expect, it, vi } from "vitest";
import { expandBriefing } from "./briefing.js";
import type { LLMProvider } from "../llm/types.js";

function fakeLLM(direction: string): LLMProvider {
  return {
    id: "openrouter",
    generate: vi.fn().mockResolvedValue({ data: { direction }, usage: { inputTokens: 1, outputTokens: 1 } }),
  };
}

describe("expandBriefing", () => {
  it("returns the direction produced by the LLM", async () => {
    const llm = fakeLLM("Tom leve, público jovem, não pode faltar humor.");
    const direction = await expandBriefing(llm, "A história da chegada à Lua", "compact");
    expect(direction).toBe("Tom leve, público jovem, não pode faltar humor.");
  });

  it("includes the length instruction in the user message", async () => {
    const llm = fakeLLM("x");
    await expandBriefing(llm, "tema", "verbose");
    const call = (llm.generate as ReturnType<typeof vi.fn>).mock.calls[0]![0];
    expect(call.userMessage).toMatch(/5-7 sentences/);
  });

  it("includes the language instruction in the system prompt when given", async () => {
    const llm = fakeLLM("x");
    await expandBriefing(llm, "tema", "compact", "pt-BR");
    const call = (llm.generate as ReturnType<typeof vi.fn>).mock.calls[0]![0];
    expect(call.systemPrompt).toMatch(/Write in pt-BR/);
  });
});
