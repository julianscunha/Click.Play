import { useEffect, useState } from "react";
import { approveCost, createJob, getFormConfig, getJob, type CreateJobInput, type FormConfig, type JobView } from "./api.js";
import { CreateForm } from "./components/CreateForm.js";
import { ProgressView } from "./components/ProgressView.js";
import { ResultPlayer } from "./components/ResultPlayer.js";

const POLL_INTERVAL_MS = 2000;

export function App() {
  const [config, setConfig] = useState<FormConfig | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [job, setJob] = useState<JobView | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [approving, setApproving] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    getFormConfig()
      .then(setConfig)
      .catch((err) => setConfigError(err instanceof Error ? err.message : String(err)));
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

  async function handleApprove(approved: boolean) {
    if (!jobId) return;
    setApproving(true);
    try {
      await approveCost(jobId, approved);
    } finally {
      setApproving(false);
    }
  }

  function reset() {
    setJobId(null);
    setJob(null);
    setCreateError(null);
  }

  return (
    <div className="min-h-screen bg-neutral-950 px-4 py-12 text-neutral-50">
      <header className="mx-auto mb-10 max-w-xl">
        <h1 className="text-xl font-semibold">Click.Play</h1>
        <p className="text-sm text-neutral-400">Descreva o vídeo, acompanhe a produção, assista o resultado.</p>
      </header>

      <main>
        {configError && (
          <p role="alert" className="mx-auto max-w-xl text-sm text-red-400">
            Não foi possível carregar as opções do formulário: {configError}
          </p>
        )}

        {!configError && !config && (
          <p className="mx-auto max-w-xl text-sm text-neutral-400">Carregando...</p>
        )}

        {config && !jobId && (
          <div className="mx-auto flex max-w-xl flex-col gap-3">
            <CreateForm config={config} onSubmit={handleCreate} submitting={submitting} />
            {createError && (
              <p role="alert" className="text-sm text-red-400">
                {createError}
              </p>
            )}
          </div>
        )}

        {job && job.status !== "COMPLETED" && (
          <ProgressView job={job} onApprove={handleApprove} approving={approving} />
        )}

        {job && job.status === "COMPLETED" && job.output && (
          <ResultPlayer output={job.output} onCreateAnother={reset} />
        )}
      </main>
    </div>
  );
}
