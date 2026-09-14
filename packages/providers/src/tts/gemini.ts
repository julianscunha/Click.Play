import { GoogleGenAI, Modality } from "@google/genai";
import type { WordTimestamp } from "@clickplay/domain";
import { pcmToMp3 } from "./pcm-to-mp3.js";
import type { TTSProvider, TTSResult, TTSSegment } from "./types.js";

/** Nem Gemini nem OpenRouter TTS suportam SSML custom (Gemini aceita instrução em
 * texto natural, OpenRouter é passthrough REST) — achata os segmentos de volta pra
 * texto plano, aproximando a pausa maior (pré-CTA) por reticências. Sem pausa real
 * nem prosódia real nesses dois fallbacks (ponytail: limitação conhecida, upgrade
 * quando algum provider de fallback suportar SSML). */
export function flattenSegments(input: string | TTSSegment[]): string {
  if (typeof input === "string") return input;
  return input
    .map((seg, i) => {
      const isLast = i === input.length - 1;
      if (isLast || !seg.pauseAfterMs) return seg.text;
      return seg.pauseAfterMs >= 500 ? `${seg.text}...` : seg.text;
    })
    .join(" ");
}

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

  async generate(input: string | TTSSegment[]): Promise<TTSResult> {
    const text = flattenSegments(input);
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

    return { audio, words: estimateWordTimestamps(text, durationSeconds), estimatedTiming: true };
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

