import * as fs from "node:fs";
import * as path from "node:path";
import { buildServer } from "./server.js";
import { openDb } from "./db.js";
import { buildJobRunnerDeps, costOptions } from "./providers.js";

const runsDir = path.resolve(process.env.RUNS_DIR || "./data/runs");
fs.mkdirSync(runsDir, { recursive: true });

const app = buildServer({
  db: openDb(),
  jobRunnerDeps: buildJobRunnerDeps(),
  costOptions,
  runsDir,
});
const port = Number(process.env.PORT ?? 8787);

app.listen({ port, host: "0.0.0.0" }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
