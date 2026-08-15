const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8787";

export type CostAmount = { status: "known"; usd: number } | { status: "unknown"; reason: string };

export interface CostBreakdown {
  llm: CostAmount;
  tts: CostAmount;
  image: CostAmount;
  video: CostAmount;
  music: CostAmount;
  total: CostAmount;
}

export type JobStatus =
  | "QUEUED"
  | "RESEARCHING"
  | "PLANNING"
  | "REVIEWING"
  | "AWAITING_COST_APPROVAL"
  | "GENERATING"
  | "RENDERING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

export interface JobView {
  id: string;
  projectId: string;
  status: JobStatus;
  stage: string;
  progress: number;
  estimatedCost: CostBreakdown | null;
  actualCost: CostBreakdown | null;
  error: string | null;
  output: string | null;
}

export interface FormConfig {
  archetypes: string[];
  pacingTiers: readonly string[];
  captionStyles: readonly string[];
}

export interface CreateJobInput {
  topic: string;
  direction?: string;
  archetype?: string;
  pacing?: string;
  videoEnabled?: boolean;
  captionStyle?: string;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error?.message ?? `Falha na requisição (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export function getFormConfig(): Promise<FormConfig> {
  return request("/config");
}

export function createJob(input: CreateJobInput): Promise<{ id: string }> {
  return request("/jobs", { method: "POST", body: JSON.stringify(input) });
}

export function getJob(id: string): Promise<JobView> {
  return request(`/jobs/${id}`);
}

export function approveCost(id: string, approved: boolean): Promise<void> {
  return request(`/jobs/${id}/approve-cost`, { method: "POST", body: JSON.stringify({ approved }) });
}

export function outputUrl(output: string): string {
  return `${API_BASE}${output}`;
}

export type SecretField = { set: true; masked: string } | { set: false };

export interface Settings {
  OPENROUTER_API_KEY: SecretField;
  OPENROUTER_MODEL: string;
  TTS_PROVIDER: string;
  TTS_API_KEY: SecretField;
  GOOGLE_API_KEY: SecretField;
  FAL_API_KEY: SecretField;
  PEXELS_API_KEY: SecretField;
  PIXABAY_API_KEY: SecretField;
}

export function getSettings(): Promise<Settings> {
  return request("/settings");
}

export function putSettings(updates: Partial<Record<keyof Settings, string>>): Promise<{ applied: boolean }> {
  return request("/settings", { method: "PUT", body: JSON.stringify(updates) });
}
