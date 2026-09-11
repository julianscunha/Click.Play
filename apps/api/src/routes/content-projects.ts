import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  createContentProject,
  getContentProject,
  listContentProjects,
  listProductionsByContentProject,
  type ClickPlayDb,
} from "@clickplay/providers";

const CreateContentProjectBody = z.object({ name: z.string().trim().min(1, "name é obrigatório") });

export interface ContentProjectsRouteDeps {
  db: ClickPlayDb;
}

/** "Projeto" (Fase 16) — contêiner agrupando produções de um mesmo canal/série. Template/Scheduler (17/19) ainda não existem, sem rota pra isso aqui. */
export function registerContentProjectsRoutes(app: FastifyInstance, deps: ContentProjectsRouteDeps): void {
  app.get("/content-projects", async () => listContentProjects(deps.db));

  app.post("/content-projects", async (req, reply) => {
    const parsed = CreateContentProjectBody.safeParse(req.body);
    if (!parsed.success) {
      return reply
        .status(422)
        .send({ error: { code: "VALIDATION_ERROR", message: "Corpo inválido", details: parsed.error.flatten() } });
    }
    const contentProject = await createContentProject(deps.db, parsed.data);
    return reply.status(201).send(contentProject);
  });

  app.get<{ Params: { id: string } }>("/content-projects/:id", async (req, reply) => {
    const contentProject = await getContentProject(deps.db, req.params.id);
    if (!contentProject) {
      return reply.status(404).send({ error: { code: "NOT_FOUND", message: "Projeto não encontrado" } });
    }
    const productions = await listProductionsByContentProject(deps.db, req.params.id);
    return reply.send({ ...contentProject, productions });
  });
}
