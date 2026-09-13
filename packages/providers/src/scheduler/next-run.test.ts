import { describe, expect, it } from "vitest";
import { computeNextRunAt } from "./next-run.js";

describe("computeNextRunAt", () => {
  it("daily: schedules for later today when the time hasn't passed yet", () => {
    const from = new Date(2026, 8, 12, 8, 0); // sábado, 08:00
    const next = computeNextRunAt({ frequency: "daily", timeOfDay: "09:00" }, from);
    expect(next).toEqual(new Date(2026, 8, 12, 9, 0));
  });

  it("daily: rolls over to tomorrow when the time already passed today", () => {
    const from = new Date(2026, 8, 12, 10, 0);
    const next = computeNextRunAt({ frequency: "daily", timeOfDay: "09:00" }, from);
    expect(next).toEqual(new Date(2026, 8, 13, 9, 0));
  });

  it("weekly: schedules for today when it's the target day and the time hasn't passed", () => {
    const from = new Date(2026, 8, 12, 8, 0); // sábado (dayOfWeek 6)
    const next = computeNextRunAt({ frequency: "weekly", timeOfDay: "09:00", dayOfWeek: 6 }, from);
    expect(next).toEqual(new Date(2026, 8, 12, 9, 0));
  });

  it("weekly: rolls over a full week when it's the target day but the time already passed", () => {
    const from = new Date(2026, 8, 12, 10, 0); // sábado
    const next = computeNextRunAt({ frequency: "weekly", timeOfDay: "09:00", dayOfWeek: 6 }, from);
    expect(next).toEqual(new Date(2026, 8, 19, 9, 0));
  });

  it("weekly: schedules for the next matching weekday", () => {
    const from = new Date(2026, 8, 12, 8, 0); // sábado
    const next = computeNextRunAt({ frequency: "weekly", timeOfDay: "09:00", dayOfWeek: 1 }, from); // segunda
    expect(next).toEqual(new Date(2026, 8, 14, 9, 0));
  });
});
