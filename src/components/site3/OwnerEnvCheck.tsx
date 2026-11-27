'use client';
import React, { useCallback, useEffect, useState } from 'react';
import { cn } from '../ui/styles';

type Item = { name: string; set: boolean; ok: boolean; note?: string };
type Group = { id: string; title: string; items: Item[] };
type RumMetric = { n: number; p75: number | null; rating: 'good' | 'needs-improvement' | 'poor' | null };
type RumGroup = { views: number; metrics: Record<'lcp' | 'inp' | 'cls' | 'ttfb', RumMetric> };
type Rum = { views: number; all: RumGroup; mobile: RumGroup; desktop: RumGroup; home: RumGroup; content: RumGroup };

/** Owner's configuration check: which Render environment variables are set and whether they look right. Values are never shown. */
export const OwnerEnvCheck: React.FC = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [rum, setRum] = useState<Rum | null>(null);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const res = await fetch('/api/owner/env-check', { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.message || 'Tekshirib bo‘lmadi.');
      setGroups(data.groups || []);
      const r = await fetch('/api/owner/rum', { cache: 'no-store' }).then((x) => x.json()).catch(() => null);
      setRum(r?.success ? r.summary : null);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xatolik.');
    } finally {
      setBusy(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13.5px] text-ink-muted dark:text-stone-400">Render muhit o‘zgaruvchilari va ulanishlar. Qiymatlar bu yerda hech qachon ko‘rsatilmaydi, faqat «qo‘yilgan» yoki «yo‘q».</p>
        <button type="button" onClick={load} disabled={busy} className="min-h-[44px] rounded-xl border border-black/10 px-4 text-[13px] font-semibold disabled:opacity-50 dark:border-white/15">{busy ? 'Tekshirilmoqda…' : 'Qayta tekshirish'}</button>
      </div>
      {error ? <p role="alert" className="rounded-xl bg-rose-500/10 px-4 py-3 text-[14px] text-rose-700">{error}</p> : null}
      <section aria-label="Haqiqiy foydalanuvchi tezligi" className="rounded-3xl border border-black/10 bg-white/70 p-5 dark:border-white/10 dark:bg-white/[0.04]">
        <h3 className="font-semibold">Haqiqiy foydalanuvchi tezligi (Core Web Vitals)</h3>
        <p className="mt-1 text-[12.5px] text-ink-muted">Tashrif buyuruvchilarning brauzerlaridan olingan o‘lchovlar; 75-foiz qiymat (Google shuni baholaydi). Server qayta ishga tushsa nolga qaytadi. Laboratoriya o‘lchovi emas.</p>
        {rum && rum.views > 0 ? (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[460px] text-left text-[13px]">
              <thead className="text-ink-muted"><tr><th className="py-1 pr-3">Guruh</th><th className="pr-3">Ko‘rishlar</th><th className="pr-3">LCP</th><th className="pr-3">INP</th><th className="pr-3">CLS</th><th>TTFB</th></tr></thead>
              <tbody>
                {([['Hammasi', rum.all], ['Telefon', rum.mobile], ['Kompyuter', rum.desktop], ['Bosh sahifa', rum.home], ['O‘quv sahifalari', rum.content]] as const).map(([label, g]) => (
                  <tr key={label} className="border-t border-black/5 dark:border-white/10">
                    <td className="py-2 pr-3 font-semibold">{label}</td>
                    <td className="pr-3">{g.views}</td>
                    {(['lcp', 'inp', 'cls', 'ttfb'] as const).map((m) => {
                      const v = g.metrics[m];
                      const text = v.p75 === null ? '—' : m === 'cls' ? String(v.p75) : `${v.p75} ms`;
                      return <td key={m} className={cn('pr-3', v.rating === 'good' ? 'text-emerald-700 dark:text-emerald-300' : v.rating === 'poor' ? 'text-rose-600' : v.rating ? 'text-amber-700' : '')}>{text}</td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-[12px] text-ink-muted">Maqsad: LCP ≤ 2500 ms, INP ≤ 200 ms, CLS ≤ 0,1. Yashil — maqsadga mos, sariq — yaxshilash kerak, qizil — yomon.</p>
          </div>
        ) : (
          <p className="mt-2 text-[13px] text-ink-muted">Hali o‘lchov yo‘q: sayt ochilib, tashrif buyuruvchilar sahifani yopgach paydo bo‘ladi.</p>
        )}
      </section>
      <div className="grid gap-4 md:grid-cols-2">
        {groups.map((g) => (
          <section key={g.id} aria-label={g.title} className="rounded-3xl border border-black/10 bg-white/70 p-5 dark:border-white/10 dark:bg-white/[0.04]">
            <h3 className="font-semibold">{g.title}</h3>
            <ul className="mt-3 space-y-2">
              {g.items.map((i) => (
                <li key={i.name} className="flex items-start justify-between gap-3 text-[13px]">
                  <div>
                    <p className="font-mono text-[12px]">{i.name}</p>
                    {i.note ? <p className="text-[12px] text-ink-muted">{i.note}</p> : null}
                  </div>
                  <span className={cn('shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold', i.ok ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' : i.set ? 'bg-amber-500/15 text-amber-700' : 'bg-black/5 text-ink-muted dark:bg-white/10')}>
                    {i.ok ? 'yaxshi' : i.set ? 'tekshiring' : 'yo‘q'}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
};
