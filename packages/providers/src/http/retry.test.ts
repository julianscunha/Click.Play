import { describe, expect, it, vi } from "vitest";
import { RateLimitedError, parseSuggestedRetryDelayMs, retryDelayMsFromHeaders, withRetry } from "./retry.js";

describe("retryDelayMsFromHeaders", () => {
  it("reads Retry-After in seconds", () => {
    expect(retryDelayMsFromHeaders(new Headers({ "retry-after": "9" }))).toBe(9000);
  });

  it("reads Retry-After as an HTTP date", () => {
    const future = new Date(Date.now() + 5000).toUTCString();
    const ms = retryDelayMsFromHeaders(new Headers({ "retry-after": future }));
    expect(ms).toBeGreaterThan(4000);
    expect(ms).toBeLessThanOrEqual(5000);
  });

  it("falls back to X-RateLimit-Reset (epoch ms) when Retry-After is absent", () => {
    const resetAt = Date.now() + 3000;
    const ms = retryDelayMsFromHeaders(new Headers({ "x-ratelimit-reset": String(resetAt) }));
    expect(ms).toBeGreaterThan(2000);
    expect(ms).toBeLessThanOrEqual(3000);
  });

  it("returns undefined when neither header is present", () => {
    expect(retryDelayMsFromHeaders(new Headers())).toBeUndefined();
  });
});

describe("parseSuggestedRetryDelayMs", () => {
  it("extracts seconds from 'Please retry in ~7s'", () => {
    expect(parseSuggestedRetryDelayMs("Google AI Studio... Please retry in ~7s")).toBe(7000);
  });

  it("extracts seconds from 'retry after 20 seconds'", () => {
    expect(parseSuggestedRetryDelayMs("rate limited, retry after 20 seconds")).toBe(20000);
  });

  it("returns null when the message has no suggested delay", () => {
    expect(parseSuggestedRetryDelayMs("No output generated")).toBeNull();
  });
});

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

  it("waits the provider-suggested delay instead of the fixed backoff", async () => {
    vi.useFakeTimers();
    const fn = vi.fn().mockRejectedValueOnce(new Error("Please retry in ~7s")).mockResolvedValueOnce("ok");
    const promise = withRetry(fn, { label: "test", backoffMs: 1 });

    await vi.advanceTimersByTimeAsync(6999);
    expect(fn).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(fn).toHaveBeenCalledTimes(2);

    await expect(promise).resolves.toBe("ok");
    vi.useRealTimers();
  });

  it("prefers RateLimitedError.retryAfterMs over the fixed backoff and over text parsing", async () => {
    vi.useFakeTimers();
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new RateLimitedError("429 (no retry hint in text)", 4000))
      .mockResolvedValueOnce("ok");
    const promise = withRetry(fn, { label: "test", backoffMs: 1 });

    await vi.advanceTimersByTimeAsync(3999);
    expect(fn).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(fn).toHaveBeenCalledTimes(2);

    await expect(promise).resolves.toBe("ok");
    vi.useRealTimers();
  });

  it("gives up after maxAttempts and throws the last error", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("still failing"));
    await expect(withRetry(fn, { label: "test", backoffMs: 1, maxAttempts: 3 })).rejects.toThrow(
      "still failing",
    );
    expect(fn).toHaveBeenCalledTimes(3);
  });
});
