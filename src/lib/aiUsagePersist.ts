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

let initializing: Promise<void> | null = null;
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
export function ensureProviderUsagePersistence(): Promise<void> {
  if (!initializing) initializing = initialize().catch(error => { initializing = null; throw error; });
  return initializing;
}

async function initialize(): Promise<void> {
  const { rows } = await getPool().query('select key, value from public.site_settings where key in ($1, $2)', [KEY, BLOCK_KEY]);
  const saved = rows.find(row => row.key === KEY)?.value as { day?: string; providers?: Record<string, { calls?: number; tokens?: number }> } | undefined;
  if (saved?.day && saved.providers) seedProviderDay(saved.day, saved.providers);
  const ids = (rows.find(row => row.key === BLOCK_KEY)?.value as { ids?: string[] } | undefined)?.ids;
  if (Array.isArray(ids)) seedPaymentBlocked(ids);
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
