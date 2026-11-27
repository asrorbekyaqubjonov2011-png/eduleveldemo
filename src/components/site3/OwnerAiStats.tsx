'use client';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { api } from '../../services/api';

interface Bucket { calls: number; inTok: number; outTok: number }
interface ModelStat extends Bucket { ok: number; fail: number; ms: number; lastError?: string; lastAt?: string }
interface DayStats { models: Record<string, ModelStat>; ops: Record<string, Bucket>; users: Record<string, Bucket> }
interface Payload {
  today: string;
  stats: { days: Record<string, DayStats> };
  names: Record<string, string>;
  secondsToday: Record<string, number>;
  modelOrder: string[];
  hasKey: boolean;
  limits?: { inPerM?: number; outPerM?: number; capSom?: number };
}

const card = 'rounded-2xl border border-line/80 bg-white/70 p-5 dark:border-white/10 dark:bg-white/[0.03]';
const fmt = (n: number) => Math.round(n).toLocaleString('uz-UZ').replace(/ /g, ' ');
const OP_LABEL: Record<string, string> = {
  'chat-tutor': 'Edubek suhbati',
  translate: 'Tarjima',
  'translate-3level': 'Tarjima',
  'generate-exercises': 'Mashq yaratish',
  'grade-writing': 'Writing baholash',
  'evaluate-speaking': 'Speaking baholash',
  'student-test': 'O‘quvchi testi',
  'generate-test': 'Mock test yaratish',
  'paste-to-mock': 'Matndan mock',
  'exercise-generate': 'Mashq yaratish',
  'owner-assistant': 'Owner yordamchi'
};
const RANGES: Array<[string, number]> = [['Bugun', 1], ['7 kun', 7], ['30 kun', 30]];

