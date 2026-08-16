import * as fs from "node:fs";
import * as path from "node:path";
import * as url from "node:url";
import { recoverOrphanedJobs } from "@clickplay/providers";
import { buildServer } from "./server.js";
import { openDb } from "./db.js";
import { buildCostOptions, buildJobRunnerDeps } from "./providers.js";

const runsDir = path.resolve(process.env.RUNS_DIR || "./data/runs");
fs.mkdirSync(runsDir, { recursive: true });
const envFilePath = path.join(path.dirname(url.fileURLToPath(import.meta.url)), "..", ".env");

const db = openDb();
const app = buildServer({
  db,
  buildJobRunnerDeps,
  buildCostOptions,
  runsDir,
  envFilePath,
  apiToken: process.env.API_TOKEN || undefined,
});
const port = Number(process.env.PORT ?? 8787);

recoverOrphanedJobs(db)
  .then((count) => {
    if (count > 0) app.log.warn(`${count} job(s) órfão(s) de um restart anterior marcado(s) como FAILED`);
  })
  .catch((err) => app.log.error(err, "falha ao recuperar jobs órfãos no boot"));

app.listen({ port, host: "0.0.0.0" }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
