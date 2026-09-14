/**
 * Lógica comum aos 5 wrappers `Fallback{LLM,TTS,Image,Video,Music}` (extraída num audit
 * ponytail — eram 5 classes quase idênticas): tenta o primário, loga+encadeia o erro do
 * fallback se também falhar. Encadear as duas mensagens (não só a última) é o que importa —
 * achado real: com providers em cascata, só o erro do último escondia se o primário falhou
 * pela mesma razão ou por outra completamente diferente.
 */
export async function withFallback<R>(label: string, primary: () => Promise<R>, fallback: () => Promise<R>): Promise<R> {
  try {
    return await primary();
  } catch (primaryErr) {
    const primaryMsg = primaryErr instanceof Error ? primaryErr.message : String(primaryErr);
    console.warn(`[${label}] primary failed (${primaryMsg}), trying fallback provider`);
    try {
      return await fallback();
    } catch (fallbackErr) {
      const fallbackMsg = fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr);
      throw new Error(`${primaryMsg} → ${fallbackMsg}`);
    }
  }
}
