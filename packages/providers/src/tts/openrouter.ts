import { withRetry } from "../http/retry.js";
import { pcmToMp3 } from "./pcm-to-mp3.js";
import { estimateWordTimestamps } from "./gemini.js";
import type { TTSProvider, TTSResult } from "./types.js";

const SAMPLE_RATE = 24000;

/**
 * TTS via OpenRouter (/v1/audio/speech, OpenAI-compatible) — mesma
 * OPENROUTER_API_KEY já usada pro LLM de texto e pra imagem. Modelo default é
 * o mesmo Gemini já validado com PT-BR (tts/gemini.ts), só que sem exigir
 * GOOGLE_API_KEY separada. Confirmado em teste manual real: response_format
 * "pcm" (s16le, 24kHz, mono) — mesmo formato do Gemini direto, mesma
 * recodificação pra MP3.
 */
export class OpenRouterTTS implements TTSProvider {
  private apiKey: string;
  private model: string;
  private voice: string;

  constructor(model = "google/gemini-3.1-flash-tts-preview", voice = "Kore", apiKey?: string) {
    const key = apiKey ?? process.env["OPENROUTER_API_KEY"];
    if (!key) throw new Error("OPENROUTER_API_KEY environment variable is required");
    this.apiKey = key;
    this.model = model;
    this.voice = voice;
  }

  async generate(text: string): Promise<TTSResult> {
    // Rate limit transitório do provider por trás (mesmo achado da imagem/vídeo).
    return withRetry(() => this.generateOnce(text), { label: "openrouter-tts" });
  }

  private async generateOnce(text: string): Promise<TTSResult> {
    const res = await fetch("https://openrouter.ai/api/v1/audio/speech", {
      method: "POST",
      headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: this.model, input: text, voice: this.voice, response_format: "pcm" }),
    });

    if (!res.ok) {
      throw new Error(`OpenRouter TTS failed (${res.status}): ${await res.text()}`);
    }

    const pcm = Buffer.from(await res.arrayBuffer());
    const audio = await pcmToMp3(pcm, SAMPLE_RATE);
    const durationSeconds = pcm.length / 2 / SAMPLE_RATE;

    return { audio, words: estimateWordTimestamps(text, durationSeconds) };
  }
}
