import { createHash } from 'node:crypto';

/**
 * Lesson video access model.
 *
 * - A lesson with an empty `videoTiers` list has no tier gate (existing behaviour).
 * - A lesson with a non-empty list is watchable only by users whose current VIP tier is in that list (exact match).
 * - Fail closed: an unknown tier in the list or an unknown user tier denies access.
 * - Bunny Stream is behind the BUNNY_STREAM_ENABLED flag. Its keys are read from env only and never stored in code.
 */

/** Tiers the owner can attach to a video. Mirrors the VIP plan ids (see src/data/defaults.ts). */
export const KNOWN_VIDEO_TIERS = ['start', 'plus', 'pro', 'gold', 'premium', 'legend', 'individual'] as const;

const TIER_SET = new Set<string>(KNOWN_VIDEO_TIERS);

/** Keeps only known, unique tier ids. Unknown ids are dropped on save; a stored unknown id still denies access. */
export function normalizeVideoTiers(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const out: string[] = [];
  for (const raw of input) {
    const t = String(raw ?? '').trim().toLowerCase();
    if (TIER_SET.has(t) && !out.includes(t)) out.push(t);
  }
  return out;
}

export interface LessonAccessInput {
  role?: string | null;
  /** The user's effective VIP tier now (already 'none' when expired). */
  userTier?: string | null;
  videoTiers?: unknown;
}

/** True when the viewer may play the lesson video. Fails closed. */
export function canWatchLessonVideo({ role, userTier, videoTiers }: LessonAccessInput): boolean {
  if (role === 'owner') return true;
  if (!Array.isArray(videoTiers) || videoTiers.length === 0) return true;
  // Any unknown id in the stored list means the configuration is not trusted: deny.
  for (const t of videoTiers) if (!TIER_SET.has(String(t))) return false;
  if (!userTier || !TIER_SET.has(userTier)) return false;
  return videoTiers.includes(userTier);
}

export interface BunnyConfig {
  libraryId: string;
  tokenKey: string;
}

/**
 * Reads Bunny settings from env. Returns null unless the feature flag is on AND all values are present,
 * so a missing key always means "no Bunny playback" (fail closed).
 */
export function readBunnyConfig(env: Record<string, string | undefined> = process.env): BunnyConfig | null {
  if (env.BUNNY_STREAM_ENABLED !== '1') return null;
  const libraryId = (env.BUNNY_LIBRARY_ID || '').trim();
  const tokenKey = (env.BUNNY_TOKEN_KEY || '').trim();
  if (!libraryId || !tokenKey) return null;
  return { libraryId, tokenKey };
}

const GUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

/** Accepts a bare Bunny video GUID or a Bunny embed / play URL that contains one. */
export function parseBunnyVideoId(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const m = input.trim().match(GUID_RE);
  return m ? m[0].toLowerCase() : null;
}

/**
 * Signed Bunny embed URL (Bunny token authentication: sha256(tokenKey + videoId + expires), hex).
 * Call only after the server has checked the viewer's access.
 */
export function bunnySignedEmbedUrl(cfg: BunnyConfig, videoId: string, nowSec: number, ttlSec = 600): { url: string; expires: number } {
  const expires = Math.floor(nowSec) + ttlSec;
  const token = createHash('sha256').update(cfg.tokenKey + videoId + String(expires)).digest('hex');
  const url = `https://iframe.mediadelivery.net/embed/${encodeURIComponent(cfg.libraryId)}/${videoId}?token=${token}&expires=${expires}`;
  return { url, expires };
}
