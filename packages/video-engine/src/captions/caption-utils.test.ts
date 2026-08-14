import type { WordTimestamp } from "@clickplay/domain";
import { describe, expect, it } from "vitest";
import { computeWordStates, getWordChunk, getWordState } from "./caption-utils";

const words: WordTimestamp[] = [
  { word: "Hello", start: 1.0, end: 1.5 },
  { word: "world", start: 1.6, end: 2.0 },
  { word: "this", start: 2.5, end: 2.8 },
  { word: "is", start: 2.9, end: 3.1 },
  { word: "a", start: 3.2, end: 3.3 },
  { word: "test", start: 3.4, end: 3.8 },
];

describe("getWordChunk", () => {
  it("returns the correct chunk for mid-stream time", () => {
    const { chunk, chunkStart } = getWordChunk(words, 1.2, 3);
    expect(chunkStart).toBe(0);
    expect(chunk.length).toBe(3);
    expect(chunk[0]?.word).toBe("Hello");
  });

  it("advances to the next chunk when previous chunk is exhausted", () => {
    const { chunk, chunkStart } = getWordChunk(words, 3.5, 3);
    expect(chunkStart).toBe(3);
    expect(chunk[0]?.word).toBe("is");
  });

  it("handles the partial last chunk", () => {
    // 6 words with chunkSize 4: chunk 0 = [0..3], chunk 1 = [4..5]
    const { chunk, chunkStart } = getWordChunk(words, 3.5, 4);
    expect(chunkStart).toBe(4);
    expect(chunk.length).toBe(2);
    expect(chunk[0]?.word).toBe("a");
    expect(chunk[1]?.word).toBe("test");
  });

  it("returns the first chunk for time before any speech", () => {
    const { chunkStart } = getWordChunk(words, 0.1, 3);
    expect(chunkStart).toBe(0);
  });

  it("uses default lingerS of 0.3 when not specified", () => {
    const { chunkStart } = getWordChunk(words, 4.09, 3);
    expect(chunkStart).toBe(3);
  });

  it("respects custom lingerS parameter", () => {
    const { chunkStart } = getWordChunk(words, 2.86, 3, 0.05);
    expect(chunkStart).toBe(3);
  });

  it("handles lingerS=0 (instant advance)", () => {
    const { chunkStart } = getWordChunk(words, 2.81, 3, 0);
    expect(chunkStart).toBe(3);
  });

  it("handles very large lingerS but advances when next chunk has started", () => {
    const { chunkStart } = getWordChunk(words, 50, 3, 100);
    expect(chunkStart).toBe(3);
  });

  it("lingers on last chunk indefinitely when no next chunk exists", () => {
    const { chunkStart } = getWordChunk(words, 4.0, 3, 100);
    expect(chunkStart).toBe(3);
  });

  it("handles empty words array", () => {
    const { chunk, chunkStart } = getWordChunk([], 1.0, 3);
    expect(chunkStart).toBe(0);
    expect(chunk).toEqual([]);
  });

  it("advances to next chunk when next chunk's first word has started, even during linger", () => {
    const continuous: WordTimestamp[] = [
      { word: "Did", start: 0.1, end: 0.3 },
      { word: "you", start: 0.3, end: 0.5 },
      { word: "know", start: 0.5, end: 0.8 },
      { word: "we", start: 0.8, end: 1.0 },
      { word: "know", start: 1.0, end: 1.3 },
      { word: "more", start: 1.3, end: 1.6 },
      { word: "about", start: 1.6, end: 1.9 },
      { word: "Mars", start: 1.9, end: 2.2 },
    ];
    const { chunkStart, chunk } = getWordChunk(continuous, 1.05, 4, 0.5);
    expect(chunkStart).toBe(4);
    expect(chunk[0]?.word).toBe("know");
  });

  it("still lingers when there is a gap before next chunk starts", () => {
    const gapped: WordTimestamp[] = [
      { word: "Hello", start: 0.0, end: 0.3 },
      { word: "world", start: 0.3, end: 0.6 },
      { word: "Next", start: 1.5, end: 1.8 },
      { word: "chunk", start: 1.8, end: 2.0 },
    ];
    const { chunkStart } = getWordChunk(gapped, 0.8, 2, 0.3);
    expect(chunkStart).toBe(0);
  });

  it("returns empty chunk after voiceover ends plus linger", () => {
    const { chunk, chunkStart } = getWordChunk(words, 5.0, 3, 0.3);
    expect(chunk).toEqual([]);
    expect(chunkStart).toBe(words.length);
  });
});

// Identity spring: returns 1 for any input (refactor commit behavior)
const identitySpring = () => 1;

