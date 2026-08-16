import { DatabaseSync } from "node:sqlite";
import { drizzle } from "drizzle-orm/sqlite-proxy";
import * as schema from "./schema.js";

export type ClickPlayDb = ReturnType<typeof drizzle<typeof schema>>;

/**
 * Sem drizzle-kit/migrations por ora (escopo mínimo, 10D): 2 tabelas, cria
 * via DDL direto no boot. Trocar por migrations quando o schema estabilizar
 * ou precisar rodar em múltiplos ambientes.
 */
const DDL = `
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  topic TEXT NOT NULL,
  config TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id),
  status TEXT NOT NULL DEFAULT 'QUEUED',
  progress REAL NOT NULL DEFAULT 0,
  run_dir TEXT NOT NULL,
  output_path TEXT,
  estimated_cost TEXT,
  actual_cost TEXT,
  qc_report TEXT,
  stage_detail TEXT,
  error TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
`;

/** Coluna adicionada após o deploy inicial — bancos existentes não ganham via CREATE TABLE IF NOT EXISTS. */
function addCheckpointColumnIfMissing(sqlite: DatabaseSync): void {
  try {
    sqlite.exec("ALTER TABLE jobs ADD COLUMN checkpoint TEXT");
  } catch {
    // já existe
  }
}

/** Idem, coluna de progresso granular por sub-etapa (§11A observabilidade). */
function addStageDetailColumnIfMissing(sqlite: DatabaseSync): void {
  try {
    sqlite.exec("ALTER TABLE jobs ADD COLUMN stage_detail TEXT");
  } catch {
    // já existe
  }
}

/**
 * `drizzle-orm/node-sqlite` ainda não existe na versão estável do pacote (só
 * em pre-release `1.0.0-beta`) — usa o adapter genérico `sqlite-proxy` com
 * `node:sqlite` (nativo do Node, sem compilação — `better-sqlite3` exige
 * Visual Studio C++ Build Tools, indisponível neste ambiente Windows).
 * `node:sqlite` devolve linhas como objeto; o proxy espera array de valores
 * na ordem das colunas — `Object.values` preserva essa ordem (chaves string
 * mantêm ordem de inserção em JS, que é a ordem do SELECT).
 */
function toRow(row: Record<string, unknown> | undefined): unknown[] {
  return row ? Object.values(row) : [];
}

/** `sqliteFilePath` pode ser um caminho de arquivo ou `:memory:` (testes). */
export function createDb(sqliteFilePath: string): ClickPlayDb {
  const sqlite = new DatabaseSync(sqliteFilePath);
  if (sqliteFilePath !== ":memory:") sqlite.exec("PRAGMA journal_mode = WAL");
  sqlite.exec(DDL);
  addCheckpointColumnIfMissing(sqlite);
  addStageDetailColumnIfMissing(sqlite);

  return drizzle(async (sqlText, params, method) => {
    const stmt = sqlite.prepare(sqlText);
    if (method === "run") {
      stmt.run(...params);
      return { rows: [] };
    }
    if (method === "get") {
      // Contrato do sqlite-proxy pra "get": `rows` É o array de valores da
      // linha (não um array de linhas) — undefined quando não há resultado.
      const row = stmt.get(...params) as Record<string, unknown> | undefined;
      return { rows: (row ? toRow(row) : undefined) as unknown[] };
    }
    const rows = stmt.all(...params) as Record<string, unknown>[];
    return { rows: rows.map(toRow) };
  }, { schema });
}
