import * as fs from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OpenRouterMusic } from "./openrouter.js";

function sseStream(lines: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const line of lines) controller.enqueue(encoder.encode(`data: ${line}\n`));
      controller.close();
    },
  });
}

describe("OpenRouterMusic", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("joins base64 audio chunks from the SSE stream into a WAV file", async () => {
    const b64 = Buffer.from("fake-music").toString("base64");
    const chunk1 = JSON.stringify({ choices: [{ delta: { audio: { data: b64.slice(0, 6) } } }] });
    const chunk2 = JSON.stringify({ choices: [{ delta: { audio: { data: b64.slice(6) } } }] });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, body: sseStream([chunk1, chunk2, "[DONE]"]) }),
    );

    const music = new OpenRouterMusic(undefined, "key");
    const result = await music.generate("upbeat trailer music", "epic_cinematic");

    expect(fs.readFileSync(result.filePath, "utf8")).toBe("fake-music");
    fs.unlinkSync(result.filePath);
  });

  it("throws when the stream never yields audio data", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, body: sseStream(["[DONE]"]) }));

    const music = new OpenRouterMusic(undefined, "key");
    await expect(music.generate("upbeat trailer music", "epic_cinematic")).rejects.toThrow("no audio data");
  });

  it("throws when the API responds with an error status", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 429, body: null, text: async () => "quota exceeded" }),
    );

    const music = new OpenRouterMusic(undefined, "key");
    await expect(music.generate("upbeat trailer music", "epic_cinematic")).rejects.toThrow("429");
  });

  it("throws in the constructor when no API key is available", () => {
    const original = process.env["OPENROUTER_API_KEY"];
    delete process.env["OPENROUTER_API_KEY"];
    expect(() => new OpenRouterMusic()).toThrow("OPENROUTER_API_KEY");
    if (original) process.env["OPENROUTER_API_KEY"] = original;
  });
});
