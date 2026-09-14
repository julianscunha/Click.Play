import { describe, expect, it } from "vitest";
import { normalizeForSpeech } from "./normalize-text.js";

describe("normalizeForSpeech", () => {
  it("expands R$ currency in pt-BR", () => {
    expect(normalizeForSpeech("Custou R$ 50.", "pt-BR")).toContain("cinquenta reais");
  });

  it("expands percentages in pt-BR", () => {
    expect(normalizeForSpeech("Deu 42% de desconto.", "pt-BR")).toContain("quarenta e dois por cento");
  });

  it("expands bare numbers in pt-BR", () => {
    expect(normalizeForSpeech("Em 23 dias.", "pt-BR")).toContain("vinte e três dias");
  });

  it("expands $ currency in en-US", () => {
    expect(normalizeForSpeech("It cost $50.", "en-US")).toContain("dollars");
  });

  it("expands percentages in en-US", () => {
    expect(normalizeForSpeech("Gave 42% off.", "en-US")).toContain("forty-two percent");
  });

  it("defaults to pt-BR when language is omitted", () => {
    expect(normalizeForSpeech("R$ 50")).toContain("reais");
  });
});
