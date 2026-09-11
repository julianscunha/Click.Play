import type { VisualElement } from "@clickplay/domain";
import { describe, expect, it, vi } from "vitest";
import type { ImageProvider } from "../image/types";
import type { StockAsset, StockCandidate, StockProvider } from "../stock/types";
import type { VideoGenerationProvider } from "../video/types";
import { inferAspectRatio, pickSupportedDuration, resolveElement } from "./resolve-element";
import type { ResolveElementContext } from "./resolve-element";
import { StockResolutionError } from "./types";

const fakeImageProvider: ImageProvider = {
  generate: vi.fn().mockResolvedValue(Buffer.from("fake-image")),
};

function fakeStockProvider(
  id: "pexels" | "pixabay",
  overrides: Partial<StockProvider> = {},
): StockProvider {
  return {
    id,
    searchImage: vi.fn().mockResolvedValue([]),
    searchVideo: vi.fn().mockResolvedValue([]),
    download: vi.fn(),
    ...overrides,
  };
}

const CANDIDATE: StockCandidate = { url: "https://example.com/a.jpg", width: 1080, height: 1920, id: "cand-1" };
const ASSET: StockAsset = { filePath: "/cache/cand-1.jpg", width: 1080, height: 1920 };

function baseCtx(overrides: Partial<ResolveElementContext> = {}): ResolveElementContext {
  return {
    imageProvider: fakeImageProvider,
    videoProviders: {},
    hasGoogleKey: false,
    hasFalKey: false,
    stockProviders: [],
    writeAsset: vi.fn().mockResolvedValue("/out/asset.png"),
    assetId: "0-0",
    ...overrides,
  };
}

describe("resolveElement — ai_image", () => {
  it("generates via ImageProvider and writes the asset", async () => {
    const element: VisualElement = { type: "ai_image", prompt: "a cat", motion: "zoom_in" };
    const result = await resolveElement(element, baseCtx());
    expect(result).toEqual({ type: "ai_image", assetPath: "/out/asset.png", motion: "zoom_in" });
  });
});

describe("resolveElement — animated_text", () => {
  it("passes through the text with no asset resolution, defaulting position to center", async () => {
    const element: VisualElement = { type: "animated_text", text: "1969" };
    const result = await resolveElement(element, baseCtx());
    expect(result).toEqual({ type: "animated_text", text: "1969", position: "center" });
  });

  it("passes through an explicit position", async () => {
    const element: VisualElement = { type: "animated_text", text: "1969", position: "top" };
    const result = await resolveElement(element, baseCtx());
    expect(result).toEqual({ type: "animated_text", text: "1969", position: "top" });
  });

  it("resolves 'random' position to one of top/bottom/center", async () => {
    const element: VisualElement = { type: "animated_text", text: "1969", position: "random" };
    const result = await resolveElement(element, baseCtx());
    expect(["top", "bottom", "center"]).toContain(result.position);
  });
});

describe("resolveElement — unsupported types (Fase 9 MVP scope)", () => {
  it("passes through without asset for svg", async () => {
    const element: VisualElement = { type: "svg", asset: "rocket" };
    const result = await resolveElement(element, baseCtx());
    expect(result).toEqual({ type: "svg" });
  });
});

