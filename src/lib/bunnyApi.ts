import { createHash } from 'node:crypto';

/**
 * Bunny Stream management API (server only). Three different Bunny secrets exist and must not be mixed up:
 * - BUNNY_API_KEY (or BUNNY_STREAM_API_KEY): the Stream library API key. Creates and lists videos, signs uploads.
 * - BUNNY_TOKEN_KEY: Token Authentication key. Signs playback links only (see videoAccess.ts).
 * - BUNNY_LIBRARY_ID: the numeric library id (not secret).
 * The API key never reaches the browser: the browser receives a short-lived upload signature for one video.
 */
export interface BunnyApiConfig {
  libraryId: string;
  apiKey: string;
}

export function readBunnyApiConfig(env: Record<string, string | undefined> = process.env): BunnyApiConfig | null {
  if (env.BUNNY_STREAM_ENABLED !== '1') return null;
  const libraryId = (env.BUNNY_LIBRARY_ID || '').trim();
  const apiKey = (env.BUNNY_API_KEY || env.BUNNY_STREAM_API_KEY || '').trim();
  if (!/^\d+$/.test(libraryId) || !apiKey) return null;
  return { libraryId, apiKey };
}

/** TUS upload signature: sha256(libraryId + apiKey + expire + videoId), hex (Bunny's documented scheme). */
export function tusSignature(libraryId: string, apiKey: string, expire: number, videoId: string): string {
  return createHash('sha256').update(libraryId + apiKey + String(expire) + videoId).digest('hex');
}

export interface BunnyVideoSummary {
  guid: string;
  title: string;
  lengthSec: number;
  /** Bunny status: 0 created, 1 uploaded, 2 processing, 3 transcoding, 4 finished, 5 error, 6 upload failed. */
  status: number;
  encodeProgress: number;
  uploadedAt: string | null;
}

const BASE = 'https://video.bunnycdn.com';

function describeBunnyStatus(status: number): string {
  if (status === 401 || status === 403) return 'Bunny kalitni qabul qilmadi: BUNNY_API_KEY Stream kutubxonasining API kaliti bo‘lishi kerak (Token Authentication kaliti emas)';
  if (status === 404) return 'Bunny kutubxonasi yoki video topilmadi (BUNNY_LIBRARY_ID ni tekshiring)';
  if (status === 429) return 'Bunny so‘rov limiti tugadi, keyinroq urinib ko‘ring';
  return `Bunny xatosi (HTTP ${status})`;
}

export class BunnyError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function bunnyFetch(cfg: BunnyApiConfig, path: string, init: RequestInit, fetchImpl: typeof fetch): Promise<unknown> {
  let res: Response;
  try {
    res = await fetchImpl(`${BASE}/library/${cfg.libraryId}${path}`, {
      ...init,
      headers: { AccessKey: cfg.apiKey, accept: 'application/json', 'content-type': 'application/json', ...(init.headers || {}) },
      signal: AbortSignal.timeout(10_000)
    });
  } catch {
    throw new BunnyError(0, 'Bunny bilan aloqa o‘rnatilmadi');
  }
  if (!res.ok) throw new BunnyError(res.status, describeBunnyStatus(res.status));
  return res.json();
}

export async function bunnyListVideos(cfg: BunnyApiConfig, page = 1, search = '', fetchImpl: typeof fetch = fetch): Promise<{ total: number; page: number; items: BunnyVideoSummary[] }> {
  const q = new URLSearchParams({ page: String(Math.max(1, page)), itemsPerPage: '20', orderBy: 'date' });
  if (search) q.set('search', search.slice(0, 80));
  const data = (await bunnyFetch(cfg, `/videos?${q}`, { method: 'GET' }, fetchImpl)) as { totalItems?: number; currentPage?: number; items?: Record<string, unknown>[] };
  return {
    total: Number(data.totalItems) || 0,
    page: Number(data.currentPage) || 1,
    items: (data.items || []).map((v) => ({
      guid: String(v.guid || ''),
      title: String(v.title || ''),
      lengthSec: Number(v.length) || 0,
      status: Number(v.status) || 0,
      encodeProgress: Number(v.encodeProgress) || 0,
      uploadedAt: v.dateUploaded ? String(v.dateUploaded) : null
    }))
  };
}

/** Creates an empty video object in the library. The file is then uploaded straight from the owner's browser. */
export async function bunnyCreateVideo(cfg: BunnyApiConfig, title: string, fetchImpl: typeof fetch = fetch): Promise<string> {
  const data = (await bunnyFetch(cfg, '/videos', { method: 'POST', body: JSON.stringify({ title: title.slice(0, 120) }) }, fetchImpl)) as { guid?: string };
  if (!data.guid) throw new BunnyError(502, 'Bunny video ID qaytarmadi');
  return data.guid;
}
