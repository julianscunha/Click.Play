import { describe, expect, it } from "vitest";
import { Scene, minAiVideoScenes, violatesSlideshowRule, violatesVideoModeRule } from "./scene.js";

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

function videoScene(id: string): Scene {
  return Scene.parse({
    id,
    durationSeconds: 5,
    visualStrategy: "ai_video",
    elements: [{ type: "ai_video_clip", provider: "gemini", prompt: "a mountain" }],
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

describe("minAiVideoScenes", () => {
  it("motion_graphics_only never requires video scenes", () => {
    expect(minAiVideoScenes(10, "motion_graphics_only")).toBe(0);
  });

  it("ai_video_only requires every scene to be video", () => {
    expect(minAiVideoScenes(10, "ai_video_only")).toBe(10);
  });

  it("hybrid requires a 30% floor, rounded up", () => {
    expect(minAiVideoScenes(10, "hybrid")).toBe(3);
    expect(minAiVideoScenes(4, "hybrid")).toBe(2);
  });
});

describe("violatesVideoModeRule", () => {
  it("motion_graphics_only never violates, even with zero video scenes", () => {
    expect(violatesVideoModeRule([staticScene("1"), staticScene("2")], "motion_graphics_only")).toBe(false);
  });

  it("hybrid violates when below the 30% floor", () => {
    // 1/4 = 25% de cenas em vídeo, floor exigido = ceil(4*0.3) = 2.
    const scenes = [videoScene("1"), staticScene("2"), staticScene("3"), staticScene("4")];
    expect(violatesVideoModeRule(scenes, "hybrid")).toBe(true);
  });

  it("hybrid passes once the floor is met", () => {
    const scenes = [videoScene("1"), videoScene("2"), staticScene("3"), staticScene("4")];
    expect(violatesVideoModeRule(scenes, "hybrid")).toBe(false);
  });

  it("ai_video_only violates if any scene lacks an ai_video_clip element", () => {
    const scenes = [videoScene("1"), staticScene("2")];
    expect(violatesVideoModeRule(scenes, "ai_video_only")).toBe(true);
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
