/**
 * Server-side fallback chain for AI providers configured through environment variables.
 * Keys are read only on the server (GROQ_API_KEY, DEEPSEEK_API_KEY, OPENROUTER_API_KEY, MISTRAL_API_KEY).
 * Each provider here speaks the OpenAI-compatible chat-completions format, so one call function serves all of them.
 * The chain only runs after the primary provider fails; nothing is sent to a provider without a configured key.
 */

export type FallbackProviderId = 'groq' | 'deepseek' | 'openrouter' | 'mistral' | 'cloudflare' | 'sambanova' | 'siliconflow';

interface ProviderSpec {
  id: FallbackProviderId;
  envKey: string;
  endpoint: string;
  /** Tried in order. A model the provider does not know (404) is skipped for the next one. Free models only. */
  models: string[];
  modelEnv: string;
  /** Other variables the provider needs before it counts as configured (Cloudflare: the account id). */
  extraEnv?: string[];
  /** The endpoint depends on the environment (Cloudflare puts the account id in the URL). */
  endpointFor?: (env: Record<string, string | undefined>) => string;
  /**
   * Zero cost: only the built-in model names (and an explicit env override) are ever called. The provider's live list is
   * not used to discover more models, because it does not say which ones are free.
   */
  strictModels?: boolean;
}

import { assertFreeCall, isReasoningModel, onlyFreeCandidates, orderForChat, reconcileWithListing } from './aiFreeOnly';

export const FALLBACK_PROVIDERS: Record<FallbackProviderId, ProviderSpec> = {
  groq: {
    id: 'groq',
    envKey: 'GROQ_API_KEY',
    endpoint: 'https://api.groq.com/openai/v1/chat/completions',
    models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'openai/gpt-oss-20b'],
    modelEnv: 'GROQ_MODEL'
  },
  deepseek: {
    id: 'deepseek',
    envKey: 'DEEPSEEK_API_KEY',
    endpoint: 'https://api.deepseek.com/v1/chat/completions',
    models: ['deepseek-chat'],
    modelEnv: 'DEEPSEEK_MODEL'
  },
  openrouter: {
    id: 'openrouter',
    envKey: 'OPENROUTER_API_KEY',
    endpoint: 'https://openrouter.ai/api/v1/chat/completions',
    models: ['google/gemma-3-27b-it:free', 'meta-llama/llama-3.3-70b-instruct:free', 'qwen/qwen3-next-80b-a3b-instruct:free'],
    modelEnv: 'OPENROUTER_MODEL'
  },
  mistral: {
    id: 'mistral',
    envKey: 'MISTRAL_API_KEY',
    endpoint: 'https://api.mistral.ai/v1/chat/completions',
    models: ['mistral-small-latest', 'open-mistral-nemo'],
    modelEnv: 'MISTRAL_MODEL'
  },
  // Cloudflare Workers AI: OpenAI-compatible route; the free allowance is daily and capped (no automatic overage on the free plan).
  cloudflare: {
    id: 'cloudflare',
    envKey: 'CLOUDFLARE_API_TOKEN',
    extraEnv: ['CLOUDFLARE_ACCOUNT_ID'],
    endpoint: 'https://api.cloudflare.com/client/v4/accounts/{account}/ai/v1/chat/completions',
    endpointFor: (env) => `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent((env.CLOUDFLARE_ACCOUNT_ID || '').trim())}/ai/v1/chat/completions`,
    models: ['@cf/meta/llama-3.1-8b-instruct', '@cf/meta/llama-3.3-70b-instruct-fp8-fast', '@cf/mistralai/mistral-small-3.1-24b-instruct'],
    modelEnv: 'CLOUDFLARE_MODEL',
    strictModels: true
  },
  // SambaNova Cloud: OpenAI-compatible; its free tier is rate limited.
  sambanova: {
    id: 'sambanova',
    envKey: 'SAMBANOVA_API_KEY',
    endpoint: 'https://api.sambanova.ai/v1/chat/completions',
    models: ['Meta-Llama-3.3-70B-Instruct', 'Meta-Llama-3.1-8B-Instruct'],
    modelEnv: 'SAMBANOVA_MODEL',
    strictModels: true
  },
  // SiliconFlow: most models are paid; only the small models it labels free are listed here.
  siliconflow: {
    id: 'siliconflow',
    envKey: 'SILICONFLOW_API_KEY',
    endpoint: 'https://api.siliconflow.com/v1/chat/completions',
    models: ['Qwen/Qwen3-8B', 'THUDM/glm-4-9b-0414', 'Qwen/Qwen2.5-7B-Instruct'],
    modelEnv: 'SILICONFLOW_MODEL',
    strictModels: true
  }
};

