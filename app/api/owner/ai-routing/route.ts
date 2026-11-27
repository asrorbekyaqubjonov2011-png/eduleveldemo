import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, logAudit, withDatabase } from '@/src/lib/dbStore';
import { requireOwner } from '@/src/lib/auth/guards';
import { providerQueue, providerStatsSnapshot } from '@/src/lib/aiRouter';
import { sharedAnswerCache } from '@/src/lib/aiCache';
import { voiceSummary } from '@/src/lib/voiceMetrics';
import { AI_TASKS, PROVIDER_REFS, getRoutingConfig, isConfigured, resolveRoute, routeConfig, sanitizeRouting, setRoutingConfig, type ProviderRef } from '@/src/lib/aiRouting';

export const dynamic = 'force-dynamic';

const LABEL: Record<ProviderRef, string> = { gemini: 'Google Gemini', groq: 'Groq', deepseek: 'DeepSeek', openrouter: 'OpenRouter', mistral: 'Mistral', cloudflare: 'Cloudflare Workers AI', sambanova: 'SambaNova', siliconflow: 'SiliconFlow' };

function view() {
  const cfg = getRoutingConfig();
  return {
    success: true,
    updatedAt: cfg.updatedAt ?? null,
    // Answer cache (word translations only) and the per-provider queue, as seen by this server.
    cache: sharedAnswerCache.stats(),
    // EduBek voice latency measured in students' browsers (durations only), since this server started.
    voice: voiceSummary(),
    queue: Object.fromEntries(PROVIDER_REFS.filter((r) => r !== 'gemini').map((r) => [r, providerQueue(r as 'groq')])),
    providers: PROVIDER_REFS.map((id) => ({
      id,
      label: LABEL[id],
      configured: isConfigured(id),
      disabled: cfg.disabled.includes(id),
      budget: id === 'gemini' ? null : cfg.budgets[id] ?? null,
      // Real counters from this server since it started; Gemini is measured in the AI statistics tab.
      usage: id === 'gemini' ? null : (({ rpm, tpm, dayRequests, dayTokens, inTok, outTok }) => ({ rpm, tpm, dayRequests, dayTokens, inTok, outTok }))(providerStatsSnapshot()[id])
    })),
    tasks: AI_TASKS.map((t) => {
      const r = routeConfig(t.id, cfg);
      return { id: t.id, label: t.label, kind: t.kind, primary: r.primary, fallbacks: r.fallbacks, timeoutMs: r.timeoutMs ?? null, isDefault: r.isDefault, effective: resolveRoute(t.id) };
    })
  };
}

/** Owner's AI task routing: which provider answers each kind of AI work. Stored in the database; keys are never involved. */
async function handleGet(req: NextRequest) {
  const auth = requireOwner(req);
  if (auth instanceof NextResponse) return auth;
  return NextResponse.json(view());
}

async function handlePut(req: NextRequest) {
  const auth = requireOwner(req);
  if (auth instanceof NextResponse) return auth;
  const body = (await req.json().catch(() => ({}))) as { tasks?: unknown; disabled?: unknown; budgets?: unknown; reset?: unknown };
  const db = getDatabase();
  if (body.reset === true) {
    db.aiRouting = undefined;
    setRoutingConfig(undefined);
    logAudit('owner', 'ai_routing_reset', 'ai_routing', 'AI marshrutlash standart holatga qaytarildi');
    return NextResponse.json(view());
  }
  const cfg = sanitizeRouting({ tasks: body.tasks, disabled: body.disabled, budgets: body.budgets });
  cfg.updatedAt = new Date().toISOString();
  db.aiRouting = cfg;
  setRoutingConfig(cfg);
  logAudit('owner', 'ai_routing_update', 'ai_routing', `Vazifalar: ${Object.keys(cfg.tasks).length}, o‘chirilgan provayderlar: ${cfg.disabled.join(', ') || 'yo‘q'}, limitli provayderlar: ${Object.keys(cfg.budgets).join(', ') || 'yo‘q'}`);
  return NextResponse.json(view());
}

export const GET = withDatabase(handleGet);
export const PUT = withDatabase(handlePut);
