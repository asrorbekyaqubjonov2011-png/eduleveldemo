import { randomBytes } from 'node:crypto';
import { getPool } from './db/pool';

/**
 * IndexNow (free): tells participating search engines (Bing, Yandex, ...) that a URL is new, changed or removed.
 * Being accepted is NOT indexing; it only asks the engine to look sooner. Only the canonical host is ever submitted,
 * only changed URLs are sent, and nothing is sent on a plain deploy.
 */
export const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/IndexNow';
const KEY_ROW = 'indexnow';
const MIN_GAP_MS = 60_000;
const MAX_URLS = 10_000;

export interface SubmissionRecord { at: string; reason: string; count: number; status: number | null; ok: boolean; message: string; sample: string[] }
export interface IndexNowState {
  key: string;
  /** url -> lastmod that was last submitted successfully */
  submitted: Record<string, string>;
  /** URLs whose last submission failed, waiting for a retry */
  failed: string[];
  history: SubmissionRecord[];
  lastAttemptAt?: string;
}

/** Keeps https URLs of the canonical host only, without fragments, de-duplicated, at most 10 000. */
export function normalizeUrls(urls: string[], host: string): string[] {
  const out = new Set<string>();
  for (const raw of urls) {
    try {
      const u = new URL(String(raw).trim());
      if (u.protocol !== 'https:' || u.hostname !== host) continue;
      u.hash = '';
      out.add(u.toString());
    } catch {
      /* not a URL */
    }
    if (out.size >= MAX_URLS) break;
  }
  return Array.from(out);
}

export function isValidKey(key: string): boolean {
  return /^[a-zA-Z0-9-]{8,128}$/.test(key);
}

export function buildPayload(host: string, key: string, keyLocation: string, urlList: string[]) {
  return { host, key, keyLocation, urlList };
}

export function describeStatus(status: number | null): { ok: boolean; message: string } {
  if (status === 200) return { ok: true, message: 'Qabul qilindi (200)' };
  if (status === 202) return { ok: true, message: 'Qabul qilindi, kalit tekshiruvi kutilmoqda (202)' };
  if (status === 400) return { ok: false, message: 'So‘rov noto‘g‘ri (400)' };
  if (status === 403) return { ok: false, message: 'Kalit tasdiqlanmadi (403): kalit fayli ochilmayotgan bo‘lishi mumkin' };
  if (status === 422) return { ok: false, message: 'URL domen yoki kalitga mos emas (422)' };
  if (status === 429) return { ok: false, message: 'Juda ko‘p so‘rov (429): keyinroq qayta uriniladi' };
  return { ok: false, message: status === null ? 'Tarmoq xatosi' : `Kutilmagan javob (${status})` };
}

/** URLs that are new or whose last-modified date moved since the last successful submission. */
export function changedUrls(entries: { url: string; lastModified?: string | Date }[], submitted: Record<string, string>): string[] {
  return entries
    .filter((e) => {
      const mod = e.lastModified ? new Date(e.lastModified).toISOString().slice(0, 10) : '';
      return submitted[e.url] === undefined || (mod && submitted[e.url] !== mod);
    })
    .map((e) => e.url);
}

const emptyState = (key: string): IndexNowState => ({ key, submitted: {}, failed: [], history: [] });

export async function loadState(): Promise<IndexNowState> {
  const { rows } = await getPool().query('select value from public.site_settings where key = $1', [KEY_ROW]);
  const v = rows[0]?.value as IndexNowState | undefined;
  if (v && isValidKey(v.key)) return { ...emptyState(v.key), ...v };
  const fresh = emptyState(randomBytes(16).toString('hex'));
  await getPool().query(`insert into public.site_settings (key, value) values ($1, $2::jsonb) on conflict (key) do nothing`, [KEY_ROW, JSON.stringify(fresh)]);
  const again = await getPool().query('select value from public.site_settings where key = $1', [KEY_ROW]);
  return { ...emptyState(fresh.key), ...(again.rows[0]?.value as IndexNowState) };
}

async function saveState(s: IndexNowState): Promise<void> {
  s.history = s.history.slice(-40);
  s.failed = s.failed.slice(0, MAX_URLS);
  await getPool().query(`update public.site_settings set value = $2::jsonb, updated_at = now() where key = $1`, [KEY_ROW, JSON.stringify(s)]);
}

export interface SubmitResult { sent: number; ok: boolean; status: number | null; message: string; skipped?: string }

/** Sends URLs once (one request, at most one per minute). Failed URLs stay in the retry list. */
export async function submitUrls(host: string, siteUrl: string, urls: string[], reason: string, lastmods: Record<string, string> = {}, fetchImpl: typeof fetch = fetch): Promise<SubmitResult> {
  const list = normalizeUrls(urls, host);
  if (!list.length) return { sent: 0, ok: true, status: null, message: 'Yuboriladigan yangi URL yo‘q', skipped: 'empty' };
  const state = await loadState();
  if (state.lastAttemptAt && Date.now() - new Date(state.lastAttemptAt).getTime() < MIN_GAP_MS) {
    state.failed = Array.from(new Set([...state.failed, ...list]));
    await saveState(state);
    return { sent: 0, ok: false, status: null, message: 'Oxirgi yuborishdan 1 daqiqa o‘tmadi: navbatga qo‘yildi', skipped: 'rate' };
  }
  const keyLocation = `${siteUrl}/api/indexnow/key`;
  let status: number | null = null;
  try {
    const res = await fetchImpl(INDEXNOW_ENDPOINT, { method: 'POST', headers: { 'content-type': 'application/json; charset=utf-8' }, body: JSON.stringify(buildPayload(host, state.key, keyLocation, list)), signal: AbortSignal.timeout(10_000) });
    status = res.status;
  } catch {
    status = null;
  }
  const d = describeStatus(status);
  state.lastAttemptAt = new Date().toISOString();
  state.history.push({ at: state.lastAttemptAt, reason, count: list.length, status, ok: d.ok, message: d.message, sample: list.slice(0, 3) });
  if (d.ok) {
    for (const u of list) state.submitted[u] = lastmods[u] || new Date().toISOString().slice(0, 10);
    state.failed = state.failed.filter((u) => !list.includes(u));
  } else {
    state.failed = Array.from(new Set([...state.failed, ...list]));
  }
  await saveState(state);
  return { sent: d.ok ? list.length : 0, ok: d.ok, status, message: d.message };
}

/** Best-effort: tells IndexNow about one changed or removed owner page. Never throws, never blocks the owner's save. */
export function notifyIndexNow(path: string, siteUrl: string, reason: string): void {
  try {
    const host = new URL(siteUrl).hostname;
    if (host === 'localhost') return;
    void submitUrls(host, siteUrl, [siteUrl + (path.startsWith('/') ? path : '/' + path)], reason).catch(() => undefined);
  } catch {
    /* ignore */
  }
}
