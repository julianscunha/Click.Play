/**
 * Buffer de log em memória por job (§ tela de geração — usuário reportou
 * "ficar olhando pro nada" com só barra de progresso). Mesmo espírito
 * "sem Redis/fila" já decidido pro resto do projeto (job-runner.ts) — só
 * as últimas linhas, não histórico completo, e só enquanto o processo
 * está de pé (perde em restart, igual ao resto do estado em memória).
 *
 * ponytail: sem eviction de jobs antigos do Map — cada entrada é no máximo
 * MAX_LINES strings curtas, negligível mesmo depois de milhares de jobs.
 * Revisar se isso virar um servidor de longuíssima duração com volume alto.
 */
const MAX_LINES = 20;
const buffers = new Map<string, string[]>();

export function appendJobLog(jobId: string, message: string): void {
  const lines = buffers.get(jobId) ?? [];
  lines.push(message);
  if (lines.length > MAX_LINES) lines.shift();
  buffers.set(jobId, lines);
}

export function getJobLog(jobId: string): string[] {
  return buffers.get(jobId) ?? [];
}
