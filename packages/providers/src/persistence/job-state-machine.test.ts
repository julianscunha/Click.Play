import { describe, expect, it } from "vitest";
import { assertTransition, PROGRESS_BY_STATUS } from "./job-state-machine.js";

describe("assertTransition", () => {
  it("allows the linear happy path QUEUED→...→COMPLETED", () => {
    const path = [
      "QUEUED",
      "RESEARCHING",
      "PLANNING",
      "REVIEWING",
      "GENERATING",
      "RENDERING",
      "COMPLETED",
    ] as const;
    for (let i = 0; i < path.length - 1; i++) {
      expect(() => assertTransition(path[i]!, path[i + 1]!)).not.toThrow();
    }
  });

  it("rejects skipping a stage", () => {
    expect(() => assertTransition("QUEUED", "GENERATING")).toThrow(/inválida/);
  });

  it("rejects going backwards", () => {
    expect(() => assertTransition("RENDERING", "PLANNING")).toThrow(/inválida/);
  });

  it("allows FAILED from any non-terminal state", () => {
    for (const from of ["QUEUED", "RESEARCHING", "PLANNING", "REVIEWING", "GENERATING", "RENDERING"] as const) {
      expect(() => assertTransition(from, "FAILED")).not.toThrow();
    }
  });

  it("allows CANCELLED from any non-terminal state", () => {
    for (const from of ["QUEUED", "RESEARCHING", "PLANNING", "REVIEWING", "GENERATING", "RENDERING"] as const) {
      expect(() => assertTransition(from, "CANCELLED")).not.toThrow();
    }
  });

  it("rejects any transition out of a terminal state", () => {
    for (const from of ["COMPLETED", "FAILED", "CANCELLED"] as const) {
      expect(() => assertTransition(from, "FAILED")).toThrow(/já finalizado/);
      expect(() => assertTransition(from, "CANCELLED")).toThrow(/já finalizado/);
    }
  });

  it("keeps progress monotonic across the happy path", () => {
    const path = ["QUEUED", "RESEARCHING", "PLANNING", "REVIEWING", "GENERATING", "RENDERING", "COMPLETED"] as const;
    const values = path.map((s) => PROGRESS_BY_STATUS[s]);
    for (let i = 1; i < values.length; i++) {
      expect(values[i]!).toBeGreaterThan(values[i - 1]!);
    }
  });
});
