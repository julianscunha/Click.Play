import { describe, expect, it } from "vitest";
import { Scene, violatesSlideshowRule } from "./scene.js";

function staticScene(id: string): Scene {
  return Scene.parse({
    id,
    durationSeconds: 5,
    visualStrategy: "motion_graphics",
    elements: [{ type: "stock_image", prompt: "a mountain" }],
    scriptLine: "line",
    transition: null,
  });
}

describe("violatesSlideshowRule", () => {
  it("allows up to 2 consecutive static-only scenes", () => {
    expect(violatesSlideshowRule([staticScene("1"), staticScene("2")])).toBe(false);
  });

  it("flags 3+ consecutive static-only scenes as slideshow", () => {
    expect(violatesSlideshowRule([staticScene("1"), staticScene("2"), staticScene("3")])).toBe(true);
  });

  it("does not flag scenes with composed (multi-element) visuals", () => {
    const composed = Scene.parse({
      id: "1",
      durationSeconds: 8,
      visualStrategy: "hybrid",
      elements: [
        { type: "ai_video_clip", provider: "gemini", prompt: "rocket launch" },
        { type: "animated_text", text: "1969" },
      ],
      scriptLine: "line",
      transition: null,
    });
    expect(violatesSlideshowRule([composed, composed, composed])).toBe(false);
  });
});

describe("Scene refinement", () => {
  it("rejects visualStrategy ai_video without an ai_video_clip element", () => {
    expect(() =>
      Scene.parse({
        id: "1",
        durationSeconds: 5,
        visualStrategy: "ai_video",
        elements: [{ type: "stock_image", prompt: "x" }],
        scriptLine: "line",
        transition: null,
      }),
    ).toThrow();
  });
});
