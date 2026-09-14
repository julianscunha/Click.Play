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

export interface ResultSummary {
  imageCount: number;
  videoClipCount: number;
  audioSeconds: number;
  /** true = legenda gerada com timing estimado (fallback TTS sem WordBoundary real). */
  narrationTimingEstimated: boolean;
}

export type QcDecision = "PASS" | "WARNING" | "BLOCK";

export interface QcCheckResult {
  id: string;
  severity: "block" | "warning";
  passed: boolean;
  message: string;
  details?: Record<string, unknown>;
}

export interface QcReport {
  decision: QcDecision;
  checks: QcCheckResult[];
  generatedAt: string;
}

export interface JobView {
  id: string;
  productionId: string;
  status: JobStatus;
  stage: string;
  stageDetail: string | null;
  resultSummary: ResultSummary | null;
  qcReport: QcReport | null;
  progress: number;
  estimatedCost: CostBreakdown | null;
  actualCost: CostBreakdown | null;
  error: string | null;
  output: string | null;
  logTail: string[];
}

export interface ArchetypePreview {
  mood: string;
  artStyle: string;
  scenePacing: string;
  colorPalette: { background: string; accent: string; text: string };
}

export interface PacingPreview {
  scenes: string;
  wordsPerScene: string;
}

export interface FormConfig {
  archetypes: string[];
  pacingTiers: readonly string[];
  captionStyles: readonly string[];
  recommendedModels: string[];
  recommendedImageModels: string[];
  recommendedVideoModels: string[];
  recommendedTtsFallbackModels: string[];
  archetypePreviews: Record<string, ArchetypePreview>;
  pacingPreviews: Record<string, PacingPreview>;
}

export interface CreateJobInput {
  topic: string;
  direction?: string;
  archetype?: string;
  pacing?: string;
  videoMode?: "motion_graphics_only" | "ai_video_only" | "hybrid";
  captionStyle?: string;
  aspectRatio?: "vertical" | "horizontal" | "square";
  qualityTier?: "draft" | "standard" | "high";
  targetDurationSeconds?: number;
  /** Frames por segundo do render — default 30 no orchestrator quando omitido. */
  fps?: number;
  language?: string;
  captionChunkSize?: number;
  showTextOverlays?: boolean;
  transitionDurationFrames?: number;
  useOwnProviders?: boolean;
  voiceGender?: "female" | "male";
  musicEnabled?: boolean;
  musicVolume?: number;
  narrationEnabled?: boolean;
  captionsEnabled?: boolean;
  contentProjectId?: string;
  intro?: IntroOutroConfig;
  outro?: IntroOutroConfig;
}

export type TransitionType =
  | "none"
  | "crossfade"
  | "slide_left"
  | "slide_right"
  | "wipe"
  | "flip"
  | "zoom"
  | "whip_pan"
  | "flash";