/** The endpoint of a provider for this environment. */
export function endpointOf(id: FallbackProviderId, env: Record<string, string | undefined> = process.env): string {
  const spec = FALLBACK_PROVIDERS[id];
  return spec.endpointFor ? spec.endpointFor(env) : spec.endpoint;
}

/** A provider counts as configured when its key (and any extra variable) is set. */
export function providerConfigured(id: FallbackProviderId, env: Record<string, string | undefined> = process.env): boolean {
  const spec = FALLBACK_PROVIDERS[id];
  return [spec.envKey, ...(spec.extraEnv || [])].every((k) => (env[k] || '').trim().length > 0);
}

/** The model names to try for a provider: the env override first (if set), then the built-in candidates. */
export function modelCandidates(id: FallbackProviderId, env: Env = process.env): string[] {
  const spec = FALLBACK_PROVIDERS[id];
  const override = (env[spec.modelEnv] || '').trim();
  return Array.from(new Set([override, ...spec.models].filter(Boolean)));
}

const listingCache = new Map<string, { at: number; ids: string[] }>();
/** The models a provider lists for this key (Groq, Mistral). Cached for an hour; a failure returns [] and the built-in names are used. */
export async function providerListing(id: FallbackProviderId, key: string, fetchImpl: typeof fetch = fetch): Promise<string[]> {
  if (id !== 'groq' && id !== 'mistral') return [];
  const hit = listingCache.get(id);
  if (hit && Date.now() - hit.at < 3_600_000) return hit.ids;
  try {
    const url = FALLBACK_PROVIDERS[id].endpoint.replace(/\/chat\/completions$/, '/models');
    const res = await fetchImpl(url, { headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(5_000) });
    if (!res.ok) return [];
    const data = (await res.json()) as { data?: { id?: string }[] };
    const ids = (data.data || []).map((m) => String(m.id || '')).filter(Boolean);
    if (ids.length) listingCache.set(id, { at: Date.now(), ids });
    return ids;
  } catch {
    return [];
  }
}

let freeOpenRouter: { at: number; models: string[] } | null = null;
/** OpenRouter's currently free models (`:free`, price 0). The public list needs no key; a failure keeps the built-in list. */
export async function openRouterFreeModels(fetchImpl: typeof fetch = fetch): Promise<string[]> {
  if (freeOpenRouter && Date.now() - freeOpenRouter.at < 3_600_000) return freeOpenRouter.models;
  try {
    const res = await fetchImpl('https://openrouter.ai/api/v1/models', { signal: AbortSignal.timeout(5_000) });
    if (!res.ok) return [];
    const data = (await res.json()) as { data?: { id: string; pricing?: { prompt?: string; completion?: string } }[] };
    const models = (data.data || [])
      .filter((m) => String(m.pricing?.prompt) === '0' && String((m.pricing as { completion?: string } | undefined)?.completion) === '0' && m.id.endsWith(':free'))
      .map((m) => m.id)
      .slice(0, 6);
    if (models.length) freeOpenRouter = { at: Date.now(), models };
    return models;
  } catch {
    return [];
  }
}

/**
 * Concurrency limit per provider (AI_MAX_CONCURRENCY, default 8). Calls above the limit wait in a queue for up to
 * 8 seconds, then give up so the next provider answers; this keeps one busy provider from piling up requests.
 */
const activeCalls = new Map<FallbackProviderId, number>();
const waiters = new Map<FallbackProviderId, (() => void)[]>();
export function providerQueue(id: FallbackProviderId): { active: number; queued: number } {
  return { active: activeCalls.get(id) || 0, queued: (waiters.get(id) || []).length };
}
async function acquireSlot(id: FallbackProviderId, max: number, waitMs = 8_000): Promise<() => void> {
  const release = () => {
    const q = waiters.get(id) || [];
    const next = q.shift();
    if (next) next();
    else activeCalls.set(id, Math.max(0, (activeCalls.get(id) || 1) - 1));
  };
  if ((activeCalls.get(id) || 0) < max) {
    activeCalls.set(id, (activeCalls.get(id) || 0) + 1);
    return release;
  }
  return new Promise<() => void>((resolve, reject) => {
    const q = waiters.get(id) || [];
    waiters.set(id, q);
    const entry = () => { clearTimeout(timer); resolve(release); };
    const timer = setTimeout(() => {
      const at = q.indexOf(entry);
      if (at >= 0) q.splice(at, 1);
      reject(new Error(`${id}: navbat to‘lgan (juda ko‘p bir vaqtdagi so‘rov)`));
    }, waitMs);
    q.push(entry);
  });
}

