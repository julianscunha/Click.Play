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
CREATE TABLE IF NOT EXISTS content_projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS productions (
  id TEXT PRIMARY KEY,
  topic TEXT NOT NULL,
  config TEXT NOT NULL,
  content_project_id TEXT REFERENCES content_projects(id),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  production_id TEXT NOT NULL REFERENCES productions(id),
  status TEXT NOT NULL DEFAULT 'QUEUED',
  progress REAL NOT NULL DEFAULT 0,
  run_dir TEXT NOT NULL,
  output_path TEXT,
  estimated_cost TEXT,
  actual_cost TEXT,
  qc_report TEXT,
  stage_detail TEXT,
  result_summary TEXT,
  error TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS templates (
  id TEXT PRIMARY KEY,
  content_project_id TEXT REFERENCES content_projects(id),
  name TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  config TEXT NOT NULL,
  source_production_id TEXT REFERENCES productions(id),
  variable_schema TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS wallet (
  id TEXT PRIMARY KEY,
  balance_usd REAL NOT NULL,
  consumed_usd REAL NOT NULL,
  updated_at INTEGER NOT NULL
);
`;

/** Saldo inicial em créditos (1 crédito = US$1) pra quem nunca configurou nada — evita bloquear o fluxo padrão logo na 1ª aprovação de custo. */
const DEFAULT_WALLET_BALANCE_USD = 1000;

function ensureWalletRow(sqlite: DatabaseSync): void {
  const row = sqlite.prepare("SELECT id FROM wallet WHERE id = ?").get("default");
  if (!row) {
    sqlite
      .prepare("INSERT INTO wallet (id, balance_usd, consumed_usd, updated_at) VALUES (?, ?, ?, ?)")
      .run("default", DEFAULT_WALLET_BALANCE_USD, 0, Date.now());
  }
}

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

/** Idem, coluna de contagem final (§11A Bloco 6 item 11). */
function addResultSummaryColumnIfMissing(sqlite: DatabaseSync): void {
  try {
    sqlite.exec("ALTER TABLE jobs ADD COLUMN result_summary TEXT");
  } catch {
    // já existe
  }
}

/** Idem, FK opcional pro Projeto dono da produção (Fase 16). */
function addContentProjectIdColumnIfMissing(sqlite: DatabaseSync): void {
  try {
    sqlite.exec("ALTER TABLE productions ADD COLUMN content_project_id TEXT REFERENCES content_projects(id)");
  } catch {
    // já existe
  }
}

/** Idem, schema de variáveis do template (Fase 18). */
function addVariableSchemaColumnIfMissing(sqlite: DatabaseSync): void {
  try {
    sqlite.exec("ALTER TABLE templates ADD COLUMN variable_schema TEXT");
  } catch {
    // já existe
  }
}

/**
 * Só engole o erro esperado ("já renomeado/nunca existiu") — qualquer outra
 * falha (lock de arquivo, disco cheio) tem que estourar, senão o `CREATE
 * TABLE IF NOT EXISTS` seguinte cria uma tabela nova vazia e os dados reais
 * ficam órfãos na tabela antiga, silenciosamente (achado de code review).
 */
function runIfTargetMissing(sqlite: DatabaseSync, sql: string, expectedMissing: string[]): void {
  try {
    sqlite.exec(sql);
  } catch (err) {
    if (err instanceof Error && expectedMissing.some((msg) => err.message.includes(msg))) return;
    throw err;
  }
}

function renameProjectsToProductionsIfNeeded(sqlite: DatabaseSync): void {
  runIfTargetMissing(sqlite, "ALTER TABLE projects RENAME TO productions", ["no such table: projects"]);
  // "no such table: jobs" cobre o 1º boot de sempre (nem `jobs` existe ainda, DDL roda depois).
  runIfTargetMissing(sqlite, "ALTER TABLE jobs RENAME COLUMN project_id TO production_id", [
    'no such column: "project_id"',
    "no such table: jobs",
  ]);
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
  renameProjectsToProductionsIfNeeded(sqlite);
  sqlite.exec(DDL);
  addCheckpointColumnIfMissing(sqlite);
  addStageDetailColumnIfMissing(sqlite);
  addResultSummaryColumnIfMissing(sqlite);
  addContentProjectIdColumnIfMissing(sqlite);
  addVariableSchemaColumnIfMissing(sqlite);
  ensureWalletRow(sqlite);

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
