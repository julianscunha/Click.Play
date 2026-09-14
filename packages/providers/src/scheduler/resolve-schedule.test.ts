import { describe, expect, it, vi } from "vitest";
import { resolveGenerativeVariables, resolveScheduleConfig } from "./resolve-schedule.js";
import type { LLMProvider } from "../llm/types.js";
import type { ProductionConfig, TemplateVariable } from "../persistence/types.js";

function fakeLLM(value: string): LLMProvider {
  return {
    id: "openrouter",
    generate: vi.fn().mockResolvedValue({ data: { value }, usage: { inputTokens: 1, outputTokens: 1 } }),
  };
}

const baseConfig: ProductionConfig = {
  cost: { llmModel: "openai/gpt-4.1", ttsProvider: "edge", imageProvider: "gemini", musicProvider: "bundled" },
};

describe("resolveScheduleConfig", () => {
  it("interpolates {{key}} bindings into direction", () => {
    const resolved = resolveScheduleConfig(
      { ...baseConfig, direction: "Uma história sobre {{PERSONAGEM}}." },
      { PERSONAGEM: "João" },
    );
    expect(resolved.direction).toBe("Uma história sobre João.");
  });

  it("returns the config unchanged when there's no direction", () => {
    expect(resolveScheduleConfig(baseConfig, { PERSONAGEM: "João" })).toEqual(baseConfig);
  });
});

describe("resolveGenerativeVariables", () => {
  const schema: TemplateVariable[] = [
    { key: "PERSONAGEM", label: "Invente um nome de personagem curioso", kind: "generative" },
    { key: "TEMA", label: "Tema" },
  ];

  it("calls the LLM only for generative variables without an existing binding", async () => {
    const llm = fakeLLM("Capitão Zorbo");
    const merged = await resolveGenerativeVariables(llm, schema, {});
    expect(merged).toEqual({ PERSONAGEM: "Capitão Zorbo" });
    expect(llm.generate).toHaveBeenCalledTimes(1);
    expect(llm.generate).toHaveBeenCalledWith(
      expect.objectContaining({ userMessage: "Instruction: Invente um nome de personagem curioso" }),
    );
  });

  it("doesn't call the LLM when a binding was already provided (user override)", async () => {
    const llm = fakeLLM("ignored");
    const merged = await resolveGenerativeVariables(llm, schema, { PERSONAGEM: "Ana" });
    expect(merged).toEqual({ PERSONAGEM: "Ana" });
    expect(llm.generate).not.toHaveBeenCalled();
  });

  it("preserves existing literal bindings untouched", async () => {
    const llm = fakeLLM("Capitão Zorbo");
    const merged = await resolveGenerativeVariables(llm, schema, { TEMA: "espaço" });
    expect(merged).toEqual({ TEMA: "espaço", PERSONAGEM: "Capitão Zorbo" });
  });
});
