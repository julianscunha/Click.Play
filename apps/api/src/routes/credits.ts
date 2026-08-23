import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { getWallet, setWalletBalance, type ClickPlayDb } from "@clickplay/providers";

const PutCreditsBody = z.object({ balanceUsd: z.number().min(0) });

export interface CreditsRouteDeps {
  db: ClickPlayDb;
}

/** 1 crédito = US$1 (decisão do usuário) — sem billing real ainda, reabastecimento é manual via PUT (Fase 22 troca por Stripe). */
export function registerCreditsRoutes(app: FastifyInstance, deps: CreditsRouteDeps): void {
  app.get("/credits", async () => getWallet(deps.db));

  app.put("/credits", async (req, reply) => {
    const parsed = PutCreditsBody.safeParse(req.body);
    if (!parsed.success) {
      return reply
        .status(422)
        .send({ error: { code: "VALIDATION_ERROR", message: "Corpo inválido", details: parsed.error.flatten() } });
    }
    await setWalletBalance(deps.db, parsed.data.balanceUsd);
    return reply.send(await getWallet(deps.db));
  });
}
