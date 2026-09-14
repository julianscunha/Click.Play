import type { Readable } from "node:stream";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import type { WordTimestamp } from "@clickplay/domain";
import type { TTSProvider, TTSResult, TTSSegment } from "./types.js";

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

/** Catálogo ampliado (nomes reais de vozes neurais Edge, por locale) — usado só quando
 * um `voiceId` explícito é passado a `resolveEdgeVoice` (ex. escolha por arquétipo).
 * Sem isso, o produto ficava travado nas 4 vozes fixas de EDGE_TTS_VOICES. */
export const EDGE_VOICE_CATALOG: Record<string, { id: string; gender: "female" | "male"; style?: string }[]> = {
  "pt-BR": [
    { id: "pt-BR-FranciscaNeural", gender: "female", style: "warm" },
    { id: "pt-BR-AntonioNeural", gender: "male", style: "narration" },
    { id: "pt-BR-BrendaNeural", gender: "female", style: "energetic" },
    { id: "pt-BR-DonatoNeural", gender: "male", style: "calm" },
  ],
  "en-US": [
    { id: "en-US-AriaNeural", gender: "female", style: "warm" },
    { id: "en-US-GuyNeural", gender: "male", style: "narration" },
    { id: "en-US-JennyNeural", gender: "female", style: "energetic" },
    { id: "en-US-DavisNeural", gender: "male", style: "calm" },
  ],
};

/** Voz Edge pro idioma+gênero do job (§11A Bloco 3, Fase 15 Narração) — idioma fora do mapa (ainda só pt-BR/en-US) cai em pt-BR sem erro, não trava o job por typo/idioma não coberto.
 * `voiceId` explícito (ex. escolha por arquétipo) vence sobre o default de gênero. */
export function resolveEdgeVoice(language?: string, gender: "female" | "male" = "female", voiceId?: string): string {
  if (voiceId) return voiceId;
  const entry = language && language in EDGE_TTS_VOICES ? EDGE_TTS_VOICES[language as keyof typeof EDGE_TTS_VOICES] : undefined;
  return (entry ?? EDGE_TTS_VOICES["pt-BR"])[gender];
}

function escapeXml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function normalizeSegments(input: string | TTSSegment[]): TTSSegment[] {
  return typeof input === "string" ? [{ text: input }] : input;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class EdgeTTS implements TTSProvider {
  constructor(private voice: string = EDGE_TTS_VOICES["pt-BR"].female) {}

  async generate(input: string | TTSSegment[]): Promise<TTSResult> {
    const segments = normalizeSegments(input);
    const maxAttempts = 3;
    let lastError: unknown;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // Achado em teste manual: 3 tentativas em sequência, sem espera, falharam
      // idênticas ("Premature close") — provável janela curta de instabilidade
      // de rede; um pequeno backoff dá tempo dela passar (mesma lógica do LLM).
      if (attempt > 0) await sleep(attempt * 3000);
      try {
        return await this.generateOnce(segments);
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

  /** SSML manual via `rawToStream` (sem wrapping automático da lib) — necessário só pra
   * variar `rate`/`pitch`, que `toStream` (assinatura só aceita string) não permite.
   *
   * IMPORTANTE (achado em teste manual real contra o serviço, não simulado): este
   * endpoint reverso do Edge TTS aceita SÓ UM elemento filho de texto dentro de
   * `<voice>` — qualquer coisa além disso quebra a geração com "Stream closed before
   * the synthesis completed (no turn.end received)": 2+ `<prosody>` irmãos, `<break>`
   * (em qualquer posição, com qualquer atributo), `<emphasis>`, `<mstts:silence>`,
   * `<mark>`, até `<prosody>` aninhado dentro de `<prosody>`. Confirmado com múltiplas
   * chamadas reais, não é flake. Por isso: 1 único `<prosody>` envolvendo TODO o texto
   * concatenado (mesmo formato usado pelo `toStream` original da lib), pausa maior
   * aproximada por reticências no texto (mesma técnica já usada em `flattenSegments`,
   * gemini.ts/openrouter.ts) em vez de `<break>` real, e SEM `<emphasis>` — não há como
   * aplicar ênfase vocal real nesta API. `emphasisWords` continua populando a ênfase
   * VISUAL da legenda (scene-timing.ts resolveEmphasisIndices), que não depende de SSML. */
  buildSSML(segments: TTSSegment[]): string {
    const rate = segments[0]?.rate ?? "default";
    const pitch = segments[0]?.pitch ?? "default";
    const text = segments
      .map((seg, i) => {
        const isLast = i === segments.length - 1;
        const body = escapeXml(seg.text);
        return !isLast && seg.pauseAfterMs && seg.pauseAfterMs >= 500 ? `${body}...` : body;
      })
      .join(" ");
    // Locale extraído do próprio nome da voz (ex. "pt-BR-FranciscaNeural" -> "pt-BR").
    const locale = this.voice.split("-").slice(0, 2).join("-");
    return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${locale}"><voice name="${this.voice}"><prosody rate="${rate}" pitch="${pitch}">${text}</prosody></voice></speak>`;
  }

  private async generateOnce(segments: TTSSegment[]): Promise<TTSResult> {
    const tts = new MsEdgeTTS();
    await tts.setMetadata(this.voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3, {
      wordBoundaryEnabled: true,
    });
    const { audioStream, metadataStream } = tts.rawToStream(this.buildSSML(segments));

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
