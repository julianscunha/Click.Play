import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { BRIEFING_LENGTHS, expandBriefing, type LLMProvider } from "@clickplay/providers";

const ExpandBriefingBody = z.object({
  topic: z.string().trim().min(1, "topic é obrigatório"),
  length: z.enum(BRIEFING_LENGTHS),
  language: z.string().optional(),
});

export interface BriefingRouteDeps {
  buildLLM(): LLMProvider;
}

/** §11A Bloco 7 — botão "gerar automaticamente" do Briefing no Wizard. */
export function registerBriefingRoutes(app: FastifyInstance, deps: BriefingRouteDeps): void {
  app.post("/briefing/expand", async (req, reply) => {
    const parsed = ExpandBriefingBody.safeParse(req.body);
    if (!parsed.success) {
      return reply
        .status(422)
        .send({ error: { code: "VALIDATION_ERROR", message: "Corpo inválido", details: parsed.error.flatten() } });
    }
    try {
      const direction = await expandBriefing(deps.buildLLM(), parsed.data.topic, parsed.data.length, parsed.data.language);
      return reply.send({ direction });
    } catch (err) {
      return reply.status(502).send({
        error: { code: "LLM_ERROR", message: err instanceof Error ? err.message : String(err) },
      });
    }
  });
}
