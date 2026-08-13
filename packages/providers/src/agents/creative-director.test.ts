import { describe, expect, it, vi } from "vitest";
import type { LLMProvider } from "../llm/types.js";
import { generateDirectorScore } from "./creative-director.js";
import type { ResearchResult } from "./research.js";

const research: ResearchResult = {
  summary: "Apollo 11 moon landing",
  key_facts: ["Launched July 16, 1969"],
  mood: "awe",
};

function sceneRaw(overrides: Record<string, unknown> = {}) {
  return {
    visualStrategy: "motion_graphics",
    elements: [{ type: "animated_text", text: "1969" }],
    scriptLine: "In 1969, humanity reached the Moon.",
    transition: null,
    ...overrides,
  };
}

function fakeLLM(scenes: unknown[]): LLMProvider {
  return {
    id: "openrouter",
    generate: vi.fn().mockResolvedValue({
      data: {
        emotional_arc: "curiosity-to-wonder",
        archetype: "cinematic_documentary",
        music_mood: "epic_cinematic",
        scenes,
      },
      usage: { inputTokens: 100, outputTokens: 50 },
    }),
  };
}

describe("generateDirectorScore", () => {
  it("assigns sequential ids to scenes and validates against DirectorScore", async () => {
    const llm = fakeLLM([sceneRaw(), sceneRaw(), sceneRaw()]);
    const result = await generateDirectorScore(llm, "Apollo 11", research);

    expect(result.data.scenes.map((s) => s.id)).toEqual(["1", "2", "3"]);
    expect(result.data.archetype).toBe("cinematic_documentary");
  });

  it("retries and eventually throws when scenes keep violating the anti-slideshow rule", async () => {
    const staticScene = sceneRaw({ elements: [{ type: "stock_image", prompt: "moon" }] });
    // 3 cenas consecutivas só com imagem estática viola violatesSlideshowRule (domain).
    const llm = fakeLLM([staticScene, staticScene, staticScene]);

    await expect(generateDirectorScore(llm, "Apollo 11", research)).rejects.toThrow(
      "Creative Director failed after 3 attempts",
    );
    expect(llm.generate).toHaveBeenCalledTimes(3);
  });
});
