'use client';
import React, { useCallback, useEffect, useState } from 'react';
import { cn } from '../ui/styles';
import { OwnerAiModelCatalog } from './OwnerAiModelCatalog';

type ProviderStats = {
  calls: number; ok: number; failed: number; rateLimited: number;
  lastLatencyMs: number | null; lastOkAt: string | null; lastError: string | null; lastErrorAt: string | null;
  paymentBlocked?: boolean; cooling: boolean; cooldownUntil: string | null; successRate: number | null;
};
type Provider = { id: string; label: string; configured: boolean; model: string; effectiveModels?: string[]; freeNote?: string; role: 'primary' | 'fallback' | 'off'; cooling?: boolean; stats?: ProviderStats };
type PingResult = { ok: boolean; ms?: number; message?: string };

const ROLE_UZ: Record<Provider['role'], string> = { primary: 'Asosiy', fallback: 'Zaxira', off: 'Ulanmagan' };

/**
 * Owner's view of the AI providers. Shows only whether a key is set (never the key itself), the fallback order, and
 * lets the owner send one tiny test prompt to each provider to see that it answers and how long it takes.
 */
export const OwnerAiProviders: React.FC = () => {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [order, setOrder] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, PingResult>>({});

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/owner/ai-providers', { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.message || 'Yuklab bo‘lmadi.');
      setProviders(data.providers || []);
      setOrder(data.fallbackOrder || []);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xatolik.');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const ping = async (id: string) => {
    setBusy(id);
    setResults((r) => ({ ...r, [id]: { ok: false, message: 'Sinov ketmoqda…' } }));
    try {
      const res = await fetch('/api/owner/ai-providers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ provider: id }) });
      const data = await res.json().catch(() => ({}));
      setResults((r) => ({ ...r, [id]: data.success ? { ok: true, ms: data.ms } : { ok: false, message: data.message || 'Javob bermadi', ms: data.ms } }));
    } catch {
      setResults((r) => ({ ...r, [id]: { ok: false, message: 'Tarmoq xatosi' } }));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13.5px] text-ink-muted dark:text-stone-400">
          Kalitlar faqat serverda saqlanadi, bu yerda ko‘rinmaydi. Asosiy provayder ishlamasa, zaxira tartibida keyingisi chaqiriladi.
        </p>
        <button type="button" onClick={load} className="min-h-[40px] rounded-xl border border-black/10 px-4 text-[13px] font-semibold dark:border-white/15">Yangilash</button>
      </div>
      {error ? <p role="alert" className="rounded-xl bg-rose-500/10 px-4 py-3 text-[14px] text-rose-700">{error}</p> : null}
      <div className="rounded-2xl bg-emerald-500/10 px-4 py-3 text-[13px] text-emerald-800 dark:text-emerald-200">
        <span className="font-semibold">Free Only rejimi (doim yoqilgan):</span> faqat bepul modellar chaqiriladi. OpenRouter uchun faqat «:free» modellar; Groq va Mistral uchun provayder o‘zi ko‘rsatgan modellar. Pullik yoki narxi noma’lum modelga o‘tilmaydi. Provayder 402 (to‘lov kerak) qaytarsa, u marshrutdan chiqariladi va siz o‘zingiz qayta yoqmaguningizcha hech qanday so‘rov yuborilmaydi; integratsiya kodi saqlanadi.
      </div>
      {order.length ? (
        <div className="rounded-2xl bg-black/[0.03] px-4 py-3 text-[13px] dark:bg-white/[0.04]">
          <span className="font-semibold">Zaxira tartibi:</span> Gemini → {order.join(' → ')}
        </div>
      ) : null}
      <ul className="grid gap-3 sm:grid-cols-2">
        {providers.map((p) => {
          const r = results[p.id];
          return (
            <li key={p.id} className="rounded-3xl border border-black/10 bg-white/70 p-5 dark:border-white/10 dark:bg-white/[0.04]">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{p.label}</p>
                  <p className="mt-0.5 font-mono text-[12px] text-ink-muted">{p.model}</p>
                  {p.freeNote ? <p className="mt-1 text-[11.5px] text-ink-muted">{p.freeNote}</p> : null}
                  {p.effectiveModels && p.effectiveModels.length > 1 ? <p className="mt-0.5 text-[11px] text-ink-muted">Zaxira modellar: {p.effectiveModels.slice(1).join(', ')}</p> : null}
                  {p.stats?.paymentBlocked ? (
                    <button type="button" onClick={async () => { await fetch('/api/owner/ai-providers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'unblock', provider: p.id }) }); void load(); }} className="mt-2 min-h-[44px] rounded-xl border border-black/10 px-3 text-[12.5px] font-semibold dark:border-white/15">Bepul ruxsat tasdiqlandi — qayta yoqish</button>
                  ) : null}
                </div>
                <span className={cn('shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold', p.configured && !p.cooling && !p.stats?.paymentBlocked ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' : 'bg-black/5 text-ink-muted dark:bg-white/10')}>
                  {!p.configured ? 'Kalit yo‘q' : p.stats?.paymentBlocked ? '402 · o‘chirilgan (qo‘lda yoqiladi)' : p.cooling ? `${ROLE_UZ[p.role]} · vaqtincha o‘tkazilmoqda` : `${ROLE_UZ[p.role]} · kalit bor`}
                </span>
              </div>
              {p.stats ? (
                <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1.5 rounded-2xl bg-black/[0.03] p-3 text-[12.5px] dark:bg-white/[0.04]">
                  <dt className="text-ink-muted">So‘rovlar (shu server)</dt><dd className="text-right font-semibold">{p.stats.calls}</dd>
                  <dt className="text-ink-muted">Muvaffaqiyat</dt><dd className="text-right font-semibold">{p.stats.successRate === null ? '—' : `${p.stats.successRate}%`}</dd>
                  <dt className="text-ink-muted">Oxirgi javob vaqti</dt><dd className="text-right font-semibold">{p.stats.lastLatencyMs === null ? '—' : `${p.stats.lastLatencyMs} ms`}</dd>
                  <dt className="text-ink-muted">Limit xatosi (429)</dt><dd className="text-right font-semibold">{p.stats.rateLimited}</dd>
                  <dt className="text-ink-muted">Cooldown</dt>
                  <dd className="text-right font-semibold">{p.stats.cooling && p.stats.cooldownUntil ? new Date(p.stats.cooldownUntil).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }) + ' gacha' : 'yo‘q'}</dd>
                  {p.stats.lastError ? (
                    <><dt className="text-ink-muted">Oxirgi xato</dt><dd className="col-span-1 text-right text-rose-600">{p.stats.lastError}</dd></>
                  ) : null}
                </dl>
              ) : null}
              <div className="mt-4 flex items-center gap-3">
                <button type="button" disabled={!p.configured || busy !== null} onClick={() => ping(p.id)}
                  className="min-h-[40px] rounded-xl bg-ember-500 px-4 text-[13px] font-semibold text-white disabled:opacity-40">
                  {busy === p.id ? 'Sinalmoqda…' : 'Sinash'}
                </button>
                {r && r.message !== 'Sinov ketmoqda…' ? (
                  <span className={cn('text-[13px]', r.ok ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-600')}>
                    {r.ok ? `Javob berdi · ${r.ms} ms` : `Xato: ${r.message}`}
                  </span>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
      {!providers.length && !error ? <p className="text-[14px] text-ink-muted">Yuklanmoqda…</p> : null}
      <OwnerAiModelCatalog />
    </div>
  );
};
