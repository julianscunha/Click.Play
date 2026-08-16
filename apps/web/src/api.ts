const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8787";

const TOKEN_KEY = "clickplay_api_token";

export function getStoredToken(): string {
  return localStorage.getItem(TOKEN_KEY) ?? "";
}

export function setStoredToken(value: string): void {
  if (value) localStorage.setItem(TOKEN_KEY, value);
  else localStorage.removeItem(TOKEN_KEY);
}

export class UnauthorizedError extends Error {}

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
  recommendedModels: string[];
  recommendedImageModels: string[];
  recommendedVideoModels: string[];
  recommendedTtsFallbackModels: string[];
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
  const token = getStoredToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });
  if (res.status === 401) throw new UnauthorizedError("Token inválido ou ausente");
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

export function retryJob(id: string): Promise<{ id: string; status: string }> {
  return request(`/jobs/${id}/retry`, { method: "POST" });
}

export function outputUrl(output: string): string {
  return `${API_BASE}${output}`;
}

export type SecretField = { set: true; masked: string } | { set: false };

export interface Settings {
  OPENROUTER_API_KEY: SecretField;
  OPENROUTER_MODEL: string;
  OPENROUTER_MODEL_FALLBACK: string;
  IMAGE_MODEL: string;
  VIDEO_MODEL: string;
  TTS_MODEL_FALLBACK: string;
  MUSIC_PROVIDER: string;
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
