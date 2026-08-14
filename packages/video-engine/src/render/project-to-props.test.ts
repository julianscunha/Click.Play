import { describe, expect, it } from "vitest";
import { getTotalDurationInFrames, mapRenderInputToProps } from "./project-to-props";
import type { RenderInput, ResolvedScene } from "./types";

const scene = (overrides: Partial<ResolvedScene> = {}): ResolvedScene => ({
  id: "s1",
  durationInFrames: 90,
  elements: [{ type: "ai_image", assetPath: "img.png" }],
  transition: "none",
  transitionDurationFrames: 15,
  ...overrides,
});

const baseInput: RenderInput = {
  scenes: [scene()],
  fps: 30,
  width: 1080,
  height: 1920,
  words: [],
  captionStyle: "clean",
  captionAccentColor: "#38A169",
  captionChunkSize: 5,
  captionLingerS: 0.3,
};

describe("mapRenderInputToProps", () => {
  it("maps voiceover/music paths to null when absent", () => {
    const props = mapRenderInputToProps(baseInput);
    expect(props.voiceoverSrc).toBeNull();
    expect(props.musicSrc).toBeNull();
  });

  it("passes through resolved paths when present", () => {
    const props = mapRenderInputToProps({
      ...baseInput,
      voiceoverPath: "voice.mp3",
      musicPath: "music.mp3",
    });
    expect(props.voiceoverSrc).toBe("voice.mp3");
    expect(props.musicSrc).toBe("music.mp3");
  });
});

describe("getTotalDurationInFrames", () => {
  it("sums scene durations with no transitions", () => {
    const props = mapRenderInputToProps({
      ...baseInput,
      scenes: [scene({ durationInFrames: 90 }), scene({ id: "s2", durationInFrames: 60 })],
    });
    expect(getTotalDurationInFrames(props, 30)).toBe(150);
  });

  it("subtracts transition overlap between scenes", () => {
    const props = mapRenderInputToProps({
      ...baseInput,
      scenes: [
        scene({ durationInFrames: 90, transition: "crossfade", transitionDurationFrames: 15 }),
        scene({ id: "s2", durationInFrames: 60 }),
      ],
    });
    expect(getTotalDurationInFrames(props, 30)).toBe(135);
  });

  it("floors at the voiceover end time even if scenes are shorter", () => {
    const props = mapRenderInputToProps({
      ...baseInput,
      scenes: [scene({ durationInFrames: 30 })],
      words: [{ word: "hi", start: 0, end: 5 }],
    });
    // 30 frames = 1s of scenes, but voiceover ends at 5s (150 frames @ 30fps)
    expect(getTotalDurationInFrames(props, 30)).toBe(150);
  });
});
