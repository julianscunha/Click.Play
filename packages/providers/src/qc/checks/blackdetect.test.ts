import { describe, expect, it } from "vitest";
import { checkBlackdetect } from "./blackdetect.js";

describe("checkBlackdetect", () => {
  it("passes when there are no segments", () => {
    const result = checkBlackdetect([], 1.0);
    expect(result.passed).toBe(true);
    expect(result.severity).toBe("warning");
  });

  it("fails (warning) when segments are present", () => {
    const result = checkBlackdetect([{ start: 0, end: 2, duration: 2 }], 1.0);
    expect(result.passed).toBe(false);
    expect(result.severity).toBe("warning");
  });
});
