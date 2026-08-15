import { describe, expect, it, vi } from "vitest";
import type { LLMProvider } from "../llm/types.js";
import { research } from "./research.js";

function fakeLLM(...responses: (unknown | Error)[]): LLMProvider {
  const generate = vi.fn();
  for (const r of responses) {
    if (r instanceof Error) generate.mockRejectedValueOnce(r);
    else generate.mockResolvedValueOnce({ data: r, usage: { inputTokens: 10, outputTokens: 5 } });
  }
  return { id: "openrouter", generate };
}

const RESULT = { summary: "sum", key_facts: ["fact"], mood: "curious" };

describe("research", () => {
  it("returns the result on the first successful attempt", async () => {
    const llm = fakeLLM(RESULT);
    const result = await research(llm, "Apollo 11");
    expect(result.data).toEqual(RESULT);
    expect(llm.generate).toHaveBeenCalledTimes(1);
  });

  it("retries after a transient failure (e.g. 'No output generated')", async () => {
    const llm = fakeLLM(new Error("No output generated."), RESULT);
    const result = await research(llm, "Apollo 11");
    expect(result.data).toEqual(RESULT);
    expect(llm.generate).toHaveBeenCalledTimes(2);
  });

  it("gives up after 3 attempts", async () => {
    const err = new Error("No output generated.");
    const llm = fakeLLM(err, err, err);
    await expect(research(llm, "Apollo 11")).rejects.toThrow("Research failed after 3 attempts");
    expect(llm.generate).toHaveBeenCalledTimes(3);
  });
});
