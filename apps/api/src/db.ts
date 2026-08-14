import * as fs from "node:fs";
import * as path from "node:path";
import { createDb, type ClickPlayDb } from "@clickplay/providers";

/** `DATABASE_URL` é um caminho de arquivo relativo ao cwd do processo (ou `:memory:` em teste) — sem driver remoto nesta fase (10D). */
export function openDb(databaseUrl = process.env.DATABASE_URL || "./data/clickplay.sqlite"): ClickPlayDb {
  if (databaseUrl !== ":memory:") {
    fs.mkdirSync(path.dirname(databaseUrl), { recursive: true });
  }
  return createDb(databaseUrl);
}