const stateWords: WordTimestamp[] = [
  { word: "Hello", start: 1.0, end: 1.5 },
  { word: "beautiful", start: 1.6, end: 2.0 },
  { word: "world", start: 2.1, end: 2.5 },
  { word: "this", start: 2.6, end: 3.0 },
  { word: "is", start: 3.1, end: 3.3 },
];

describe("getWordState", () => {
  it("returns unspoken before word starts", () => {
    expect(getWordState(stateWords[0]!, 0.5)).toBe("unspoken");
  });

  it("returns active during word", () => {
    expect(getWordState(stateWords[0]!, 1.2)).toBe("active");
  });

  it("returns spoken after word ends", () => {
    expect(getWordState(stateWords[0]!, 1.6)).toBe("spoken");
  });

  it("returns active at exact start time", () => {
    expect(getWordState(stateWords[0]!, 1.0)).toBe("active");
  });

  it("returns spoken at exact end time", () => {
    expect(getWordState(stateWords[0]!, 1.5)).toBe("spoken");
  });

  it("handles zero-duration word (start === end)", () => {
    const zeroDuration = { word: "x", start: 1.0, end: 1.0 };
    expect(getWordState(zeroDuration, 0.9)).toBe("unspoken");
    expect(getWordState(zeroDuration, 1.0)).toBe("spoken");
  });
});

describe("computeWordStates", () => {
  it("computes correct states for a chunk", () => {
    const chunk = stateWords.slice(0, 3);
    const result = computeWordStates(chunk, 0, 1.8, identitySpring);

    expect(result[0]!.state).toBe("spoken");
    expect(result[1]!.state).toBe("active");
    expect(result[2]!.state).toBe("unspoken");
  });

  it("sets springProgress to 0 for unspoken words", () => {
    const chunk = stateWords.slice(0, 3);
    const result = computeWordStates(chunk, 0, 0.5, identitySpring);
    expect(result[0]!.springProgress).toBe(0);
    expect(result[1]!.springProgress).toBe(0);
    expect(result[2]!.springProgress).toBe(0);
  });

  it("calls springFn for active and spoken words", () => {
    const chunk = stateWords.slice(0, 3);
    const mockSpring = (idx: number) => (idx === 0 ? 0.7 : 1.0);
    const result = computeWordStates(chunk, 0, 1.8, mockSpring);

    expect(result[0]!.springProgress).toBe(0.7);
    expect(result[1]!.springProgress).toBe(1.0);
    expect(result[2]!.springProgress).toBe(0);
  });

  it("preserves global indices with chunkStart offset", () => {
    const chunk = stateWords.slice(2, 5);
    const result = computeWordStates(chunk, 2, 2.8, identitySpring);

    expect(result[0]!.globalIndex).toBe(2);
    expect(result[1]!.globalIndex).toBe(3);
    expect(result[2]!.globalIndex).toBe(4);
  });

  it("marks emphasis words from emphasisIndices set", () => {
    const chunk = stateWords.slice(0, 3);
    const emphasisSet = new Set([1]);
    const result = computeWordStates(chunk, 0, 1.2, identitySpring, emphasisSet);

    expect(result[0]!.emphasis).toBe(false);
    expect(result[1]!.emphasis).toBe(true);
    expect(result[2]!.emphasis).toBe(false);
  });

  it("handles undefined emphasisIndices gracefully", () => {
    const chunk = stateWords.slice(0, 2);
    const result = computeWordStates(chunk, 0, 1.2, identitySpring, undefined);
    expect(result[0]!.emphasis).toBe(false);
    expect(result[1]!.emphasis).toBe(false);
  });

  it("handles empty chunk", () => {
    const result = computeWordStates([], 0, 1.0, identitySpring);
    expect(result).toEqual([]);
  });

  it("handles single word", () => {
    const result = computeWordStates([stateWords[0]!], 0, 1.2, identitySpring);
    expect(result).toHaveLength(1);
    expect(result[0]!.state).toBe("active");
    expect(result[0]!.globalIndex).toBe(0);
  });

  it("handles simultaneous timestamps (two words with same start)", () => {
    const simultaneous = [
      { word: "A", start: 1.0, end: 1.2 },
      { word: "B", start: 1.0, end: 1.3 },
    ];
    const result = computeWordStates(simultaneous, 0, 1.1, identitySpring);
    expect(result[0]!.state).toBe("active");
    expect(result[1]!.state).toBe("active");
  });

  it("handles backwards timestamps defensively", () => {
    const backwards = [
      { word: "A", start: 1.5, end: 1.8 },
      { word: "B", start: 1.0, end: 1.3 },
    ];
    const result = computeWordStates(backwards, 0, 1.2, identitySpring);
    expect(result[0]!.state).toBe("unspoken");
    expect(result[1]!.state).toBe("active");
  });
});
