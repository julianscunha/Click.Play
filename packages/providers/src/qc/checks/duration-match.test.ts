import { describe, expect, it } from "vitest";
import { checkDurationMatch } from "./duration-match.js";

describe("checkDurationMatch", () => {
  it("passes within default 5% tolerance", () => {
    expect(checkDurationMatch(10, 10.3).passed).toBe(true);
  });

  it("fails outside tolerance", () => {
    expect(checkDurationMatch(10, 11.5).passed).toBe(false);
  });

  it("severity is block", () => {
    expect(checkDurationMatch(10, 10).severity).toBe("block");
  });

  it("respects a custom tolerance", () => {
    expect(checkDurationMatch(10, 10.3, 0.01).passed).toBe(false);
  });
});
