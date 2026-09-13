import { useEffect, useState } from "react";
import {
  createSchedule,
  deleteSchedule,
  getTemplate,
  listSchedules,
  listTemplates,
  setScheduleEnabled,
  type Schedule,
  type ScheduleFrequency,
  type TemplateSummary,
  type TemplateVariable,
} from "../api.js";

export interface ScheduleViewProps {
  onClose(): void;
}

const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

const fieldClass =
  "rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-50 placeholder:text-neutral-500 focus:border-neutral-400 focus:outline-none";
const labelClass = "text-sm font-medium text-neutral-200";

function formatNextRun(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function NewScheduleForm({ templates, onCreated }: { templates: TemplateSummary[]; onCreated(s: Schedule): void }) {
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? "");
  const [topic, setTopic] = useState("");
  const [frequency, setFrequency] = useState<ScheduleFrequency>("daily");
  const [timeOfDay, setTimeOfDay] = useState("09:00");
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [templateVariables, setTemplateVariables] = useState<TemplateVariable[]>([]);
  const [variableBindings, setVariableBindings] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setVariableBindings({});
    if (!templateId) {
      setTemplateVariables([]);
      return;
    }
    getTemplate(templateId)
      .then((t) => setTemplateVariables(t.variableSchema))
      .catch(() => setTemplateVariables([]));
  }, [templateId]);

  async function handleCreate() {
    if (!templateId || !topic.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      const schedule = await createSchedule({
        templateId,
        topic: topic.trim(),
        frequency,
        timeOfDay,
        dayOfWeek: frequency === "weekly" ? dayOfWeek : undefined,
        variableBindings: templateVariables.length > 0 ? variableBindings : undefined,
      });
      onCreated(schedule);
      setTopic("");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  if (templates.length === 0) {
    return (
      <p className="text-sm text-neutral-400">
        Nenhum template salvo ainda — salve um a partir de uma produção concluída antes de criar um agendamento.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-md border border-neutral-800 bg-neutral-900/50 p-4">
      <p className="text-sm font-medium text-neutral-100">Novo agendamento</p>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="scheduleTemplate" className={labelClass}>
          Template
        </label>
        <select id="scheduleTemplate" value={templateId} onChange={(e) => setTemplateId(e.target.value)} className={fieldClass}>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
              {t.version > 1 ? ` (v${t.version})` : ""}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="scheduleTopic" className={labelClass}>
          Tema
        </label>
        <input
          id="scheduleTopic"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Ex: A história da chegada à Lua"
          className={fieldClass}
        />
      </div>
      {templateVariables.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className={labelClass}>Variáveis do template</p>
          {templateVariables.map((v) => (
            <div key={v.key} className="flex flex-col gap-1.5">
              <label htmlFor={`sched-var-${v.key}`} className="text-xs text-neutral-400">
                {v.label}
              </label>
              <input
                id={`sched-var-${v.key}`}
                value={variableBindings[v.key] ?? ""}
                onChange={(e) => setVariableBindings((b) => ({ ...b, [v.key]: e.target.value }))}
                className={fieldClass}
              />
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="scheduleFrequency" className={labelClass}>
            Frequência
          </label>
          <select
            id="scheduleFrequency"
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as ScheduleFrequency)}
            className={fieldClass}
          >
            <option value="daily">Diariamente</option>
            <option value="weekly">Semanalmente</option>
          </select>
        </div>
        {frequency === "weekly" && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="scheduleDay" className={labelClass}>
              Dia da semana
            </label>
            <select
              id="scheduleDay"
              value={dayOfWeek}
              onChange={(e) => setDayOfWeek(Number(e.target.value))}
              className={fieldClass}
            >
              {WEEKDAYS.map((label, i) => (
                <option key={i} value={i}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="scheduleTime" className={labelClass}>
            Horário
          </label>
          <input
            id="scheduleTime"
            type="time"
            value={timeOfDay}
            onChange={(e) => setTimeOfDay(e.target.value)}
            className={fieldClass}
          />
        </div>
      </div>
      <button
        type="button"
        onClick={handleCreate}
        disabled={saving || !topic.trim()}
        className="self-start rounded-md border border-neutral-600 px-3 py-2 text-sm font-medium text-neutral-200 hover:bg-neutral-800 disabled:opacity-50"
      >
        {saving ? "Criando..." : "Criar agendamento"}
      </button>
      {error && (
        <p role="alert" className="text-xs text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}

export function ScheduleView({ onClose }: ScheduleViewProps) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    Promise.all([listSchedules(), listTemplates()])
      .then(([s, t]) => {
        setSchedules(s);
        setTemplates(t);
      })
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false));
  }

  useEffect(refresh, []);

  async function handleToggle(schedule: Schedule) {
    await setScheduleEnabled(schedule.id, !schedule.enabled);
    refresh();
  }

  async function handleDelete(schedule: Schedule) {
    await deleteSchedule(schedule.id);
    refresh();
  }

  function templateName(templateId: string): string {
    return templates.find((t) => t.id === templateId)?.name ?? "(template apagado)";
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-neutral-50">Agendamentos</h2>
        <button type="button" onClick={onClose} className="text-sm text-neutral-400 underline">
          Voltar
        </button>
      </div>

      {loading && <p className="text-sm text-neutral-400">Carregando...</p>}
      {error && (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      )}

      {!loading && !error && (
        <>
          <NewScheduleForm templates={templates} onCreated={() => refresh()} />

          <div className="flex flex-col gap-2">
            {schedules.length === 0 && <p className="text-sm text-neutral-500">Nenhum agendamento criado ainda.</p>}
            {schedules.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between gap-3 rounded-md border border-neutral-800 bg-neutral-900/50 p-3"
              >
                <div className="flex flex-col gap-0.5">
                  <p className="text-sm font-medium text-neutral-100">{s.topic}</p>
                  <p className="text-xs text-neutral-500">
                    {templateName(s.templateId)} · {s.frequency === "daily" ? "diário" : `semanal (${WEEKDAYS[s.dayOfWeek ?? 0]})`}{" "}
                    às {s.timeOfDay} · próxima execução: {formatNextRun(s.nextRunAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggle(s)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium ${
                      s.enabled
                        ? "border-emerald-600 bg-emerald-950 text-emerald-400"
                        : "border-neutral-700 text-neutral-500"
                    }`}
                  >
                    {s.enabled ? "Ativo" : "Pausado"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(s)}
                    className="text-xs text-neutral-500 underline hover:text-red-400"
                  >
                    Apagar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
