import { toCardinal as toCardinalPtBR, toCurrency as toCurrencyPtBR } from "n2words/pt-BR";
import { toCardinal as toCardinalEnUS, toCurrency as toCurrencyEnUS } from "n2words/en-US";

/** Só o texto que vai pro TTS é normalizado — scriptLine/legenda seguem intactos
 * (a legenda deve mostrar "R$ 50", a voz deve falar "cinquenta reais"). Melhora a
 * fala em si e estabiliza estimateWordTimestamps no fallback (proporção de
 * caracteres por palavra fica mais previsível sem "R$50" como 1 token gigante). */
export function normalizeForSpeech(text: string, language = "pt-BR"): string {
  const isPtBR = language.startsWith("pt");
  const toCardinal = isPtBR ? toCardinalPtBR : toCardinalEnUS;
  const toCurrency = isPtBR ? toCurrencyPtBR : toCurrencyEnUS;

  let out = text;
  // R$50 / R$ 50,90 / $50 -> "cinquenta reais" (moeda antes do número puro, senão o
  // símbolo já vira parte do número seguinte e é consumido primeiro).
  out = out.replace(/(?:R\$|\$)\s?(\d+(?:[.,]\d+)?)/g, (_, n: string) => toCurrency(Number(n.replace(",", "."))));
  out = out.replace(/(\d+(?:[.,]\d+)?)\s?%/g, (_, n: string) => `${toCardinal(Number(n.replace(",", ".")))} ${isPtBR ? "por cento" : "percent"}`);
  return out.replace(/\b\d+\b/g, (n) => toCardinal(Number(n)));
}