/** Owner: which model answered, how many tokens it used, how fast, and where it failed. */
export const OwnerAiStats: React.FC = () => {
  const [data, setData] = useState<Payload | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [range, setRange] = useState(7);

  const load = useCallback(async () => {
    setBusy(true);
    setErr('');
    try {
      const r = await api.aiStats();
      if (r?.success) setData(r);
      else setErr(r?.message || 'Statistikani olib bo‘lmadi.');
    } catch {
      setErr('Server bilan bog‘lanib bo‘lmadi.');
    } finally {
      setBusy(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const view = useMemo(() => {
    if (!data) return null;
    const days = Object.keys(data.stats.days || {}).sort().slice(-range);
    const models: Record<string, ModelStat> = {};
    const ops: Record<string, Bucket> = {};
    const users: Record<string, Bucket> = {};
    const perDay = days.map((d) => {
      const day = data.stats.days[d];
      let tokens = 0;
      let calls = 0;
      for (const [m, s] of Object.entries(day.models)) {
        const t = (models[m] ||= { calls: 0, ok: 0, fail: 0, inTok: 0, outTok: 0, ms: 0 });
        t.calls += s.calls; t.ok += s.ok; t.fail += s.fail; t.inTok += s.inTok; t.outTok += s.outTok; t.ms += s.ms;
        if (s.lastError) t.lastError = s.lastError;
        tokens += s.inTok + s.outTok;
        calls += s.calls;
      }
      for (const [o, s] of Object.entries(day.ops)) { const t = (ops[o] ||= { calls: 0, inTok: 0, outTok: 0 }); t.calls += s.calls; t.inTok += s.inTok; t.outTok += s.outTok; }
      for (const [u, s] of Object.entries(day.users)) { const t = (users[u] ||= { calls: 0, inTok: 0, outTok: 0 }); t.calls += s.calls; t.inTok += s.inTok; t.outTok += s.outTok; }
      return { day: d, tokens, calls };
    });
    const all = Object.values(models);
    const calls = all.reduce((a, m) => a + m.calls, 0);
    const fail = all.reduce((a, m) => a + m.fail, 0);
    const ms = all.reduce((a, m) => a + m.ms, 0);
    return {
      perDay,
      models: Object.entries(models).sort((a, b) => b[1].inTok + b[1].outTok - (a[1].inTok + a[1].outTok)),
      ops: Object.entries(ops).sort((a, b) => b[1].calls - a[1].calls),
      users: Object.entries(users).sort((a, b) => b[1].inTok + b[1].outTok - (a[1].inTok + a[1].outTok)).slice(0, 10),
      calls,
      fail,
      inTok: all.reduce((a, m) => a + m.inTok, 0),
      outTok: all.reduce((a, m) => a + m.outTok, 0),
      avgMs: calls ? ms / calls : 0,
      cost: ((all.reduce((a, m) => a + m.inTok, 0) / 1e6) * (data.limits?.inPerM || 0)) + ((all.reduce((a, m) => a + m.outTok, 0) / 1e6) * (data.limits?.outPerM || 0))
    };
  }, [data, range]);

  const maxDay = Math.max(1, ...(view?.perDay.map((d) => d.tokens) ?? [1]));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label="Davr" className="inline-flex rounded-full border border-line/80 bg-white/70 p-1 dark:border-white/10 dark:bg-white/[0.04]">
          {RANGES.map(([label, n]) => (
            <button key={n} type="button" onClick={() => setRange(n)} aria-pressed={range === n} className={`rounded-full px-4 py-1.5 text-[12.5px] font-semibold ${range === n ? 'bg-ink text-white dark:bg-white dark:text-ink' : 'text-ink-muted dark:text-stone-400'}`}>{label}</button>
          ))}
        </div>
        <button type="button" onClick={load} disabled={busy} className="inline-flex h-10 items-center gap-2 rounded-full border border-line bg-white/60 px-4 text-[13px] font-semibold text-ink dark:border-white/10 dark:bg-white/[0.05] dark:text-white">
          <RefreshCw className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} /> Yangilash
        </button>
      </div>
      {err ? <div role="alert" className="rounded-xl bg-rose-500/10 px-4 py-2.5 text-[13px] font-semibold text-rose-700 dark:text-rose-300">{err}</div> : null}
      {!data || !view ? (
        <div className={`${card} text-[13.5px] text-ink-muted`}>{busy ? 'Yuklanmoqda…' : 'Ma’lumot yo‘q.'}</div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            {[
              ['So‘rovlar', fmt(view.calls), view.fail ? `${view.fail} ta xato` : 'xatosiz'],
              ['Kirish tokenlari', fmt(view.inTok), 'savol va ko‘rsatma'],
              ['Chiqish tokenlari', fmt(view.outTok), 'javob (fikrlash ham)'],
              ['O‘rtacha tezlik', view.avgMs ? `${(view.avgMs / 1000).toFixed(1)} s` : '—', 'bir so‘rovga'],
              ['Taxminiy xarajat', data.limits?.inPerM || data.limits?.outPerM ? `${fmt(view.cost)} so‘m` : 'narx kiritilmagan', data.limits?.capSom ? `oylik chegara: ${fmt(data.limits.capSom)} so‘m` : 'Vaqt limiti bo‘limida narxni kiriting']
            ].map(([t, v, s]) => (
              <div key={t} className={card}>
                <div className="text-[11.5px] font-semibold uppercase tracking-[0.1em] text-ink-muted dark:text-stone-400">{t}</div>
                <div className="mt-1 font-display text-2xl font-extrabold tabular-nums text-ink dark:text-white">{v}</div>
                <div className="text-[12px] text-ink-muted dark:text-stone-500">{s}</div>
              </div>
            ))}
          </div>

          <section className={card}>
            <h3 className="text-[15px] font-bold text-ink dark:text-white">Kuniga sarflangan tokenlar</h3>
            {view.perDay.length === 0 ? (
              <p className="mt-3 text-[13px] text-ink-muted dark:text-stone-400">Bu davrda hali AI so‘rovi bo‘lmagan. Statistika yangi so‘rovlardan boshlab yig‘iladi.</p>
            ) : (
              <div className="mt-4 flex h-32 items-end gap-1.5" role="img" aria-label="Kunlik tokenlar grafigi">
                {view.perDay.map((d) => (
                  <div key={d.day} className="group flex h-full flex-1 flex-col items-center justify-end gap-1" title={`${d.day}: ${fmt(d.tokens)} token, ${d.calls} so‘rov`}>
                    <div className="w-full rounded-t-md bg-gradient-to-t from-[#f2650f] to-[#ffa149] transition-[height] duration-700" style={{ height: `${Math.max(4, (d.tokens / maxDay) * 100)}%` }} />
                    <span className="text-[10px] text-ink-muted dark:text-stone-500">{d.day.slice(5)}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className={`${card} overflow-x-auto`}>
            <h3 className="text-[15px] font-bold text-ink dark:text-white">Modellar bo‘yicha</h3>
            <p className="mt-1 text-[12.5px] text-ink-muted dark:text-stone-400">
              Tartib (birinchisi avval so‘raladi): {data.modelOrder.length ? data.modelOrder.map((m, i) => `${i + 1}. ${m}`).join(' → ') : data.hasKey ? 'aniqlanmadi' : 'AI kaliti sozlanmagan'}
            </p>
            <table className="mt-3 w-full min-w-[620px] text-left text-[13px]">
              <thead className="text-[11.5px] uppercase tracking-[0.08em] text-ink-muted dark:text-stone-500">
                <tr><th className="py-2 pr-3">Model</th><th className="pr-3">So‘rov</th><th className="pr-3">Muvaffaqiyat</th><th className="pr-3">Kirish</th><th className="pr-3">Chiqish</th><th className="pr-3">O‘rtacha</th><th>So‘nggi xato</th></tr>
              </thead>
              <tbody className="text-ink dark:text-white">
                {view.models.length === 0 ? (
                  <tr><td colSpan={7} className="py-4 text-ink-muted dark:text-stone-400">Hali so‘rov yo‘q.</td></tr>
                ) : (
                  view.models.map(([m, s]) => (
                    <tr key={m} className="border-t border-line/60 dark:border-white/10">
                      <td className="py-2 pr-3 font-semibold">{m}</td>
                      <td className="pr-3 tabular-nums">{fmt(s.calls)}</td>
                      <td className="pr-3 tabular-nums">{s.calls ? Math.round((s.ok / s.calls) * 100) : 0}%</td>
                      <td className="pr-3 tabular-nums">{fmt(s.inTok)}</td>
                      <td className="pr-3 tabular-nums">{fmt(s.outTok)}</td>
                      <td className="pr-3 tabular-nums">{s.calls ? (s.ms / s.calls / 1000).toFixed(1) : '—'} s</td>
                      <td className="max-w-[260px] truncate text-[12px] text-rose-600" title={s.lastError}>{s.fail ? s.lastError : '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </section>

          <div className="grid gap-5 lg:grid-cols-2">
            <section className={card}>
              <h3 className="text-[15px] font-bold text-ink dark:text-white">Qaysi vazifaga ketdi</h3>
              <ul className="mt-3 space-y-2 text-[13px]">
                {view.ops.length === 0 ? <li className="text-ink-muted dark:text-stone-400">Hali yo‘q.</li> : view.ops.map(([o, s]) => (
                  <li key={o} className="flex justify-between gap-3"><span className="text-ink dark:text-white">{OP_LABEL[o] || o}</span><span className="tabular-nums text-ink-muted dark:text-stone-400">{fmt(s.calls)} so‘rov · {fmt(s.inTok + s.outTok)} token</span></li>
                ))}
              </ul>
            </section>
            <section className={card}>
              <h3 className="text-[15px] font-bold text-ink dark:text-white">Eng faol o‘quvchilar</h3>
              <ul className="mt-3 space-y-2 text-[13px]">
                {view.users.length === 0 ? <li className="text-ink-muted dark:text-stone-400">Hali yo‘q.</li> : view.users.map(([u, s]) => (
                  <li key={u} className="flex justify-between gap-3"><span className="truncate text-ink dark:text-white">{data.names[u] || (u.startsWith('owner') ? 'Owner' : u)}</span><span className="shrink-0 tabular-nums text-ink-muted dark:text-stone-400">{fmt(s.calls)} so‘rov · {fmt(s.inTok + s.outTok)} token{data.secondsToday[u] ? ` · bugun ${Math.round(data.secondsToday[u] / 60)} daq` : ''}</span></li>
                ))}
              </ul>
            </section>
          </div>
        </>
      )}
    </div>
  );
};
