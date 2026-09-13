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
import { ScheduleView } from "./components/ScheduleView.js";
import { SettingsView } from "./components/SettingsView.js";
import { TokenGate } from "./components/TokenGate.js";
import { Wizard } from "./components/wizard/Wizard.js";

const POLL_INTERVAL_MS = 2000;

function FilmIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 9h18M3 15h18M8 4v16M16 4v16" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 13a7.97 7.97 0 0 0 0-2l2.1-1.6-2-3.5-2.5 1a8 8 0 0 0-1.7-1L14.9 3h-4l-.4 2.9a8 8 0 0 0-1.7 1l-2.5-1-2 3.5L6.4 11a7.97 7.97 0 0 0 0 2l-2.1 1.6 2 3.5 2.5-1a8 8 0 0 0 1.7 1l.4 2.9h4l.4-2.9a8 8 0 0 0 1.7-1l2.5 1 2-3.5L19.4 13Z" />
    </svg>
  );
}

interface RailButtonProps {
  label: string;
  active: boolean;
  onClick(): void;
  children: React.ReactNode;
}

function RailButton({ label, active, onClick, children }: RailButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      className={`flex h-12 w-12 items-center justify-center rounded-lg transition-colors ${
        active ? "bg-accent-wash text-accent" : "text-fg-tertiary hover:bg-surface-2 hover:text-fg-primary"
      }`}
    >
      {children}
    </button>
  );
}

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
  const [showSchedules, setShowSchedules] = useState(false);
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

  function goHome() {
    setShowSettings(false);
    setShowSchedules(false);
  }

  return (
    <div className="flex h-screen bg-surface-0 text-fg-primary">
      <nav className="flex w-rail shrink-0 flex-col items-center gap-1 border-r border-border-subtle py-4">
        <RailButton label="Novo vídeo" active={!showSettings && !showSchedules} onClick={goHome}>
          <FilmIcon />
        </RailButton>
        <RailButton label="Agendamentos" active={showSchedules} onClick={() => setShowSchedules(true)}>
          <ClockIcon />
        </RailButton>
        <RailButton label="Configurações" active={showSettings} onClick={() => setShowSettings(true)}>
          <GearIcon />
        </RailButton>
      </nav>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border-subtle px-6">
          <h1 className="text-lg font-semibold">Click.Play</h1>
          {credits && (
            <p className="font-mono text-xs text-fg-secondary" title="1 crédito = US$ 1">
              Saldo: <span className="font-medium text-fg-primary">{credits.balanceUsd.toFixed(2)}</span>
              <span className="mx-1.5 text-fg-disabled">·</span>
              Consumido: {credits.consumedUsd.toFixed(2)}
            </p>
          )}
        </header>

        <main className="flex-1 overflow-y-auto px-8 py-8">
          <div className="mx-auto w-full max-w-[1600px]">
            {needsToken && <TokenGate onSaved={() => window.location.reload()} />}

            {!needsToken && showSettings && <SettingsView onClose={() => setShowSettings(false)} />}

            {!needsToken && !showSettings && showSchedules && <ScheduleView onClose={() => setShowSchedules(false)} />}

            {!needsToken && !showSettings && !showSchedules && configError && (
              <p role="alert" className="text-sm text-status-error">
                Não foi possível carregar as opções do formulário: {configError}
              </p>
            )}

            {!needsToken && !showSettings && !showSchedules && !configError && !config && (
              <p className="text-sm text-fg-secondary">Carregando...</p>
            )}

            {config && !jobId && (
              <div className={`flex flex-col gap-3 ${showSettings || showSchedules ? "hidden" : ""}`}>
                <Wizard config={config} onSubmit={handleCreate} submitting={submitting} />
                {createError && (
                  <p role="alert" className="text-center text-sm text-status-error">
                    {createError}
                  </p>
                )}
              </div>
            )}

            {!showSettings && !showSchedules && job && job.status !== "COMPLETED" && (
              <ProgressView
                job={job}
                onApprove={handleApprove}
                approving={approving}
                approveError={approveError}
                onRetry={handleRetry}
                retrying={retrying}
              />
            )}

            {!showSettings && !showSchedules && job && job.status === "COMPLETED" && job.output && (
              <ResultPlayer job={job} onCreateAnother={reset} />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
