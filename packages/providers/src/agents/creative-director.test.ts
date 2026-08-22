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
    const result = await generateDirectorScore(llm, "Apollo 11", research, { videoMode: "motion_graphics_only" });

    expect(result.data.scenes.map((s) => s.id)).toEqual(["1", "2", "3"]);
    expect(result.data.archetype).toBe("cinematic_documentary");
  });

  it("instructs the LLM to skip animated_text when showTextOverlays is false", async () => {
    const llm = fakeLLM([sceneRaw(), sceneRaw(), sceneRaw()]);
    await generateDirectorScore(llm, "Apollo 11", research, {
      videoMode: "motion_graphics_only",
      showTextOverlays: false,
    });

    const call = (llm.generate as ReturnType<typeof vi.fn>).mock.calls[0]![0];
    expect(call.userMessage).toMatch(/do NOT use "animated_text"/);
  });

  it("repairs an ai_video scene missing an ai_video_clip element by injecting one, reusing an existing prompt", async () => {
    const brokenAiVideo = sceneRaw({
      visualStrategy: "ai_video",
      elements: [{ type: "stock_image", prompt: "rocket launch" }],
    });
    const llm = fakeLLM([sceneRaw(), sceneRaw(), brokenAiVideo]);

    const result = await generateDirectorScore(llm, "Apollo 11", research, { videoMode: "motion_graphics_only" });

    expect(result.data.scenes[2]!.visualStrategy).toBe("ai_video");
    expect(result.data.scenes[2]!.elements).toContainEqual(
      expect.objectContaining({ type: "ai_video_clip", provider: "auto", prompt: "rocket launch" }),
    );
    expect(llm.generate).toHaveBeenCalledTimes(1);
  });

  it("satisfies VideoMode 'ai_video_only' even when every scene comes back missing its ai_video_clip element", async () => {
    // Caso real observado em produção: LLM marca visualStrategy "ai_video" em
    // todas as cenas mas esquece o elemento "ai_video_clip" nas 8 — antes do
    // reparo isso rebaixava tudo pra "motion_graphics" e "ai_video_only"
    // (piso = 100% das cenas) falhava sempre, nas 3 tentativas.
    const brokenAiVideo = sceneRaw({
      visualStrategy: "ai_video",
      elements: [{ type: "stock_image", prompt: "rocket launch" }],
    });
    const llm = fakeLLM([brokenAiVideo, brokenAiVideo, brokenAiVideo]);

    const result = await generateDirectorScore(llm, "Apollo 11", research, { videoMode: "ai_video_only" });

    expect(result.data.scenes.every((s) => s.elements.some((e) => e.type === "ai_video_clip"))).toBe(true);
    expect(llm.generate).toHaveBeenCalledTimes(1);
  });

  it("retries and eventually throws when scenes keep violating the anti-slideshow rule", async () => {
    const staticScene = sceneRaw({ elements: [{ type: "stock_image", prompt: "moon" }] });
    // 3 cenas consecutivas só com imagem estática viola violatesSlideshowRule (domain).
    const llm = fakeLLM([staticScene, staticScene, staticScene]);

    await expect(generateDirectorScore(llm, "Apollo 11", research)).rejects.toThrow(
      "Creative Director failed after 3 attempts",
    );
    expect(llm.generate).toHaveBeenCalledTimes(3);
  }, 15_000); // backoff entre retries (4s, 8s) — vitest default de 5s não basta
});
