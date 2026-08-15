import type { Readable } from "node:stream";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import type { WordTimestamp } from "@clickplay/domain";
import type { TTSProvider, TTSResult } from "./types.js";

/**
 * TTS default do Click.Play (docs/IMPLEMENTATION-PLAN.md §0.1): grátis, sem
 * API key, sem conta Azure — confirmado por auditoria do "Azure TTS V1" do
 * MoneyPrinterTurbo (que é isto por baixo). Componente novo, não existe no
 * OpenReels. Word boundaries nativos (wordBoundaryEnabled), então não precisa
 * do decorator de alinhamento Whisper.
 */
export const EDGE_TTS_VOICES = {
  "pt-BR": { female: "pt-BR-FranciscaNeural", male: "pt-BR-AntonioNeural" },
  "en-US": { female: "en-US-AriaNeural", male: "en-US-GuyNeural" },
} as const;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class EdgeTTS implements TTSProvider {
  constructor(private voice: string = EDGE_TTS_VOICES["pt-BR"].female) {}

  async generate(text: string): Promise<TTSResult> {
    const maxAttempts = 3;
    let lastError: unknown;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // Achado em teste manual: 3 tentativas em sequência, sem espera, falharam
      // idênticas ("Premature close") — provável janela curta de instabilidade
      // de rede; um pequeno backoff dá tempo dela passar (mesma lógica do LLM).
      if (attempt > 0) await sleep(attempt * 3000);
      try {
        return await this.generateOnce(text);
      } catch (err) {
        // WebSocket do Edge TTS fecha sem aviso ocasionalmente ("Premature
        // close", achado em teste manual) — sem retry, 1 flake de rede derruba
        // o job inteiro depois de já ter passado por research/director/critic.
        lastError = err;
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`[edge-tts] Attempt ${attempt + 1} failed: ${msg}`);
      }
    }

    throw lastError instanceof Error ? lastError : new Error(String(lastError));
  }

  private async generateOnce(text: string): Promise<TTSResult> {
    const tts = new MsEdgeTTS();
    await tts.setMetadata(this.voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3, {
      wordBoundaryEnabled: true,
    });
    const { audioStream, metadataStream } = tts.toStream(text);

    const [audio, metadataRaw] = await Promise.all([
      streamToBuffer(audioStream),
      metadataStream ? streamToBuffer(metadataStream) : Promise.resolve(Buffer.alloc(0)),
    ]);

    return { audio, words: parseWordBoundaries(metadataRaw.toString("utf-8")) };
  }
}

async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

/**
 * Edge TTS emite eventos "WordBoundary" com Offset/Duration em ticks de
 * 100ns (convenção do serviço, não documentada no msedge-tts). Cada linha do
 * metadataStream é 1 objeto JSON com uma lista `Metadata`.
 */
export function parseWordBoundaries(raw: string): WordTimestamp[] {
  const TICKS_PER_SECOND = 10_000_000;
  const words: WordTimestamp[] = [];

  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    let parsed: { Metadata?: unknown[] };
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      continue;
    }

    for (const entry of parsed.Metadata ?? []) {
      const e = entry as { Type?: string; Data?: { Offset?: number; Duration?: number; text?: { Text?: string } } };
      if (e.Type !== "WordBoundary") continue;

      const word = e.Data?.text?.Text;
      if (!word) continue;

      const offsetTicks = e.Data?.Offset ?? 0;
      const durationTicks = e.Data?.Duration ?? 0;
      words.push({
        word,
        start: offsetTicks / TICKS_PER_SECOND,
        end: (offsetTicks + durationTicks) / TICKS_PER_SECOND,
      });
    }
  }

  return words;
}
