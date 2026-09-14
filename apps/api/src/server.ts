import * as fs from "node:fs";
import * as path from "node:path";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import fastifyStatic from "@fastify/static";
import Fastify from "fastify";
import {
  createCostApprovalGate,
  type ClickPlayDb,
  type CostEstimateOptions,
  type JobRunnerDeps,
  type LLMProvider,
} from "@clickplay/providers";
import type { QualityTier } from "@clickplay/domain";
import { registerBriefingRoutes } from "./routes/briefing.js";
import { registerContentProjectsRoutes } from "./routes/content-projects.js";
import { registerCreditsRoutes } from "./routes/credits.js";
import { registerJobsRoutes } from "./routes/jobs.js";
import { registerMetaRoutes } from "./routes/meta.js";
import { registerPublishRoutes } from "./routes/publish.js";
import { registerSchedulesRoutes } from "./routes/schedules.js";
import { registerSettingsRoutes } from "./routes/settings.js";
import { registerTemplatesRoutes } from "./routes/templates.js";

export interface BuildServerOptions {
  db: ClickPlayDb;
  buildJobRunnerDeps(
    tier?: QualityTier,
    language?: string,
    useOwnProviders?: boolean,
    voiceGender?: "female" | "male",
  ): JobRunnerDeps;
  buildCostOptions(): CostEstimateOptions;
  /** Opcional — sem valor, deriva do `llm` já construído por `buildJobRunnerDeps` (mesmo provider,
   * evita exigir esse parâmetro em toda chamada de `buildServer` só por causa da rota de briefing). */
  buildLLM?(): LLMProvider;
  runsDir: string;
  envFilePath: string;
  /** Base pública da API (sem barra final) — usada como redirect_uri do OAuth do YouTube (Fase 21).
   * Precisa bater com o que está registrado no Google Cloud Console. Default: http://localhost:<PORT>. */
  publicApiUrl?: string;
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

  // methods explícito: default do @fastify/cors não incluiu PUT no preflight
  // (bug real achado em teste manual — PUT /settings falhava com "Failed to
  // fetch" no navegador porque o preflight OPTIONS não listava PUT em
  // access-control-allow-methods; curl não reproduz pois CORS é só do browser).
  app.register(cors, { origin: true, methods: ["GET", "POST", "PUT", "DELETE"] });
  app.register(rateLimit, { max: 1000, timeWindow: "1 minute" });
  // contentSecurityPolicy: false — API só serve JSON/arquivo, não HTML, CSP não se aplica.
  // crossOriginResourcePolicy "cross-origin" — vídeo (/files/*) é consumido via <video src>
  // de outra origem (web em porta diferente); o default "same-origin" do helmet bloquearia isso.
  app.register(helmet, { contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: "cross-origin" } });
  app.register(fastifyStatic, { root: opts.runsDir, prefix: "/files/" });

  // Rota dedicada pro botão "Baixar vídeo" (§11A item 9, gotcha registrado 2026-08-23): `<a download>`
  // apontando pra /files/* (servido pelo fastifyStatic acima, sem Content-Disposition) é ignorado pelo
  // browser em cross-origin dev (localhost:5173→8787) — abre o vídeo em vez de salvar. Não dá pra
  // resolver via `setHeaders` do fastifyStatic (não recebe a request, só path/stat, sem como diferenciar
  // "preview" de "download" na mesma URL) — por isso rota própria, só pra download, com Content-Disposition
  // fixo; o `<video src>` de preview continua batendo em /files/* normal, sem esse header.
  app.get<{ Params: { productionId: string } }>("/files/:productionId/output/download", async (req, reply) => {
    if (!/^[a-zA-Z0-9-]+$/.test(req.params.productionId)) {
      return reply.status(400).send({ error: { code: "INVALID_ID", message: "productionId inválido" } });
    }
    const filePath = path.join(opts.runsDir, req.params.productionId, "output", "output.mp4");
    if (!fs.existsSync(filePath)) {
      return reply.status(404).send({ error: { code: "NOT_FOUND", message: "Arquivo não encontrado" } });
    }
    reply.header("Content-Disposition", 'attachment; filename="output.mp4"').type("video/mp4");
    return reply.send(fs.createReadStream(filePath));
  });

  if (opts.apiToken) {
    const expected = `Bearer ${opts.apiToken}`;
    app.addHook("onRequest", async (req, reply) => {
      // /oauth/* é navegação direta do browser (link/redirect do Google) — nunca carrega o Bearer token.
      if (req.url === "/health" || req.url.startsWith("/files/") || req.url.startsWith("/oauth/")) return;
      if (req.headers.authorization !== expected) {
        return reply.status(401).send({ error: { code: "UNAUTHORIZED", message: "Token inválido ou ausente" } });
      }
    });
  }

  app.get("/health", async () => ({ status: "ok" }));

  registerMetaRoutes(app);
  registerSettingsRoutes(app, { envFilePath: opts.envFilePath });
  registerCreditsRoutes(app, { db: opts.db });
  registerContentProjectsRoutes(app, { db: opts.db });
  registerTemplatesRoutes(app, { db: opts.db });
  registerSchedulesRoutes(app, { db: opts.db });
  registerBriefingRoutes(app, { buildLLM: opts.buildLLM ?? (() => opts.buildJobRunnerDeps().llm) });
  registerJobsRoutes(app, {
    db: opts.db,
    buildJobRunnerDeps: opts.buildJobRunnerDeps,
    buildCostOptions: opts.buildCostOptions,
    runsDir: opts.runsDir,
    gate,
  });
  registerPublishRoutes(app, {
    db: opts.db,
    envFilePath: opts.envFilePath,
    publicApiUrl: opts.publicApiUrl ?? "http://localhost:8787",
  });

  return app;
}
