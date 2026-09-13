import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { getProduction, getTemplate, listTemplates, upsertTemplate, type ClickPlayDb } from "@clickplay/providers";

const SaveTemplateBody = z.object({
  name: z.string().trim().min(1, "name é obrigatório"),
  productionId: z.string().min(1, "productionId é obrigatório"),
  /** Fase 18: variáveis {{key}} interpoladas em `config.direction` ao usar o template. */
  variableSchema: z
    .array(z.object({ key: z.string().trim().min(1), label: z.string().trim().min(1) }))
    .optional(),
});

export interface TemplatesRouteDeps {
  db: ClickPlayDb;
}

/** "Template" (Fase 17) — config de produção salvo/reaproveitável, sem tela dedicada de gerenciamento
 * nesta rodada (decisão do usuário, mesmo padrão de Projeto na Fase 16). */
export function registerTemplatesRoutes(app: FastifyInstance, deps: TemplatesRouteDeps): void {
  app.get("/templates", async () => listTemplates(deps.db));

  app.post("/templates", async (req, reply) => {
    const parsed = SaveTemplateBody.safeParse(req.body);
    if (!parsed.success) {
      return reply
        .status(422)
        .send({ error: { code: "VALIDATION_ERROR", message: "Corpo inválido", details: parsed.error.flatten() } });
    }
    const production = await getProduction(deps.db, parsed.data.productionId);
    if (!production) {
      return reply.status(404).send({ error: { code: "NOT_FOUND", message: "Produção não encontrada" } });
    }
    const template = await upsertTemplate(deps.db, {
      name: parsed.data.name,
      config: production.config,
      contentProjectId: production.contentProjectId,
      sourceProductionId: production.id,
      variableSchema: parsed.data.variableSchema,
    });
    return reply.status(201).send(template);
  });

  app.get<{ Params: { id: string } }>("/templates/:id", async (req, reply) => {
    const template = await getTemplate(deps.db, req.params.id);
    if (!template) {
      return reply.status(404).send({ error: { code: "NOT_FOUND", message: "Template não encontrado" } });
    }
    return reply.send(template);
  });
}
