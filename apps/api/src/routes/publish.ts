import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  createPublication,
  getJob,
  getLatestPublicationForJob,
  getProduction,
  markPublicationError,
  markPublicationSuccess,
  YouTubePublisher,
  type ClickPlayDb,
} from "@clickplay/providers";
import { readEnvFile, writeEnvFile } from "../env-file.js";

const YOUTUBE_SCOPE = "https://www.googleapis.com/auth/youtube.upload";

const PublishBody = z.object({
  title: z.string().trim().min(1).optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  privacyStatus: z.enum(["private", "unlisted", "public"]).default("private"),
});

export interface PublishRouteDeps {
  db: ClickPlayDb;
  envFilePath: string;
  /** Base pública da API, usada como redirect_uri do OAuth — precisa bater com o registrado no Google Cloud Console. */
  publicApiUrl: string;
}

/**
 * Fase 21 — Publication. Só YouTube por ora (`PublishingProvider`, packages/providers/src/publish).
 * Gatilho manual (decisão do usuário): sem auto-publicação quando o job completa, o usuário clica
 * "Publicar" no ResultPlayer. `POST /jobs/:id/publish` já exige job.status === "COMPLETED" — isso
 * implica qcReport.decision !== "BLOCK" (job-runner.ts marca BLOCK como FAILED, nunca chega em
 * COMPLETED), então não precisa checar QC de novo aqui.
 */
export function registerPublishRoutes(app: FastifyInstance, deps: PublishRouteDeps): void {
  app.get("/oauth/youtube/authorize", async (_req, reply) => {
    const values = readEnvFile(deps.envFilePath);
    const clientId = values.YOUTUBE_CLIENT_ID;
    if (!clientId) {
      return reply
        .status(400)
        .send({ error: { code: "MISSING_CLIENT_ID", message: "Configure YOUTUBE_CLIENT_ID em Configurações antes de conectar." } });
    }
    const redirectUri = `${deps.publicApiUrl}/oauth/youtube/callback`;
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", YOUTUBE_SCOPE);
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "consent");
    return reply.redirect(url.toString());
  });

  app.get<{ Querystring: { code?: string; error?: string } }>("/oauth/youtube/callback", async (req, reply) => {
    if (req.query.error) return reply.type("text/html").send(`<p>Autorização negada: ${req.query.error}. Pode fechar esta aba.</p>`);
    const code = req.query.code;
    if (!code) return reply.status(400).send({ error: { code: "MISSING_CODE", message: "Callback sem code" } });

    const values = readEnvFile(deps.envFilePath);
    const clientId = values.YOUTUBE_CLIENT_ID;
    const clientSecret = values.YOUTUBE_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      return reply
        .status(400)
        .send({ error: { code: "MISSING_CREDENTIALS", message: "Configure YOUTUBE_CLIENT_ID/SECRET em Configurações." } });
    }

    const redirectUri = `${deps.publicApiUrl}/oauth/youtube/callback`;
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    });
    if (!tokenRes.ok) {
      const detail = await tokenRes.text();
      return reply.status(502).type("text/html").send(`<p>Falha ao trocar o código por token: ${detail}</p>`);
    }
    const data = (await tokenRes.json()) as { refresh_token?: string };
    if (!data.refresh_token) {
      // Google só devolve refresh_token na 1ª autorização (ou com prompt=consent, já forçado acima) —
      // se ainda assim vier vazio, a conta provavelmente já tem um token concedido; pedir pra revogar
      // o acesso do app em https://myaccount.google.com/permissions e tentar de novo.
      return reply
        .status(502)
        .type("text/html")
        .send("<p>Google não devolveu refresh_token. Revogue o acesso do app em myaccount.google.com/permissions e tente de novo.</p>");
    }
    writeEnvFile(deps.envFilePath, { YOUTUBE_REFRESH_TOKEN: data.refresh_token });
    process.env.YOUTUBE_REFRESH_TOKEN = data.refresh_token;
    return reply.type("text/html").send("<p>Conectado ao YouTube. Pode fechar esta aba.</p>");
  });

  app.get<{ Params: { id: string } }>("/jobs/:id/publication", async (req, reply) => {
    const job = await getJob(deps.db, req.params.id);
    if (!job) return reply.status(404).send({ error: { code: "NOT_FOUND", message: "Job não encontrado" } });
    const publication = await getLatestPublicationForJob(deps.db, job.id);
    return reply.send(publication);
  });

  app.post<{ Params: { id: string } }>("/jobs/:id/publish", async (req, reply) => {
    const parsed = PublishBody.safeParse(req.body);
    if (!parsed.success) {
      return reply
        .status(422)
        .send({ error: { code: "VALIDATION_ERROR", message: "Corpo inválido", details: parsed.error.flatten() } });
    }

    const job = await getJob(deps.db, req.params.id);
    if (!job) return reply.status(404).send({ error: { code: "NOT_FOUND", message: "Job não encontrado" } });
    if (job.status !== "COMPLETED" || !job.outputPath) {
      return reply.status(409).send({ error: { code: "NOT_READY", message: "Job ainda não completou com sucesso" } });
    }

    const values = readEnvFile(deps.envFilePath);
    const clientId = values.YOUTUBE_CLIENT_ID;
    const clientSecret = values.YOUTUBE_CLIENT_SECRET;
    const refreshToken = values.YOUTUBE_REFRESH_TOKEN;
    if (!clientId || !clientSecret || !refreshToken) {
      return reply.status(400).send({
        error: { code: "NOT_CONNECTED", message: "Conecte sua conta do YouTube em Configurações → Publicação antes de publicar." },
      });
    }

    const production = await getProduction(deps.db, job.productionId);
    const publication = await createPublication(deps.db, { jobId: job.id, platform: "youtube" });

    try {
      const publisher = new YouTubePublisher(clientId, clientSecret, refreshToken);
      const result = await publisher.publish({
        videoPath: job.outputPath,
        title: parsed.data.title?.trim() || production?.topic || "Vídeo Click.Play",
        description: parsed.data.description,
        tags: parsed.data.tags,
        privacyStatus: parsed.data.privacyStatus,
      });
      await markPublicationSuccess(deps.db, publication.id, result.externalUrl);
      return reply.status(201).send({ ...publication, status: "success", externalUrl: result.externalUrl });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await markPublicationError(deps.db, publication.id, message);
      return reply.status(502).send({ error: { code: "PUBLISH_FAILED", message } });
    }
  });
}
