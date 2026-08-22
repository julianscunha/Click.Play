import { describe, expect, it } from "vitest";
import { checkTargetDurationMatch } from "./target-duration-match.js";

describe("checkTargetDurationMatch", () => {
  it("passes within default 20% tolerance", () => {
    expect(checkTargetDurationMatch(60, 68).passed).toBe(true);
  });

  it("fails outside tolerance", () => {
    expect(checkTargetDurationMatch(60, 90).passed).toBe(false);
  });

  it("severity is warning, not block", () => {
    expect(checkTargetDurationMatch(60, 60).severity).toBe("warning");
  });
});
