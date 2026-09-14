import { describe, expect, it } from "vitest";
import { computeExitProgress } from "./TextElement";

describe("computeExitProgress", () => {
  it("stays fully visible while far from the end of the scene", () => {
    expect(computeExitProgress(50, 11)).toBe(1);
  });

  it("ramps down to 0 as framesToEnd approaches 0", () => {
    expect(computeExitProgress(11, 11)).toBeCloseTo(1, 5);
    expect(computeExitProgress(0, 11)).toBeCloseTo(0, 5);
  });

  it("clamps to 0 when framesToEnd goes negative (frame beyond sceneDurationInFrames)", () => {
    expect(computeExitProgress(-5, 11)).toBe(0);
  });
});
