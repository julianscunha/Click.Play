import { describe, expect, it, vi } from "vitest";
import { estimateWordTimestamps, GeminiTTS } from "./gemini.js";

describe("estimateWordTimestamps", () => {
  it("splits duration proportionally to word length", () => {
    const words = estimateWordTimestamps("oi mundo", 3);
    // "oi" (2 chars) + "mundo" (5 chars) = 7 chars totais
    expect(words[0]!.word).toBe("oi");
    expect(words[0]!.start).toBe(0);
    expect(words[0]!.end).toBeCloseTo((2 / 7) * 3, 5);
    expect(words[1]!.word).toBe("mundo");
    expect(words[1]!.end).toBeCloseTo(3, 5);
  });

  it("returns an empty array for blank text", () => {
    expect(estimateWordTimestamps("   ", 5)).toEqual([]);
  });
});

vi.mock("@google/genai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@google/genai")>();
  return {
    ...actual,
    GoogleGenAI: class {
      models = {
        generateContent: vi.fn().mockResolvedValue({
          candidates: [
            {
              content: {
                // 100 amostras s16le (200 bytes) a 24kHz — silêncio, só pra validar o pipeline.
                parts: [{ inlineData: { data: Buffer.alloc(200).toString("base64") } }],
              },
            },
          ],
        }),
      };
    },
  };
});

describe("GeminiTTS.generate", () => {
  it("converts the returned PCM to a real MP3 buffer with estimated word timestamps", async () => {
    const tts = new GeminiTTS(undefined, undefined, "fake-key");
    const result = await tts.generate("oi mundo");

    // ID3 (com tag) ou 0xFF (frame sync direto) — cabeçalho MP3 válido produzido pelo ffmpeg.
    const header = result.audio.subarray(0, 3).toString("latin1");
    expect(header === "ID3" || result.audio[0] === 0xff).toBe(true);
    expect(result.words.map((w) => w.word)).toEqual(["oi", "mundo"]);
  });

  it("throws when the API key is missing", () => {
    const original = process.env.GOOGLE_API_KEY;
    delete process.env.GOOGLE_API_KEY;
    expect(() => new GeminiTTS()).toThrow("GOOGLE_API_KEY");
    if (original) process.env.GOOGLE_API_KEY = original;
  });
});
