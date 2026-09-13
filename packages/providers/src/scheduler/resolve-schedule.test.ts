import { describe, expect, it } from "vitest";
import { resolveScheduleConfig } from "./resolve-schedule.js";
import type { ProductionConfig } from "../persistence/types.js";

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
