import { describe, expect, it, vi } from "vitest";
import { createConsoleLogger } from "./logger.js";

describe("createConsoleLogger", () => {
  it("redacts sensitive fields", () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const logger = createConsoleLogger();

    logger.info("test", { apiKey: "secret-value", jobId: "123" });

    const payload = JSON.parse(logSpy.mock.calls[0]?.[0] as string);
    expect(payload.apiKey).toBe("[redacted]");
    expect(payload.jobId).toBe("123");

    logSpy.mockRestore();
  });
});
