'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import { TelegramSetup } from './TelegramSetup';
import { DepositsFinanceManager } from './DepositsFinanceManager';

const COMMANDS: Array<[string, string]> = [
  ['/start', 'Asosiy menyu'], ['/darslar', 'Ochiq darslar'], ['/kod KOD', 'Dars kodi bilan dars'], ['/test', 'Test yechish'],
  ['/speaking', 'Ovozli speaking'], ['/ai', 'AI ustozdan savol'], ['/soz', 'So‘z tarjimasi'], ['/progress', 'Progress'],
  ['/taklif', 'Do‘stlarni taklif qilish'], ['/kanal', 'Kanal va obuna'], ['/murojaat', 'Ustozga savol'], ['/depozit', 'Depozit'],
  ['/admin', 'Ustoz paneli (faqat ustoz)'], ['/ulash KOD', 'Saytdagi hisobni ulash'], ['/ko‘proq', 'Qo‘shimcha 22 funksiya']
];

/** The owner's own Telegram bot area: status, messages, channel tools, settings and the bot's commands. */
export const TelegramBotManager: React.FC = () => {
  const { db, refreshDb } = useApp();
  const [status, setStatus] = useState<any>(null);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const students = useMemo(
    () =>
      db.users
        .filter((u) => u.role !== 'owner' && (u.telegramUsername || '').trim())
        .filter((u) => !query.trim() || `${u.name} ${u.surname || ''} ${u.telegramUsername || ''}`.toLowerCase().includes(query.trim().toLowerCase()))
        .sort((a, b) => (b.xp || 0) - (a.xp || 0))
        .slice(0, 50),
    [db.users, query]
  );
  const pendingReviews = (db.reviews || []).filter((r) => r.status === 'pending').sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  const newTickets = (db.supportTickets || []).filter((t) => t.status === 'new').sort((a, b) => Date.parse(b.createdAt || '') - Date.parse(a.createdAt || ''));

  const setReview = async (id: string, next: 'approved' | 'hidden') => {
    setBusy(id);
    await api.ownerReviews({ action: 'status', id, status: next }).catch(() => undefined);
    await refreshDb();
    setBusy(null);
  };

  useEffect(() => {
    api.telegramStatus().then((r) => r?.success && setStatus(r)).catch(() => undefined);
  }, []);

  const linked = db.users.filter((u) => u.role !== 'owner' && (u.telegramUsername || '').trim()).length;
  const tickets = (db.supportTickets || []).filter((t) => t.status === 'new').length;
  const reviews = (db.reviews || []).filter((r) => r.status === 'pending').length;
  const cards: Array<[string, string | number]> = [
    ['Obunachilar', status?.subscribers ?? '—'],
    ['Hisobi ulangan talabalar', linked],
    ['Yangi murojaatlar', tickets],
    ['Kutilayotgan sharhlar', reviews],
    ['Botdan ochiladigan darslar', status?.lessonsReady ?? '—']
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-1">
      <header className="space-y-2">
        <p className="inline-flex rounded-full bg-emerald-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-300">Telegram bot</p>
        <h1 className="font-display text-[28px] font-extrabold tracking-tight text-ink dark:text-white">Bot, kanal va xabarlar</h1>
        <p className="max-w-2xl text-[14px] text-ink-muted dark:text-stone-400">
          Botni ulash, kanalga e’lon, obunachilarga xabar, sozlamalar va buyruqlar shu yerda. Botda /admin buyrug‘i ham shu imkoniyatlarni beradi.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {cards.map(([label, value]) => (
          <div key={label} className="liquid-glass rounded-2xl p-4">
            <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-muted dark:text-stone-400">{label}</div>
            <div className="mt-1 font-display text-[26px] font-extrabold text-ink dark:text-white">{value}</div>
          </div>
        ))}
      </div>

      <section className="liquid-glass rounded-[24px] p-5">
        <h2 className="mb-3 font-display text-[18px] font-extrabold text-ink dark:text-white">Holat, xabarlar va kanal</h2>
        <TelegramSetup />
      </section>

      <section className="liquid-glass rounded-[24px] p-5">
        <h2 className="mb-3 font-display text-[18px] font-extrabold text-ink dark:text-white">Bot sozlamalari</h2>
        <DepositsFinanceManager botOnly />
      </section>

      <section className="liquid-glass rounded-[24px] p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-[18px] font-extrabold text-ink dark:text-white">Bog‘langan talabalar ({students.length})</h2>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ism yoki @username" className="h-9 min-w-[220px] rounded-full border border-line/80 bg-white/70 px-4 text-[13px] text-ink outline-none dark:border-white/10 dark:bg-white/[0.04] dark:text-white" />
        </div>
        {students.length === 0 ? (
          <p className="text-[13px] text-ink-muted dark:text-stone-400">Hali hisobini ulagan talaba yo‘q. Talaba saytda “Telegram bot bilan ulash” orqali ulanadi.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead className="text-[11px] uppercase tracking-[0.12em] text-ink-muted dark:text-stone-400">
                <tr><th className="py-2">Talaba</th><th>Telegram</th><th>Yo‘nalish</th><th>XP</th><th>Darslar</th></tr>
              </thead>
              <tbody>
                {students.map((u) => (
                  <tr key={u.id} className="border-t border-line/60 dark:border-white/10">
                    <td className="py-2 font-semibold text-ink dark:text-white">{u.name} {u.surname || ''}</td>
                    <td>@{u.telegramUsername}</td>
                    <td>{(u.track || 'ielts').toUpperCase()}</td>
                    <td>{(u.xp || 0).toLocaleString('en-US')}</td>
                    <td>{(u.completedLessons || []).length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="liquid-glass rounded-[24px] p-5">
        <h2 className="mb-3 font-display text-[18px] font-extrabold text-ink dark:text-white">Sharhlar ({pendingReviews.length} kutilmoqda)</h2>
        {pendingReviews.length === 0 ? (
          <p className="text-[13px] text-ink-muted dark:text-stone-400">Tasdiqlash kutilayotgan sharh yo‘q. ✅</p>
        ) : (
          <ul className="space-y-2">
            {pendingReviews.slice(0, 10).map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line/70 p-3 dark:border-white/10">
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-semibold text-ink dark:text-white">{r.name} · {'★'.repeat(r.rating)}</div>
                  <div className="text-[12.5px] text-ink-muted dark:text-stone-400">{r.text}</div>
                </div>
                <div className="flex gap-2">
                  <button type="button" disabled={busy === r.id} onClick={() => setReview(r.id, 'approved')} className="h-9 rounded-full bg-emerald-600 px-4 text-[12.5px] font-semibold text-white disabled:opacity-50">Tasdiqlash</button>
                  <button type="button" disabled={busy === r.id} onClick={() => setReview(r.id, 'hidden')} className="h-9 rounded-full border border-rose-300 px-4 text-[12.5px] font-semibold text-rose-700 disabled:opacity-50 dark:text-rose-300">Yashirish</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="liquid-glass rounded-[24px] p-5">
        <h2 className="mb-3 font-display text-[18px] font-extrabold text-ink dark:text-white">Yangi murojaatlar ({newTickets.length})</h2>
        {newTickets.length === 0 ? (
          <p className="text-[13px] text-ink-muted dark:text-stone-400">Yangi murojaat yo‘q. ✅</p>
        ) : (
          <ul className="space-y-2">
            {newTickets.slice(0, 10).map((t) => (
              <li key={t.id} className="rounded-xl border border-line/70 p-3 text-[13px] dark:border-white/10">
                <div className="font-semibold text-ink dark:text-white">{t.userName}</div>
                <div className="text-ink-muted dark:text-stone-400">{t.message}</div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="liquid-glass rounded-[24px] p-5">
        <h2 className="mb-3 font-display text-[18px] font-extrabold text-ink dark:text-white">Botdagi buyruqlar</h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {COMMANDS.map(([cmd, desc]) => (
            <div key={cmd} className="rounded-xl border border-line/70 px-3 py-2 dark:border-white/10">
              <code className="font-mono text-[13px] font-bold text-ember-700 dark:text-ember-300">{cmd}</code>
              <div className="text-[12px] text-ink-muted dark:text-stone-400">{desc}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