/** A provider that failed for money or rate reasons is skipped for a while, so every answer does not wait for it. */
const providerCooldown = new Map<FallbackProviderId, number>();
/**
 * Providers that answered 402 (payment required) are switched off until the OWNER re-enables them (after confirming a
 * free allowance). Nothing retries them on a timer, so no request that could cost money is ever sent. The integration stays.
 */
const paymentBlocked = new Map<FallbackProviderId, number>();
let paymentListener: (() => void) | null = null;
export function onPaymentBlockChange(fn: (() => void) | null): void {
  paymentListener = fn;
}
export function providerPaymentBlocked(id: FallbackProviderId, _now = Date.now()): boolean {
  return paymentBlocked.has(id);
}
export function listPaymentBlocked(): FallbackProviderId[] {
  return Array.from(paymentBlocked.keys());
}
export function seedPaymentBlocked(ids: string[]): void {
  for (const id of ids) if (id in FALLBACK_PROVIDERS) paymentBlocked.set(id as FallbackProviderId, Date.now());
}
export function clearPaymentBlock(id: FallbackProviderId): void {
  if (paymentBlocked.delete(id)) paymentListener?.();
}
export function markProviderFailed(id: FallbackProviderId, status: number): void {
  if (status === 402 && !paymentBlocked.has(id)) {
    paymentBlocked.set(id, Date.now());
    paymentListener?.();
  }
  const ms = status === 402 ? 60 * 60_000 : status === 429 ? 3 * 60_000 : status === 401 || status === 403 ? 30 * 60_000 : 0;
  if (ms > 0) providerCooldown.set(id, Date.now() + ms);
}
/** Tests only: forget cooldowns and counters. */
export function resetProviderCooldowns(): void {
  providerCooldown.clear();
  paymentBlocked.clear();
  listingCache.clear();
  badModels.clear();
  resetProviderStats();
}

/**
 * Live counters per provider, kept in this server instance's memory. Only real calls are counted; nothing is estimated.
 * Gemini is measured in universalAi, not here.
 */
export interface ProviderStat {
  calls: number;
  ok: number;
  failed: number;
  rateLimited: number;
  lastLatencyMs: number | null;
  lastOkAt: string | null;
  lastError: string | null;
  lastErrorAt: string | null;
  /** Tokens the provider reported for answered calls (a provider that reports none adds 0). */
  inTok: number;
  outTok: number;
}
const emptyStat = (): ProviderStat => ({ calls: 0, ok: 0, failed: 0, rateLimited: 0, lastLatencyMs: null, lastOkAt: null, lastError: null, lastErrorAt: null, inTok: 0, outTok: 0 });

