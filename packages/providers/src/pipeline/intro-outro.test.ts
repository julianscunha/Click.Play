import { describe, expect, it, vi } from "vitest";
import type { LLMProvider } from "../llm/types.js";
import { resolveIntroOutroScene } from "./intro-outro.js";

const RESEARCH = { summary: "sum", key_facts: ["fact"], mood: "curious" };

function fakeLLM(text: string): LLMProvider {
  return {
    id: "openrouter",
    generate: vi.fn().mockResolvedValue({ data: { text }, usage: { inputTokens: 1, outputTokens: 1 } }),
  };
}

describe("resolveIntroOutroScene", () => {
  it("returns null when config is undefined", async () => {
    const scene = await resolveIntroOutroScene(undefined, "intro", fakeLLM("x"), "topic", RESEARCH);
    expect(scene).toBeNull();
  });

  it("returns null when mode is upload (not resolved yet)", async () => {
    const scene = await resolveIntroOutroScene({ mode: "upload" }, "intro", fakeLLM("x"), "topic", RESEARCH);
    expect(scene).toBeNull();
  });

  it("uses the user-provided text without calling the LLM", async () => {
    const llm = fakeLLM("should not be used");
    const scene = await resolveIntroOutroScene(
      { mode: "generated", text: "Welcome!" },
      "intro",
      llm,
      "topic",
      RESEARCH,
    );
    expect(scene?.scriptLine).toBe("Welcome!");
    expect(scene?.elements[0]).toMatchObject({ type: "animated_text", text: "Welcome!", position: "center" });
    expect(llm.generate).not.toHaveBeenCalled();
  });

  it("generates the text via LLM when none is provided", async () => {
    const llm = fakeLLM("Generated hook");
    const scene = await resolveIntroOutroScene({ mode: "generated" }, "intro", llm, "topic", RESEARCH);
    expect(scene?.scriptLine).toBe("Generated hook");
    expect(llm.generate).toHaveBeenCalledTimes(1);
  });

  it("defaults transition to crossfade and honors an explicit override", async () => {
    const defaultScene = await resolveIntroOutroScene(
      { mode: "generated", text: "Bye" },
      "outro",
      fakeLLM("x"),
      "topic",
      RESEARCH,
    );
    expect(defaultScene?.transition).toBe("crossfade");

    const overridden = await resolveIntroOutroScene(
      { mode: "generated", text: "Bye", transition: "wipe" },
      "outro",
      fakeLLM("x"),
      "topic",
      RESEARCH,
    );
    expect(overridden?.transition).toBe("wipe");
    expect(overridden?.id).toBe("outro");
  });
});
