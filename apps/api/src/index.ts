import * as fs from "node:fs";
import * as path from "node:path";
import * as url from "node:url";
import { createCostApprovalGate, recoverOrphanedJobs } from "@clickplay/providers";
import { buildServer } from "./server.js";
import { openDb } from "./db.js";
import { buildCostOptions, buildJobRunnerDeps, buildLLM } from "./providers.js";
import { runDueSchedules } from "./scheduler.js";

const runsDir = path.resolve(process.env.RUNS_DIR || "./data/runs");
fs.mkdirSync(runsDir, { recursive: true });
const envFilePath = path.join(path.dirname(url.fileURLToPath(import.meta.url)), "..", ".env");

const db = openDb();
/** Mesma instância passada pro server e pro runner do Scheduler (Fase 19) — um job criado por
 * agendamento precisa resolver na MESMA fila de aprovação que `POST /jobs/:id/approve-cost` consulta. */
const gate = createCostApprovalGate();
const app = buildServer({
  db,
  buildJobRunnerDeps,
  buildCostOptions,
  buildLLM: () => buildLLM("standard", false),
  runsDir,
  envFilePath,
  apiToken: process.env.API_TOKEN || undefined,
  gate,
});
const port = Number(process.env.PORT ?? 8787);

recoverOrphanedJobs(db)
  .then((count) => {
    if (count > 0) app.log.warn(`${count} job(s) órfão(s) de um restart anterior marcado(s) como FAILED`);
  })
  .catch((err) => app.log.error(err, "falha ao recuperar jobs órfãos no boot"));

/** Checa agendamentos vencidos a cada minuto (Fase 19) — in-process, mesmo processo do servidor Fastify
 * (decisão do usuário: sem worker/infra separada; se o processo cair, agendamentos pausam até reiniciar). */
const SCHEDULER_INTERVAL_MS = 60_000;
setInterval(() => {
  runDueSchedules({
    db,
    buildJobRunnerDeps,
    buildCostOptions,
    runsDir,
    gate,
    onLog: (jobId, message) => app.log.info({ jobId }, message),
    onError: (scheduleId, err) => app.log.error({ scheduleId, err }, "falha ao disparar agendamento"),
  }).catch((err) => app.log.error(err, "falha ao checar agendamentos vencidos"));
}, SCHEDULER_INTERVAL_MS);

app.listen({ port, host: "0.0.0.0" }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
