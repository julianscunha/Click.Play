import { describe, expect, it } from "vitest";
import { withProviderTimeout, withTimeout } from "./timeout.js";

describe("withTimeout", () => {
  it("resolves normally when fn finishes before the timeout", async () => {
    const result = await withTimeout(() => Promise.resolve("ok"), { label: "test", ms: 50 });
    expect(result).toBe("ok");
  });

  it("rejects when fn takes longer than the timeout", async () => {
    const hang = () => new Promise<string>((resolve) => setTimeout(() => resolve("too late"), 100));
    await expect(withTimeout(hang, { label: "test", ms: 10 })).rejects.toThrow(/timeout/);
  });
});

describe("withProviderTimeout", () => {
  it("preserves other provider properties (e.g. id)", () => {
    const provider = { id: "openrouter", generate: async () => "ok" };
    const decorated = withProviderTimeout(provider, "test", 50);
    expect(decorated.id).toBe("openrouter");
  });

  it("rejects generate() once the timeout elapses, without cancelling other calls", async () => {
    const provider = {
      generate: () => new Promise<string>((resolve) => setTimeout(() => resolve("too late"), 100)),
    };
    const decorated = withProviderTimeout(provider, "test", 10);
    await expect(decorated.generate()).rejects.toThrow(/timeout/);
  });

  it("forwards arguments to the wrapped generate()", async () => {
    const provider = { generate: async (text: string) => `echo:${text}` };
    const decorated = withProviderTimeout(provider, "test", 50);
    await expect(decorated.generate("hi")).resolves.toBe("echo:hi");
  });
});
