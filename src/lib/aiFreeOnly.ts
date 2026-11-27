/**
 * Zero-cost rules for the AI gateway. EduLevel never pays for AI: only models that are free to call are ever tried.
 * - OpenRouter: a model must be a ":free" variant (and, when the live catalogue is read, have price 0 for prompt and completion).
 * - Groq and Mistral: only chat models that the provider itself lists for the key (their free tiers are rate limited, not billed).
 * - DeepSeek has no free tier; it stays integrated but is switched off automatically when it answers 402 (payment required).
 * A model whose price is unknown is not used.
 */
export const FREE_ONLY_MODE = true as const;

const NON_CHAT = /whisper|guard|tts|embed|moderat|ocr|transcri|orpheus|playai|speech|rerank|image|vision-preview/i;

/** Chat-capable model ids out of a provider's /models listing, original order kept. */
export function chatModelsFromListing(ids: string[]): string[] {
  return ids.filter((id) => typeof id === 'string' && id && !NON_CHAT.test(id));
}

/**
 * Free status of one model, decided with fail-closed rules. Only FREE_VERIFIED may be called.
 * - FREE_VERIFIED: OpenRouter ':free' model that is in the live catalogue with price 0 for prompt AND completion; or any
 *   model the owner confirmed in AI_CONFIRMED_FREE (after checking the provider's billing / free-tier page).
 * - FREE_UNVERIFIED: a model the provider lists or the code knows, but nothing proves it is free for this account.
 * - PAID: known paid (SiliconFlow models without an owner confirmation).
 * - UNKNOWN: no price evidence at all (OpenRouter with an empty catalogue, OpenRouter model without ':free').
 * Listing a model is never proof of a free price.
 */
export type FreeStatus = 'FREE_VERIFIED' | 'FREE_UNVERIFIED' | 'PAID' | 'UNKNOWN';
export type Env = Record<string, string | undefined>;

/** Owner confirmations: AI_CONFIRMED_FREE="provider:model,provider:model" (split at the first colon). */
export function confirmedFreeSet(env: Env = process.env): Set<string> {
  return new Set(
    (env.AI_CONFIRMED_FREE || '')
      .split(',')
      .map((x) => x.trim())
      .filter((x) => x.includes(':'))
  );
}

/** Gemini may be called only when the owner confirmed the free tier (GEMINI_FREE_TIER_CONFIRMED=1) for this account. */
export function geminiAllowed(env: Env = process.env): boolean {
  return (env.GEMINI_FREE_TIER_CONFIRMED || '').trim() === '1';
}

export function freeStatus(provider: string, model: string, opts: { liveFree?: string[] | null; env?: Env } = {}): FreeStatus {
  const env = opts.env ?? process.env;
  if (!model) return 'UNKNOWN';
  const confirmed = confirmedFreeSet(env).has(`${provider}:${model}`);
  if (provider === 'openrouter') {
    if (!model.endsWith(':free')) return 'UNKNOWN';
    // An empty or unreadable catalogue is NOT proof that a model is free.
    if (!opts.liveFree || opts.liveFree.length === 0) return 'UNKNOWN';
    return opts.liveFree.includes(model) ? 'FREE_VERIFIED' : 'UNKNOWN';
  }
  if (provider === 'gemini') return geminiAllowed(env) || confirmed ? 'FREE_VERIFIED' : 'FREE_UNVERIFIED';
  if (provider === 'siliconflow') return confirmed ? 'FREE_VERIFIED' : 'PAID';
  return confirmed ? 'FREE_VERIFIED' : 'FREE_UNVERIFIED';
}

/** Whether a model may be called under Free Only Mode (fail-closed). */
export function isVerifiedFreeModel(provider: string, model: string, opts: { liveFree?: string[] | null; env?: Env } = {}): boolean {
  return freeStatus(provider, model, opts) === 'FREE_VERIFIED';
}

/** Keeps the candidates that may be called, preserving order. Every AI call goes through this list. */
export function onlyFreeCandidates(provider: string, candidates: string[], opts: { liveFree?: string[] | null; env?: Env } = {}): string[] {
  return candidates.filter((m) => isVerifiedFreeModel(provider, m, opts));
}

/** Thrown when a call would not be free (or its price is unknown). Callers move on; nothing is sent. */
export class CostBlockedError extends Error {
  constructor(provider: string, model: string, status: FreeStatus) {
    super(`${provider}/${model}: bepul ekanligi tasdiqlanmagan (${status}); chaqiruv bloklandi`);
    this.name = 'CostBlockedError';
  }
}

/** The single cost gate used right before a request is sent. */
export function assertFreeCall(provider: string, model: string, opts: { liveFree?: string[] | null; env?: Env } = {}): void {
  const status = freeStatus(provider, model, opts);
  if (status !== 'FREE_VERIFIED') throw new CostBlockedError(provider, model, status);
}

/** Candidates for a provider whose live model list is known: the preferred names that really exist, else a few live chat models. */
export function reconcileWithListing(preferred: string[], live: string[], override = ''): string[] {
  const chat = chatModelsFromListing(live);
  if (!chat.length) return Array.from(new Set([override, ...preferred].filter(Boolean)));
  const known = new Set(chat);
  const out = [override, ...preferred].filter((m) => m && known.has(m));
  // The provider's other chat models follow, so one retired or reasoning-only preferred model never leaves a single choice.
  out.push(...chat.filter((m) => !out.includes(m)).slice(0, 6));
  return Array.from(new Set(orderForChat(out))).slice(0, 6);
}

/** Models that think before they answer (their hidden reasoning can use every token and leave the answer empty). */
const REASONING = /gpt-oss|nemotron|deepseek-r1|(^|[\/-])r1([\/-]|$)|qwq|reason|think|magistral|o1|o3|kimi/i;
export function isReasoningModel(model: string): boolean {
  return REASONING.test(model);
}
/** Vision-language and other models that are poor for plain text chat. */
const NOT_PLAIN_CHAT = /(^|[\/-])vl([\/-]|$)|vision|-vl-|image|multimodal-embed|safeguard/i;
export function isPlainChatModel(model: string): boolean {
  return !NOT_PLAIN_CHAT.test(model);
}
/** Plain, fast (non-reasoning) models first; reasoning ones keep their order after them; vision models last. */
export function orderForChat(models: string[]): string[] {
  const score = (m: string) => (isPlainChatModel(m) ? 0 : 2) + (isReasoningModel(m) ? 1 : 0);
  return models.map((m, i) => ({ m, i })).sort((a, b) => score(a.m) - score(b.m) || a.i - b.i).map((x) => x.m);
}
