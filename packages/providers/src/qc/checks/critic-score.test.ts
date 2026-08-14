import { describe, expect, it } from "vitest";
import type { RevisionLogEntry } from "../../pipeline/types.js";
import { checkCriticScore } from "./critic-score.js";

function entry(round: number, score: number): RevisionLogEntry {
  return {
    round,
    score,
    critique: { score, strengths: [], weaknesses: [], revision_needed: score < 7, revision_instructions: null, weakest_scene_index: null },
  };
}

describe("checkCriticScore", () => {
  it("passes when final score >= 7", () => {
    const result = checkCriticScore([entry(0, 5), entry(1, 8)]);
    expect(result.passed).toBe(true);
    expect(result.severity).toBe("warning");
  });

  it("fails (warning) when final score stays below 7 after revisions", () => {
    const result = checkCriticScore([entry(0, 5), entry(1, 6), entry(2, 6)]);
    expect(result.passed).toBe(false);
    expect(result.details?.revisionsAttempted).toBe(2);
  });
});
