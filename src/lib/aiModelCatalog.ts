import { FALLBACK_PROVIDERS, endpointOf, providerConfigured, type FallbackProviderId } from './aiRouter';
import { chatModelsFromListing } from './aiFreeOnly';

/**
 * Model catalogue per provider, built only from what each provider's own model list says. A field the provider does not
 * give is null ("unknown"): nothing is guessed. Being listed does not prove the key may call a model for free:
 * `freeStatus` says what the evidence is.
 */
export interface CatalogModel {
  provider: 'gemini' | FallbackProviderId;
  id: string;
  name: string | null;
  contextWindow: number | null;
  inputTokenLimit: number | null;
  outputTokenLimit: number | null;
  streaming: boolean | null;
  vision: boolean | null;
  audio: boolean | null;
  /** 'verified-free': price 0 in the catalogue (OpenRouter). 'free-tier': provider offers a rate-limited free tier, per-model access unverified. 'unknown'. */
  freeStatus: 'verified-free' | 'free-tier' | 'unknown';
  usable: boolean;
}

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.round(v) : null);

export function mapGroqListing(data: { data?: { id?: string; context_window?: number }[] }): CatalogModel[] {
  const rows = (data.data || []).filter((m) => m.id);
  const chat = new Set(chatModelsFromListing(rows.map((m) => String(m.id))));
  return rows.map((m) => ({ provider: 'groq', id: String(m.id), name: null, contextWindow: num(m.context_window), inputTokenLimit: null, outputTokenLimit: null, streaming: null, vision: null, audio: /whisper|tts|orpheus|playai/i.test(String(m.id)) ? true : null, freeStatus: 'free-tier', usable: chat.has(String(m.id)) }));
}

export function mapMistralListing(data: { data?: { id?: string; name?: string; max_context_length?: number; capabilities?: { vision?: boolean } }[] }): CatalogModel[] {
  const rows = (data.data || []).filter((m) => m.id);
  const chat = new Set(chatModelsFromListing(rows.map((m) => String(m.id))));
  return rows.map((m) => ({ provider: 'mistral', id: String(m.id), name: m.name || null, contextWindow: num(m.max_context_length), inputTokenLimit: null, outputTokenLimit: null, streaming: null, vision: typeof m.capabilities?.vision === 'boolean' ? m.capabilities.vision : null, audio: null, freeStatus: 'free-tier', usable: chat.has(String(m.id)) }));
}

export function mapOpenRouterListing(data: { data?: { id?: string; name?: string; context_length?: number; pricing?: { prompt?: string; completion?: string }; architecture?: { input_modalities?: string[] }; top_provider?: { max_completion_tokens?: number } }[] }): CatalogModel[] {
  return (data.data || [])
    .filter((m) => m.id && String(m.id).endsWith(':free'))
    .map((m) => {
      const free = String(m.pricing?.prompt) === '0' && String(m.pricing?.completion) === '0';
      const inputs = m.architecture?.input_modalities;
      return { provider: 'openrouter' as const, id: String(m.id), name: m.name || null, contextWindow: num(m.context_length), inputTokenLimit: null, outputTokenLimit: num(m.top_provider?.max_completion_tokens), streaming: null, vision: Array.isArray(inputs) ? inputs.includes('image') : null, audio: Array.isArray(inputs) ? inputs.includes('audio') : null, freeStatus: free ? ('verified-free' as const) : ('unknown' as const), usable: free };
    });
}

