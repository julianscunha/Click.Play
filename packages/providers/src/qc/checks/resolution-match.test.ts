import { describe, expect, it } from "vitest";
import { checkResolutionMatch } from "./resolution-match.js";

describe("checkResolutionMatch", () => {
  const expected = { width: 1080, height: 1920, fps: 30 };

  it("passes when width/height/fps all match", () => {
    expect(checkResolutionMatch(expected, { ...expected }).passed).toBe(true);
  });

  it("fails on width mismatch", () => {
    expect(checkResolutionMatch(expected, { ...expected, width: 720 }).passed).toBe(false);
  });

  it("fails on fps mismatch", () => {
    expect(checkResolutionMatch(expected, { ...expected, fps: 24 }).passed).toBe(false);
  });
});
