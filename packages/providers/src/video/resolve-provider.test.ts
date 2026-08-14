import { describe, expect, it } from "vitest";
import { resolveVideoGenerationProvider } from "./resolve-provider.js";

describe("resolveVideoGenerationProvider", () => {
  it("passes through an explicit provider unchanged", () => {
    expect(resolveVideoGenerationProvider("fal", { hasGoogleKey: true, hasFalKey: true })).toBe("fal");
  });

  it("resolves auto to gemini when both keys are available (Gemini preferred)", () => {
    expect(resolveVideoGenerationProvider("auto", { hasGoogleKey: true, hasFalKey: true })).toBe("gemini");
  });

  it("resolves auto to fal when only FAL_API_KEY is set", () => {
    expect(resolveVideoGenerationProvider("auto", { hasGoogleKey: false, hasFalKey: true })).toBe("fal");
  });

  it("throws when auto is requested and no provider key is configured", () => {
    expect(() => resolveVideoGenerationProvider("auto", { hasGoogleKey: false, hasFalKey: false })).toThrow(
      "No video generation provider available",
    );
  });
});
