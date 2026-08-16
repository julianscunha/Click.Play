/**
 * Toda chamada externa (LLM/TTS/imagem/vídeo/música) rodava sem timeout —
 * achado em teste manual real: job travou 2h em 15% sem erro, sem log, nada
 * (fetch pendurado). withProviderTimeout decora qualquer provider com
 * `generate(...)` pra rejeitar após `ms`, o que já é pego pelos wrappers de
 * Fallback existentes (FallbackLLM/TTS/Image/Music) — timeout do primário
 * vira "erro" comum e aciona o fallback normalmente.
 */
export function withTimeout<T>(fn: () => Promise<T>, opts: { label: string; ms: number }): Promise<T> {
  return Promise.race([
    fn(),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`[${opts.label}] timeout após ${opts.ms}ms sem resposta`)), opts.ms),
    ),
  ]);
}

/** Provider genérico com um método `generate` — cobre LLM/TTS/Image/Video/Music, cada um com assinatura própria. */
interface GenerateProvider {
  // biome-ignore lint/suspicious/noExplicitAny: assinatura varia por tipo de provider (ver types.ts de cada um)
  generate: (...args: any[]) => Promise<any>;
}

export function withProviderTimeout<T extends GenerateProvider>(provider: T, label: string, ms: number): T {
  return {
    ...provider,
    generate: (...args: Parameters<T["generate"]>) => withTimeout(() => provider.generate(...args), { label, ms }),
  };
}
