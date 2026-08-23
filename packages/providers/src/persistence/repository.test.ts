import { beforeEach, describe, expect, it } from "vitest";
import { createDb } from "./client.js";
import {
  createJob,
  createProject,
  getJob,
  getProject,
  getWallet,
  listJobsByProject,
  recoverOrphanedJobs,
  setJobActualCost,
  setJobError,
  setJobEstimatedCost,
  setJobOutputPath,
  setJobQcReport,
  setWalletBalance,
  trySpend,
  updateJobStatus,
} from "./repository.js";
import type { ProjectConfig } from "./types.js";

const config: ProjectConfig = {
  cost: { llmModel: "openai/gpt-4.1", ttsProvider: "edge", imageProvider: "gemini", musicProvider: "bundled" },
};

describe("persistence repository", () => {
  let db: ReturnType<typeof createDb>;

  beforeEach(() => {
    db = createDb(":memory:");
  });

  it("creates and reads back a project", async () => {
    const project = await createProject(db, { topic: "Apollo 11", config });
    const fetched = await getProject(db, project.id);

    expect(fetched).not.toBeNull();
    expect(fetched?.topic).toBe("Apollo 11");
    expect(fetched?.config).toEqual(config);
  });

  it("returns null for a missing project", async () => {
    expect(await getProject(db, "does-not-exist")).toBeNull();
  });

  it("creates a job QUEUED with progress 0, linked to its project", async () => {
    const project = await createProject(db, { topic: "t", config });
    const job = await createJob(db, { projectId: project.id, runDir: "/tmp/run-1" });

    expect(job.status).toBe("QUEUED");
    expect(job.progress).toBe(0);
    expect(job.projectId).toBe(project.id);

    const jobs = await listJobsByProject(db, project.id);
    expect(jobs).toHaveLength(1);
    expect(jobs[0]!.id).toBe(job.id);
  });

  it("updateJobStatus advances status and derives progress, but preserves progress on FAILED", async () => {
    const project = await createProject(db, { topic: "t", config });
    const job = await createJob(db, { projectId: project.id, runDir: "/tmp/run-2" });

    await updateJobStatus(db, job.id, "RESEARCHING");
    let fetched = await getJob(db, job.id);
    expect(fetched?.status).toBe("RESEARCHING");
    expect(fetched?.progress).toBeGreaterThan(0);

    const progressBeforeFailure = fetched!.progress;
    await updateJobStatus(db, job.id, "FAILED");
    fetched = await getJob(db, job.id);
    expect(fetched?.status).toBe("FAILED");
    expect(fetched?.progress).toBe(progressBeforeFailure);
  });

  it("persists estimated cost, actual cost, output path and error independently", async () => {
    const project = await createProject(db, { topic: "t", config });
    const job = await createJob(db, { projectId: project.id, runDir: "/tmp/run-3" });

    const estimate = { llm: { status: "known" as const, usd: 1 } } as never;
    const actual = { llm: { status: "known" as const, usd: 2 } } as never;

    await setJobEstimatedCost(db, job.id, estimate);
    await setJobActualCost(db, job.id, actual);
    await setJobOutputPath(db, job.id, "/tmp/run-3/output/output.mp4");
    await setJobError(db, job.id, "boom");

    const fetched = await getJob(db, job.id);
    expect(fetched?.estimatedCost).toEqual(estimate);
    expect(fetched?.actualCost).toEqual(actual);
    expect(fetched?.outputPath).toBe("/tmp/run-3/output/output.mp4");
    expect(fetched?.error).toBe("boom");
  });

  it("persists qc report", async () => {
    const project = await createProject(db, { topic: "t", config });
    const job = await createJob(db, { projectId: project.id, runDir: "/tmp/run-4" });

    expect((await getJob(db, job.id))?.qcReport).toBeNull();

    const qcReport = {
      decision: "WARNING" as const,
      checks: [{ id: "output_exists", severity: "block" as const, passed: true, message: "ok" }],
      generatedAt: new Date().toISOString(),
    };
    await setJobQcReport(db, job.id, qcReport);

    const fetched = await getJob(db, job.id);
    expect(fetched?.qcReport).toEqual(qcReport);
  });

  it("recoverOrphanedJobs marks non-terminal jobs FAILED and leaves terminal ones alone", async () => {
    const project = await createProject(db, { topic: "t", config });
    const stuck = await createJob(db, { projectId: project.id, runDir: "/tmp/run-5" });
    await updateJobStatus(db, stuck.id, "RENDERING");

    const done = await createJob(db, { projectId: project.id, runDir: "/tmp/run-6" });
    await updateJobStatus(db, done.id, "RESEARCHING");
    await updateJobStatus(db, done.id, "PLANNING");
    await updateJobStatus(db, done.id, "REVIEWING");
    await updateJobStatus(db, done.id, "AWAITING_COST_APPROVAL");
    await updateJobStatus(db, done.id, "GENERATING");
    await updateJobStatus(db, done.id, "RENDERING");
    await updateJobStatus(db, done.id, "COMPLETED");

    const count = await recoverOrphanedJobs(db);
    expect(count).toBe(1);

    expect((await getJob(db, stuck.id))?.status).toBe("FAILED");
    expect((await getJob(db, stuck.id))?.error).toMatch(/reiníc/);
    expect((await getJob(db, done.id))?.status).toBe("COMPLETED");
  });

  describe("wallet", () => {
    it("starts with a default balance and no consumption", async () => {
      const wallet = await getWallet(db);
      expect(wallet.balanceUsd).toBeGreaterThan(0);
      expect(wallet.consumedUsd).toBe(0);
    });

    it("trySpend debits balance and tracks consumed when there's enough credit", async () => {
      await setWalletBalance(db, 10);
      const ok = await trySpend(db, 4);

      expect(ok).toBe(true);
      const wallet = await getWallet(db);
      expect(wallet.balanceUsd).toBe(6);
      expect(wallet.consumedUsd).toBe(4);
    });

    it("trySpend refuses and leaves balance untouched when insufficient", async () => {
      await setWalletBalance(db, 3);
      const ok = await trySpend(db, 4);

      expect(ok).toBe(false);
      const wallet = await getWallet(db);
      expect(wallet.balanceUsd).toBe(3);
      expect(wallet.consumedUsd).toBe(0);
    });

    it("setWalletBalance sets an exact value, not additive", async () => {
      await setWalletBalance(db, 10);
      await setWalletBalance(db, 25);

      expect((await getWallet(db)).balanceUsd).toBe(25);
    });
  });
});
