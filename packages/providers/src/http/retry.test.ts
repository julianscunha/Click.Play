import { describe, expect, it, vi } from "vitest";
import { withRetry } from "./retry.js";

describe("withRetry", () => {
  it("returns the result on the first success, no retry", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    const result = await withRetry(fn, { label: "test", backoffMs: 1 });
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries after a transient failure and succeeds", async () => {
    const fn = vi.fn().mockRejectedValueOnce(new Error("429")).mockResolvedValueOnce("ok");
    const result = await withRetry(fn, { label: "test", backoffMs: 1 });
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("gives up after maxAttempts and throws the last error", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("still failing"));
    await expect(withRetry(fn, { label: "test", backoffMs: 1, maxAttempts: 3 })).rejects.toThrow(
      "still failing",
    );
    expect(fn).toHaveBeenCalledTimes(3);
  });
});
