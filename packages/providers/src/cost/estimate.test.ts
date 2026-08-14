import type { Scene } from "@clickplay/domain";
import { describe, expect, it } from "vitest";
import { compareCost, computeActualCost, estimateCost } from "./estimate";

const scene = (overrides: Partial<Scene> = {}): Scene => ({
  id: "s1",
  visualStrategy: "motion_graphics",
  elements: [{ type: "ai_image", prompt: "a cat" }],
  scriptLine: "Hello world",
  transition: null,
  ...overrides,
});

const KNOWN_OPTS = {
  llmModel: "anthropic/claude-sonnet-4.6",
  ttsProvider: "edge",
  imageProvider: "gemini",
  musicProvider: "bundled",
};

describe("estimateCost", () => {
  it("returns known amounts when all providers/models are priced", () => {
    const result = estimateCost([scene()], KNOWN_OPTS);
    expect(result.llm.status).toBe("known");
    expect(result.tts.status).toBe("known");
    expect(result.image.status).toBe("known");
    expect(result.video).toEqual({ status: "known", usd: 0 });
    expect(result.music).toEqual({ status: "known", usd: 0 }); // bundled é grátis
    expect(result.total.status).toBe("known");
  });

  it("marks llm as unknown for a model without listed pricing", () => {
    const result = estimateCost([scene()], { ...KNOWN_OPTS, llmModel: "mystery/model-x" });
    expect(result.llm.status).toBe("unknown");
    expect(result.total.status).toBe("unknown");
  });

  it("marks tts as unknown for an unlisted provider, without assuming zero cost", () => {
    const result = estimateCost([scene()], { ...KNOWN_OPTS, ttsProvider: "some-new-tts" });
    expect(result.tts.status).toBe("unknown");
    expect(result.total.status).toBe("unknown");
  });

  it("requires videoProvider when a scene has an ai_video_clip element", () => {
    const s = scene({ elements: [{ type: "ai_video_clip", provider: "auto", prompt: "rocket launch" }] });
    const result = estimateCost([s], KNOWN_OPTS);
    expect(result.video.status).toBe("unknown");
  });

  it("prices video cost when videoProvider is known", () => {
    const s = scene({ elements: [{ type: "ai_video_clip", provider: "gemini", prompt: "rocket launch" }] });
    const result = estimateCost([s], { ...KNOWN_OPTS, videoProvider: "gemini" });
    expect(result.video).toEqual({ status: "known", usd: 6 * 0.05 });
    expect(result.details.aiVideos).toBe(1);
  });

  it("counts a source image for ai_video_clip elements that request one", () => {
    const s = scene({
      elements: [
        { type: "ai_video_clip", provider: "gemini", prompt: "rocket launch", sourceImagePrompt: "a rocket" },
      ],
    });
    const result = estimateCost([s], { ...KNOWN_OPTS, videoProvider: "gemini" });
    expect(result.details.aiImages).toBe(1);
  });

  it("sums ttsCharacters across scenes from scriptLine", () => {
    const result = estimateCost(
      [scene({ scriptLine: "abc" }), scene({ id: "s2", scriptLine: "defgh" })],
      KNOWN_OPTS,
    );
    expect(result.details.ttsCharacters).toBe(8);
  });

  it("prices music as unknown for an unlisted music provider", () => {
    const result = estimateCost([scene()], { ...KNOWN_OPTS, musicProvider: "new-music-service" });
    expect(result.music.status).toBe("unknown");
  });
});

describe("computeActualCost", () => {
  it("computes known llm cost from real token usage", () => {
    const result = computeActualCost({
      llmUsages: [{ inputTokens: 1000, outputTokens: 500 }],
      llmModel: "anthropic/claude-sonnet-4.6",
      ttsCharacters: 100,
      ttsProvider: "edge",
      aiImages: 1,
      imageProvider: "gemini",
      aiVideos: 0,
      videoSeconds: 0,
      musicGenerated: false,
      musicProvider: "bundled",
    });
    expect(result.llm.status).toBe("known");
    expect(result.total.status).toBe("known");
  });

  it("skips music cost when musicGenerated is false, even for a paid provider", () => {
    const result = computeActualCost({
      llmUsages: [],
      llmModel: "anthropic/claude-sonnet-4.6",
      ttsCharacters: 0,
      ttsProvider: "edge",
      aiImages: 0,
      imageProvider: "gemini",
      aiVideos: 0,
      videoSeconds: 0,
      musicGenerated: false,
      musicProvider: "lyria",
    });
    expect(result.music).toEqual({ status: "known", usd: 0 });
  });
});

describe("compareCost", () => {
  it("returns the usd delta when both sides are known", () => {
    const estimated = estimateCost([scene()], KNOWN_OPTS);
    const actual = computeActualCost({
      llmUsages: [{ inputTokens: 100, outputTokens: 50 }],
      llmModel: "anthropic/claude-sonnet-4.6",
      ttsCharacters: 11,
      ttsProvider: "edge",
      aiImages: 1,
      imageProvider: "gemini",
      aiVideos: 0,
      videoSeconds: 0,
      musicGenerated: false,
      musicProvider: "bundled",
    });
    const diff = compareCost(estimated, actual);
    expect(diff.status).toBe("known");
  });

  it("propagates unknown from either side", () => {
    const estimated = estimateCost([scene()], { ...KNOWN_OPTS, llmModel: "mystery/model-x" });
    const actual = computeActualCost({
      llmUsages: [],
      llmModel: "anthropic/claude-sonnet-4.6",
      ttsCharacters: 0,
      ttsProvider: "edge",
      aiImages: 0,
      imageProvider: "gemini",
      aiVideos: 0,
      videoSeconds: 0,
      musicGenerated: false,
      musicProvider: "bundled",
    });
    expect(compareCost(estimated, actual).status).toBe("unknown");
  });
});
