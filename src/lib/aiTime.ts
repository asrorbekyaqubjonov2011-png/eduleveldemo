import { getPool } from './db/pool';
import { statsDay } from './aiStats';
import { DEFAULT_AI_LIMITS as DEFAULTS } from './aiLimitsDefaults';

/** How long each plan may use the AI per day. 0 means no limit. The owner changes these in the owner panel. */
export interface AiLimits {
  /** Students with no active plan. */
  freeMinutes: number;
  /** Minutes per day for each plan id. */
  planMinutes: Record<string, number>;
  /** Owner's prices, so'm per million tokens, to show what the AI costs. 0 or missing: not set. */
  inPerM?: number;
  outPerM?: number;
  /** Monthly spending cap in so'm for the whole platform; students' AI stops when it is reached. 0 or missing: none. */
  capSom?: number;
}

export const DEFAULT_AI_LIMITS: AiLimits = DEFAULTS;

/** Minutes per day for this student: the plan they hold now, or the free allowance when none (or it has expired). */
export function aiMinutesFor(limits: AiLimits | undefined, user?: { vipTier?: string; vipExpiresAt?: string | null }): number {
  const l = limits || DEFAULT_AI_LIMITS;
  const tier = user?.vipTier;
  const expired = !!user?.vipExpiresAt && Date.parse(user.vipExpiresAt) < Date.now();
  if (!tier || tier === 'none' || tier === 'free' || expired) return l.freeMinutes ?? DEFAULT_AI_LIMITS.freeMinutes;
  return l.planMinutes?.[tier] ?? DEFAULT_AI_LIMITS.planMinutes[tier] ?? 60;
}

/** Keeps an owner-supplied limits object to whole minutes between 0 and 24 hours. */
export function cleanAiLimits(input: any): AiLimits | null {
  const clamp = (v: unknown) => Math.max(0, Math.min(1440, Math.round(Number(v))));
  if (!input || typeof input !== 'object') return null;
  const free = clamp(input.freeMinutes);
  if (!Number.isFinite(free)) return null;
  const plans: Record<string, number> = {};
  for (const [id, v] of Object.entries(input.planMinutes || {})) {
    const m = clamp(v);
    if (/^[a-z0-9_-]{1,40}$/i.test(id) && Number.isFinite(m)) plans[id] = m;
  }
  const money = (v: unknown) => {
    const n = Math.round(Number(v));
    return Number.isFinite(n) && n > 0 ? Math.min(n, 1_000_000_000) : 0;
  };
  return { freeMinutes: free, planMinutes: plans, inPerM: money(input.inPerM), outPerM: money(input.outPerM), capSom: money(input.capSom) };
}

/** What the tokens in these days cost in so'm at the owner's prices. */
export function costSom(days: Array<{ models: Record<string, { inTok: number; outTok: number }> }>, limits?: AiLimits): number {
  const inP = limits?.inPerM || 0;
  const outP = limits?.outPerM || 0;
  if (!inP && !outP) return 0;
  let inTok = 0;
  let outTok = 0;
  for (const d of days) for (const m of Object.values(d.models || {})) { inTok += m.inTok; outTok += m.outTok; }
  return (inTok / 1e6) * inP + (outTok / 1e6) * outP;
}

interface TimeRow {
  day: string;
  seconds: Record<string, number>;
  beat: Record<string, number>;
}
const KEY = 'ai_time';
/** A heartbeat counts the time since the previous one, at most this long (a closed tab must not keep counting). */
const MAX_GAP_SECONDS = 45;

export async function readAiSeconds(userId: string): Promise<number> {
  try {
    const { rows } = await getPool().query('select value from public.site_settings where key = $1', [KEY]);
    const v = rows[0]?.value as TimeRow | undefined;
    return v && v.day === statsDay() ? Number(v.seconds?.[userId]) || 0 : 0;
  } catch {
    return 0;
  }
}

/** Adds the time since this student's last heartbeat (or a fixed charge) to today's total. Returns today's total in seconds. */
export async function beatAiTime(userId: string, addSeconds?: number): Promise<number> {
  const client = await getPool().connect();
  try {
    await client.query('begin');
    await client.query(`insert into public.site_settings (key, value) values ($1, '{}'::jsonb) on conflict (key) do nothing`, [KEY]);
    const { rows } = await client.query('select value from public.site_settings where key = $1 for update', [KEY]);
    const today = statsDay();
    let v = rows[0]?.value as TimeRow | undefined;
    if (!v || v.day !== today) v = { day: today, seconds: {}, beat: {} };
    const now = Date.now();
    const last = v.beat[userId];
    // addSeconds: a fixed charge (an AI check outside the AI section); otherwise the time since the last heartbeat.
    const gap = addSeconds !== undefined ? addSeconds : last ? Math.min(MAX_GAP_SECONDS, Math.max(0, (now - last) / 1000)) : 5;
    v.seconds[userId] = Math.round((Number(v.seconds[userId]) || 0) + gap);
    if (addSeconds === undefined) v.beat[userId] = now;
    await client.query('update public.site_settings set value = $2::jsonb, updated_at = now() where key = $1', [KEY, JSON.stringify(v)]);
    await client.query('commit');
    return v.seconds[userId];
  } catch (e) {
    await client.query('rollback').catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

/** Today's AI time for every student (owner statistics). */
export async function readAllAiSeconds(): Promise<Record<string, number>> {
  try {
    const { rows } = await getPool().query('select value from public.site_settings where key = $1', [KEY]);
    const v = rows[0]?.value as TimeRow | undefined;
    return v && v.day === statsDay() ? v.seconds || {} : {};
  } catch {
    return {};
  }
}
