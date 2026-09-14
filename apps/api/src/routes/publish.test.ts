import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDb, createJob, createProduction, setJobOutputPath, updateJobStatus, type ClickPlayDb } from "@clickplay/providers";
import { buildServer } from "../server.js";
import { writeEnvFile } from "../env-file.js";

async function buildCompletedJob(db: ClickPlayDb, outputPath: string) {
  const production = await createProduction(db, { topic: "Como fazer pão caseiro", config: {} as never });
  const job = await createJob(db, { productionId: production.id, runDir: "/tmp/run" });
  await setJobOutputPath(db, job.id, outputPath);
  await updateJobStatus(db, job.id, "COMPLETED");
  return job;
}

describe("publish routes", () => {
  let db: ClickPlayDb;
  let envFilePath: string;
  let videoPath: string;
  let app: ReturnType<typeof buildServer>;

  beforeEach(() => {
    db = createDb(":memory:");
    envFilePath = path.join(os.tmpdir(), `clickplay-publish-test-${Date.now()}.env`);
    videoPath = path.join(os.tmpdir(), `clickplay-publish-video-${Date.now()}.mp4`);
    fs.writeFileSync(videoPath, "fake-mp4");
    app = buildServer({
      db,
      buildJobRunnerDeps: () => ({}) as never,
      buildCostOptions: () => ({}) as never,
      runsDir: os.tmpdir(),
      envFilePath,
      publicApiUrl: "http://localhost:8787",
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fs.rmSync(envFilePath, { force: true });
    fs.rmSync(videoPath, { force: true });
  });

  it("rejects publish when the job hasn't completed", async () => {
    const production = await createProduction(db, { topic: "t", config: {} as never });
    const job = await createJob(db, { productionId: production.id, runDir: "/tmp/run" });

    const res = await app.inject({ method: "POST", url: `/jobs/${job.id}/publish`, payload: {} });
    expect(res.statusCode).toBe(409);
  });

  it("rejects publish when YouTube isn't connected", async () => {
    const job = await buildCompletedJob(db, videoPath);

    const res = await app.inject({ method: "POST", url: `/jobs/${job.id}/publish`, payload: {} });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe("NOT_CONNECTED");
  });

  it("publishes to YouTube and persists the publication, defaulting title to the production topic", async () => {
    writeEnvFile(envFilePath, {
      YOUTUBE_CLIENT_ID: "id",
      YOUTUBE_CLIENT_SECRET: "secret",
      YOUTUBE_REFRESH_TOKEN: "refresh",
    });
    const job = await buildCompletedJob(db, videoPath);

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: "tok" }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: "xyz789" }) });
    vi.stubGlobal("fetch", fetchMock);

    const res = await app.inject({ method: "POST", url: `/jobs/${job.id}/publish`, payload: {} });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.status).toBe("success");
    expect(body.externalUrl).toBe("https://www.youtube.com/watch?v=xyz789");
    expect(fetchMock.mock.calls[1]![1].body.toString()).toContain('"title":"Como fazer pão caseiro"');

    const getRes = await app.inject({ method: "GET", url: `/jobs/${job.id}/publication` });
    expect(getRes.json().externalUrl).toBe("https://www.youtube.com/watch?v=xyz789");
  });

  it("records the error and returns 502 when the upload fails", async () => {
    writeEnvFile(envFilePath, {
      YOUTUBE_CLIENT_ID: "id",
      YOUTUBE_CLIENT_SECRET: "secret",
      YOUTUBE_REFRESH_TOKEN: "refresh",
    });
    const job = await buildCompletedJob(db, videoPath);

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 401, text: async () => "invalid_grant" }));

    const res = await app.inject({ method: "POST", url: `/jobs/${job.id}/publish`, payload: {} });
    expect(res.statusCode).toBe(502);

    const getRes = await app.inject({ method: "GET", url: `/jobs/${job.id}/publication` });
    expect(getRes.json().status).toBe("error");
  });
});
