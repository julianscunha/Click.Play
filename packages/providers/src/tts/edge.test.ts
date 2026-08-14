import { describe, expect, it } from "vitest";
import { parseWordBoundaries } from "./edge.js";

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