/** Sliding one-minute windows (for RPM and TPM) and a per-day counter, per provider. Memory only: they restart with the server. */
interface Windows { calls: number[]; tokens: [number, number][]; day: string; dayCalls: number; dayTokens: number }
const windows = new Map<FallbackProviderId, Windows>();
const dayKey = (now: number) => new Date(now).toISOString().slice(0, 10);
function windowsOf(id: FallbackProviderId, now = Date.now()): Windows {
  let w = windows.get(id);
  if (!w) {
    w = { calls: [], tokens: [], day: dayKey(now), dayCalls: 0, dayTokens: 0 };
    windows.set(id, w);
  }
  if (w.day !== dayKey(now)) { w.day = dayKey(now); w.dayCalls = 0; w.dayTokens = 0; }
  const cutoff = now - 60_000;
  w.calls = w.calls.filter((t) => t > cutoff);
  w.tokens = w.tokens.filter(([t]) => t > cutoff);
  return w;
}
/** Called after a counter changed; the persistence module uses it to save today's totals (debounced). */
let usageListener: (() => void) | null = null;
export function onProviderUsageChange(fn: (() => void) | null): void {
  usageListener = fn;
}
/** Today's (UTC) totals for every fallback provider, for saving. */
export function providerDayTotals(now = Date.now()): { day: string; providers: Record<string, { calls: number; tokens: number }> } {
  const providers: Record<string, { calls: number; tokens: number }> = {};
  (Object.keys(FALLBACK_PROVIDERS) as FallbackProviderId[]).forEach((id) => {
    const w = windowsOf(id, now);
    providers[id] = { calls: w.dayCalls, tokens: w.dayTokens };
  });
  return { day: dayKey(now), providers };
}
/** Restores today's totals after a restart (never lowers a counter that already grew in this process). */
export function seedProviderDay(day: string, providers: Record<string, { calls?: number; tokens?: number }>, now = Date.now()): void {
  if (day !== dayKey(now)) return;
  (Object.keys(FALLBACK_PROVIDERS) as FallbackProviderId[]).forEach((id) => {
    const saved = providers?.[id];
    if (!saved) return;
    const w = windowsOf(id, now);
    w.dayCalls = Math.max(w.dayCalls, Math.max(0, Math.round(Number(saved.calls) || 0)));
    w.dayTokens = Math.max(w.dayTokens, Math.max(0, Math.round(Number(saved.tokens) || 0)));
  });
}
/** Requests and tokens in the last minute and today (UTC) for one provider, as seen by this server. */
export function providerUsage(id: FallbackProviderId, now = Date.now()): { rpm: number; tpm: number; dayRequests: number; dayTokens: number } {
  const w = windowsOf(id, now);
  return { rpm: w.calls.length, tpm: w.tokens.reduce((s, [, n]) => s + n, 0), dayRequests: w.dayCalls, dayTokens: w.dayTokens };
}
export interface ProviderBudget { dailyTokens?: number; dailyRequests?: number }
/** True when today's requests or tokens reached the owner's cap for this provider (no cap set: never). */
export function providerOverBudget(id: FallbackProviderId, budget: ProviderBudget | undefined, now = Date.now()): boolean {
  if (!budget) return false;
  const u = providerUsage(id, now);
  return (!!budget.dailyRequests && u.dayRequests >= budget.dailyRequests) || (!!budget.dailyTokens && u.dayTokens >= budget.dailyTokens);
}
const stats = new Map<FallbackProviderId, ProviderStat>();
function statOf(id: FallbackProviderId): ProviderStat {
  let st = stats.get(id);
  if (!st) {
    st = emptyStat();
    stats.set(id, st);
  }
  return st;
}
export function resetProviderStats(): void {
  stats.clear();
  windows.clear();
}
export function recordProviderSuccess(id: FallbackProviderId, ms: number, inTok = 0, outTok = 0): void {
  const st = statOf(id);
  st.ok += 1;
  st.lastLatencyMs = ms;
  st.lastOkAt = new Date().toISOString();
  st.inTok += inTok;
  st.outTok += outTok;
}
/** A call was sent to the provider (counts toward RPM and the daily request count whether or not it succeeds). */
function noteRequestSent(id: FallbackProviderId, now = Date.now()): void {
  const w = windowsOf(id, now);
  w.calls.push(now);
  w.dayCalls += 1;
  usageListener?.();
}
function noteTokens(id: FallbackProviderId, n: number, now = Date.now()): void {
  if (n <= 0) return;
  const w = windowsOf(id, now);
  w.tokens.push([now, n]);
  w.dayTokens += n;
  usageListener?.();
}
export function recordProviderFailure(id: FallbackProviderId, status: number | null, message: string): void {
  const st = statOf(id);
  st.failed += 1;
  if (status === 429) st.rateLimited += 1;
  st.lastError = message.slice(0, 160);
  st.lastErrorAt = new Date().toISOString();
}
/** Counters plus the cooldown state of every provider (for the owner's panel). */
export type ProviderSnapshot = ProviderStat & { paymentBlocked: boolean; cooling: boolean; cooldownUntil: string | null; successRate: number | null; rpm: number; tpm: number; dayRequests: number; dayTokens: number };
export function providerStatsSnapshot(now = Date.now()): Record<FallbackProviderId, ProviderSnapshot> {
  const out = {} as Record<FallbackProviderId, ProviderSnapshot>;
  (Object.keys(FALLBACK_PROVIDERS) as FallbackProviderId[]).forEach((id) => {
    const st = stats.get(id) || emptyStat();
    const until = providerCooldown.get(id) || 0;
    out[id] = {
      ...st,
      paymentBlocked: providerPaymentBlocked(id, now),
      cooling: until > now,
      cooldownUntil: until > now ? new Date(until).toISOString() : null,
      successRate: st.calls > 0 ? Math.round((st.ok / st.calls) * 1000) / 10 : null,
      ...providerUsage(id, now)
    };
  });
  return out;
}
export function providerAvailable(id: FallbackProviderId, now = Date.now()): boolean {
  return (providerCooldown.get(id) || 0) <= now && !providerPaymentBlocked(id, now);
}

