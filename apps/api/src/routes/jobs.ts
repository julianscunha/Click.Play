import * as path from "node:path";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { IntroOutroConfig, QualityTier, VideoMode } from "@clickplay/domain";
import {
  createCostApprovalGate,
  createJob,
  createProject,
  getJob,
  getProject,
  retryJob,
  startJob,
  type ClickPlayDb,
  type CostEstimateOptions,
  type JobRunnerDeps,
  type JobStatus,
} from "@clickplay/providers";
import { CAPTION_STYLES, PACING_TIERS } from "../config.js";

const ASPECT_RATIOS = ["vertical", "horizontal", "square"] as const;

/** width/height por aspectRatio — não expor width/height cru na API pra evitar resoluções arbitrárias não testadas no RemotionRenderer (§11A Bloco 2 item 2). */
const RESOLUTION_BY_ASPECT_RATIO: Record<(typeof ASPECT_RATIOS)[number], { width: number; height: number }> = {
  vertical: { width: 1080, height: 1920 },
  horizontal: { width: 1920, height: 1080 },
  square: { width: 1080, height: 1080 },
};

const CreateJobBody = z.object({
  topic: z.string().min(1, "topic é obrigatório"),
  direction: z.string().optional(),
  archetype: z.string().optional(),
  pacing: z.enum(PACING_TIERS).optional(),
  videoMode: VideoMode.optional(),
  captionStyle: z.enum(CAPTION_STYLES).optional(),
  aspectRatio: z.enum(ASPECT_RATIOS).optional(),
  qualityTier: QualityTier.optional(),
  targetDurationSeconds: z.number().positive().optional(),
  language: z.string().optional(),
  intro: IntroOutroConfig.optional(),
  outro: IntroOutroConfig.optional(),
});

const ApproveCostBody = z.object({ approved: z.boolean() });

/** Rótulo de stage pra WebUI — deriva de JobStatus, não é input livre. */
const STAGE_BY_STATUS: Record<JobStatus, string> = {
  QUEUED: "queued",
  RESEARCHING: "research",
  PLANNING: "director",
  REVIEWING: "director_review",
  AWAITING_COST_APPROVAL: "cost_approval",
  GENERATING: "tts_and_visuals",
  RENDERING: "render",
  COMPLETED: "done",
  FAILED: "failed",
  CANCELLED: "cancelled",
};

export interface JobsRouteDeps {
  db: ClickPlayDb;
  /** Chamado por job (não montado uma vez no boot) — reflete keys/modelo salvos via PUT /settings sem exigir restart. */
  buildJobRunnerDeps(tier?: QualityTier, language?: string): JobRunnerDeps;
  buildCostOptions(): CostEstimateOptions;
  runsDir: string;
  gate: ReturnType<typeof createCostApprovalGate>;
}

function jobToResponse(job: NonNullable<Awaited<ReturnType<typeof getJob>>>) {
  return {
    id: job.id,
    projectId: job.projectId,
    status: job.status,
    stage: STAGE_BY_STATUS[job.status],
    stageDetail: job.stageDetail,
    resultSummary: job.resultSummary,
    progress: job.progress,
    estimatedCost: job.estimatedCost,
    actualCost: job.actualCost,
    error: job.error,
    output: job.outputPath ? `/files/${job.projectId}/output/output.mp4` : null,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  };
}

export function registerJobsRoutes(app: FastifyInstance, deps: JobsRouteDeps): void {
  app.post("/jobs", async (req, reply) => {
    const parsed = CreateJobBody.safeParse(req.body);
    if (!parsed.success) {
      return reply
        .status(422)
        .send({ error: { code: "VALIDATION_ERROR", message: "Corpo inválido", details: parsed.error.flatten() } });
    }
    const {
      topic,
      direction,
      archetype,
      pacing,
      videoMode,
      captionStyle,
      aspectRatio,
      qualityTier,
      targetDurationSeconds,
      language,
      intro,
      outro,
    } = parsed.data;
    if (intro?.mode === "upload" || outro?.mode === "upload") {
      return reply.status(422).send({
        error: { code: "VALIDATION_ERROR", message: 'intro/outro modo "upload" ainda não implementado' },
      });
    }
    const resolution = aspectRatio ? RESOLUTION_BY_ASPECT_RATIO[aspectRatio] : undefined;

    const project = await createProject(deps.db, {
      topic,
      config: {
        cost: deps.buildCostOptions(),
        direction,
        archetype,
        pacing,
        videoMode,
        captionStyle,
        width: resolution?.width,
        height: resolution?.height,
        qualityTier,
        targetDurationSeconds,
        language,
        intro,
        outro,
      },
    });
    const runDir = path.join(deps.runsDir, project.id);
    const job = await createJob(deps.db, { projectId: project.id, runDir });

    startJob(deps.db, job.id, deps.buildJobRunnerDeps(qualityTier, language), {
      approveCost: (estimate) => deps.gate.waitForApproval(job.id),
      onLog: (message) => app.log.info({ jobId: job.id }, message),
    });

    return reply.status(201).send({ id: job.id, projectId: project.id, status: job.status });
  });

  app.get<{ Params: { id: string } }>("/jobs/:id", async (req, reply) => {
    const job = await getJob(deps.db, req.params.id);
    if (!job) return reply.status(404).send({ error: { code: "NOT_FOUND", message: "Job não encontrado" } });
    return reply.send(jobToResponse(job));
  });

  app.post<{ Params: { id: string } }>("/jobs/:id/approve-cost", async (req, reply) => {
    const parsed = ApproveCostBody.safeParse(req.body);
    if (!parsed.success) {
      return reply
        .status(422)
        .send({ error: { code: "VALIDATION_ERROR", message: "Corpo inválido", details: parsed.error.flatten() } });
    }

    const job = await getJob(deps.db, req.params.id);
    if (!job) return reply.status(404).send({ error: { code: "NOT_FOUND", message: "Job não encontrado" } });

    if (job.status !== "AWAITING_COST_APPROVAL") {
      // Idempotente: job já resolvido ou ainda não chegou lá — não dispara nada de novo.
      return reply.send({ jobId: job.id, status: job.status, applied: false });
    }

    const applied = deps.gate.resolveApproval(job.id, parsed.data.approved);
    return reply.send({ jobId: job.id, status: job.status, applied });
  });

  app.post<{ Params: { id: string } }>("/jobs/:id/retry", async (req, reply) => {
    const job = await getJob(deps.db, req.params.id);
    if (!job) return reply.status(404).send({ error: { code: "NOT_FOUND", message: "Job não encontrado" } });

    const project = await getProject(deps.db, job.projectId);
    const retried = await retryJob(
      deps.db,
      job.id,
      deps.buildJobRunnerDeps(project?.config.qualityTier, project?.config.language),
      {
        approveCost: (estimate) => deps.gate.waitForApproval(job.id),
        onLog: (message) => app.log.info({ jobId: job.id }, message),
      },
    );
    if (!retried) {
      return reply
        .status(409)
        .send({ error: { code: "NOT_RETRYABLE", message: "Job só pode ser retomado quando está FAILED" } });
    }

    return reply.send({ id: job.id, projectId: job.projectId, status: "retrying" });
  });
}
