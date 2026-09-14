export type PublicationPrivacyStatus = "private" | "unlisted" | "public";

export interface PublishInput {
  /** Caminho absoluto do MP4 já renderizado (job.outputPath). */
  videoPath: string;
  title: string;
  description?: string;
  tags?: string[];
  privacyStatus: PublicationPrivacyStatus;
}

export interface PublishResult {
  externalUrl: string;
}

/**
 * Contrato de publicação num destino externo (Fase 21, spec §37 — antes só
 * interface prevista/não implementada). 1 implementação por plataforma;
 * YouTube é a primeira (`youtube.ts`).
 */
export interface PublishingProvider {
  publish(input: PublishInput): Promise<PublishResult>;
}
