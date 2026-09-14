import { z } from "zod";
import type { LLMProvider } from "../llm/types.js";
import type { ProductionConfig, TemplateVariable } from "../persistence/types.js";

/**
 * Mesma lógica de `interpolateTemplateVariables` do Wizard (Fase 18, `apps/web`) — duplicada aqui de
 * propósito: o Wizard roda no navegador (não depende de `@clickplay/providers`), o Scheduler roda em
 * Node sem humano preenchendo formulário. Runtimes diferentes, sem caminho de import entre eles.
 */
export function interpolateTemplateVariables(text: string, bindings: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (match, key: string) => bindings[key]?.trim() || match);
}

/** Aplica os bindings de um agendamento sobre o config salvo do template, só em `direction` (único
 * campo de texto livre persistido em `Template.config`, ver Fase 18). */
export function resolveScheduleConfig(config: ProductionConfig, bindings: Record<string, string>): ProductionConfig {
  if (!config.direction) return config;
  return { ...config, direction: interpolateTemplateVariables(config.direction, bindings) };
}

const GeneratedVariableValue = z.object({ value: z.string() });

/**
 * Fase 20 — resolve variáveis `kind: "generative"` (Fase 18 deixou só "literal" implementado) chamando o
 * LLM 1x por variável, usando `label` como instrução (dual-propósito: também é o rótulo mostrado no
 * Wizard/ScheduleView pra "literal") — decisão de manter `TemplateVariable` com 1 campo só em vez de
 * `label`+`prompt` separados. Variáveis "literal", ou "generative" que já vieram com um binding explícito
 * (usuário sobrescreveu), não geram nada — passam direto.
 */
export async function resolveGenerativeVariables(
  llm: LLMProvider,
  variableSchema: TemplateVariable[],
  bindings: Record<string, string>,
): Promise<Record<string, string>> {
  const merged = { ...bindings };
  for (const variable of variableSchema) {
    if (variable.kind !== "generative" || merged[variable.key]?.trim()) continue;
    const result = await llm.generate({
      systemPrompt:
        "You generate a single short value for a video template variable, following the instruction given. " +
        "Reply with just the value itself — no quotes, no labels, no explanation.",
      userMessage: `Instruction: ${variable.label}`,
      schema: GeneratedVariableValue,
    });
    merged[variable.key] = result.data.value;
  }
  return merged;
}
