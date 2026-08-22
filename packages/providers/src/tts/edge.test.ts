import { Readable } from "node:stream";
import { describe, expect, it, vi } from "vitest";
import { EdgeTTS, EDGE_TTS_VOICES, parseWordBoundaries, resolveEdgeVoice } from "./edge.js";

let attempt = 0;
let failuresBeforeSuccess = 0;

vi.mock("msedge-tts", () => ({
  OUTPUT_FORMAT: { AUDIO_24KHZ_48KBITRATE_MONO_MP3: "audio-24khz-48kbitrate-mono-mp3" },
  MsEdgeTTS: class {
    async setMetadata() {}
    toStream() {
      attempt++;
      if (attempt <= failuresBeforeSuccess) {
        const failing = new Readable({
          read() {
            this.destroy(new Error("Premature close"));
          },
        });
        return { audioStream: failing, metadataStream: Readable.from([]) };
      }
      return { audioStream: Readable.from([Buffer.from("audio")]), metadataStream: Readable.from([]) };
    }
  },
}));

function metadataLine(word: string, offsetTicks: number, durationTicks: number): string {
  return JSON.stringify({
    Metadata: [{ Type: "WordBoundary", Data: { Offset: offsetTicks, Duration: durationTicks, text: { Text: word } } }],
  });
}

describe("parseWordBoundaries", () => {
  it("converts Offset/Duration ticks (100ns) to start/end seconds", () => {
    const raw = metadataLine("hello", 10_000_000, 5_000_000);
    expect(parseWordBoundaries(raw)).toEqual([{ word: "hello", start: 1, end: 1.5 }]);
  });

  it("parses multiple lines and skips non-WordBoundary metadata", () => {
    const raw = [
      metadataLine("hello", 0, 5_000_000),
      JSON.stringify({ Metadata: [{ Type: "SentenceBoundary", Data: {} }] }),
      metadataLine("world", 5_000_000, 5_000_000),
    ].join("\n");

    expect(parseWordBoundaries(raw)).toEqual([
      { word: "hello", start: 0, end: 0.5 },
      { word: "world", start: 0.5, end: 1 },
    ]);
  });

  it("returns empty array for blank/malformed input", () => {
    expect(parseWordBoundaries("")).toEqual([]);
    expect(parseWordBoundaries("not json\n\n")).toEqual([]);
  });
});

describe("resolveEdgeVoice", () => {
  it("resolves the female voice for a covered language", () => {
    expect(resolveEdgeVoice("en-US")).toBe(EDGE_TTS_VOICES["en-US"].female);
  });

  it("falls back to pt-BR when language is not in EDGE_TTS_VOICES", () => {
    expect(resolveEdgeVoice("fr-FR")).toBe(EDGE_TTS_VOICES["pt-BR"].female);
  });

  it("falls back to pt-BR when language is omitted", () => {
    expect(resolveEdgeVoice(undefined)).toBe(EDGE_TTS_VOICES["pt-BR"].female);
  });
});

describe("EdgeTTS.generate", () => {
  it("retries on a transient stream error (e.g. Premature close) and succeeds", async () => {
    attempt = 0;
    failuresBeforeSuccess = 2;
    const result = await new EdgeTTS().generate("hello");
    expect(result.audio.toString()).toBe("audio");
    expect(attempt).toBe(3);
  }, 15_000); // backoff entre retries (3s, 6s) — vitest default de 5s não basta

  it("gives up and throws after exhausting retries", async () => {
    attempt = 0;
    failuresBeforeSuccess = 99;
    await expect(new EdgeTTS().generate("hello")).rejects.toThrow("Premature close");
    expect(attempt).toBe(3);
  }, 15_000);
});
