function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry+backoff genérico — mesma lógica já usada em tts/edge.ts,
 * agents/research.ts e agents/creative-director.ts, extraída pra reuso pelos
 * providers OpenRouter (imagem/vídeo/TTS/música), todos sujeitos a rate limit
 * transitório (429 "retry in Ns", achado em teste manual real).
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: { label: string; maxAttempts?: number; backoffMs?: number },
): Promise<T> {
  const maxAttempts = opts.maxAttempts ?? 3;
  const backoffMs = opts.backoffMs ?? 3000;
  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) await sleep(attempt * backoffMs);
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
