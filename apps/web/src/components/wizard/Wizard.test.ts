import { describe, expect, it } from "vitest";
import { interpolateTemplateVariables } from "./Wizard.js";

describe("interpolateTemplateVariables (Fase 18)", () => {
  it("replaces every {{key}} with its bound value", () => {
    const result = interpolateTemplateVariables("Uma história sobre {{PERSONAGEM}} no {{LUGAR}}.", {
      PERSONAGEM: "João",
      LUGAR: "espaço",
    });
    expect(result).toBe("Uma história sobre João no espaço.");
  });

  it("leaves {{key}} untouched when no binding was provided or it's blank", () => {
    const result = interpolateTemplateVariables("Sobre {{PERSONAGEM}}.", { PERSONAGEM: "  " });
    expect(result).toBe("Sobre {{PERSONAGEM}}.");
  });

  it("is a no-op on text without placeholders", () => {
    expect(interpolateTemplateVariables("texto normal", { X: "y" })).toBe("texto normal");
  });
});
