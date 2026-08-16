import * as fs from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OpenRouterVideo } from "./openrouter.js";

function jsonResponse(body: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => body, text: async () => JSON.stringify(body) };
}

describe("OpenRouterVideo", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("submits, polls until completed, and downloads the video", async () => {
    const fetchMock = vi
      .fn()
      // submit
      .mockResolvedValueOnce(jsonResponse({ id: "job1", status: "pending", polling_url: "https://openrouter.ai/api/v1/videos/job1" }))
      // poll: still running
      .mockResolvedValueOnce(jsonResponse({ id: "job1", status: "running", polling_url: "https://openrouter.ai/api/v1/videos/job1" }))
      // poll: completed
      .mockResolvedValueOnce(
        jsonResponse({ id: "job1", status: "completed", unsigned_urls: ["https://cdn.example.com/video.mp4"] }),
      )
      // download (third-party CDN, no auth header)
      .mockResolvedValueOnce({ ok: true, arrayBuffer: async () => new TextEncoder().encode("fake-video").buffer });
    vi.stubGlobal("fetch", fetchMock);

    const video = new OpenRouterVideo(undefined, "key");
    const genPromise = video.generate({ sourceImage: Buffer.from("img"), prompt: "a cat" });

    // deixa o setTimeout do poll interval resolver de verdade (curto o bastante pro teste)
    const result = await genPromise;

    expect(result.durationSeconds).toBe(6);
    expect(fs.readFileSync(result.filePath, "utf8")).toBe("fake-video");
    expect(fetchMock).toHaveBeenCalledTimes(4);

    fs.unlinkSync(result.filePath);
  }, 15_000);

  it("throws when the job fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ id: "job1", status: "failed", error: "provider error" })),
    );

    const video = new OpenRouterVideo(undefined, "key");
    await expect(video.generate({ sourceImage: Buffer.from("img"), prompt: "a cat" })).rejects.toThrow(
      "provider error",
    );
  }, 15_000);

  it("throws in the constructor when no API key is available", () => {
    const original = process.env["OPENROUTER_API_KEY"];
    delete process.env["OPENROUTER_API_KEY"];
    expect(() => new OpenRouterVideo()).toThrow("OPENROUTER_API_KEY");
    if (original) process.env["OPENROUTER_API_KEY"] = original;
  });
});
