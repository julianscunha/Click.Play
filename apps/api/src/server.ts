import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import Fastify from "fastify";
import { createCostApprovalGate, type ClickPlayDb, type CostEstimateOptions, type JobRunnerDeps } from "@clickplay/providers";
import { registerJobsRoutes } from "./routes/jobs.js";
import { registerMetaRoutes } from "./routes/meta.js";

export interface BuildServerOptions {
  db: ClickPlayDb;
  jobRunnerDeps: JobRunnerDeps;
  costOptions: CostEstimateOptions;
  runsDir: string;
  /** Injetável pra testes reaproveitarem o mesmo gate entre chamadas HTTP simuladas. Default: novo gate por servidor. */
  gate?: ReturnType<typeof createCostApprovalGate>;
}

export function buildServer(opts: BuildServerOptions) {
  const app = Fastify({ logger: true });
  const gate = opts.gate ?? createCostApprovalGate();

  app.register(cors, { origin: true });
  app.register(fastifyStatic, { root: opts.runsDir, prefix: "/files/" });

  app.get("/health", async () => ({ status: "ok" }));

  registerMetaRoutes(app);
  registerJobsRoutes(app, {
    db: opts.db,
    jobRunnerDeps: opts.jobRunnerDeps,
    costOptions: opts.costOptions,
    runsDir: opts.runsDir,
    gate,
  });

  return app;
}