/** Order used when AI_FALLBACK_ORDER is not set. Gemini is the primary provider and is not part of this list. */
// Free-tier providers first; the ones that are paid unless a free allowance is confirmed (DeepSeek, Mistral) come last.
const DEFAULT_ORDER: FallbackProviderId[] = ['groq', 'sambanova', 'cloudflare', 'openrouter', 'siliconflow', 'deepseek', 'mistral'];

type Env = Record<string, string | undefined>;

/** The fallback providers that have a key in this environment, in the configured order. */
export function availableFallbacks(env: Env = process.env): { id: FallbackProviderId; model: string }[] {
  const raw = (env.AI_FALLBACK_ORDER || '').trim();
  const requested = raw
    ? raw.split(',').map((s) => s.trim().toLowerCase()).filter((s): s is FallbackProviderId => s in FALLBACK_PROVIDERS)
    : DEFAULT_ORDER;
  return requested
    .filter((id, i, all) => all.indexOf(id) === i)
    .filter((id) => providerConfigured(id, env))
    .map((id) => ({ id, model: modelCandidates(id, env)[0] }));
}

export interface ChatCallInput {
  system?: string;
  prompt: string;
  temperature?: number;
  jsonMode?: boolean;
  maxTokens?: number;
  timeoutMs?: number;
}

export interface ChatCallResult {
  provider: FallbackProviderId;
  model: string;
  text: string;
  ms: number;
  /** Tokens as reported by the provider (0 when it reports none). */
  inTok: number;
  outTok: number;
}

const STATUS_HINT: Record<number, string> = {
  400: 'so‘rov noto‘g‘ri (model nomi yoki parametr)',
  401: 'kalit noto‘g‘ri yoki bekor qilingan — Render’da kalitni tekshiring',
  402: 'hisobda mablag‘ yoki kredit tugagan',
  403: 'ruxsat yo‘q (kalit huquqi yoki hudud cheklovi)',
  404: 'model topilmadi — model nomini tekshiring',
  429: 'so‘rov limiti tugagan, keyinroq urinib ko‘ring',
  500: 'provayder ichki xatosi',
  502: 'provayder vaqtincha ishlamayapti',
  503: 'provayder band yoki vaqtincha ishlamayapti',
  504: 'provayder javob bermadi (vaqt tugadi)'
};

/** Human explanation for a failed call. The key is never included; the provider's short message is, with any key-like text hidden. */
export function describeHttpError(id: string, status: number, providerMessage = ''): string {
  const hint = STATUS_HINT[status] || 'noma’lum xato';
  const msg = providerMessage.replace(/\b(sk|gsk|sk-or|AIza)[-_A-Za-z0-9]{6,}/g, '[kalit]').replace(/\s+/g, ' ').trim().slice(0, 140);
  return `${id} HTTP ${status}: ${hint}${msg ? ` (${msg})` : ''}`;
}

/** The provider's error text (JSON error.message or plain text), if any. Never throws. */
async function readProviderMessage(res: Response): Promise<string> {
  try {
    const text = await res.text();
    try {
      const j = JSON.parse(text);
      const m = j?.error?.message ?? j?.message ?? j?.error;
      return typeof m === 'string' ? m : '';
    } catch {
      // Plain-text bodies may echo request data: they are not shown.
      return '';
    }
  } catch {
    return '';
  }
}

/** A model that answered 404 (gone) or empty is skipped for a while, so every request does not retry it first. */
const badModels = new Map<string, number>();
export function markModelBad(provider: string, model: string, ms: number): void {
  badModels.set(`${provider}/${model}`, Date.now() + ms);
}
export function modelIsBad(provider: string, model: string, now = Date.now()): boolean {
  return (badModels.get(`${provider}/${model}`) || 0) > now;
}

/** Models worth trying first among OpenRouter's free list (quality and speed vary; unknown ones keep their order). */
const OR_PREFERRED = /llama-3\.3|gpt-oss|gemma|mistral|deepseek|glm|nemotron/i;
export function rankFreeModels(models: string[]): string[] {
  const base = [...models].sort((a, b) => Number(OR_PREFERRED.test(b)) - Number(OR_PREFERRED.test(a)));
  return orderForChat(base);
}

