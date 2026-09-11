import { DatabaseSync } from "node:sqlite";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createDb } from "./client.js";

let dbPath: string;

beforeEach(() => {
  dbPath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "cp-client-")), "db.sqlite");
});

afterEach(() => {
  // createDb() não expõe close() no handle sqlite interno — no Windows o arquivo
  // fica locked até o processo terminar; best-effort, não falha o teste por isso.
  try {
    fs.rmSync(path.dirname(dbPath), { recursive: true, force: true });
  } catch {
    // ignora
  }
});

describe("createDb migration: projects -> productions", () => {
  it("renames an old-schema DB (projects/project_id) in place, preserving rows", () => {
    // Simula um banco criado antes do rename (§11 decisão #1, Fase 16) — DDL antigo direto, sem passar por createDb.
    const legacy = new DatabaseSync(dbPath);
    legacy.exec(`
      CREATE TABLE projects (id TEXT PRIMARY KEY, topic TEXT NOT NULL, config TEXT NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL);
      CREATE TABLE jobs (id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id), status TEXT NOT NULL DEFAULT 'QUEUED', progress REAL NOT NULL DEFAULT 0, run_dir TEXT NOT NULL, output_path TEXT, estimated_cost TEXT, actual_cost TEXT, qc_report TEXT, checkpoint TEXT, stage_detail TEXT, result_summary TEXT, error TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL);
    `);
    legacy
      .prepare("INSERT INTO projects (id, topic, config, created_at, updated_at) VALUES (?, ?, ?, ?, ?)")
      .run("p1", "Apollo 11", "{}", 1, 1);
    legacy
      .prepare(
        "INSERT INTO jobs (id, project_id, status, progress, run_dir, created_at, updated_at) VALUES (?, ?, 'QUEUED', 0, ?, ?, ?)",
      )
      .run("j1", "p1", "/tmp/run", 1, 1);
    legacy.close();

    const db = createDb(dbPath);
    const sqlite = new DatabaseSync(dbPath);
    const production = sqlite.prepare("SELECT * FROM productions WHERE id = ?").get("p1") as
      | { id: string; topic: string }
      | undefined;
    const job = sqlite.prepare("SELECT * FROM jobs WHERE id = ?").get("j1") as
      | { id: string; production_id: string }
      | undefined;

    expect(production?.topic).toBe("Apollo 11");
    expect(job?.production_id).toBe("p1");
    expect(() => sqlite.prepare("SELECT * FROM projects").get()).toThrow();

    void db;
    sqlite.close();
  });

  it("is a no-op on a fresh DB (no legacy projects table to rename)", () => {
    const db = createDb(dbPath);
    const sqlite = new DatabaseSync(dbPath);
    expect(sqlite.prepare("SELECT * FROM productions").all()).toEqual([]);
    void db;
    sqlite.close();
  });
});
