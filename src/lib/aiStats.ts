import { AsyncLocalStorage } from 'node:async_hooks';
import { getPool } from './db/pool';

/** One call to an AI model: which one, how long, how many tokens, and whether it worked. */
export interface AiCallRecord {
  model: string;
  provider: string;
  ok: boolean;
  ms: number;
  inTok: number;
  outTok: number;
  /** Time to the first word, for streamed answers. */
  ttft?: number;
  error?: string;
  at: string;
}

/** Calls made while one request runs are collected here and stored once the request is done. */
export const aiCallStore = new AsyncLocalStorage<{ calls: AiCallRecord[] }>();

export function noteAiCall(rec: Omit<AiCallRecord, 'at'>, sink?: AiCallRecord[]): void {
  const full = { ...rec, at: new Date().toISOString() };
  if (sink) sink.push(full);
  else aiCallStore.getStore()?.calls.push(full);
}

interface Bucket {
  calls: number;
  inTok: number;
  outTok: number;
}
export interface ModelStat extends Bucket {
  /** Sum of times to first word and how many answers it covers. */
  ttft?: number;
  ttftN?: number;
  ok: number;
  fail: number;
  ms: number;
  lastError?: string;
  lastAt?: string;
}
export interface DayStats {
  models: Record<string, ModelStat>;
  ops: Record<string, Bucket>;
  users: Record<string, Bucket>;
}
export interface AiStats {
  days: Record<string, DayStats>;
}

const KEY = 'ai_stats';
const KEEP_DAYS = 45;

/** Tashkent calendar day (UTC+5), the same day the usage limits use. */
export function statsDay(offsetDays = 0): string {
  return new Date(Date.now() + 5 * 3600_000 + offsetDays * 86400_000).toISOString().slice(0, 10);
}

/** Adds calls to the statistics (pure: returns the same object, changed). */
export function mergeAiStats(stats: AiStats, calls: AiCallRecord[], ctx: { op: string; userId: string; day: string }): AiStats {
  if (!calls.length) return stats;
  stats.days ||= {};
  const day = (stats.days[ctx.day] ||= { models: {}, ops: {}, users: {} });
  const op = (day.ops[ctx.op] ||= { calls: 0, inTok: 0, outTok: 0 });
  const user = (day.users[ctx.userId] ||= { calls: 0, inTok: 0, outTok: 0 });
  for (const c of calls) {
    const m = (day.models[c.model] ||= { calls: 0, ok: 0, fail: 0, inTok: 0, outTok: 0, ms: 0 });
    m.calls += 1;
    m.inTok += c.inTok;
    m.outTok += c.outTok;
    m.ms += c.ms;
    m.lastAt = c.at;
    if (c.ok && c.ttft) {
      m.ttft = (m.ttft || 0) + c.ttft;
      m.ttftN = (m.ttftN || 0) + 1;
    }
    if (c.ok) m.ok += 1;
    else {
      m.fail += 1;
      m.lastError = (c.error || 'xato').slice(0, 160);
    }
    if (c.ok) {
      op.calls += 1;
      op.inTok += c.inTok;
      op.outTok += c.outTok;
      user.calls += 1;
      user.inTok += c.inTok;
      user.outTok += c.outTok;
    }
  }
  const keys = Object.keys(stats.days).sort();
  while (keys.length > KEEP_DAYS) delete stats.days[keys.shift() as string];
  return stats;
}

/**
 * Stores calls in their own settings row, in a short transaction of their own, so it works the
 * same for ordinary requests and for streams that finish after the response was sent.
 * Never throws: statistics must not break an answer.
 */
export async function recordAiStats(calls: AiCallRecord[], ctx: { op: string; userId: string }): Promise<void> {
  if (!calls.length) return;
  let client;
  try {
    client = await getPool().connect();
    await client.query('begin');
    await client.query(`insert into public.site_settings (key, value) values ($1, '{"days":{}}'::jsonb) on conflict (key) do nothing`, [KEY]);
    const { rows } = await client.query('select value from public.site_settings where key = $1 for update', [KEY]);
    const stats = mergeAiStats((rows[0]?.value as AiStats) || { days: {} }, calls, { ...ctx, day: statsDay() });
    await client.query('update public.site_settings set value = $2::jsonb, updated_at = now() where key = $1', [KEY, JSON.stringify(stats)]);
    await client.query('commit');
  } catch (e) {
    await client?.query('rollback').catch(() => {});
    console.warn('[ai-stats] not stored:', (e as Error)?.message);
  } finally {
    client?.release();
  }
}

export async function readAiStats(): Promise<AiStats> {
  try {
    const { rows } = await getPool().query('select value from public.site_settings where key = $1', [KEY]);
    return (rows[0]?.value as AiStats) || { days: {} };
  } catch {
    return { days: {} };
  }
}
