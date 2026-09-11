import { beforeEach, describe, expect, it } from "vitest";
import { createDb } from "./client.js";
import {
  createContentProject,
  createJob,
  createProduction,
  getContentProject,
  getJob,
  getProduction,
  getTemplate,
  getWallet,
  listContentProjects,
  listJobsByProduction,
  listProductionsByContentProject,
  listTemplates,
  recoverOrphanedJobs,
  setJobActualCost,
  setJobError,
  setJobEstimatedCost,
  setJobOutputPath,
  setJobQcReport,
  setWalletBalance,
  trySpend,
  updateJobStatus,
  upsertTemplate,
} from "./repository.js";
import type { ProductionConfig } from "./types.js";

const config: ProductionConfig = {
  cost: { llmModel: "openai/gpt-4.1", ttsProvider: "edge", imageProvider: "gemini", musicProvider: "bundled" },
};

describe("persistence repository", () => {
  let db: ReturnType<typeof createDb>;

  beforeEach(() => {
    db = createDb(":memory:");
  });

  it("creates and reads back a production", async () => {
    const production = await createProduction(db, { topic: "Apollo 11", config });
    const fetched = await getProduction(db, production.id);

    expect(fetched).not.toBeNull();
    expect(fetched?.topic).toBe("Apollo 11");
    expect(fetched?.config).toEqual(config);
  });

  it("returns null for a missing production", async () => {
    expect(await getProduction(db, "does-not-exist")).toBeNull();
  });

  describe("content projects (Fase 16)", () => {
    it("creates, lists and reads back a content project", async () => {
      const created = await createContentProject(db, { name: "Histórias do Joãozinho" });
      expect(await listContentProjects(db)).toEqual([created]);
      expect(await getContentProject(db, created.id)).toEqual(created);
    });

    it("returns null for a missing content project", async () => {
      expect(await getContentProject(db, "does-not-exist")).toBeNull();
    });

    it("links a production to a content project and lists it back", async () => {
      const contentProject = await createContentProject(db, { name: "Série X" });
      const production = await createProduction(db, { topic: "t", config, contentProjectId: contentProject.id });

      expect(production.contentProjectId).toBe(contentProject.id);
      const linked = await listProductionsByContentProject(db, contentProject.id);
      expect(linked).toHaveLength(1);
      expect(linked[0]!.id).toBe(production.id);
    });

    it("leaves contentProjectId null when a production has no project", async () => {
      const production = await createProduction(db, { topic: "t", config });
      expect(production.contentProjectId).toBeNull();
    });
  });

  describe("templates (Fase 17)", () => {
    it("saves a new template from a production's config, version 1", async () => {
      const production = await createProduction(db, { topic: "t", config });
      const template = await upsertTemplate(db, {
        name: "Contos infantis",
        config: production.config,
        contentProjectId: production.contentProjectId,
        sourceProductionId: production.id,
      });

      expect(template.name).toBe("Contos infantis");
      expect(template.version).toBe(1);
      expect(template.config).toEqual(config);
      expect(template.sourceProductionId).toBe(production.id);
      expect(await getTemplate(db, template.id)).toEqual(template);
      expect(await listTemplates(db)).toEqual([template]);
    });

    it("overwrites the existing template and bumps version when the name matches", async () => {
      const production1 = await createProduction(db, { topic: "t1", config });
      const first = await upsertTemplate(db, {
        name: "Contos infantis",
        config: production1.config,
        contentProjectId: null,
        sourceProductionId: production1.id,
      });

      const newConfig: ProductionConfig = { ...config, archetype: "storybook_picturebook" };
      const production2 = await createProduction(db, { topic: "t2", config: newConfig });
      const second = await upsertTemplate(db, {
        name: "Contos infantis",
        config: production2.config,
        contentProjectId: null,
        sourceProductionId: production2.id,
      });

      expect(second.id).toBe(first.id); // mesma linha, não duplicou
      expect(second.version).toBe(2);
      expect(second.config).toEqual(newConfig);
      expect(second.sourceProductionId).toBe(production2.id);
      expect(await listTemplates(db)).toHaveLength(1);
    });

    it("returns null for a missing template", async () => {
      expect(await getTemplate(db, "does-not-exist")).toBeNull();
    });
  });

  it("creates a job QUEUED with progress 0, linked to its production", async () => {
    const production = await createProduction(db, { topic: "t", config });
    const job = await createJob(db, { productionId: production.id, runDir: "/tmp/run-1" });

    expect(job.status).toBe("QUEUED");
    expect(job.progress).toBe(0);
    expect(job.productionId).toBe(production.id);

    const jobs = await listJobsByProduction(db, production.id);
    expect(jobs).toHaveLength(1);
    expect(jobs[0]!.id).toBe(job.id);
  });

  it("updateJobStatus advances status and derives progress, but preserves progress on FAILED", async () => {
    const production = await createProduction(db, { topic: "t", config });
    const job = await createJob(db, { productionId: production.id, runDir: "/tmp/run-2" });

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
    const production = await createProduction(db, { topic: "t", config });
    const job = await createJob(db, { productionId: production.id, runDir: "/tmp/run-3" });

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
    const production = await createProduction(db, { topic: "t", config });
    const job = await createJob(db, { productionId: production.id, runDir: "/tmp/run-4" });

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
    const production = await createProduction(db, { topic: "t", config });
    const stuck = await createJob(db, { productionId: production.id, runDir: "/tmp/run-5" });
    await updateJobStatus(db, stuck.id, "RENDERING");

    const done = await createJob(db, { productionId: production.id, runDir: "/tmp/run-6" });
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
