import * as fsp from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { withRetry } from "../http/retry.js";
import type { MusicMood, MusicProvider, MusicResult } from "./types.js";

/**
 * Música por IA via OpenRouter (Lyria, chat/completions com modalities
 * ["text","audio"], streaming SSE obrigatório — endpoint dedicado /v1/images
 * ou /v1/audio/speech não cobre música, só imagem/TTS). Mesma
 * OPENROUTER_API_KEY já obrigatória, sem exigir GOOGLE_API_KEY separada.
 *
 * NÃO validado ao vivo: modelo bateu quota=0 do Google (billing não
 * habilitado no projeto do OpenRouter) em todo teste manual feito até agora
 * — mesmo bloqueio que o Lyria direto (music/lyria.ts). Parser SSE escrito
 * só a partir da doc oficial (openrouter.ai/docs/guides/overview/multimodal/audio).
 * Se o formato real da resposta divergir, este provider quebra — próximo
 * teste real (billing habilitado) precisa confirmar.
 */
export class OpenRouterMusic implements MusicProvider {
  private apiKey: string;
  private model: string;

  constructor(model = "google/lyria-3-pro-preview", apiKey?: string) {
    const key = apiKey ?? process.env["OPENROUTER_API_KEY"];
    if (!key) throw new Error("OPENROUTER_API_KEY environment variable is required");
    this.apiKey = key;
    this.model = model;
  }

  async generate(prompt: string, _mood: MusicMood): Promise<MusicResult> {
    // Rate limit transitório do provider por trás (mesmo achado da imagem/vídeo/TTS).
    return withRetry(() => this.generateOnce(prompt), { label: "openrouter-music" });
  }

  private async generateOnce(prompt: string): Promise<MusicResult> {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.model,
        messages: [{ role: "user", content: prompt }],
        modalities: ["text", "audio"],
        audio: { format: "wav" },
        stream: true,
      }),
    });

    if (!res.ok || !res.body) {
      throw new Error(`OpenRouter music generation failed (${res.status}): ${await res.text()}`);
    }

    const audioChunks: string[] = [];
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice("data: ".length).trim();
        if (data === "[DONE]") continue;

        const chunk = JSON.parse(data) as { choices?: Array<{ delta?: { audio?: { data?: string } } }> };
        const audioData = chunk.choices?.[0]?.delta?.audio?.data;
        if (audioData) audioChunks.push(audioData);
      }
    }

    if (audioChunks.length === 0) throw new Error("OpenRouter music generation returned no audio data");

    const buffer2 = Buffer.from(audioChunks.join(""), "base64");
    const tmpPath = path.join(os.tmpdir(), `clickplay-openrouter-music-${Date.now()}.wav`);
    await fsp.writeFile(tmpPath, buffer2);

    return { filePath: tmpPath };
  }
}
