import { afterEach, describe, expect, it, vi } from "vitest";
import { OpenRouterImage } from "./openrouter.js";

describe("OpenRouterImage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("decodes the base64 image returned by the /v1/images endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ b64_json: Buffer.from("fake-image").toString("base64") }] }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const provider = new OpenRouterImage(undefined, "key");
    const result = await provider.generate("a cat");

    expect(result.toString()).toBe("fake-image");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://openrouter.ai/api/v1/images",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("throws when the API responds with an error status", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 429, text: async () => "quota exceeded" }),
    );

    const provider = new OpenRouterImage(undefined, "key");
    await expect(provider.generate("a cat")).rejects.toThrow("429");
  });

  it("throws when no image data is returned", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: [{}] }) }));

    const provider = new OpenRouterImage(undefined, "key");
    await expect(provider.generate("a cat")).rejects.toThrow("no image data");
  });

  it("throws in the constructor when no API key is available", () => {
    const original = process.env["OPENROUTER_API_KEY"];
    delete process.env["OPENROUTER_API_KEY"];
    expect(() => new OpenRouterImage()).toThrow("OPENROUTER_API_KEY");
    if (original) process.env["OPENROUTER_API_KEY"] = original;
  });
});
