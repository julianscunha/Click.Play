import { describe, expect, it } from "vitest";
import { resolveVideoGenerationProvider } from "./resolve-provider.js";

describe("resolveVideoGenerationProvider", () => {
  it("passes through an explicit provider unchanged", () => {
    expect(resolveVideoGenerationProvider("fal")).toBe("fal");
    expect(resolveVideoGenerationProvider("gemini")).toBe("gemini");
    expect(resolveVideoGenerationProvider("openrouter")).toBe("openrouter");
  });

  it("resolves auto to openrouter (mesma chave já obrigatória pro LLM, sem exigir conta separada)", () => {
    expect(resolveVideoGenerationProvider("auto")).toBe("openrouter");
  });
});