/**
 * The models that may be called for a provider right now, in order: the provider's own live listing (Groq, Mistral) or
 * OpenRouter's verified-free catalogue, never a retired built-in name, never a model that is not verified free.
 */
export async function resolveCandidates(id: FallbackProviderId, key: string, env: Env = process.env, fetchImpl: typeof fetch = fetch): Promise<string[]> {
  const spec = FALLBACK_PROVIDERS[id];
  if (spec.strictModels) {
    // Built-in names (plus an explicit override) only, and only those the owner confirmed as free (AI_CONFIRMED_FREE).
    const own = onlyFreeCandidates(id, modelCandidates(id, env), { env });
    return own.filter((m) => !modelIsBad(id, m));
  }
  const live = id === 'openrouter' ? rankFreeModels(await openRouterFreeModels(fetchImpl)) : [];
  let candidates = Array.from(new Set([...modelCandidates(id, env).slice(0, 1), ...live, ...modelCandidates(id, env).slice(1)]));
  if (id === 'groq' || id === 'mistral') {
    const listing = await providerListing(id, key, fetchImpl);
    candidates = reconcileWithListing(spec.models, listing, (env[spec.modelEnv] || '').trim());
  }
  // Fail-closed: a model is kept only when its free status is FREE_VERIFIED (OpenRouter: live catalogue price 0).
  const free = onlyFreeCandidates(id, candidates, { liveFree: id === 'openrouter' ? live : null, env });
  return free.filter((m) => !modelIsBad(id, m));
}

/** The OpenRouter free list read most recently (empty when unknown). Used by the call-time cost gate. */
export function currentOpenRouterFree(): string[] {
  return freeOpenRouter?.models ?? [];
}

/** Reasoning models need room to think AND answer; a small caller limit would leave the answer empty. */
export function maxTokensFor(model: string, requested: number | undefined, boost = 1): number {
  const base = requested && requested > 0 ? requested : 0;
  if (!isReasoningModel(model)) return base * boost || 0;
  return Math.min(4096, Math.max(base, 700) * boost);
}
/** Provider-specific switches that keep a reasoning model's thinking short and out of the answer. */
export function reasoningParams(id: FallbackProviderId, model: string): Record<string, unknown> {
  if (!isReasoningModel(model)) return {};
  if (id === 'groq' && /gpt-oss/i.test(model)) return { reasoning_effort: 'low', include_reasoning: false };
  if (id === 'openrouter') return { reasoning: { effort: 'low', exclude: true } };
  return {};
}