describe("resolveElement — ai_video_clip", () => {
  it("generates a source image then calls the video provider", async () => {
    const videoProvider: VideoGenerationProvider = {
      supportedDurations: [5],
      generate: vi.fn().mockResolvedValue({ filePath: "/out/clip.mp4", durationSeconds: 5 }),
    };
    const element: VisualElement = { type: "ai_video_clip", provider: "gemini", prompt: "rocket launch" };
    const result = await resolveElement(
      element,
      baseCtx({ videoProviders: { gemini: videoProvider }, hasGoogleKey: true }),
    );
    expect(result).toEqual({ type: "ai_video_clip", assetPath: "/out/clip.mp4", sourceDurationSeconds: 5 });
    expect(videoProvider.generate).toHaveBeenCalledWith(
      expect.objectContaining({ prompt: "rocket launch", sourceImage: expect.any(Buffer) }),
    );
  });

  it("requests the smallest supported duration >= the scene duration, plus aspectRatio and a generic negativePrompt", async () => {
    const videoProvider: VideoGenerationProvider = {
      supportedDurations: [4, 6, 8],
      generate: vi.fn().mockResolvedValue({ filePath: "/out/clip.mp4", durationSeconds: 6 }),
    };
    const element: VisualElement = { type: "ai_video_clip", provider: "gemini", prompt: "rocket launch" };
    await resolveElement(
      element,
      baseCtx({
        videoProviders: { gemini: videoProvider },
        hasGoogleKey: true,
        sceneDurationSeconds: 5,
        aspectRatio: "1:1",
      }),
    );
    expect(videoProvider.generate).toHaveBeenCalledWith(
      expect.objectContaining({ durationSeconds: 6, aspectRatio: "1:1", negativePrompt: expect.stringContaining("static") }),
    );
  });

  it("falls back to the largest supported duration when the scene is longer than any option", async () => {
    const videoProvider: VideoGenerationProvider = {
      supportedDurations: [4, 6],
      generate: vi.fn().mockResolvedValue({ filePath: "/out/clip.mp4", durationSeconds: 6 }),
    };
    const element: VisualElement = { type: "ai_video_clip", provider: "gemini", prompt: "rocket launch" };
    await resolveElement(
      element,
      baseCtx({ videoProviders: { gemini: videoProvider }, hasGoogleKey: true, sceneDurationSeconds: 20 }),
    );
    expect(videoProvider.generate).toHaveBeenCalledWith(expect.objectContaining({ durationSeconds: 6 }));
  });

  it("leaves durationSeconds undefined when no sceneDurationSeconds is provided (provider falls back to its own default)", async () => {
    const videoProvider: VideoGenerationProvider = {
      supportedDurations: [4, 6],
      generate: vi.fn().mockResolvedValue({ filePath: "/out/clip.mp4", durationSeconds: 6 }),
    };
    const element: VisualElement = { type: "ai_video_clip", provider: "gemini", prompt: "rocket launch" };
    await resolveElement(element, baseCtx({ videoProviders: { gemini: videoProvider }, hasGoogleKey: true }));
    expect(videoProvider.generate).toHaveBeenCalledWith(expect.objectContaining({ durationSeconds: undefined }));
  });

  it("throws when the requested provider isn't configured", async () => {
    const element: VisualElement = { type: "ai_video_clip", provider: "fal", prompt: "rocket launch" };
    await expect(resolveElement(element, baseCtx())).rejects.toThrow('"fal" não configurado');
  });

  it("falls back to another configured provider when 'auto' and the resolved (openrouter) one fails", async () => {
    const openrouter: VideoGenerationProvider = {
      supportedDurations: [5],
      generate: vi.fn().mockRejectedValue(new Error("quota exceeded")),
    };
    const gemini: VideoGenerationProvider = {
      supportedDurations: [5],
      generate: vi.fn().mockRejectedValue(new Error("Premature close")),
    };
    const fal: VideoGenerationProvider = {
      supportedDurations: [5],
      generate: vi.fn().mockResolvedValue({ filePath: "/out/fal-clip.mp4", durationSeconds: 5 }),
    };
    const element: VisualElement = { type: "ai_video_clip", provider: "auto", prompt: "rocket launch" };
    const result = await resolveElement(
      element,
      baseCtx({ videoProviders: { openrouter, gemini, fal }, hasGoogleKey: true, hasFalKey: true }),
    );
    expect(result).toEqual({ type: "ai_video_clip", assetPath: "/out/fal-clip.mp4", sourceDurationSeconds: 5 });
    expect(fal.generate).toHaveBeenCalled();
  });

  it("uses the FALLBACK provider's own duration ladder, not the primary's, when falling back", async () => {
    const openrouter: VideoGenerationProvider = {
      supportedDurations: [4, 6, 8], // 7s de cena arredondaria pra 8 nesta escada
      generate: vi.fn().mockRejectedValue(new Error("quota exceeded")),
    };
    const fal: VideoGenerationProvider = {
      supportedDurations: [5, 10], // mesma cena arredonda pra 10 nesta escada, não 8
      generate: vi.fn().mockResolvedValue({ filePath: "/out/fal-clip.mp4", durationSeconds: 10 }),
    };
    const element: VisualElement = { type: "ai_video_clip", provider: "auto", prompt: "rocket launch" };
    await resolveElement(
      element,
      baseCtx({ videoProviders: { openrouter, fal }, hasFalKey: true, sceneDurationSeconds: 7 }),
    );
    expect(fal.generate).toHaveBeenCalledWith(expect.objectContaining({ durationSeconds: 10 }));
  });

  it("does not fall back when a specific provider was explicitly requested (not 'auto')", async () => {
    const gemini: VideoGenerationProvider = {
      supportedDurations: [5],
      generate: vi.fn().mockRejectedValue(new Error("Premature close")),
    };
    const fal: VideoGenerationProvider = { supportedDurations: [5], generate: vi.fn() };
    const element: VisualElement = { type: "ai_video_clip", provider: "gemini", prompt: "rocket launch" };
    await expect(
      resolveElement(element, baseCtx({ videoProviders: { gemini, fal }, hasGoogleKey: true, hasFalKey: true })),
    ).rejects.toThrow("Premature close");
    expect(fal.generate).not.toHaveBeenCalled();
  });
});

