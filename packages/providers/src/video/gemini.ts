import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { GoogleGenAI } from "@google/genai";
import type { VideoGenerationProvider, VideoResult } from "./types.js";

const POLL_INTERVAL_MS = 5_000;
const TIMEOUT_MS = 180_000;

/** Veo, via Gemini API. Adaptado de OpenReels src/providers/video/gemini.ts (MIT), reaproveitado quase 1:1. */
export class GeminiVideo implements VideoGenerationProvider {
  private client: GoogleGenAI;
  private model: string;

  readonly supportedDurations = [4, 6, 8];

  constructor(model = "veo-3.1-lite-generate-preview", apiKey?: string) {
    const key = apiKey ?? process.env["GOOGLE_API_KEY"];
    if (!key) throw new Error("GOOGLE_API_KEY environment variable is required for video generation");
    this.client = new GoogleGenAI({ apiKey: key });
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
      console.warn(`[video] negativePrompt ignored: ${this.model} does not support it`);
    }

    let operation = await this.client.models.generateVideos({
      model: this.model,
      prompt: opts.prompt,
      image: { imageBytes: opts.sourceImage.toString("base64"), mimeType: "image/png" },
      config: { numberOfVideos: 1, durationSeconds, aspectRatio },
    });

    const deadline = Date.now() + TIMEOUT_MS;
    while (!operation.done) {
      if (Date.now() > deadline) {
        throw new Error(`Veo video generation timed out after ${TIMEOUT_MS / 1000}s`);
      }
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      operation = await this.client.operations.getVideosOperation({ operation });
    }

    if (operation.error) {
      throw new Error(`Veo video generation failed: ${JSON.stringify(operation.error)}`);
    }

    const generatedVideo = operation.response?.generatedVideos?.[0];
    if (!generatedVideo) {
      throw new Error("Veo returned no generated video");
    }

    const tmpPath = path.join(os.tmpdir(), `clickplay-veo-${Date.now()}.mp4`);
    await this.client.files.download({ file: generatedVideo, downloadPath: tmpPath });

    if (!fs.existsSync(tmpPath) || fs.statSync(tmpPath).size === 0) {
      throw new Error("Veo video download produced empty file");
    }

    return { filePath: tmpPath, durationSeconds };
  }
}
