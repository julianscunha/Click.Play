import { useEffect, useState } from "react";
import type { CostBreakdown, JobStatus, JobView } from "../api.js";

const STAGE_LABELS: Record<string, string> = {
  queued: "Na fila",
  research: "Pesquisando o tema",
  director: "Roteirizando",
  director_review: "Revisando roteiro",
  cost_approval: "Aguardando aprovação de custo",
  tts_and_visuals: "Gerando narração e visuais",
  render: "Renderizando vídeo",
  done: "Concluído",
  failed: "Falhou",
  cancelled: "Cancelado",
};

/** Log/tips só fazem sentido enquanto o job está de fato avançando — nesses
 * status o pipeline está pausado (aguardando decisão) ou já terminou, então
 * as duas peças somem (decisão UX Architect + UI Designer, 2026-09-14): não
 * dá pra parecer que o sistema "não percebeu" que parou/quebrou. */
const ACTIVE_STATUSES: JobStatus[] = ["QUEUED", "RESEARCHING", "PLANNING", "REVIEWING", "GENERATING", "RENDERING"];

const LOG_VISIBLE_LINES = 6;
const TIP_ROTATE_MS = 7000;

/** Destaca o prefixo "[estágio]" (recuado, fg-disabled) da mensagem em si —
 * mesma linha de log, dois tons de contraste. */
function LogLine({ text, emphasized }: { text: string; emphasized: boolean }) {
  const match = text.match(/^(\[[^\]]+\]\s*)(.*)$/);
  const prefix = match?.[1];
  const rest = match ? match[2] : text;
  return (
    <p className={`truncate font-mono text-xs leading-relaxed ${emphasized ? "text-fg-secondary" : "text-fg-tertiary"}`}>
      {prefix && <span className="text-fg-disabled">{prefix}</span>}
      {rest}
    </p>
  );
}

/** Dicas genéricas sobre o produto — sem contextualizar por estágio de propósito
 * (decisão UX Architect: ganho marginal frente ao custo de manter 2 listas
 * sincronizadas com os enums de stage). Só entretém enquanto o job roda. */
const TIPS = [
  "Arquétipos definem paleta de cor, ritmo e estilo visual de uma vez só — dá pra ver o preview de cada um na etapa Roteiro antes de gerar.",
  "Salvar um vídeo como template guarda toda a configuração (arquétipo, voz, legenda...) pra reaproveitar em produções futuras.",
  "Sem preencher chaves de imagem/vídeo por IA (Google/Fal), o sistema usa banco de imagens prontas (Pexels/Pixabay) automaticamente.",
  "O tier de qualidade \"Rascunho\" é mais rápido e mais barato — bom pra testar uma ideia antes de gerar a versão final.",
  "Cada etapa (Imagem, Vídeo, Narração...) tem sua própria cadeia de fallback configurável em Configurações — dá pra ver a ordem exata de tentativa.",
  "Agendamentos disparam um template numa cadência fixa (diária/semanal) sem precisar abrir o wizard de novo.",
  "O botão \"Gerar automaticamente\" no Briefing cria um rascunho de narração a partir só do tema, em três tamanhos (compacto/equilibrado/verboso).",
  "Legendas e narração são independentes — dá pra gerar um vídeo mudo com legenda sincronizada pelo tempo estimado do roteiro.",
  "O custo estimado aparece antes de qualquer geração de mídia começar — só a etapa de roteiro (texto) roda antes da sua aprovação.",
];

function useRotatingTip(active: boolean): string | null {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (!active) return;
    const interval = setInterval(() => setIndex((i) => (i + 1) % TIPS.length), TIP_ROTATE_MS);
    return () => clearInterval(interval);
  }, [active]);
  return active ? TIPS[index]! : null;
}

/** Erros de provider (LLM/TTS) vêm crus — stack técnica, JSON de validação, URLs de doc.
 * Traduz os padrões mais comuns pra mensagem acionável; resto cai no fallback truncado. */
