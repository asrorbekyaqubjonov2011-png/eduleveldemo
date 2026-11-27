import { getPool } from './db/pool';
import { listPaymentBlocked, onPaymentBlockChange, onProviderUsageChange, providerDayTotals, seedPaymentBlocked, seedProviderDay } from './aiRouter';

/**
 * Keeps each provider's daily request/token totals across restarts and redeploys (Render Free restarts often), so an
 * owner's daily cap or a provider's free daily quota is not forgotten. One small row, written at most every 30 seconds
 * and only when something changed; no prompts or answers are stored.
 */
const KEY = 'ai_provider_day';
const FLUSH_MS = 30_000;

const BLOCK_KEY = 'ai_payment_blocked';

async function savePaymentBlocked(): Promise<void> {
  try {
    await getPool().query(`insert into public.site_settings (key, value) values ($1, $2::jsonb) on conflict (key) do update set value = excluded.value, updated_at = now()`, [BLOCK_KEY, JSON.stringify({ ids: listPaymentBlocked() })]);
  } catch (e) {
    console.warn('[ai-usage] payment block not stored:', (e as Error)?.message);
  }
}

let started = false;
let timer: ReturnType<typeof setTimeout> | null = null;
let dirty = false;

export async function flushProviderUsage(): Promise<void> {
  dirty = false;
  try {
    const totals = providerDayTotals();
    await getPool().query(
      `insert into public.site_settings (key, value) values ($1, $2::jsonb)
       on conflict (key) do update set value = excluded.value, updated_at = now()`,
      [KEY, JSON.stringify(totals)]
    );
  } catch (e) {
    console.warn('[ai-usage] not stored:', (e as Error)?.message);
  }
}

/** Loads today's saved totals once and starts the debounced saver. Safe to call on every request. */
export async function ensureProviderUsagePersistence(): Promise<void> {
  if (started) return;
  started = true;
  try {
    const { rows } = await getPool().query('select value from public.site_settings where key = $1', [KEY]);
    const saved = rows[0]?.value as { day?: string; providers?: Record<string, { calls?: number; tokens?: number }> } | undefined;
    if (saved?.day && saved.providers) seedProviderDay(saved.day, saved.providers);
  } catch {
    /* no database yet: counters simply start from zero */
  }
  try {
    const { rows } = await getPool().query('select value from public.site_settings where key = $1', [BLOCK_KEY]);
    const ids = (rows[0]?.value as { ids?: string[] } | undefined)?.ids;
    if (Array.isArray(ids)) seedPaymentBlocked(ids);
  } catch {
    /* ignore */
  }
  onPaymentBlockChange(() => { void savePaymentBlocked(); });
  onProviderUsageChange(() => {
    dirty = true;
    if (timer) return;
    timer = setTimeout(() => {
      timer = null;
      if (dirty) void flushProviderUsage();
    }, FLUSH_MS);
    (timer as { unref?: () => void }).unref?.();
  });
}
