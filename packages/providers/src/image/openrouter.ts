import { withRetry } from "../http/retry.js";
import type { ImageProvider } from "./types.js";

/**
 * Geração de imagem via OpenRouter (endpoint dedicado /v1/images, base64 no
 * campo b64_json) — mesma OPENROUTER_API_KEY já usada pro LLM de texto.
 * Achado em teste manual real: GeminiImage direto (GOOGLE_API_KEY) esbarra em
 * quota=0 pra geração de imagem sem billing habilitado no projeto Google
 * Cloud; OpenRouter revende os mesmos modelos Gemini sem essa exigência.
 */
export class OpenRouterImage implements ImageProvider {
  private apiKey: string;
  private model: string;

  constructor(model = "google/gemini-3.1-flash-lite-image", apiKey?: string) {
    const key = apiKey ?? process.env["OPENROUTER_API_KEY"];
    if (!key) throw new Error("OPENROUTER_API_KEY environment variable is required");
    this.apiKey = key;
    this.model = model;
  }

  async generate(prompt: string, style?: string): Promise<Buffer> {
    const fullPrompt = style
      ? `${prompt}. Style: ${style}. Vertical 9:16 aspect ratio, 1080x1920 pixels. No text, no watermarks.`
      : `${prompt}. Vertical 9:16 aspect ratio, 1080x1920 pixels. No text, no watermarks.`;

    // Rate limit transitório do provider por trás ("retry in Ns", achado em
    // teste manual real) — sem retry, 1 429 passageiro derruba o job inteiro.
    return withRetry(() => this.generateOnce(fullPrompt), { label: "openrouter-image" });
  }

  private async generateOnce(fullPrompt: string): Promise<Buffer> {
    const res = await fetch("https://openrouter.ai/api/v1/images", {
      method: "POST",
      headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: this.model, prompt: fullPrompt }),
    });

    if (!res.ok) {
      throw new Error(`OpenRouter image generation failed (${res.status}): ${await res.text()}`);
    }

    const body = (await res.json()) as { data?: Array<{ b64_json?: string }> };
    const b64 = body.data?.[0]?.b64_json;
    if (!b64) throw new Error("OpenRouter returned no image data");

    return Buffer.from(b64, "base64");
  }
}
