import { spawn } from "node:child_process";
import { GoogleGenAI, Modality } from "@google/genai";
import ffmpegPath from "ffmpeg-static";
import type { WordTimestamp } from "@clickplay/domain";
import type { TTSProvider, TTSResult } from "./types.js";

const SAMPLE_RATE = 24000;

/**
 * Fallback do EdgeTTS (achado em teste manual: WebSocket do Edge cai
 * intermitentemente, "Premature close") — REST simples, sem streaming longo,
 * mesma GOOGLE_API_KEY já usada pra imagem. Cota é por modelo
 * (confirmado: erro de quota nomeia o modelo na métrica), não compartilhada
 * com o modelo de texto.
 *
 * Sem timestamp por palavra nativo (diferente do Edge) — estima
 * proporcionalmente por tamanho de palavra, mesmo espírito do fallback já
 * usado em pipeline/scene-timing.ts quando o TTS não bate 1:1 com o script.
 */
export class GeminiTTS implements TTSProvider {
  private client: GoogleGenAI;
  private model: string;
  private voice: string;

  constructor(model = "gemini-3.1-flash-tts-preview", voice = "Kore", apiKey?: string) {
    const key = apiKey ?? process.env["GOOGLE_API_KEY"];
    if (!key) throw new Error("GOOGLE_API_KEY environment variable is required");
    this.client = new GoogleGenAI({ apiKey: key });
    this.model = model;
    this.voice = voice;
  }

  async generate(text: string): Promise<TTSResult> {
    const response = await this.client.models.generateContent({
      model: this.model,
      contents: text,
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: this.voice } } },
      },
    });

    const data = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!data) throw new Error("Gemini TTS returned no audio data");

    const pcm = Buffer.from(data, "base64");
    const audio = await pcmToMp3(pcm, SAMPLE_RATE);
    const durationSeconds = pcm.length / 2 / SAMPLE_RATE;

    return { audio, words: estimateWordTimestamps(text, durationSeconds) };
  }
}

/** Divide a duração total proporcionalmente ao tamanho de cada palavra (aproximação — sem dado real de timing). */
export function estimateWordTimestamps(text: string, durationSeconds: number): WordTimestamp[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const totalChars = words.reduce((sum, w) => sum + w.length, 0) || 1;

  let cursor = 0;
  return words.map((word) => {
    const start = cursor;
    cursor += (word.length / totalChars) * durationSeconds;
    return { word, start, end: cursor };
  });
}

/** Gemini devolve PCM cru (s16le, mono) — o pipeline escreve sempre em voiceover.mp3 (orchestrator.ts), então recodifica aqui em vez de mudar o contrato pro resto do código por causa de 1 provider. */
function pcmToMp3(pcm: Buffer, sampleRate: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegPath!, [
      "-f",
      "s16le",
      "-ar",
      String(sampleRate),
      "-ac",
      "1",
      "-i",
      "pipe:0",
      "-f",
      "mp3",
      "pipe:1",
    ]);
    const chunks: Buffer[] = [];
    proc.stdout.on("data", (chunk: Buffer) => chunks.push(chunk));
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code !== 0) reject(new Error(`ffmpeg pcm->mp3 falhou (code ${code})`));
      else resolve(Buffer.concat(chunks));
    });
    proc.stdin.write(pcm);
    proc.stdin.end();
  });
}
