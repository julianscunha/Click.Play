import * as fsp from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { GoogleGenAI } from "@google/genai";
import type { MusicMood } from "@clickplay/domain";
import type { MusicProvider, MusicResult } from "./types.js";

const MODEL = "lyria-3-pro-preview";
const MAX_RETRIES = 1;

/**
 * Geração de música por IA via Google Lyria 3 Pro. Pago ($0.08/música,
 * confirmado ago/2026 — não é grátis) — upgrade opcional, nunca default.
 * Default de música é BundledMusic (docs/IMPLEMENTATION-PLAN.md §Fase 7).
 *
 *   prompt ──▶ Lyria API ──▶ base64 audio ──▶ temp MP3 file
 *                  │
 *                  ├── success ──▶ return { filePath, metadata }
 *                  ├── safety filter ──▶ sanitize prompt ──▶ retry once
 *                  └── other error ──▶ throw
 */
export class LyriaMusic implements MusicProvider {
  private client: GoogleGenAI;

  constructor(apiKey?: string) {
    const key = apiKey ?? process.env["GOOGLE_API_KEY"];
    if (!key) throw new Error("GOOGLE_API_KEY is required for Lyria music generation");
    this.client = new GoogleGenAI({ apiKey: key });
  }

  // mood já está embutido no prompt gerado pelo LLM; Lyria usa o texto direto
  async generate(prompt: string, _mood: MusicMood): Promise<MusicResult> {
    let lastError: Error | null = null;
    let currentPrompt = prompt;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        return await this.callLyria(currentPrompt);
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));

        if (isFinishReasonOther(lastError)) {
          break;
        }

        if (attempt < MAX_RETRIES && isSafetyFilterError(lastError)) {
          console.warn(`[lyria] Safety filter triggered, retrying with sanitized prompt`);
          currentPrompt = sanitizePrompt(prompt);
          continue;
        }

        break;
      }
    }

    throw lastError ?? new Error("Lyria music generation failed");
  }

  private async callLyria(prompt: string): Promise<MusicResult> {
    const response = await this.client.models.generateContent({
      model: MODEL,
      contents: prompt,
      config: {
        responseModalities: ["audio", "text"],
      },
    });

    const blockReason = response.promptFeedback?.blockReason;
    if (blockReason) {
      throw new Error(`Lyria prompt blocked: ${blockReason}`);
    }

    const candidate = response.candidates?.[0];
    const finishReason = candidate?.finishReason;

    const parts = candidate?.content?.parts;
    if (!parts || parts.length === 0) {
      if (finishReason === "OTHER") {
        throw new Error(
          "Lyria returned empty response (finishReason: OTHER). " +
            "This can be a transient issue with the preview API or a non-configurable " +
            "content filter. Check the rejected prompt in the logs for content issues.",
        );
      }
      const reason = finishReason ? ` (finishReason: ${finishReason})` : "";
      throw new Error(`Lyria returned no content${reason}`);
    }

    let audioData: string | null = null;
    let audioMimeType = "audio/mp3";
    const textParts: string[] = [];

    for (const part of parts) {
      if (part.inlineData?.data) {
        audioData = part.inlineData.data;
        if (part.inlineData.mimeType) {
          audioMimeType = part.inlineData.mimeType;
        }
      }
      if (part.text) {
        textParts.push(part.text);
      }
    }

    if (!audioData) {
      throw new Error("Lyria returned no audio data");
    }

    if (!audioMimeType.includes("mp3") && !audioMimeType.includes("mpeg")) {
      console.warn(`[lyria] Unexpected audio format: ${audioMimeType} (expected audio/mp3)`);
    }

    const buffer = Buffer.from(audioData, "base64");
    const ext = audioMimeType.includes("wav") ? "wav" : "mp3";
    const tmpPath = path.join(os.tmpdir(), `clickplay-lyria-${Date.now()}.${ext}`);
    await fsp.writeFile(tmpPath, buffer);

    const metadata: Record<string, unknown> = {};
    if (textParts.length > 0) {
      metadata.lyriaResponse = textParts.join("\n");
    }

    return { filePath: tmpPath, metadata };
  }
}

/** Check if the error is a finishReason: OTHER response from the Gemini API.
 *  This is an opaque catch-all. Retrying with adjective sanitization won't help
 *  because we don't know the actual cause. */
function isFinishReasonOther(err: Error): boolean {
  return err.message.includes("finishReason: OTHER");
}

/** Check if an error is a safety filter rejection (not rate limits or network) */
function isSafetyFilterError(err: Error): boolean {
  const msg = err.message.toLowerCase();
  return (
    msg.includes("safety") ||
    msg.includes("harm") ||
    msg.includes("content policy") ||
    msg.includes("blocklist") ||
    msg.includes("prohibited") ||
    (msg.includes("blocked") && (msg.includes("safety") || msg.includes("harm") || msg.includes("content")))
  );
}

/**
 * Strip intense adjectives and potentially triggering descriptors from the prompt
 * while preserving musical structure (instruments, tempo, sections, constraints).
 */
function sanitizePrompt(prompt: string): string {
  const intensifiers = [
    "oppressive",
    "aggressive",
    "violent",
    "brutal",
    "menacing",
    "threatening",
    "sinister",
    "ominous",
    "heavy",
    "intense",
    "fierce",
    "savage",
    "relentless",
    "devastating",
    "explosive",
    "dangerous",
    "deadly",
  ];

  let sanitized = prompt;
  for (const word of intensifiers) {
    sanitized = sanitized.replace(new RegExp(`\\b${word}\\b`, "gi"), "restrained");
  }

  return sanitized;
}

export { sanitizePrompt as _sanitizePrompt };