export function friendlyError(raw: string): { title: string; hint?: string } {
  // Cadeia de fallback ("→" entre mensagens, tts/fallback.ts e llm/fallback.ts
  // — qualquer provider com 2 níveis) — mostrar que vários providers falharam
  // evita o usuário investigar só o último erro da cadeia, que pode não ser a causa real.
  const chained = raw.includes(" → ");
  if (chained && /guardrail/i.test(raw)) {
    return {
      title: `Todos os providers falharam — um deles foi bloqueado por Guardrails do OpenRouter (${raw.split(" → ").length} tentativas em cascata).`,
      hint: "Ajuste em https://openrouter.ai/workspaces/default/guardrails, ou veja a cadeia completa abaixo pra achar a causa real (nem sempre é a última tentativa).",
    };
  }
  if (chained) {
    return {
      title: `Todos os providers configurados falharam (${raw.split(" → ").length} tentativas em cascata).`,
      hint: "Veja a cadeia completa abaixo — a causa real pode estar numa tentativa anterior à última.",
    };
  }
  if (/guardrail/i.test(raw)) {
    return {
      title: "Provider bloqueado pelas restrições (Guardrails) da sua conta OpenRouter.",
      hint: "Ajuste em https://openrouter.ai/workspaces/default/guardrails.",
    };
  }
  if (/api_key_service_blocked|permission_denied/i.test(raw)) {
    return {
      title: "Chave de API bloqueada pelo provedor (Google/outro) pra este serviço.",
      hint: "Confirme em Configurações se a API correspondente está habilitada pra essa chave.",
    };
  }
  if (/quota|rate.?limit|429/i.test(raw)) {
    return {
      title: "Limite de uso do provedor de IA atingido (rate limit / quota).",
      hint: "Espere alguns segundos e tente de novo, ou troque a chave/modelo em Configurações.",
    };
  }
  if (/structured output/i.test(raw)) {
    return {
      title: "O modelo escolhido não suporta saída estruturada (JSON schema).",
      hint: "Comum em modelos gratuitos/experimentais no OpenRouter — troque OPENROUTER_MODEL (e o fallback) em Configurações por um modelo pago mais confiável.",
    };
  }
  if (/no output generated/i.test(raw)) {
    return {
      title: "O modelo de IA não retornou resposta.",
      hint: "Tente de novo — se persistir, troque o modelo em Configurações (modelos \"preview\"/experimentais falham mais).",
    };
  }
  if (/premature close|econnreset|fetch failed|network/i.test(raw)) {
    return {
      title: "Falha de conexão com um provedor externo.",
      hint: "Geralmente é falha pontual de rede — tente criar o vídeo de novo.",
    };
  }
  return { title: raw.length > 200 ? `${raw.slice(0, 200)}…` : raw };
}

export function costLine(label: string, amount: CostBreakdown[keyof CostBreakdown]) {
  return (
    <div key={label} className="flex justify-between text-sm text-fg-secondary">
      <span>{label}</span>
      <span>{amount.status === "known" ? `US$ ${amount.usd.toFixed(3)}` : "indisponível"}</span>
    </div>
  );
}

export interface ProgressViewProps {
  job: JobView;
  onApprove(approved: boolean): Promise<boolean>;
  approving: boolean;
  approveError: string | null;
  onRetry(): void;
  retrying: boolean;
}

