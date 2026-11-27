'use client';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { cn } from '../ui/styles';

type Ref = 'gemini' | 'groq' | 'deepseek' | 'openrouter' | 'mistral';
type StageView = { n: number; p50: number | null; p95: number | null };
type VoiceView = { turns: number; stages: Record<'sttMs' | 'llmFirstMs' | 'ttsMs' | 'playMs' | 'totalMs', StageView>; byDevice: Record<string, { turns: number; totalP50: number | null }>; byVoice: Record<string, { turns: number; totalP50: number | null }> };
type Usage = { rpm: number; tpm: number; dayRequests: number; dayTokens: number; inTok: number; outTok: number };
type Budget = { dailyTokens?: number; dailyRequests?: number };
type ProviderInfo = { id: Ref; label: string; configured: boolean; disabled: boolean; budget: Budget | null; usage: Usage | null };
type TaskView = { id: string; label: string; kind: 'fast' | 'quality'; primary: Ref; fallbacks: Ref[]; timeoutMs: number | null; isDefault: boolean; effective: Ref[] };
type Draft = Record<string, { primary: Ref; fallbacks: Ref[]; timeoutMs: number | null }>;
type Bench = { provider: string; model: string; ok: boolean; ttftMs: number | null; totalMs: number | null; chars: number; message?: string };

const KIND_UZ = { fast: 'tezkor', quality: 'sifatli' } as const;

/**
 * Owner's AI task routing: for each kind of AI work, which provider goes first and which ones follow. Saved in the
 * database (no deploy needed). Providers without a key are shown but never called. The benchmark sends one tiny
 * streamed request to each configured provider and shows measured time to first token and total time.
 */
