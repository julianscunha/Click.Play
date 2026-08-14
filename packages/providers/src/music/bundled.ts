import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import type { MusicMood } from "@clickplay/domain";

export interface ManifestTrack {
  id: string;
  mood: string;
  filename: string;
  durationSec: number;
  source: string;
  sourceId: number;
  license: string;
}

interface MusicManifest {
  tracks: ManifestTrack[];
}

export interface MusicSelection {
  trackId: string;
  filename: string;
  filePath: string;
  mood: string;
  requestedMood: string;
  fallback: boolean;
}

const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const MUSIC_DIR = path.join(PACKAGE_ROOT, "assets", "music");
const MANIFEST_PATH = path.join(PACKAGE_ROOT, "assets", "music-manifest.json");

let cachedManifest: MusicManifest | null = null;

/** Reset the cached manifest (for testing only) */
export function _resetCache(): void {
  cachedManifest = null;
}

function loadManifest(): MusicManifest {
  if (cachedManifest) return cachedManifest;
  const raw = fs.readFileSync(MANIFEST_PATH, "utf-8");
  cachedManifest = JSON.parse(raw) as MusicManifest;
  return cachedManifest;
}

/** Lista todas as faixas do manifest — usado por `GET /music` (metadados, sem stream de áudio nesta fase). */
export function listTracks(): ManifestTrack[] {
  return loadManifest().tracks;
}

/**
 * Valida que toda faixa do manifest tem um MP3 correspondente em disco.
 * Chamar no startup pra pegar clones quebrados cedo.
 */
export function validateManifest(): { valid: boolean; missing: string[] } {
  const manifest = loadManifest();
  const missing: string[] = [];

  for (const track of manifest.tracks) {
    const filePath = path.join(MUSIC_DIR, track.filename);
    if (!fs.existsSync(filePath)) {
      missing.push(track.filename);
    }
  }

  return { valid: missing.length === 0, missing };
}

/**
 * Seleciona uma faixa pro mood pedido.
 * - Mood com faixas disponíveis: pick aleatório dentro do mood.
 * - Mood sem faixas (ex: playful_kids ainda sem catálogo): fallback pra
 *   qualquer mood disponível — gap documentado em docs/IMPLEMENTATION-PLAN.md §Fase 7.
 * - Retorna null só se o manifest inteiro estiver vazio.
 */
export function selectTrack(mood: MusicMood): MusicSelection | null {
  const manifest = loadManifest();

  const moodTracks = manifest.tracks.filter((t) => t.mood === mood);

  if (moodTracks.length > 0) {
    const track = moodTracks[Math.floor(Math.random() * moodTracks.length)]!;
    return {
      trackId: track.id,
      filename: track.filename,
      filePath: path.join(MUSIC_DIR, track.filename),
      mood: track.mood,
      requestedMood: mood,
      fallback: false,
    };
  }

  if (manifest.tracks.length > 0) {
    const track = manifest.tracks[Math.floor(Math.random() * manifest.tracks.length)]!;
    return {
      trackId: track.id,
      filename: track.filename,
      filePath: path.join(MUSIC_DIR, track.filename),
      mood: track.mood,
      requestedMood: mood,
      fallback: true,
    };
  }

  return null;
}
