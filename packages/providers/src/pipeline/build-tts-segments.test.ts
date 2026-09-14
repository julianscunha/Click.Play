import type { Scene } from "@clickplay/domain";
import { describe, expect, it } from "vitest";
import { getArchetype } from "../config/archetype-registry.js";
import { buildTtsSegments } from "./orchestrator.js";

function scene(scriptLine: string, overrides: Partial<Scene> = {}): Scene {
  return {
    id: "1",
    visualStrategy: "motion_graphics",
    elements: [{ type: "stock_image", prompt: "x", motion: "zoom_in" }],
    scriptLine,
    transition: null,
    ...overrides,
  } as Scene;
}

describe("buildTtsSegments", () => {
  it("adds a bigger pause before the last scene and no pause after it", () => {
    const scenes = [scene("hook"), scene("body"), scene("cta")];
    const segments = buildTtsSegments(scenes, getArchetype("cinematic_documentary"));

    expect(segments[0]!.pauseAfterMs).toBe(250);
    expect(segments[1]!.pauseAfterMs).toBe(700);
    expect(segments[2]!.pauseAfterMs).toBe(0);
  });

  it("passes emphasisWords through unchanged", () => {
    const scenes = [scene("this is critical", { emphasisWords: ["critical"] })];
    const segments = buildTtsSegments(scenes, getArchetype("cinematic_documentary"));
    expect(segments[0]!.emphasisWords).toEqual(["critical"]);
  });

  it("normalizes numbers/currency in the TTS text without touching scriptLine", () => {
    const scenes = [scene("Custou R$ 50.")];
    const segments = buildTtsSegments(scenes, getArchetype("cinematic_documentary"), "pt-BR");
    expect(segments[0]!.text).toContain("cinquenta reais");
    expect(scenes[0]!.scriptLine).toBe("Custou R$ 50.");
  });
});
