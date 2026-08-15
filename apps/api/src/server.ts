import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import fastifyStatic from "@fastify/static";
import Fastify from "fastify";
import { createCostApprovalGate, type ClickPlayDb, type CostEstimateOptions, type JobRunnerDeps } from "@clickplay/providers";
import { registerJobsRoutes } from "./routes/jobs.js";
import { registerMetaRoutes } from "./routes/meta.js";
import { registerSettingsRoutes } from "./routes/settings.js";

export interface BuildServerOptions {
  db: ClickPlayDb;
  buildJobRunnerDeps(): JobRunnerDeps;
  buildCostOptions(): CostEstimateOptions;
  runsDir: string;
  envFilePath: string;
  /** Injetável pra testes reaproveitarem o mesmo gate entre chamadas HTTP simuladas. Default: novo gate por servidor. */
  gate?: ReturnType<typeof createCostApprovalGate>;
  /** Se setado, exige `Authorization: Bearer <apiToken>` em toda rota exceto /health e /files/* (vídeo servido direto por <video src>, sem como anexar header). Sem valor: sem auth (comportamento anterior, uso localhost). */
  apiToken?: string;
}

export function buildServer(opts: BuildServerOptions) {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || "info",
      // Serializer padrão do Fastify não loga headers hoje, mas isso é
      // defesa em profundidade — não depender só disso continuar assim.
      redact: ["req.headers.authorization", "req.headers.cookie"],
    },
  });
  const gate = opts.gate ?? createCostApprovalGate();

  app.register(cors, { origin: true });
  app.register(rateLimit, { max: 1000, timeWindow: "1 minute" });
  // contentSecurityPolicy: false — API só serve JSON/arquivo, não HTML, CSP não se aplica.
  // crossOriginResourcePolicy "cross-origin" — vídeo (/files/*) é consumido via <video src>
  // de outra origem (web em porta diferente); o default "same-origin" do helmet bloquearia isso.
  app.register(helmet, { contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: "cross-origin" } });
  app.register(fastifyStatic, { root: opts.runsDir, prefix: "/files/" });

  if (opts.apiToken) {
    const expected = `Bearer ${opts.apiToken}`;
    app.addHook("onRequest", async (req, reply) => {
      if (req.url === "/health" || req.url.startsWith("/files/")) return;
      if (req.headers.authorization !== expected) {
        return reply.status(401).send({ error: { code: "UNAUTHORIZED", message: "Token inválido ou ausente" } });
      }
    });
  }

  app.get("/health", async () => ({ status: "ok" }));

  registerMetaRoutes(app);
  registerSettingsRoutes(app, { envFilePath: opts.envFilePath });
  registerJobsRoutes(app, {
    db: opts.db,
    buildJobRunnerDeps: opts.buildJobRunnerDeps,
    buildCostOptions: opts.buildCostOptions,
    runsDir: opts.runsDir,
    gate,
  });

  return app;
}