export function mapGeminiListing(data: { models?: { name?: string; displayName?: string; inputTokenLimit?: number; outputTokenLimit?: number; supportedGenerationMethods?: string[] }[] }): CatalogModel[] {
  return (data.models || [])
    .filter((m) => m.name)
    .map((m) => {
      const methods = m.supportedGenerationMethods || [];
      const text = methods.includes('generateContent');
      return { provider: 'gemini' as const, id: String(m.name).replace(/^models\//, ''), name: m.displayName || null, contextWindow: null, inputTokenLimit: num(m.inputTokenLimit), outputTokenLimit: num(m.outputTokenLimit), streaming: methods.length ? methods.includes('streamGenerateContent') : null, vision: null, audio: null, freeStatus: 'free-tier' as const, usable: text && !/embedding|aqa|imagen|veo|tts|live|native-audio/i.test(String(m.name)) };
    });
}

/**
 * Cloudflare, SambaNova and SiliconFlow: only the built-in model names are usable (their live lists do not say which
 * models are free). Other listed models are shown for information as unknown and are never called.
 */
export function mapStrictProvider(id: 'cloudflare' | 'sambanova' | 'siliconflow', listed: string[]): CatalogModel[] {
  const own = new Set(FALLBACK_PROVIDERS[id].models);
  const ids = Array.from(new Set([...FALLBACK_PROVIDERS[id].models, ...listed]));
  return ids.map((m) => ({ provider: id, id: m, name: null, contextWindow: null, inputTokenLimit: null, outputTokenLimit: null, streaming: null, vision: null, audio: null, freeStatus: own.has(m) ? ('free-tier' as const) : ('unknown' as const), usable: own.has(m) }));
}

/** Reads every configured provider's list (one request each, in turn). A provider that fails is reported with its reason. */
export async function fetchModelCatalog(env: Record<string, string | undefined> = process.env, fetchImpl: typeof fetch = fetch): Promise<{ models: CatalogModel[]; errors: Record<string, string>; checkedAt: string }> {
  const models: CatalogModel[] = [];
  const errors: Record<string, string> = {};
  const get = async (id: string, url: string, headers: Record<string, string>) => {
    try {
      const res = await fetchImpl(url, { headers, signal: AbortSignal.timeout(8_000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      errors[id] = (e as Error).message.slice(0, 80);
      return null;
    }
  };
  const gk = (env.GEMINI_API_KEY || '').trim();
  if (gk) {
    const d = await get('gemini', 'https://generativelanguage.googleapis.com/v1beta/models?pageSize=200', { 'x-goog-api-key': gk });
    if (d) models.push(...mapGeminiListing(d));
  } else errors.gemini = 'kalit yo‘q';
  for (const id of ['groq', 'mistral'] as const) {
    const key = (env[FALLBACK_PROVIDERS[id].envKey] || '').trim();
    if (!key) { errors[id] = 'kalit yo‘q'; continue; }
    const d = await get(id, FALLBACK_PROVIDERS[id].endpoint.replace(/\/chat\/completions$/, '/models'), { Authorization: `Bearer ${key}` });
    if (d) models.push(...(id === 'groq' ? mapGroqListing(d) : mapMistralListing(d)));
  }
  for (const id of ['sambanova', 'siliconflow'] as const) {
    const key = (env[FALLBACK_PROVIDERS[id].envKey] || '').trim();
    if (!key) { errors[id] = 'kalit yo‘q'; continue; }
    const d = await get(id, endpointOf(id, env).replace(/\/chat\/completions$/, '/models'), { Authorization: `Bearer ${key}` });
    models.push(...mapStrictProvider(id, ((d?.data || []) as { id?: string }[]).map((m) => String(m.id || '')).filter(Boolean)));
  }
  if (providerConfigured('cloudflare', env)) models.push(...mapStrictProvider('cloudflare', []));
  else errors.cloudflare = 'kalit yoki account id yo‘q';
  const or = await get('openrouter', 'https://openrouter.ai/api/v1/models', {});
  if (or) models.push(...mapOpenRouterListing(or));
  // DeepSeek publishes no free tier and its list needs a funded key: it is shown as a known-paid, switched-off integration.
  errors.deepseek = 'bepul tarif yo‘q; 402 bo‘lsa avtomatik o‘chiriladi';
  return { models, errors, checkedAt: new Date().toISOString() };
}
