import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { readEnvFile, writeEnvFile } from "../env-file.js";

/** Chaves/modelo geridos pela tela de settings — resto do .env (DATABASE_URL, PORT, RUNS_DIR...) fica fora, é infra de boot, não credencial de provider. */
const SECRET_FIELDS = [
  "OPENROUTER_API_KEY",
  "GOOGLE_API_KEY",
  "FAL_API_KEY",
  "PEXELS_API_KEY",
  "PIXABAY_API_KEY",
] as const;

const PLAIN_FIELDS = [
  "OPENROUTER_MODEL",
  "OPENROUTER_MODEL_FALLBACK",
  "IMAGE_MODEL",
  "VIDEO_MODEL",
  "TTS_MODEL_FALLBACK",
  "MUSIC_PROVIDER",
] as const;

// Sem \r\n: writeEnvFile grava "KEY=valor\n" cru — um valor com quebra de
// linha injetaria uma linha .env nova (ex.: sobrescrever outra chave).
const noNewlines = z.string().regex(/^[^\r\n]*$/, "não pode conter quebra de linha");

const SettingsBody = z.object({
  OPENROUTER_API_KEY: noNewlines.optional(),
  OPENROUTER_MODEL: noNewlines.optional(),
  OPENROUTER_MODEL_FALLBACK: noNewlines.optional(),
  IMAGE_MODEL: noNewlines.optional(),
  VIDEO_MODEL: noNewlines.optional(),
  TTS_MODEL_FALLBACK: noNewlines.optional(),
  MUSIC_PROVIDER: noNewlines.optional(),
  GOOGLE_API_KEY: noNewlines.optional(),
  FAL_API_KEY: noNewlines.optional(),
  PEXELS_API_KEY: noNewlines.optional(),
  PIXABAY_API_KEY: noNewlines.optional(),
});

function mask(value: string): string {
  if (value.length <= 4) return "•".repeat(value.length);
  return `${"•".repeat(4)}${value.slice(-4)}`;
}

export interface SettingsRouteDeps {
  envFilePath: string;
}

export function registerSettingsRoutes(app: FastifyInstance, deps: SettingsRouteDeps): void {
  app.get("/settings", async () => {
    const values = readEnvFile(deps.envFilePath);
    const secrets = Object.fromEntries(
      SECRET_FIELDS.map((key) => [key, values[key] ? { set: true, masked: mask(values[key]) } : { set: false }]),
    );
    const plain = Object.fromEntries(PLAIN_FIELDS.map((key) => [key, values[key] ?? ""]));
    return { ...secrets, ...plain };
  });

  app.put("/settings", async (req, reply) => {
    const parsed = SettingsBody.safeParse(req.body);
    if (!parsed.success) {
      return reply
        .status(422)
        .send({ error: { code: "VALIDATION_ERROR", message: "Corpo inválido", details: parsed.error.flatten() } });
    }

    const updates: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed.data)) {
      if (value !== undefined) updates[key] = value;
    }
    writeEnvFile(deps.envFilePath, updates);
    for (const [key, value] of Object.entries(updates)) process.env[key] = value;

    return reply.send({ applied: true });
  });
}
