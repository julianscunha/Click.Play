import { useEffect, useState } from "react";
import {
  approveCost,
  createJob,
  getCredits,
  getFormConfig,
  getJob,
  retryJob,
  UnauthorizedError,
  type CreateJobInput,
  type Credits,
  type FormConfig,
  type JobView,
} from "./api.js";
import { ProgressView } from "./components/ProgressView.js";
import { ResultPlayer } from "./components/ResultPlayer.js";
import { SettingsView } from "./components/SettingsView.js";
import { TokenGate } from "./components/TokenGate.js";
import { Wizard } from "./components/wizard/Wizard.js";

const POLL_INTERVAL_MS = 2000;

export function App() {
  const [config, setConfig] = useState<FormConfig | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const [needsToken, setNeedsToken] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [job, setJob] = useState<JobView | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [approving, setApproving] = useState(false);
  const [approveError, setApproveError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [credits, setCredits] = useState<Credits | null>(null);

  function refreshCredits() {
    getCredits()
      .then(setCredits)
      .catch(() => {
        // Widget de saldo é informativo — falha de rede pontual não deve travar o resto da tela.
      });
  }

  useEffect(() => {
    getFormConfig()
      .then(setConfig)
      .catch((err) => {
        if (err instanceof UnauthorizedError) setNeedsToken(true);
        else setConfigError(err instanceof Error ? err.message : String(err));
      });
    refreshCredits();
  }, []);

  useEffect(() => {
    if (!jobId) return;
    let cancelled = false;

    async function poll() {
      try {
        const next = await getJob(jobId!);
        if (!cancelled) setJob(next);
      } catch {
        // Falha de rede pontual — próximo tick tenta de novo, sem derrubar a tela.
      }
    }

    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [jobId]);

  async function handleCreate(input: CreateJobInput) {
    setSubmitting(true);
    setCreateError(null);
    try {
      const created = await createJob(input);
      setJobId(created.id);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleApprove(approved: boolean): Promise<boolean> {
    if (!jobId) return false;
    setApproving(true);
    setApproveError(null);
    try {
      await approveCost(jobId, approved);
      refreshCredits();
      return true;
    } catch (err) {
      setApproveError(err instanceof Error ? err.message : String(err));
      return false;
    } finally {
      setApproving(false);
    }
  }

  async function handleRetry() {
    if (!jobId) return;
    setRetrying(true);
    try {
      await retryJob(jobId);
    } finally {
      setRetrying(false);
    }
  }

  function reset() {
    setJobId(null);
    setJob(null);
    setCreateError(null);
  }

  return (
    <div className="min-h-screen bg-neutral-950 px-4 py-12 text-neutral-50">
      <header className="mx-auto mb-10 flex max-w-xl items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Click.Play</h1>
          <p className="text-sm text-neutral-400">Descreva o vídeo, acompanhe a produção, assista o resultado.</p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          {credits && (
            <p className="text-xs text-neutral-400" title="1 crédito = US$ 1">
              Saldo: <span className="font-medium text-neutral-100">{credits.balanceUsd.toFixed(2)}</span>
              <span className="mx-1 text-neutral-600">·</span>
              Consumido: {credits.consumedUsd.toFixed(2)}
            </p>
          )}
          {!showSettings && (
            <button onClick={() => setShowSettings(true)} className="text-sm text-neutral-400 underline">
              Configurações
            </button>
          )}
        </div>
      </header>

      <main>
        {needsToken && <TokenGate onSaved={() => window.location.reload()} />}

        {!needsToken && showSettings && <SettingsView onClose={() => setShowSettings(false)} />}

        {!needsToken && !showSettings && configError && (
          <p role="alert" className="mx-auto max-w-xl text-sm text-red-400">
            Não foi possível carregar as opções do formulário: {configError}
          </p>
        )}

        {!needsToken && !showSettings && !configError && !config && (
          <p className="mx-auto max-w-xl text-sm text-neutral-400">Carregando...</p>
        )}

        {config && !jobId && (
          <div className={`mx-auto flex max-w-3xl flex-col gap-3 ${showSettings ? "hidden" : ""}`}>
            <Wizard config={config} onSubmit={handleCreate} submitting={submitting} />
            {createError && (
              <p role="alert" className="text-center text-sm text-red-400">
                {createError}
              </p>
            )}
          </div>
        )}

        {!showSettings && job && job.status !== "COMPLETED" && (
          <ProgressView
            job={job}
            onApprove={handleApprove}
            approving={approving}
            approveError={approveError}
            onRetry={handleRetry}
            retrying={retrying}
          />
        )}

        {!showSettings && job && job.status === "COMPLETED" && job.output && (
          <ResultPlayer job={job} onCreateAnother={reset} />
        )}
      </main>
    </div>
  );
}
