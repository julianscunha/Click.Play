import { afterEach, describe, expect, it, vi } from "vitest";
import { OpenRouterTTS } from "./openrouter.js";

describe("OpenRouterTTS", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("converts the returned PCM to MP3 with estimated word timestamps", async () => {
    // 100 amostras s16le (200 bytes) a 24kHz — silêncio, só pra validar o pipeline.
    const pcm = new Uint8Array(200);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, arrayBuffer: async () => pcm.buffer }),
    );

    const tts = new OpenRouterTTS(undefined, undefined, "key");
    const result = await tts.generate("oi mundo");

    const header = result.audio.subarray(0, 3).toString("latin1");
    expect(header === "ID3" || result.audio[0] === 0xff).toBe(true);
    expect(result.words.map((w) => w.word)).toEqual(["oi", "mundo"]);
  });

  it("throws when the API responds with an error status", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 400, headers: new Headers(), text: async () => "bad request" }),
    );

    const tts = new OpenRouterTTS(undefined, undefined, "key");
    await expect(tts.generate("oi")).rejects.toThrow("400");
  }, 15_000);

  it("defaults to the Gemini voice only for a Gemini model", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, arrayBuffer: async () => new Uint8Array(200).buffer });
    vi.stubGlobal("fetch", fetchMock);

    await new OpenRouterTTS("google/gemini-3.1-flash-tts-preview", undefined, "key").generate("oi");
    const body = JSON.parse(fetchMock.mock.calls[0]![1].body);
    expect(body.voice).toBe("Kore");
  });

  it("omits voice for a non-Gemini model — achado real: 'Kore' é inválido pra outro catálogo de vozes", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, arrayBuffer: async () => new Uint8Array(200).buffer });
    vi.stubGlobal("fetch", fetchMock);

    await new OpenRouterTTS("fish-audio/s2.1-pro-free:free", undefined, "key").generate("oi");
    const body = JSON.parse(fetchMock.mock.calls[0]![1].body);
    expect(body.voice).toBeUndefined();
  });

  it("respects an explicit voice even for a non-Gemini model", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, arrayBuffer: async () => new Uint8Array(200).buffer });
    vi.stubGlobal("fetch", fetchMock);

    await new OpenRouterTTS("fish-audio/s2.1-pro-free:free", "flux-bree-en", "key").generate("oi");
    const body = JSON.parse(fetchMock.mock.calls[0]![1].body);
    expect(body.voice).toBe("flux-bree-en");
  });

  it("throws in the constructor when no API key is available", () => {
    const original = process.env["OPENROUTER_API_KEY"];
    delete process.env["OPENROUTER_API_KEY"];
    expect(() => new OpenRouterTTS()).toThrow("OPENROUTER_API_KEY");
    if (original) process.env["OPENROUTER_API_KEY"] = original;
  });
});
