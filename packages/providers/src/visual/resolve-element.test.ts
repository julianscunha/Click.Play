import type { VisualElement } from "@clickplay/domain";
import { describe, expect, it, vi } from "vitest";
import type { ImageProvider } from "../image/types";
import type { StockAsset, StockCandidate, StockProvider } from "../stock/types";
import type { VideoGenerationProvider } from "../video/types";
import { resolveElement } from "./resolve-element";
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
  it("passes through the text with no asset resolution", async () => {
    const element: VisualElement = { type: "animated_text", text: "1969" };
    const result = await resolveElement(element, baseCtx());
    expect(result).toEqual({ type: "animated_text", text: "1969" });
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

  it("throws when the requested provider isn't configured", async () => {
    const element: VisualElement = { type: "ai_video_clip", provider: "fal", prompt: "rocket launch" };
    await expect(resolveElement(element, baseCtx())).rejects.toThrow('"fal" não configurado');
  });

  it("falls back to the other configured provider when 'auto' and the resolved one fails", async () => {
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
      baseCtx({ videoProviders: { gemini, fal }, hasGoogleKey: true, hasFalKey: true }),
    );
    expect(result).toEqual({ type: "ai_video_clip", assetPath: "/out/fal-clip.mp4", sourceDurationSeconds: 5 });
    expect(fal.generate).toHaveBeenCalled();
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