/** One OpenAI-compatible call. Tries the provider's model candidates in order; a 404 (unknown model) moves to the next. */
export async function callFallbackProvider(
  id: FallbackProviderId,
  input: ChatCallInput,
  env: Env = process.env,
  fetchImpl: typeof fetch = fetch
): Promise<ChatCallResult> {
  const spec = FALLBACK_PROVIDERS[id];
  const key = (env[spec.envKey] || '').trim();
  if (!key || !providerConfigured(id, env)) throw new Error(`${id}: ${[spec.envKey, ...(spec.extraEnv || [])].join(' / ')} sozlanmagan`);
  const started = Date.now();
  statOf(id).calls += 1;
  const releaseSlot = await acquireSlot(id, Math.max(1, Number(env.AI_MAX_CONCURRENCY) || 8)).catch((e: Error) => {
    recordProviderFailure(id, null, e.message);
    throw e;
  });
  try {
    return await callCandidates();
  } finally {
    releaseSlot();
  }

  async function callCandidates(): Promise<ChatCallResult> {
  // Nothing verified free to call: say so, and send nothing.
  let lastError: Error = new Error(`${id}: bepul tasdiqlangan model yo‘q (Free Only: hech narsa yuborilmadi)`);
  let candidates = await resolveCandidates(id, key, env, fetchImpl);
  for (const model of candidates) {
    // Cost gate at send time: a model that is not FREE_VERIFIED is never sent, whatever the caller passed.
    try {
      assertFreeCall(id, model, { liveFree: id === 'openrouter' ? currentOpenRouterFree() : null, env });
    } catch (gateErr) {
      lastError = gateErr as Error;
      continue;
    }
    let boost = 1;
    for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), input.timeoutMs ?? 12_000);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` };
      if (id === 'openrouter') {
        headers['HTTP-Referer'] = 'https://edulevel.uz';
        headers['X-Title'] = 'Edu Level Platform';
      }
      const body: Record<string, unknown> = {
        model,
        messages: [
          ...(input.system ? [{ role: 'system', content: input.system }] : []),
          { role: 'user', content: input.prompt }
        ],
        temperature: input.temperature ?? 0.2,
        ...(input.maxTokens || isReasoningModel(model) ? { max_tokens: maxTokensFor(model, input.maxTokens, boost) } : {}),
        ...reasoningParams(id, model),
        ...(input.jsonMode ? { response_format: { type: 'json_object' } } : {})
      };
      let res: Response;
      noteRequestSent(id);
      try {
        res = await fetchImpl(endpointOf(id, env), { method: 'POST', headers, body: JSON.stringify(body), signal: controller.signal });
      } catch (err) {
        // Timeout or network failure: counted, and the caller moves on to the next provider.
        const timedOut = err instanceof Error && err.name === 'AbortError';
        const netMsg = `${id}: ${timedOut ? 'javob vaqti tugadi' : 'tarmoq xatosi'}`;
        recordProviderFailure(id, null, netMsg);
        throw new Error(netMsg);
      }
      if (!res.ok) {
        const message = describeHttpError(id, res.status, await readProviderMessage(res));
        if (res.status === 404) {
          // This model name is unknown to the provider: try the next candidate.
          lastError = new Error(message);
          markModelBad(id, model, 24 * 3_600_000);
          break;
        }
        markProviderFailed(id, res.status);
        recordProviderFailure(id, res.status, message);
        throw new Error(message);
      }
      const data = (await res.json()) as { choices?: { message?: { content?: string | null }; finish_reason?: string }[]; usage?: { prompt_tokens?: number; completion_tokens?: number } };
      const text = (data.choices?.[0]?.message?.content || '').trim();
      if (!text) {
        const finish = data.choices?.[0]?.finish_reason;
        // A reasoning model spent every token thinking: one retry with a bigger budget, then the next model.
        if (finish === 'length' && attempt === 0) {
          boost = 3;
          continue;
        }
        const emptyMsg = `${id}: bo‘sh javob (finish_reason: ${finish ?? 'noma’lum'}, model: ${model})`;
        lastError = new Error(emptyMsg);
        markModelBad(id, model, 10 * 60_000);
        break;
      }
      const inTok = Math.max(0, Math.round(Number(data.usage?.prompt_tokens) || 0));
      const outTok = Math.max(0, Math.round(Number(data.usage?.completion_tokens) || 0));
      recordProviderSuccess(id, Date.now() - started, inTok, outTok);
      noteTokens(id, inTok + outTok);
      return { provider: id, model, text, ms: Date.now() - started, inTok, outTok };
    } finally {
      clearTimeout(timer);
    }
    }
  }
  recordProviderFailure(id, null, lastError.message);
  throw lastError;
  }
}

/**
 * Tries the fallback providers one after another. Returns the first good answer, or throws the last error when
 * every configured provider failed (the caller then reports the honest "AI unavailable" state).
 */
export async function runFallbackChain(
  input: ChatCallInput,
  env: Env = process.env,
  fetchImpl: typeof fetch = fetch,
  onFailure?: (id: FallbackProviderId, message: string) => void,
  /** Owner's task route: only these providers, in this order. Without it, the default order applies. */
  order?: FallbackProviderId[]
): Promise<ChatCallResult> {
  const base = availableFallbacks(env);
  const chain = (order ? order.map((id) => base.find((b) => b.id === id)).filter((b): b is (typeof base)[number] => Boolean(b)) : base).filter(({ id }) => providerAvailable(id));
  if (!chain.length) throw new Error('Zaxira AI provayderlari sozlanmagan yoki vaqtincha ishlamayapti');
  let last: unknown = null;
  for (const { id } of chain) {
    try {
      return await callFallbackProvider(id, input, env, fetchImpl);
    } catch (err) {
      last = err;
      onFailure?.(id, err instanceof Error ? err.message : String(err));
    }
  }
  throw last instanceof Error ? last : new Error('Zaxira AI javob bermadi');
}

export interface BenchmarkResult {
  provider: FallbackProviderId;
  model: string;
  ok: boolean;
  /** Time to the first streamed chunk, ms. */
  ttftMs: number | null;
  /** Time until the stream ended, ms. */
  totalMs: number | null;
  /** Characters received (a token count is not reported by every provider, so none is invented). */
  chars: number;
  message?: string;
}

/**
 * One tiny streamed request (a few tokens) to measure time to first token and total time. Runs only when the owner
 * presses "Benchmark"; costs a few output tokens per provider. Never throws.
 */
export async function benchmarkProvider(id: FallbackProviderId, env: Env = process.env, fetchImpl: typeof fetch = fetch): Promise<BenchmarkResult> {
  const spec = FALLBACK_PROVIDERS[id];
  const key = (env[spec.envKey] || '').trim();
  if (!key || !providerConfigured(id, env)) return { provider: id, model: modelCandidates(id, env)[0], ok: false, ttftMs: null, totalMs: null, chars: 0, message: `${spec.envKey} sozlanmagan` };
  const models = await resolveCandidates(id, key, env, fetchImpl);
  if (!models.length) return { provider: id, model: '—', ok: false, ttftMs: null, totalMs: null, chars: 0, message: `${id}: bepul model topilmadi (Free Only rejimi)` };
  // A 404 means the name is gone: the next verified-free model is measured instead (at most three tries, one at a time; a model that only produced reasoning also counts as failed).
  let result = await benchmarkModel(id, models[0], key, fetchImpl, env);
  for (let i = 1; i < Math.min(models.length, 3) && !result.ok && /404|oqimda matn|reasoning/.test(result.message || ''); i++) result = await benchmarkModel(id, models[i], key, fetchImpl, env);
  return result;
}

async function benchmarkModel(id: FallbackProviderId, model: string, key: string, fetchImpl: typeof fetch, env: Env = process.env): Promise<BenchmarkResult> {
  const spec = FALLBACK_PROVIDERS[id];
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  const t0 = Date.now();
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` };
    if (id === 'openrouter') {
      headers['HTTP-Referer'] = 'https://edulevel.uz';
      headers['X-Title'] = 'Edu Level Platform';
    }
    noteRequestSent(id);
    const res = await fetchImpl(endpointOf(id, env), {
      method: 'POST',
      headers,
      signal: controller.signal,
      body: JSON.stringify({ model, stream: true, max_tokens: isReasoningModel(model) ? 600 : 48, temperature: 0, ...reasoningParams(id, model), messages: [{ role: 'user', content: 'Count from one to five in English, in one line.' }] })
    });
    if (!res.ok || !res.body) {
      const message = describeHttpError(id, res.status, await readProviderMessage(res));
      markProviderFailed(id, res.status);
      recordProviderFailure(id, res.status, message);
      return { provider: id, model, ok: false, ttftMs: null, totalMs: Date.now() - t0, chars: 0, message };
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let ttft: number | null = null;
    let chars = 0;
    let buffer = '';
    let sawReasoning = false;
    let finishReason = '';
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        const m = line.match(/^data:\s*(.+)$/);
        if (!m || m[1] === '[DONE]') continue;
        try {
          const choice = JSON.parse(m[1])?.choices?.[0];
          const delta = choice?.delta || {};
          // Reasoning text (reasoning / reasoning_content) is never shown or counted as the answer.
          if (typeof delta.reasoning === 'string' || typeof delta.reasoning_content === 'string') sawReasoning = true;
          if (choice?.finish_reason) finishReason = String(choice.finish_reason);
          const piece = delta.content;
          if (typeof piece === 'string' && piece.length > 0) {
            if (ttft === null) ttft = Date.now() - t0;
            chars += piece.length;
          }
        } catch {
          // keep-alive or partial line
        }
      }
    }
    const total = Date.now() - t0;
    if (ttft === null) {
      const message = sawReasoning
        ? `${id}: faqat o‘ylash (reasoning) keldi, javob matni yo‘q (finish: ${finishReason || 'noma’lum'}, model: ${model})`
        : `${id}: oqimda matn kelmadi (finish: ${finishReason || 'noma’lum'}, model: ${model})`;
      markModelBad(id, model, 10 * 60_000);
      recordProviderFailure(id, null, message);
      return { provider: id, model, ok: false, ttftMs: null, totalMs: total, chars, message };
    }
    statOf(id).calls += 1;
    recordProviderSuccess(id, total);
    return { provider: id, model, ok: true, ttftMs: ttft, totalMs: total, chars };
  } catch (err) {
    const timedOut = err instanceof Error && err.name === 'AbortError';
    const message = `${id}: ${timedOut ? 'javob vaqti tugadi' : 'tarmoq xatosi'}`;
    statOf(id).calls += 1;
    recordProviderFailure(id, null, message);
    return { provider: id, model, ok: false, ttftMs: null, totalMs: Date.now() - t0, chars: 0, message };
  } finally {
    clearTimeout(timer);
  }
}
