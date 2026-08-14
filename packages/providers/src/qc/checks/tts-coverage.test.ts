import { describe, expect, it } from "vitest";
import { checkTtsCoverage } from "./tts-coverage.js";

describe("checkTtsCoverage", () => {
  it("passes at or above 90%", () => {
    expect(checkTtsCoverage(100, 90).passed).toBe(true);
  });

  it("fails below 90%", () => {
    const result = checkTtsCoverage(100, 80);
    expect(result.passed).toBe(false);
    expect(result.severity).toBe("warning");
  });
});
