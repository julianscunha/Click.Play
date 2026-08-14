/**
 * Estimativa de custo (Fase 10A). Nunca assume custo zero pra provider/modelo
 * sem preço listado — representa explicitamente como "unknown" em vez de 0
 * (docs/IMPLEMENTATION-PLAN.md §Fase 10, decisão do usuário).
 */
export type CostAmount = { status: "known"; usd: number } | { status: "unknown"; reason: string };

export interface CostBreakdown {
  llm: CostAmount;
  tts: CostAmount;
  image: CostAmount;
  video: CostAmount;
  music: CostAmount;
  /** unknown se qualquer componente acima for unknown — nunca soma parcial silenciosamente. */
  total: CostAmount;
  details: {
    llmCalls: number;
    ttsCharacters: number;
    aiImages: number;
    aiVideos: number;
  };
}

export function knownUsd(usd: number): CostAmount {
  return { status: "known", usd };
}

export function unknownCost(reason: string): CostAmount {
  return { status: "unknown", reason };
}

export function sumCostAmounts(amounts: CostAmount[]): CostAmount {
  const unknown = amounts.find((a) => a.status === "unknown");
  if (unknown) return unknownCost(`componente com custo desconhecido: ${unknown.reason}`);
  const usd = amounts.reduce((sum, a) => sum + (a as { status: "known"; usd: number }).usd, 0);
  return knownUsd(usd);
}
