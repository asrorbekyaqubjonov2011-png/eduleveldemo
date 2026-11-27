/**
 * Task-based AI routing. For every kind of AI work (chat, grading, test generation ...) the owner picks a primary provider
 * and an ordered list of fallbacks, and can switch a provider off. The configuration lives in the database
 * (site_settings.ai_routing), so it changes without a deploy.
 *
 * Only the five providers EduLevel uses: Gemini (primary SDK path) and Groq, DeepSeek, OpenRouter, Mistral (aiRouter.ts).
 * Nothing here calls a provider; it only decides the order. A provider without a key is never part of a route.
 */
import { FALLBACK_PROVIDERS, availableFallbacks, providerConfigured, providerOverBudget, providerPaymentBlocked, type FallbackProviderId, type ProviderBudget } from './aiRouter';

export type ProviderRef = 'gemini' | FallbackProviderId;

export const PROVIDER_REFS: ProviderRef[] = ['gemini', 'groq', 'sambanova', 'cloudflare', 'openrouter', 'siliconflow', 'deepseek', 'mistral'];

export const AI_TASKS = [
  { id: 'edubek_chat', label: 'EduBek AI chat', kind: 'quality' },
  { id: 'voice', label: 'Ovozli suhbat', kind: 'fast' },
  { id: 'writing_grade', label: 'Writing tekshirish (IELTS/CEFR)', kind: 'quality' },
  { id: 'speaking_grade', label: 'Speaking baholash (IELTS/CEFR)', kind: 'quality' },
  { id: 'test_generation', label: 'Test va mashq yaratish', kind: 'quality' },
  { id: 'mock_generation', label: 'Mock test yaratish', kind: 'quality' },
  { id: 'grammar', label: 'Grammar tushuntirish', kind: 'fast' },
  { id: 'vocabulary', label: 'Vocabulary mashqlari', kind: 'fast' },
  { id: 'translation', label: 'Tarjima', kind: 'fast' },
  { id: 'telegram_post', label: 'Telegram kanal postlari', kind: 'quality' },
  { id: 'seo_content', label: 'SEO kontent qoralamasi', kind: 'quality' },
  { id: 'analysis', label: 'Murakkab tahlil (owner yordamchisi)', kind: 'quality' },
  { id: 'quick_qa', label: 'Oddiy tezkor savol-javob', kind: 'fast' },
  { id: 'general', label: 'Boshqa AI so‘rovlar', kind: 'quality' }
] as const;

export type AiTaskId = (typeof AI_TASKS)[number]['id'];
const TASK_IDS = new Set<string>(AI_TASKS.map((t) => t.id));

export interface TaskRoute {
  primary: ProviderRef;
  fallbacks: ProviderRef[];
  /** Per-request timeout for the fallback providers of this task, in ms. */
  timeoutMs?: number;
}

export interface RoutingConfig {
  tasks: Partial<Record<AiTaskId, TaskRoute>>;
  /** Providers switched off by the owner: never used for any task. */
  disabled: ProviderRef[];
  /** Optional daily caps per fallback provider (requests and tokens, counted by this server since it started). A provider at its cap is skipped until the next UTC day. */
  budgets: Partial<Record<FallbackProviderId, ProviderBudget>>;
  updatedAt?: string;
}

const isRef = (v: unknown): v is ProviderRef => typeof v === 'string' && (PROVIDER_REFS as string[]).includes(v);

/**
 * Starting routes. Fast, non-reasoning work starts on Groq when it has a key (the quickest of the five); everything
 * else starts on Gemini. Measured quality per task is not known yet: the owner can change any row after a benchmark.
 */
export function defaultRoute(task: AiTaskId): TaskRoute {
  const quickFirst = task === 'voice' || task === 'quick_qa';
  const order: ProviderRef[] = quickFirst
    ? ['groq', 'sambanova', 'cloudflare', 'gemini', 'openrouter', 'siliconflow', 'deepseek', 'mistral']
    : ['gemini', 'groq', 'sambanova', 'cloudflare', 'openrouter', 'siliconflow', 'deepseek', 'mistral'];
  return { primary: order[0], fallbacks: order.slice(1) };
}

/**
 * Starting request timeout per task (ms). Spoken replies must start fast, so a slow provider is abandoned sooner and the
 * next free one answers; the owner can set any value from 3 to 60 s per task. These are starting values, to be tuned
 * from the real timings the owner sees in the Marshrutlash tab.
 */
export function defaultTimeoutMs(task: AiTaskId): number {
  if (task === 'voice') return 6_000;
  if (task === 'quick_qa') return 8_000;
  return 12_000;
}

export function emptyRouting(): RoutingConfig {
  return { tasks: {}, disabled: [], budgets: {} };
}

