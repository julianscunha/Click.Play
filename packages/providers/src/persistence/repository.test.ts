import { beforeEach, describe, expect, it } from "vitest";
import { createDb } from "./client.js";
import {
  createContentProject,
  createJob,
  createProduction,
  createSchedule,
  deleteSchedule,
  getContentProject,
  getJob,
  getProduction,
  getTemplate,
  getWallet,
  listContentProjects,
  listDueSchedules,
  listProductionsByContentProject,
  listSchedules,
  listTemplates,
  markScheduleRun,
  recoverOrphanedJobs,
  setJobActualCost,
  setJobError,
  setJobEstimatedCost,
  setJobOutputPath,
  setJobQcReport,
  setScheduleEnabled,
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

  // getSchedule não é exportado pelo repository (achado em audit ponytail: 0 caller em produção,
  // só era usado por estes testes) — busca local equivalente só pra manter as asserções por id.
  async function findSchedule(id: string) {
    return (await listSchedules(db)).find((s) => s.id === id) ?? null;
  }

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

    it("overwrites across content projects — same name wins globally, not scoped by project (decisão do usuário)", async () => {
      const projectA = await createContentProject(db, { name: "Projeto A" });
      const projectB = await createContentProject(db, { name: "Projeto B" });
      const productionA = await createProduction(db, { topic: "a", config, contentProjectId: projectA.id });
      const first = await upsertTemplate(db, {
        name: "Padrão",
        config: productionA.config,
        contentProjectId: projectA.id,
        sourceProductionId: productionA.id,
      });

      const productionB = await createProduction(db, { topic: "b", config, contentProjectId: projectB.id });
      const second = await upsertTemplate(db, {
        name: "Padrão",
        config: productionB.config,
        contentProjectId: projectB.id,
        sourceProductionId: productionB.id,
      });

      // Mesma linha (não escopado por projeto) — o template de A "virou" o de B.
      expect(second.id).toBe(first.id);
      expect(second.contentProjectId).toBe(projectB.id);
      expect(second.version).toBe(2);
      expect(await listTemplates(db)).toHaveLength(1);
    });

    it("returns null for a missing template", async () => {
      expect(await getTemplate(db, "does-not-exist")).toBeNull();
    });

    it("defaults variableSchema to [] when not provided", async () => {
      const production = await createProduction(db, { topic: "t", config });
      const template = await upsertTemplate(db, {
        name: "Sem variável",
        config: production.config,
        contentProjectId: null,
        sourceProductionId: production.id,
      });

      expect(template.variableSchema).toEqual([]);
      expect(await getTemplate(db, template.id)).toEqual(template);
    });

    it("persists variableSchema (Fase 18) and keeps it across overwrite unless replaced", async () => {
      const production = await createProduction(db, { topic: "t", config });
      const withVars = await upsertTemplate(db, {
        name: "Com variável",
        config: production.config,
        contentProjectId: null,
        sourceProductionId: production.id,
        variableSchema: [{ key: "PERSONAGEM", label: "Nome do personagem" }],
      });

      expect(withVars.variableSchema).toEqual([{ key: "PERSONAGEM", label: "Nome do personagem" }]);
      expect(await getTemplate(db, withVars.id)).toEqual(withVars);

      const overwritten = await upsertTemplate(db, {
        name: "Com variável",
        config: production.config,
        contentProjectId: null,
        sourceProductionId: production.id,
      });
      expect(overwritten.variableSchema).toEqual([]);
    });
  });

  it("creates a job QUEUED with progress 0, linked to its production", async () => {
    const production = await createProduction(db, { topic: "t", config });
    const job = await createJob(db, { productionId: production.id, runDir: "/tmp/run-1" });

    expect(job.status).toBe("QUEUED");
    expect(job.progress).toBe(0);
    expect(job.productionId).toBe(production.id);
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

  describe("schedules (Fase 19)", () => {
    async function createTemplateFixture() {
      const production = await createProduction(db, { topic: "t", config });
      return upsertTemplate(db, {
        name: "Contos infantis",
        config: production.config,
        contentProjectId: null,
        sourceProductionId: production.id,
      });
    }

    it("creates a schedule enabled by default and reads it back", async () => {
      const template = await createTemplateFixture();
      const nextRunAt = new Date(2026, 8, 13, 9, 0);
      const schedule = await createSchedule(db, {
        templateId: template.id,
        topic: "Apollo 11",
        frequency: "daily",
        timeOfDay: "09:00",
        nextRunAt,
      });

      expect(schedule.enabled).toBe(true);
      expect(schedule.dayOfWeek).toBeNull();
      expect(schedule.variableBindings).toEqual({});
      expect(schedule.lastRunAt).toBeNull();
      expect(schedule.nextRunAt).toEqual(nextRunAt);
      expect(await findSchedule(schedule.id)).toEqual(schedule);
      expect(await listSchedules(db)).toEqual([schedule]);
    });

    it("persists dayOfWeek and variableBindings for weekly schedules", async () => {
      const template = await createTemplateFixture();
      const schedule = await createSchedule(db, {
        templateId: template.id,
        topic: "t",
        frequency: "weekly",
        timeOfDay: "09:00",
        dayOfWeek: 1,
        variableBindings: { PERSONAGEM: "João" },
        nextRunAt: new Date(2026, 8, 14, 9, 0),
      });

      expect(schedule.dayOfWeek).toBe(1);
      expect(schedule.variableBindings).toEqual({ PERSONAGEM: "João" });
    });

    it("setScheduleEnabled toggles the flag without touching other fields", async () => {
      const template = await createTemplateFixture();
      const schedule = await createSchedule(db, {
        templateId: template.id,
        topic: "t",
        frequency: "daily",
        timeOfDay: "09:00",
        nextRunAt: new Date(2026, 8, 13, 9, 0),
      });

      await setScheduleEnabled(db, schedule.id, false);
      expect((await findSchedule(schedule.id))?.enabled).toBe(false);

      await setScheduleEnabled(db, schedule.id, true);
      expect((await findSchedule(schedule.id))?.enabled).toBe(true);
    });

    it("deleteSchedule removes the row", async () => {
      const template = await createTemplateFixture();
      const schedule = await createSchedule(db, {
        templateId: template.id,
        topic: "t",
        frequency: "daily",
        timeOfDay: "09:00",
        nextRunAt: new Date(2026, 8, 13, 9, 0),
      });

      await deleteSchedule(db, schedule.id);
      expect(await findSchedule(schedule.id)).toBeNull();
    });

    it("listDueSchedules returns only enabled schedules with nextRunAt <= now", async () => {
      const template = await createTemplateFixture();
      const now = new Date(2026, 8, 13, 9, 0);
      const due = await createSchedule(db, {
        templateId: template.id,
        topic: "due",
        frequency: "daily",
        timeOfDay: "09:00",
        nextRunAt: new Date(2026, 8, 13, 8, 0),
      });
      const future = await createSchedule(db, {
        templateId: template.id,
        topic: "future",
        frequency: "daily",
        timeOfDay: "09:00",
        nextRunAt: new Date(2026, 8, 14, 9, 0),
      });
      const disabled = await createSchedule(db, {
        templateId: template.id,
        topic: "disabled",
        frequency: "daily",
        timeOfDay: "09:00",
        nextRunAt: new Date(2026, 8, 13, 8, 0),
      });
      await setScheduleEnabled(db, disabled.id, false);

      const dueSchedules = await listDueSchedules(db, now);
      expect(dueSchedules.map((s) => s.id)).toEqual([due.id]);
      expect(dueSchedules.map((s) => s.id)).not.toContain(future.id);
    });

    it("markScheduleRun updates lastRunAt/nextRunAt", async () => {
      const template = await createTemplateFixture();
      const schedule = await createSchedule(db, {
        templateId: template.id,
        topic: "t",
        frequency: "daily",
        timeOfDay: "09:00",
        nextRunAt: new Date(2026, 8, 13, 9, 0),
      });

      const ranAt = new Date(2026, 8, 13, 9, 0, 5);
      const nextRunAt = new Date(2026, 8, 14, 9, 0);
      await markScheduleRun(db, schedule.id, { ranAt, nextRunAt });

      const updated = await findSchedule(schedule.id);
      expect(updated?.lastRunAt).toEqual(ranAt);
      expect(updated?.nextRunAt).toEqual(nextRunAt);
    });
  });
});