export const OwnerAiRouting: React.FC = () => {
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [tasks, setTasks] = useState<TaskView[]>([]);
  const [draft, setDraft] = useState<Draft>({});
  const [disabled, setDisabled] = useState<Ref[]>([]);
  const [budgets, setBudgets] = useState<Record<string, Budget>>({});
  const [cache, setCache] = useState<{ hits: number; misses: number; shared: number; size: number } | null>(null);
  const [voice, setVoice] = useState<VoiceView | null>(null);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [bench, setBench] = useState<Bench[] | null>(null);
  const [benchBusy, setBenchBusy] = useState(false);

  const apply = (data: { providers: ProviderInfo[]; tasks: TaskView[]; cache?: { hits: number; misses: number; shared: number; size: number }; voice?: VoiceView }) => {
    setCache(data.cache ?? null);
    setVoice(data.voice ?? null);
    setProviders(data.providers);
    setTasks(data.tasks);
    setDisabled(data.providers.filter((p) => p.disabled).map((p) => p.id));
    setBudgets(Object.fromEntries(data.providers.filter((p) => p.budget).map((p) => [p.id, p.budget as Budget])));
    const d: Draft = {};
    data.tasks.forEach((t) => (d[t.id] = { primary: t.primary, fallbacks: t.fallbacks, timeoutMs: t.timeoutMs }));
    setDraft(d);
  };

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/owner/ai-routing', { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.message || 'Yuklab bo‘lmadi.');
      apply(data);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xatolik.');
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const label = useMemo(() => Object.fromEntries(providers.map((p) => [p.id, p.label + (p.configured ? '' : ' (kalit yo‘q)')])) as Record<Ref, string>, [providers]);

  const setPrimary = (task: string, primary: Ref) => setDraft((d) => ({ ...d, [task]: { ...d[task], primary, fallbacks: d[task].fallbacks.filter((f) => f !== primary) } }));
  const toggleFallback = (task: string, id: Ref) =>
    setDraft((d) => {
      const cur = d[task].fallbacks;
      return { ...d, [task]: { ...d[task], fallbacks: cur.includes(id) ? cur.filter((f) => f !== id) : [...cur, id] } };
    });
  const setTimeoutSec = (task: string, sec: string) => setDraft((d) => ({ ...d, [task]: { ...d[task], timeoutMs: sec ? Math.round(Number(sec) * 1000) : null } }));
  const setBudget = (id: Ref, field: keyof Budget, value: string) =>
    setBudgets((b) => {
      const next = { ...(b[id] || {}) } as Budget;
      if (value === '') delete next[field];
      else next[field] = Math.max(0, Math.round(Number(value)));
      return { ...b, [id]: next };
    });
  const toggleDisabled = (id: Ref) => setDisabled((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  const save = async () => {
    setSaving(true);
    setMsg('');
    try {
      const body = {
        disabled,
        budgets,
        tasks: Object.fromEntries(Object.entries(draft).map(([k, v]) => [k, { primary: v.primary, fallbacks: v.fallbacks, ...(v.timeoutMs ? { timeoutMs: v.timeoutMs } : {}) }]))
      };
      const res = await fetch('/api/owner/ai-routing', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.message || 'Saqlab bo‘lmadi.');
      apply(data);
      setMsg('Saqlandi. Yangi tartib darhol ishlaydi.');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Xatolik.');
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/owner/ai-routing', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reset: true }) });
      const data = await res.json().catch(() => ({}));
      if (data.success) {
        apply(data);
        setMsg('Standart tartib qaytarildi.');
      }
    } finally {
      setSaving(false);
    }
  };

  const runBench = async () => {
    setBenchBusy(true);
    setBench(null);
    try {
      const res = await fetch('/api/owner/ai-providers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ benchmark: true }) });
      const data = await res.json().catch(() => ({}));
      setBench(data.results || []);
    } catch {
      setBench([]);
    } finally {
      setBenchBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <p className="text-[13.5px] text-ink-muted dark:text-stone-400">
        Har bir AI vazifasi uchun birinchi provayderni va zaxira tartibini tanlang. Kaliti yo‘q yoki o‘chirilgan provayder hech qachon chaqirilmaydi. Tezkor vazifalar uchun standart birinchi tanlov Groq, sifatli vazifalar uchun Gemini; qaysi biri yaxshiroqligini benchmark va natijalar bo‘yicha o‘zingiz hal qilasiz.
      </p>
      {error ? <p role="alert" className="rounded-xl bg-rose-500/10 px-4 py-3 text-[14px] text-rose-700">{error}</p> : null}

      <section aria-label="Provayderlarni yoqish va o‘chirish" className="flex flex-wrap gap-2">
        {providers.map((p) => {
          const off = disabled.includes(p.id);
          return (
            <button
              key={p.id}
              type="button"
              role="switch"
              aria-checked={!off}
              aria-label={`${p.label} yoqilgan`}
              onClick={() => toggleDisabled(p.id)}
              className={cn('min-h-[44px] rounded-full border px-4 text-[13px] font-semibold', off ? 'border-black/10 text-ink-muted line-through dark:border-white/15' : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300')}
            >
              {p.label} {p.configured ? '' : '· kalit yo‘q'}
            </button>
          );
        })}
      </section>

      <section aria-label="Provayder yuklamasi va kunlik limitlar" className="rounded-3xl border border-black/10 p-4 dark:border-white/10">
        <h3 className="font-semibold">Yuklama va kunlik limit</h3>
        <p className="mt-1 text-[12.5px] text-ink-muted">Sonlar shu server ishga tushgandan beri haqiqiy chaqiruvlardan olinadi (server qayta ishga tushsa nolga qaytadi). Limit qo‘ysangiz, provayder kunlik chegaraga yetgach (UTC bo‘yicha ertasi kungacha) tanlanmaydi. Narx va xarajat provayderning rasmiy narxiga bog‘liq, shuning uchun bu yerda taxmin qilinmaydi: umumiy xarajat «Vaqt limiti» va «Statistika» bo‘limlarida.</p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[620px] text-left text-[13px]">
            <thead className="text-ink-muted"><tr><th className="py-1 pr-3">Provayder</th><th className="pr-3">RPM</th><th className="pr-3">TPM</th><th className="pr-3">Bugun: so‘rov</th><th className="pr-3">Bugun: token</th><th className="pr-3">Kunlik so‘rov limiti</th><th>Kunlik token limiti</th></tr></thead>
            <tbody>
              {providers.filter((p) => p.id !== 'gemini').map((p) => (
                <tr key={p.id} className="border-t border-black/5 dark:border-white/10">
                  <td className="py-2 pr-3 font-semibold">{p.label}</td>
                  <td className="pr-3">{p.usage ? p.usage.rpm : '—'}</td>
                  <td className="pr-3">{p.usage ? p.usage.tpm : '—'}</td>
                  <td className="pr-3">{p.usage ? p.usage.dayRequests : '—'}</td>
                  <td className="pr-3">{p.usage ? p.usage.dayTokens : '—'}</td>
                  <td className="pr-3"><input aria-label={`${p.label}: kunlik so‘rov limiti`} type="number" min={0} placeholder="cheksiz" value={budgets[p.id]?.dailyRequests ?? ''} onChange={(e) => setBudget(p.id, 'dailyRequests', e.target.value)} className="min-h-[40px] w-28 rounded-lg border border-black/10 bg-white px-2 text-[13px] text-ink dark:border-white/15 dark:bg-stone-900 dark:text-white" /></td>
                  <td><input aria-label={`${p.label}: kunlik token limiti`} type="number" min={0} placeholder="cheksiz" value={budgets[p.id]?.dailyTokens ?? ''} onChange={(e) => setBudget(p.id, 'dailyTokens', e.target.value)} className="min-h-[40px] w-32 rounded-lg border border-black/10 bg-white px-2 text-[13px] text-ink dark:border-white/15 dark:bg-stone-900 dark:text-white" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[12px] text-ink-muted">Gemini bo‘yicha token va javob vaqti «Statistika» tabida.</p>
        {cache ? <p className="mt-1 text-[12px] text-ink-muted">Javob keshi (faqat so‘z tarjimalari): {cache.hits} marta keshdan, {cache.shared} marta bir vaqtdagi takror o‘rniga, {cache.misses} marta AI dan; hozir {cache.size} ta saqlangan. Shaxsiy suhbat va baholash keshga tushmaydi.</p> : null}
      </section>

      <section aria-label="EduBek ovozli suhbat kechikishi" className="rounded-3xl border border-black/10 p-4 dark:border-white/10">
        <h3 className="font-semibold">EduBek ovozli suhbat kechikishi</h3>
        <p className="mt-1 text-[12.5px] text-ink-muted">O‘quvchilarning haqiqiy brauzerlaridan olingan o‘lchovlar (faqat millisekund, matn yuborilmaydi). Server qayta ishga tushsa nolga qaytadi. Maqsad — gap tugagach birinchi ovoz 1–2 soniyada; bu kafolat emas.</p>
        {voice && voice.turns > 0 ? (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[420px] text-left text-[13px]">
              <thead className="text-ink-muted"><tr><th className="py-1 pr-3">Bosqich</th><th className="pr-3">O‘lchovlar</th><th className="pr-3">Median</th><th>95-foiz</th></tr></thead>
              <tbody>
                {([['sttMs', 'Gap tugashi → matn tayyor (STT)'], ['llmFirstMs', 'So‘rov → javobning birinchi so‘zi (LLM)'], ['ttsMs', 'Birinchi jumla → ovoz tayyor (TTS)'], ['playMs', 'Ovoz tayyor → eshitilishi'], ['totalMs', 'Gap tugashi → birinchi ovoz (jami)']] as const).map(([k, label]) => (
                  <tr key={k} className="border-t border-black/5 dark:border-white/10">
                    <td className="py-2 pr-3">{label}</td>
                    <td className="pr-3">{voice.stages[k].n}</td>
                    <td className="pr-3 font-semibold">{voice.stages[k].p50 === null ? '—' : `${voice.stages[k].p50} ms`}</td>
                    <td>{voice.stages[k].p95 === null ? '—' : `${voice.stages[k].p95} ms`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-[12px] text-ink-muted">Jami bo‘yicha median: telefon {voice.byDevice.mobile?.turns ? `${voice.byDevice.mobile.totalP50 ?? '—'} ms (${voice.byDevice.mobile.turns} ta)` : 'ma’lumot yo‘q'}, kompyuter {voice.byDevice.desktop?.turns ? `${voice.byDevice.desktop.totalP50 ?? '—'} ms (${voice.byDevice.desktop.turns} ta)` : 'ma’lumot yo‘q'}; server ovozi {voice.byVoice.server?.turns ? `${voice.byVoice.server.totalP50 ?? '—'} ms` : 'ma’lumot yo‘q'}, brauzer ovozi {voice.byVoice.browser?.turns ? `${voice.byVoice.browser.totalP50 ?? '—'} ms` : 'ma’lumot yo‘q'}.</p>
          </div>
        ) : (
          <p className="mt-2 text-[13px] text-ink-muted">Hali o‘lchov yo‘q: o‘quvchi ovozli suhbatni ishlatgach bu yerda paydo bo‘ladi.</p>
        )}
      </section>

      <ul className="space-y-3">
        {tasks.map((t) => {
          const d = draft[t.id];
          if (!d) return null;
          return (
            <li key={t.id} className="rounded-3xl border border-black/10 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.04]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">{t.label}</p>
                <span className="rounded-full bg-black/5 px-2.5 py-1 text-[11px] font-bold dark:bg-white/10">{KIND_UZ[t.kind]}{t.isDefault ? ' · standart' : ''}</span>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
                <label className="block text-[12.5px] text-ink-muted">
                  Birinchi provayder
                  <select
                    aria-label={`${t.label}: birinchi provayder`}
                    value={d.primary}
                    onChange={(e) => setPrimary(t.id, e.target.value as Ref)}
                    className="mt-1 block min-h-[44px] w-full rounded-xl border border-black/10 bg-white px-3 text-[14px] text-ink dark:border-white/15 dark:bg-stone-900 dark:text-white"
                  >
                    {providers.map((p) => (
                      <option key={p.id} value={p.id}>{label[p.id]}</option>
                    ))}
                  </select>
                </label>
                <label className="block text-[12.5px] text-ink-muted">
                  Zaxira kutish (soniya)
                  <input
                    aria-label={`${t.label}: zaxira kutish vaqti`}
                    type="number"
                    min={3}
                    max={60}
                    placeholder="12"
                    value={d.timeoutMs ? d.timeoutMs / 1000 : ''}
                    onChange={(e) => setTimeoutSec(t.id, e.target.value)}
                    className="mt-1 block min-h-[44px] w-28 rounded-xl border border-black/10 bg-white px-3 text-[14px] text-ink dark:border-white/15 dark:bg-stone-900 dark:text-white"
                  />
                </label>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2" role="group" aria-label={`${t.label}: zaxira provayderlar`}>
                <span className="text-[12.5px] text-ink-muted">Zaxira (bosish tartibi bo‘yicha):</span>
                {providers.filter((p) => p.id !== d.primary).map((p) => {
                  const idx = d.fallbacks.indexOf(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      aria-pressed={idx >= 0}
                      onClick={() => toggleFallback(t.id, p.id)}
                      className={cn('min-h-[40px] rounded-full border px-3 text-[12.5px] font-semibold', idx >= 0 ? 'border-ember-500 bg-ember-500/10 text-ember-700 dark:text-ember-300' : 'border-black/10 text-ink-muted dark:border-white/15')}
                    >
                      {idx >= 0 ? `${idx + 1}. ` : ''}{p.label}
                    </button>
                  );
                })}
              </div>
              <p className="mt-3 text-[12px] text-ink-muted">Hozir ishlaydigan tartib: {t.effective.length ? t.effective.map((id) => providers.find((p) => p.id === id)?.label || id).join(' → ') : 'hech qaysi provayder ulanmagan'}</p>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={save} disabled={saving} className="min-h-[44px] rounded-xl bg-ember-500 px-5 text-[14px] font-semibold text-white disabled:opacity-50">{saving ? 'Saqlanmoqda…' : 'Saqlash'}</button>
        <button type="button" onClick={reset} disabled={saving} className="min-h-[44px] rounded-xl border border-black/10 px-5 text-[14px] font-semibold dark:border-white/15">Standartga qaytarish</button>
        {msg ? <span role="status" className="text-[13px] text-ink-muted">{msg}</span> : null}
      </div>

      <section className="rounded-3xl border border-black/10 p-4 dark:border-white/10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold">Benchmark</h3>
            <p className="text-[12.5px] text-ink-muted">Har bir ulangan provayderga bitta juda qisqa so‘rov yuboriladi (bir necha token). Natija: birinchi so‘z vaqti (TTFT) va umumiy vaqt.</p>
          </div>
          <button type="button" onClick={runBench} disabled={benchBusy} className="min-h-[44px] rounded-xl border border-ember-500 px-5 text-[14px] font-semibold text-ember-700 disabled:opacity-50 dark:text-ember-300">{benchBusy ? 'O‘lchanmoqda…' : 'Benchmarkni ishga tushirish'}</button>
        </div>
        {bench ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-[13px]">
              <thead className="text-ink-muted"><tr><th className="py-1 pr-3">Provayder</th><th className="pr-3">Model</th><th className="pr-3">TTFT</th><th className="pr-3">Jami</th><th>Holat</th></tr></thead>
              <tbody>
                {bench.map((b) => (
                  <tr key={b.provider} className="border-t border-black/5 dark:border-white/10">
                    <td className="py-2 pr-3 font-semibold">{b.provider}</td>
                    <td className="pr-3 font-mono text-[12px]">{b.model}</td>
                    <td className="pr-3">{b.ttftMs === null ? '—' : `${b.ttftMs} ms`}</td>
                    <td className="pr-3">{b.totalMs === null ? '—' : `${b.totalMs} ms`}</td>
                    <td className={b.ok ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-600'}>{b.ok ? 'ishladi' : b.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </div>
  );
};
