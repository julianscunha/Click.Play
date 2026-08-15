import type { BlackSegment } from "../media-tools/blackdetect.js";
import type { QcCheckResult } from "../types.js";

/** Segmentos pretos além da tolerância — WARNING, não bloqueia (docs/IMPLEMENTATION-PLAN.md §11/Fase 12). */
export function checkBlackdetect(segments: BlackSegment[], minDurationSeconds: number): QcCheckResult {
  const passed = segments.length === 0;
  return {
    id: "blackdetect",
    severity: "warning",
    passed,
    message: passed
      ? `Nenhum segmento preto >= ${minDurationSeconds}s`
      : `${segments.length} segmento(s) preto(s) >= ${minDurationSeconds}s detectado(s)`,
    details: { segments, minDurationSeconds, count: segments.length },
  };
}
