import { NextRequest, NextResponse } from 'next/server';
import { withDatabase } from '@/src/lib/dbStore';
import { requireOwner } from '@/src/lib/auth/guards';
import { geminiAllowed } from '@/src/lib/aiFreeOnly';
import { providerConfigured, resolveCandidates, clearPaymentBlock, benchmarkProvider, FALLBACK_PROVIDERS, availableFallbacks, callFallbackProvider, modelCandidates, providerAvailable, providerPaymentBlocked, providerStatsSnapshot, type FallbackProviderId } from '@/src/lib/aiRouter';
import { benchmarkGemini, executeUniversalAi, pickGeminiModelsFast, usableModels } from '@/src/lib/universalAi';

export const dynamic = 'force-dynamic';

const ALL_IDS: FallbackProviderId[] = ['groq', 'sambanova', 'cloudflare', 'openrouter', 'siliconflow', 'deepseek', 'mistral'];

const PROVIDER_LABELS: Record<FallbackProviderId, string> = {
  groq: 'Groq (tez)',
  deepseek: 'DeepSeek',
  openrouter: 'OpenRouter (zaxira)',
  mistral: 'Mistral',
  cloudflare: 'Cloudflare Workers AI',
  sambanova: 'SambaNova',
  siliconflow: 'SiliconFlow'
};

/**
 * Owner's view of the AI providers. Only whether a key is set is shown (never the key). `GET` lists them;
 * `POST { provider }` sends one tiny test prompt through that provider and reports the result and the time it took.
 */
async function handleGet(req: NextRequest) {
  const auth = requireOwner(req);
  if (auth instanceof NextResponse) return auth;
  const order = availableFallbacks(process.env).map((p) => p.id).filter((id) => !providerPaymentBlocked(id)); // 402: not part of the real order
  const geminiKey = (process.env.GEMINI_API_KEY || '').trim();
  const geminiAllowedNow = geminiAllowed(process.env);
  const geminiModels = geminiKey ? usableModels(await pickGeminiModelsFast(geminiKey).catch(() => [] as string[])) : [];
  const snapshot = providerStatsSnapshot();
  const providers = [
    { id: 'gemini', label: 'Google Gemini (asosiy)', configured: Boolean((process.env.GEMINI_API_KEY || '').trim()), model: geminiModels[0] || process.env.GEMINI_MODEL || 'gemini (avtomatik)', effectiveModels: geminiModels.slice(0, 4), role: 'primary', cooling: false, freeNote: geminiAllowedNow ? 'Bepul tarif owner tomonidan tasdiqlangan (GEMINI_FREE_TIER_CONFIRMED=1)' : 'Bepul tarif tasdiqlanmagan: GEMINI_FREE_TIER_CONFIRMED=1 qo‘yilguncha so‘rov yuborilmaydi' },
    ...(await Promise.all(ALL_IDS.map(async (id) => {
      const key = providerConfigured(id) ? (process.env[FALLBACK_PROVIDERS[id].envKey] || '').trim() : '';
      // The model that will really be called first (live list, verified free), not an old built-in name.
      const effective = key ? await resolveCandidates(id, key).catch(() => []) : [];
      return {
      id,
      label: PROVIDER_LABELS[id],
      configured: providerConfigured(id),
      model: effective[0] || modelCandidates(id, process.env)[0],
      effectiveModels: effective.slice(0, 4),
      // Free-status note for the owner (fail-closed): what is callable and why nothing is, when nothing is.
      freeNote: effective.length
        ? `Bepul deb tasdiqlangan modellar: ${effective.length} ta`
        : id === 'siliconflow'
          ? 'PAID: tasdiqlanmaguncha bloklangan (AI_CONFIRMED_FREE ga model qo‘shing)'
          : id === 'openrouter'
            ? 'Bepul katalog o‘qilmadi yoki bo‘sh: hech bir model tasdiqlanmagan'
            : 'Bepul tarif tasdiqlanmagan: AI_CONFIRMED_FREE ga model qo‘shilguncha chaqirilmaydi',
      role: order.includes(id) ? 'fallback' : 'off',
      cooling: !providerAvailable(id),
      // Real counters from this server instance since its last start; null means no call has been made yet.
      stats: snapshot[id]
      };
    })))
  ];
  return NextResponse.json({ success: true, providers, fallbackOrder: order });
}

async function handlePost(req: NextRequest) {
  const auth = requireOwner(req);
  if (auth instanceof NextResponse) return auth;
  const body = (await req.json().catch(() => ({}))) as { provider?: unknown; benchmark?: unknown; action?: unknown };
  const provider = typeof body.provider === 'string' ? body.provider : '';
  if (body.action === 'unblock' && provider in FALLBACK_PROVIDERS) {
    // Only after the owner confirmed that the provider's FREE allowance works for this account.
    clearPaymentBlock(provider as FallbackProviderId);
    return NextResponse.json({ success: true, provider });
  }
  if (body.benchmark === true) {
    // One tiny streamed request per configured fallback provider, one after another (never a burst).
    const results = [];
    results.push(await benchmarkGemini());
    for (const id of ALL_IDS) results.push(await benchmarkProvider(id));
    return NextResponse.json({ success: true, results });
  }
  const probe = { prompt: 'Faqat bitta so‘z javob bering: ok', temperature: 0, maxTokens: 8, timeoutMs: 10_000 };
  const started = Date.now();
  try {
    if (provider === 'gemini') {
      const text = await executeUniversalAi({ prompt: probe.prompt, temperature: 0, maxOutputTokens: 8 });
      return NextResponse.json({ success: true, provider, ms: Date.now() - started, sample: String(text).slice(0, 40) });
    }
    if (provider in FALLBACK_PROVIDERS) {
      const r = await callFallbackProvider(provider as FallbackProviderId, probe);
      return NextResponse.json({ success: true, provider, ms: r.ms, model: r.model, sample: r.text.slice(0, 40) });
    }
    return NextResponse.json({ success: false, message: 'Noma’lum provayder.' }, { status: 400 });
  } catch (err) {
    // Only the message the router produced (status or "not configured"), never the provider's body or any key.
    const message = err instanceof Error ? err.message : 'Xatolik';
    return NextResponse.json({ success: false, provider, ms: Date.now() - started, message: message.slice(0, 160) }, { status: 502 });
  }
}

export const GET = withDatabase(handleGet);
export const POST = withDatabase(handlePost);
