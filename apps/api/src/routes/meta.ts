import type { FastifyInstance } from "fastify";
import { listTracks } from "@clickplay/providers";
import { getFormConfig } from "../config.js";

/** Metadados estáticos consumidos pela WebUI (dropdowns do form + manifest de música) — sem estado, sem DB. */
export function registerMetaRoutes(app: FastifyInstance): void {
  app.get("/config", async () => getFormConfig());

  app.get("/music", async () =>
    listTracks().map((t) => ({ id: t.id, mood: t.mood, filename: t.filename, durationSec: t.durationSec })),
  );
}