/** Validates owner input: unknown tasks and providers are dropped, lists are de-duplicated, timeouts are bounded. */
export function sanitizeRouting(input: unknown): RoutingConfig {
  const out = emptyRouting();
  if (!input || typeof input !== 'object') return out;
  const raw = input as { tasks?: unknown; disabled?: unknown; budgets?: unknown };
  if (Array.isArray(raw.disabled)) out.disabled = Array.from(new Set(raw.disabled.filter(isRef)));
  if (raw.budgets && typeof raw.budgets === 'object') {
    for (const [id, v] of Object.entries(raw.budgets as Record<string, unknown>)) {
      if (!(id in FALLBACK_PROVIDERS) || !v || typeof v !== 'object') continue;
      const b = v as { dailyTokens?: unknown; dailyRequests?: unknown };
      const budget: ProviderBudget = {};
      const t = Math.round(Number(b.dailyTokens));
      const r = Math.round(Number(b.dailyRequests));
      if (Number.isFinite(t) && t > 0 && t <= 1_000_000_000) budget.dailyTokens = t;
      if (Number.isFinite(r) && r > 0 && r <= 10_000_000) budget.dailyRequests = r;
      if (budget.dailyTokens || budget.dailyRequests) out.budgets[id as FallbackProviderId] = budget;
    }
  }
  if (raw.tasks && typeof raw.tasks === 'object') {
    for (const [task, value] of Object.entries(raw.tasks as Record<string, unknown>)) {
      if (!TASK_IDS.has(task) || !value || typeof value !== 'object') continue;
      const r = value as { primary?: unknown; fallbacks?: unknown; timeoutMs?: unknown };
      if (!isRef(r.primary)) continue;
      const fallbacks = Array.isArray(r.fallbacks) ? Array.from(new Set(r.fallbacks.filter(isRef))).filter((p) => p !== r.primary) : [];
      const route: TaskRoute = { primary: r.primary, fallbacks };
      const t = Number(r.timeoutMs);
      if (Number.isFinite(t) && t >= 3000 && t <= 60000) route.timeoutMs = Math.round(t);
      out.tasks[task as AiTaskId] = route;
    }
  }
  return out;
}

let current: RoutingConfig = emptyRouting();
/** Called once per request with the database's copy, so the running server always follows the saved configuration. */
export function setRoutingConfig(cfg: RoutingConfig | undefined | null): void {
  current = cfg ? sanitizeRouting(cfg) : emptyRouting();
}
export function getRoutingConfig(): RoutingConfig {
  return current;
}

type Env = Record<string, string | undefined>;

/** Whether a provider has a key on this server (Gemini: a key or an owner-supplied one). */
export function isConfigured(ref: ProviderRef, env: Env = process.env, hasGeminiKey = Boolean((env.GEMINI_API_KEY || '').trim())): boolean {
  if (ref === 'gemini') return hasGeminiKey;
  return providerConfigured(ref, env);
}

/** The configured route for a task, or its default. */
export function routeConfig(task: AiTaskId, cfg: RoutingConfig = current): TaskRoute & { isDefault: boolean } {
  const saved = cfg.tasks[task];
  return saved ? { ...saved, isDefault: false } : { ...defaultRoute(task), isDefault: true };
}

/**
 * The providers to try for a task, in order: primary, owner's fallbacks, then every other enabled provider as a last
 * resort. Switched-off providers and providers without a key are left out.
 */
export function resolveRoute(task: AiTaskId, opts: { env?: Env; hasGeminiKey?: boolean; cfg?: RoutingConfig } = {}): ProviderRef[] {
  const env = opts.env ?? process.env;
  const cfg = opts.cfg ?? current;
  const r = routeConfig(task, cfg);
  const ordered = [r.primary, ...r.fallbacks, ...PROVIDER_REFS];
  const seen = new Set<ProviderRef>();
  const result: ProviderRef[] = [];
  for (const ref of ordered) {
    if (seen.has(ref)) continue;
    seen.add(ref);
    if (cfg.disabled.includes(ref)) continue;
    if (!isConfigured(ref, env, opts.hasGeminiKey)) continue;
    if (ref !== 'gemini' && providerPaymentBlocked(ref)) continue; // 402: off until the owner re-enables it
    if (ref !== 'gemini' && providerOverBudget(ref, cfg.budgets?.[ref])) continue;
    result.push(ref);
  }
  return result;
}

/** Fallback-provider ids from a route (everything except Gemini), keeping their order. */
export function fallbackIds(route: ProviderRef[]): FallbackProviderId[] {
  return route.filter((r): r is FallbackProviderId => r !== 'gemini');
}

/** Providers the router would use without any owner configuration (for the panel's "default" label). */
export function defaultFallbackOrder(env: Env = process.env): FallbackProviderId[] {
  return availableFallbacks(env).map((p) => p.id);
}
