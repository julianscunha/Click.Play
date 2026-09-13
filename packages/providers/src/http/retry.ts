function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Extrai o tempo de espera que o próprio provider sugeriu no corpo do erro
 * (ex. "Please retry in ~7s", "retry after 20 seconds") — achado em teste
 * manual real: os backoffs fixos (attempt*3-4s) dos 3 pontos de retry do
 * projeto (aqui, research.ts, creative-director.ts) às vezes esperavam menos
 * que a janela de rate-limit real do provider, então a 2ª/3ª tentativa caía
 * na mesma janela e falhava de novo — "esgoelando" o provider em vez de
 * esperar o que ele pediu. `null` se o erro não menciona um tempo.
 */
export function parseSuggestedRetryDelayMs(message: string): number | null {
  const match = message.match(/retry\s+(?:in|after)\s*~?(\d+(?:\.\d+)?)\s*s(?:ec(?:ond)?s?)?/i);
  if (!match) return null;
  return Math.ceil(Number(match[1]) * 1000);
}

/**
 * Retry+backoff genérico — mesma lógica já usada em tts/edge.ts,
 * agents/research.ts e agents/creative-director.ts, extraída pra reuso pelos
 * providers OpenRouter (imagem/vídeo/TTS/música), todos sujeitos a rate limit
 * transitório (429 "retry in Ns", achado em teste manual real). Se o erro
 * trouxer um tempo sugerido, usa esse tempo (+ margem do próprio backoff) em
 * vez do backoff fixo — ver parseSuggestedRetryDelayMs.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: { label: string; maxAttempts?: number; backoffMs?: number },
): Promise<T> {
  const maxAttempts = opts.maxAttempts ?? 3;
  const backoffMs = opts.backoffMs ?? 3000;
  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) {
      const lastMsg = lastError instanceof Error ? lastError.message : String(lastError);
      const suggested = parseSuggestedRetryDelayMs(lastMsg);
      await sleep(suggested ?? attempt * backoffMs);
    }
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[${opts.label}] Attempt ${attempt + 1} failed: ${msg}`);
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}