describe("resolveElement — stock_image", () => {
  it("resolves via Pexels on the first successful search", async () => {
    const pexels = fakeStockProvider("pexels", {
      searchImage: vi.fn().mockResolvedValue([CANDIDATE]),
      download: vi.fn().mockResolvedValue(ASSET),
    });
    const element: VisualElement = { type: "stock_image", prompt: "mountain sunrise" };
    const result = await resolveElement(element, baseCtx({ stockProviders: [pexels] }));
    expect(result).toEqual({ type: "stock_image", assetPath: "/cache/cand-1.jpg", sourceDurationSeconds: undefined, motion: undefined });
  });

  it("falls back to Pixabay when Pexels returns no results", async () => {
    const pexels = fakeStockProvider("pexels", { searchImage: vi.fn().mockResolvedValue([]) });
    const pixabay = fakeStockProvider("pixabay", {
      searchImage: vi.fn().mockResolvedValue([CANDIDATE]),
      download: vi.fn().mockResolvedValue(ASSET),
    });
    const element: VisualElement = { type: "stock_image", prompt: "mountain sunrise" };
    const result = await resolveElement(element, baseCtx({ stockProviders: [pexels, pixabay] }));
    expect(result.assetPath).toBe("/cache/cand-1.jpg");
    expect(pixabay.searchImage).toHaveBeenCalled();
  });

  it("falls back to Pixabay when Pexels throws", async () => {
    const pexels = fakeStockProvider("pexels", {
      searchImage: vi.fn().mockRejectedValue(new Error("Pexels API error: 500")),
    });
    const pixabay = fakeStockProvider("pixabay", {
      searchImage: vi.fn().mockResolvedValue([CANDIDATE]),
      download: vi.fn().mockResolvedValue(ASSET),
    });
    const element: VisualElement = { type: "stock_image", prompt: "mountain sunrise" };
    const result = await resolveElement(element, baseCtx({ stockProviders: [pexels, pixabay] }));
    expect(result.assetPath).toBe("/cache/cand-1.jpg");
  });
});

describe("resolveElement — stock_video", () => {
  it("resolves via search + download, carrying source duration", async () => {
    const pexels = fakeStockProvider("pexels", {
      searchVideo: vi.fn().mockResolvedValue([{ ...CANDIDATE, duration: 8 }]),
      download: vi.fn().mockResolvedValue({ ...ASSET, duration: 8 }),
    });
    const element: VisualElement = { type: "stock_video", prompt: "ocean waves" };
    const result = await resolveElement(element, baseCtx({ stockProviders: [pexels] }));
    expect(result).toEqual({ type: "stock_video", assetPath: "/cache/cand-1.jpg", sourceDurationSeconds: 8 });
  });
});

describe("resolveElement — stock resolution failure", () => {
  it("throws a structured StockResolutionError when no provider is configured", async () => {
    const element: VisualElement = { type: "stock_image", prompt: "mountain sunrise" };
    await expect(resolveElement(element, baseCtx({ stockProviders: [] }))).rejects.toThrow(StockResolutionError);
  });

  it("throws a structured StockResolutionError listing every provider's failure when all fail", async () => {
    const pexels = fakeStockProvider("pexels", { searchImage: vi.fn().mockResolvedValue([]) });
    const pixabay = fakeStockProvider("pixabay", {
      searchImage: vi.fn().mockRejectedValue(new Error("network error")),
    });
    const element: VisualElement = { type: "stock_image", prompt: "mountain sunrise" };

    try {
      await resolveElement(element, baseCtx({ stockProviders: [pexels, pixabay] }));
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(StockResolutionError);
      const stockErr = err as StockResolutionError;
      expect(stockErr.attempts).toEqual([
        { provider: "pexels", error: "nenhum resultado" },
        { provider: "pixabay", error: "Error: network error" },
      ]);
    }
  });
});

describe("inferAspectRatio", () => {
  it("maps vertical resolutions to 9:16", () => {
    expect(inferAspectRatio(1080, 1920)).toBe("9:16");
  });

  it("maps square resolutions to 1:1", () => {
    expect(inferAspectRatio(1080, 1080)).toBe("1:1");
  });

  it("maps horizontal resolutions to 16:9", () => {
    expect(inferAspectRatio(1920, 1080)).toBe("16:9");
  });

  it("picks the nearest of the 3 supported ratios for an odd custom resolution", () => {
    expect(inferAspectRatio(1000, 1500)).toBe("9:16"); // 0.667 mais perto de 9:16 (0.5625) que de 1:1
  });
});

describe("pickSupportedDuration", () => {
  it("rounds up to the smallest supported duration >= the scene duration", () => {
    expect(pickSupportedDuration(5, [4, 6, 8])).toBe(6);
  });

  it("returns the exact match when the scene duration is already supported", () => {
    expect(pickSupportedDuration(6, [4, 6, 8])).toBe(6);
  });

  it("falls back to the largest supported value when the scene is longer than any option", () => {
    expect(pickSupportedDuration(20, [4, 6, 8])).toBe(8);
  });

  it("returns undefined when sceneDurationSeconds is not provided", () => {
    expect(pickSupportedDuration(undefined, [4, 6, 8])).toBeUndefined();
  });

  it("returns undefined when the provider has no supported durations", () => {
    expect(pickSupportedDuration(5, [])).toBeUndefined();
  });
});