export interface IntroOutroConfig {
  mode: "generated" | "upload";
  text?: string;
  transition?: TransitionType;
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
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export function getFormConfig(): Promise<FormConfig> {
  return request("/config");
}

export interface ContentProject {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export function listContentProjects(): Promise<ContentProject[]> {
  return request("/content-projects");
}

export function createContentProject(name: string): Promise<ContentProject> {
  return request("/content-projects", { method: "POST", body: JSON.stringify({ name }) });
}

export function createJob(input: CreateJobInput): Promise<{ id: string }> {
  return request("/jobs", { method: "POST", body: JSON.stringify(input) });
}

/** Config de produção salvo/reaproveitável (Fase 17) — mesmo shape parcial de CreateJobInput (sem topic/contentProjectId). */
export interface TemplateConfig {
  direction?: string;
  archetype?: string;
  pacing?: string;
  videoMode?: "motion_graphics_only" | "ai_video_only" | "hybrid";
  captionStyle?: string;
  width?: number;
  height?: number;
  qualityTier?: "draft" | "standard" | "high";
  targetDurationSeconds?: number;
  language?: string;
  captionChunkSize?: number;
  showTextOverlays?: boolean;
  transitionDurationFrames?: number;
  useOwnProviders?: boolean;
  voiceGender?: "female" | "male";
  musicEnabled?: boolean;
  musicVolume?: number;
  narrationEnabled?: boolean;
  captionsEnabled?: boolean;
  intro?: IntroOutroConfig;
  outro?: IntroOutroConfig;
}

/** Variável declarada num template (Fase 18) — `key` interpolado como `{{key}}` em `direction`. */
export interface TemplateVariable {
  key: string;
  label: string;
}

export interface TemplateSummary {
  id: string;
  contentProjectId: string | null;
  name: string;
  version: number;
  sourceProductionId: string | null;
  variableSchema: TemplateVariable[];
  createdAt: string;
  updatedAt: string;
}

export interface TemplateDetail extends TemplateSummary {
  config: TemplateConfig;
}

export function listTemplates(): Promise<TemplateSummary[]> {
  return request("/templates");
}

export function getTemplate(id: string): Promise<TemplateDetail> {
  return request(`/templates/${id}`);
}

export function saveTemplate(name: string, productionId: string, variableSchema?: TemplateVariable[]): Promise<TemplateSummary> {
  return request("/templates", { method: "POST", body: JSON.stringify({ name, productionId, variableSchema }) });
}

export type BriefingLength = "compact" | "balanced" | "verbose";

/** §11A Bloco 7 — expande o tema num rascunho de briefing revisável, antes de qualquer geração real. */
export function expandBriefing(topic: string, length: BriefingLength, language?: string): Promise<{ direction: string }> {
  return request("/briefing/expand", { method: "POST", body: JSON.stringify({ topic, length, language }) });
}

export type ScheduleFrequency = "daily" | "weekly";

/** "Agendamento" (Fase 19) — dispara um template numa cadência fixa (intervalo simples, não cron). */
export interface Schedule {
  id: string;
  templateId: string;
  topic: string;
  frequency: ScheduleFrequency;
  timeOfDay: string;
  dayOfWeek: number | null;
  variableBindings: Record<string, string>;
  enabled: boolean;
  nextRunAt: string;
  lastRunAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateScheduleInput {
  templateId: string;
  topic: string;
  frequency: ScheduleFrequency;
  timeOfDay: string;
  dayOfWeek?: number;
  variableBindings?: Record<string, string>;
}

export function listSchedules(): Promise<Schedule[]> {
  return request("/schedules");
}

export function createSchedule(input: CreateScheduleInput): Promise<Schedule> {
  return request("/schedules", { method: "POST", body: JSON.stringify(input) });
}

export function setScheduleEnabled(id: string, enabled: boolean): Promise<void> {
  return request(`/schedules/${id}`, { method: "PATCH", body: JSON.stringify({ enabled }) });
}

export function deleteSchedule(id: string): Promise<void> {
  return request(`/schedules/${id}`, { method: "DELETE" });
}

export function getJob(id: string): Promise<JobView> {
  return request(`/jobs/${id}`);
}

export function approveCost(id: string, approved: boolean): Promise<void> {
  return request(`/jobs/${id}/approve-cost`, { method: "POST", body: JSON.stringify({ approved }) });
}

export function retryJob(id: string): Promise<{ id: string; status: string }> {
  return request(`/jobs/${id}/retry`, { method: "POST", body: "{}" });
}

export function outputUrl(output: string): string {
  return `${API_BASE}${output}`;
}

/** Botão "Baixar vídeo" — rota própria com Content-Disposition: attachment (server.ts), diferente da
 * URL de preview do `<video src>` (`outputUrl`) que aponta pro mesmo arquivo sem esse header. */
export function downloadUrl(output: string): string {
  return `${API_BASE}${output.replace(/\/output\.mp4$/, "/download")}`;
}

export type PublicationStatus = "pending" | "success" | "error";

export interface Publication {
  id: string;
  jobId: string;
  platform: "youtube";
  status: PublicationStatus;
  externalUrl: string | null;
  error: string | null;
}

export interface PublishInput {
  title?: string;
  description?: string;
  tags?: string[];
  privacyStatus: "private" | "unlisted" | "public";
}

export function getPublication(jobId: string): Promise<Publication | null> {
  return request(`/jobs/${jobId}/publication`);
}

export function publishJob(jobId: string, input: PublishInput): Promise<Publication> {
  return request(`/jobs/${jobId}/publish`, { method: "POST", body: JSON.stringify(input) });
}

/** Link de "Conectar com Google" (Fase 21) — navegação direta do browser (não passa por `request`, o
 * callback do Google não carrega o Bearer token da API). */
export function youtubeAuthorizeUrl(): string {
  return `${API_BASE}/oauth/youtube/authorize`;
}

export interface Credits {
  balanceUsd: number;
  consumedUsd: number;
}

export function getCredits(): Promise<Credits> {
  return request("/credits");
}

export function putCredits(balanceUsd: number): Promise<Credits> {
  return request("/credits", { method: "PUT", body: JSON.stringify({ balanceUsd }) });
}

export type SecretField = { set: true; masked: string } | { set: false };

export interface Settings {
  OPENROUTER_API_KEY: SecretField;
  OPENROUTER_API_KEY_SYSTEM: SecretField;
  OPENROUTER_MODEL: string;
  OPENROUTER_MODEL_FALLBACK: string;
  IMAGE_MODEL: string;
  IMAGE_MODEL_FALLBACK: string;
  VIDEO_MODEL: string;
  VIDEO_MODEL_FALLBACK: string;
  TTS_MODEL_FALLBACK: string;
  TTS_MODEL_FALLBACK_VOICE: string;
  TTS_MODEL_FALLBACK_2: string;
  TTS_MODEL_FALLBACK_2_VOICE: string;
  MUSIC_PROVIDER: string;
  MUSIC_MODEL: string;
  MUSIC_MODEL_FALLBACK: string;
  GOOGLE_API_KEY: SecretField;
  GOOGLE_API_KEY_SYSTEM: SecretField;
  FAL_API_KEY: SecretField;
  FAL_API_KEY_SYSTEM: SecretField;
  PEXELS_API_KEY: SecretField;
  PIXABAY_API_KEY: SecretField;
  YOUTUBE_CLIENT_ID: SecretField;
  YOUTUBE_CLIENT_SECRET: SecretField;
  YOUTUBE_REFRESH_TOKEN: SecretField;
}

export function getSettings(): Promise<Settings> {
  return request("/settings");
}

export function putSettings(updates: Partial<Record<keyof Settings, string>>): Promise<{ applied: boolean }> {
  return request("/settings", { method: "PUT", body: JSON.stringify(updates) });
}
