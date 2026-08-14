import { describe, expect, it } from "vitest";
import { checkOutputExists } from "./output-exists.js";

describe("checkOutputExists", () => {
  it("passes when file exists and has size", () => {
    const result = checkOutputExists(true, 12345);
    expect(result.passed).toBe(true);
    expect(result.severity).toBe("block");
  });

  it("fails when file does not exist", () => {
    expect(checkOutputExists(false, 0).passed).toBe(false);
  });

  it("fails when file exists but is empty", () => {
    expect(checkOutputExists(true, 0).passed).toBe(false);
  });
});
