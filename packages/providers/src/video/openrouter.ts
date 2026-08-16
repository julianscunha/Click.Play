import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import type { VideoGenerationProvider, VideoResult } from "./types.js";

const POLL_INTERVAL_MS = 5_000;
const TIMEOUT_MS = 180_000;

interface VideoJobStatus {
  id: string;
  status: "pending" | "running" | "completed" | "failed" | "cancelled" | "expired";
  polling_url?: string;
  unsigned_urls?: string[];
  error?: string;
}

/**
 * Veo via OpenRouter (/v1/videos, submit+poll+download) — mesma
 * OPENROUTER_API_KEY já usada pro LLM/imagem/TTS, sem exigir GOOGLE_API_KEY
 * separada. Mesmo modelo (google/veo-3.1-lite) já usado em video/gemini.ts.
 */
export class OpenRouterVideo implements VideoGenerationProvider {
  private apiKey: string;
  private model: string;

  readonly supportedDurations = [4, 6, 8];

  constructor(model = "google/veo-3.1-lite", apiKey?: string) {
    const key = apiKey ?? process.env["OPENROUTER_API_KEY"];
    if (!key) throw new Error("OPENROUTER_API_KEY environment variable is required for video generation");
    this.apiKey = key;
    this.model = model;
  }

  async generate(opts: {
    sourceImage: Buffer;
    prompt: string;
    durationSeconds?: number;
    aspectRatio?: string;
    negativePrompt?: string;
  }): Promise<VideoResult> {
    const durationSeconds = opts.durationSeconds ?? 6;
    const aspectRatio = opts.aspectRatio ?? "9:16";

    if (opts.negativePrompt) {
      console.warn(`[video] negativePrompt ignored: ${this.model} via OpenRouter does not support it`);
    }

    const submitRes = await this.request("POST", "https://openrouter.ai/api/v1/videos", {
      model: this.model,
      prompt: opts.prompt,
      duration: durationSeconds,
      resolution: "720p",
      aspect_ratio: aspectRatio,
      generate_audio: false,
      frame_images: [
        {
          type: "image_url",
          image_url: { url: `data:image/png;base64,${opts.sourceImage.toString("base64")}` },
          frame_type: "first_frame",
        },
      ],
    });
    let status = (await submitRes.json()) as VideoJobStatus;

    const deadline = Date.now() + TIMEOUT_MS;
    while (status.status === "pending" || status.status === "running") {
      if (Date.now() > deadline) {
        throw new Error(`OpenRouter video generation timed out after ${TIMEOUT_MS / 1000}s`);
      }
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      const pollUrl = status.polling_url ?? `https://openrouter.ai/api/v1/videos/${status.id}`;
      const pollRes = await this.request("GET", pollUrl);
      status = (await pollRes.json()) as VideoJobStatus;
    }

    if (status.status !== "completed") {
      throw new Error(`OpenRouter video generation ${status.status}: ${status.error ?? "unknown error"}`);
    }

    const downloadUrl = status.unsigned_urls?.[0] ?? `https://openrouter.ai/api/v1/videos/${status.id}/content?index=0`;
    // unsigned_urls costuma apontar pra CDN de terceiro com URL já assinada —
    // mandar Authorization nela pode ser rejeitado; só autentica chamadas de
    // volta pra openrouter.ai (achado no cookbook oficial de video-generation).
    const videoRes = downloadUrl.startsWith("https://openrouter.ai/api/")
      ? await this.request("GET", downloadUrl)
      : await fetch(downloadUrl).then((res) => {
          if (!res.ok) throw new Error(`OpenRouter video download failed (${res.status})`);
          return res;
        });
    const videoBuffer = Buffer.from(await videoRes.arrayBuffer());

    const tmpPath = path.join(os.tmpdir(), `clickplay-openrouter-video-${Date.now()}.mp4`);
    fs.writeFileSync(tmpPath, videoBuffer);
    if (fs.statSync(tmpPath).size === 0) {
      throw new Error("OpenRouter video download produced empty file");
    }

    return { filePath: tmpPath, durationSeconds };
  }

  private async request(method: "GET" | "POST", url: string, body?: unknown): Promise<Response> {
    const res = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      throw new Error(`OpenRouter video request failed (${res.status}): ${await res.text()}`);
    }
    return res;
  }
}