export function ProgressView({ job, onApprove, approving, approveError, onRetry, retrying }: ProgressViewProps) {
  const [decided, setDecided] = useState(false);
  const percent = Math.round(job.progress * 100);
  const isActive = ACTIVE_STATUSES.includes(job.status);
  const tip = useRotatingTip(isActive);
  const logLines = job.logTail.slice(-LOG_VISIBLE_LINES);

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="flex justify-between text-sm text-fg-secondary">
          <span>{STAGE_LABELS[job.stage] ?? job.stage}</span>
          <span>{percent}%</span>
        </div>
        {job.stageDetail && <p className="text-xs text-fg-tertiary">{job.stageDetail}</p>}
        <div className="h-2 overflow-hidden rounded-full bg-surface-2">
          <div
            className="h-full rounded-full bg-fg-primary transition-all duration-500"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      {isActive && logLines.length > 0 && (
        <div className="flex h-36 flex-col justify-end gap-0.5 overflow-hidden rounded-lg border border-border-subtle bg-surface-1 p-3">
          {logLines.map((line, i) => (
            <LogLine key={i} text={line} emphasized={i === logLines.length - 1} />
          ))}
        </div>
      )}

      {job.status === "AWAITING_COST_APPROVAL" && job.estimatedCost && !decided && (
        <div className="flex flex-col gap-3 rounded-md border border-border-default bg-surface-1 p-4">
          <p className="text-sm font-medium text-fg-primary">Custo estimado</p>
          <div className="flex flex-col gap-1">
            {costLine("LLM", job.estimatedCost.llm)}
            {costLine("Narração", job.estimatedCost.tts)}
            {costLine("Imagens", job.estimatedCost.image)}
            {costLine("Vídeo", job.estimatedCost.video)}
            {costLine("Música", job.estimatedCost.music)}
            <div className="mt-1 flex justify-between border-t border-border-default pt-1 text-sm font-medium text-fg-primary">
              <span>Total</span>
              <span>
                {job.estimatedCost.total.status === "known" ? `US$ ${job.estimatedCost.total.usd.toFixed(3)}` : "—"}
              </span>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              disabled={approving}
              onClick={async () => {
                const ok = await onApprove(true);
                if (ok) setDecided(true);
              }}
              className="flex-1 rounded-md bg-fg-primary px-3 py-2 font-medium text-surface-0 hover:opacity-90 disabled:opacity-50"
            >
              Aprovar
            </button>
            <button
              type="button"
              disabled={approving}
              onClick={async () => {
                const ok = await onApprove(false);
                if (ok) setDecided(true);
              }}
              className="flex-1 rounded-md border border-border-default px-3 py-2 font-medium text-fg-primary hover:bg-surface-2 disabled:opacity-50"
            >
              Rejeitar
            </button>
          </div>
          {approveError && (
            <p role="alert" className="text-sm text-status-error">
              {approveError}
            </p>
          )}
        </div>
      )}

      {job.status === "FAILED" &&
        (() => {
          const raw = job.error ?? "Falha desconhecida.";
          const { title, hint } = friendlyError(raw);
          return (
            <div role="alert" className="flex flex-col gap-2 rounded-md border border-status-error-border bg-status-error-bg p-4 text-sm text-status-error">
              <p className="font-medium">{title}</p>
              {hint && <p className="text-status-error">{hint}</p>}
              {title !== raw && (
                <details className="text-xs text-status-error">
                  <summary className="cursor-pointer select-none">ver detalhes técnicos</summary>
                  <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-words">{raw}</pre>
                </details>
              )}
              <button
                type="button"
                disabled={retrying}
                onClick={onRetry}
                className="mt-1 self-start rounded-md bg-status-error px-3 py-1.5 font-medium text-surface-0 hover:opacity-90 disabled:opacity-50"
              >
                {retrying ? "Tentando de novo…" : "Tentar de novo"}
              </button>
            </div>
          );
        })()}

      {job.status === "CANCELLED" && (
        <div role="status" className="rounded-md border border-border-default bg-surface-1 p-4 text-sm text-fg-secondary">
          {job.error ?? "Job cancelado."}
        </div>
      )}

      {tip && (
        <p key={tip} className="animate-tip-fade border-t border-border-subtle pt-3 text-sm italic text-fg-secondary">
          <span aria-hidden className="mr-1.5 not-italic text-accent">
            ✦
          </span>
          {tip}
        </p>
      )}
    </div>
  );
}
