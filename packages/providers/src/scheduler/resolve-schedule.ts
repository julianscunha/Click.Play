import type { ProductionConfig } from "../persistence/types.js";

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
