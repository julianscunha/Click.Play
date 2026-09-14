import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createDb, type ClickPlayDb } from "@clickplay/providers";
import { buildServer } from "./server.js";

/** Cobre o gotcha registrado (docs/IMPLEMENTATION-PLAN.md §11A item 9): download cross-origin
 * precisa de Content-Disposition: attachment, que /files/* (fastifyStatic puro) não manda. */
describe("GET /files/:productionId/output/download", () => {
  let db: ClickPlayDb;
  let runsDir: string;
  let app: ReturnType<typeof buildServer>;

  beforeEach(() => {
    db = createDb(":memory:");
    runsDir = fs.mkdtempSync(path.join(os.tmpdir(), "clickplay-download-test-"));
    app = buildServer({
      db,
      buildJobRunnerDeps: () => ({}) as never,
      buildCostOptions: () => ({}) as never,
      runsDir,
      envFilePath: path.join(runsDir, ".env"),
    });
  });

  afterEach(() => {
    fs.rmSync(runsDir, { recursive: true, force: true });
  });

  it("sends the file with Content-Disposition: attachment", async () => {
    const outputDir = path.join(runsDir, "prod-1", "output");
    fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(path.join(outputDir, "output.mp4"), "fake-mp4-bytes");

    const res = await app.inject({ method: "GET", url: "/files/prod-1/output/download" });
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-disposition"]).toBe('attachment; filename="output.mp4"');
    expect(res.body).toBe("fake-mp4-bytes");
  });

  it("404s when the file doesn't exist", async () => {
    const res = await app.inject({ method: "GET", url: "/files/does-not-exist/output/download" });
    expect(res.statusCode).toBe(404);
  });

  it("rejects a productionId with path-traversal characters", async () => {
    const res = await app.inject({ method: "GET", url: "/files/..%2F..%2Fetc/output/download" });
    expect(res.statusCode).toBe(400);
  });

  it("leaves /files/* preview (no query) without the attachment header", async () => {
    const outputDir = path.join(runsDir, "prod-2", "output");
    fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(path.join(outputDir, "output.mp4"), "fake-mp4-bytes");

    const res = await app.inject({ method: "GET", url: "/files/prod-2/output/output.mp4" });
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-disposition"]).toBeUndefined();
  });
});
