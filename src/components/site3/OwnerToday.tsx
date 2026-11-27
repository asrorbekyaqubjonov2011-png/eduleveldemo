'use client';
import React, { useState } from 'react';
import { BellRing, Check, Copy, Receipt, Users, MessageSquare, Sparkles, Star } from 'lucide-react';
import { useApp } from '../../context/AppContext';

const som = (n: number) => `${Math.round(n).toLocaleString('en-US').replace(/,/g, ' ')} so‘m`;
const day = () => new Date(Date.now() + 5 * 3600_000).toISOString().slice(0, 10);

const StatCard: React.FC<{ icon: React.ElementType; label: string; value: string; hint?: string; tone: string; tab?: string; go: (tab: string) => void }> = ({ icon: Icon, label, value, hint, tone, tab, go }) => (
  <button type="button" onClick={() => tab && go(tab)} className="liquid-glass group flex items-center gap-3.5 rounded-[22px] p-4 text-left transition-transform hover:-translate-y-0.5">
    <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white ${tone}`}><Icon className="h-5 w-5" /></span>
    <span className="min-w-0">
      <span className="block font-display text-[22px] font-extrabold leading-none tabular-nums text-ink dark:text-white">{value}</span>
      <span className="mt-1 block text-[12.5px] font-semibold leading-snug text-ink-muted dark:text-stone-400">{label}</span>
      {hint ? <span className="block text-[11.5px] leading-snug text-ink-muted/80 dark:text-stone-500">{hint}</span> : null}
    </span>
  </button>
);


/**
 * "Bugun" for the owner: what needs attention right now (deposits to approve, new students, new messages,
 * reviews waiting), and the students whose plan ends within three days, each with a ready message to send.
 */
export const OwnerToday: React.FC<{ onNavigateTab: (tab: string) => void }> = ({ onNavigateTab }) => {
  const { db } = useApp();
  const [copied, setCopied] = useState('');
  const today = day();
  const students = db.users.filter((u) => u.role === 'student');
  const pending = (db.depositTransactions || []).filter((t) => t.status === 'pending');
  const newToday = students.filter((u) => (u.registeredAt || '').slice(0, 10) === today).length;
  const tickets = (db.supportTickets || []).filter((t) => t.status === 'new').length;
  const reviews = (db.reviews || []).filter((r) => r.status === 'pending').length;
  const aiToday = (db.aiUsage || []).filter((u) => u.day === today).reduce((a, u) => a + u.count, 0);

  const soon = students
    .filter((u) => u.vipTier && u.vipTier !== 'none' && u.vipTier !== 'free' && u.vipExpiresAt)
    .map((u) => ({ u, days: Math.ceil((Date.parse(u.vipExpiresAt as string) - Date.now()) / 86400_000) }))
    .filter((x) => x.days >= 0 && x.days <= 3)
    .sort((a, b) => a.days - b.days);

  const message = (name: string, plan: string, days: number) =>
    `Assalomu alaykum, ${name}! ${plan} tarifingiz ${days === 0 ? 'bugun' : `${days} kundan keyin`} tugaydi. Davom ettirish uchun platformada Profil > Balansni to‘ldirish orqali to‘lov qilishingiz mumkin.`;
  const copy = (id: string, text: string) => {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(id);
      setTimeout(() => setCopied(''), 1800);
    }).catch(() => {});
  };

  return (
    <section aria-label="Bugun" className="space-y-4">
      <h2 className="font-display text-[17px] font-extrabold text-ink dark:text-white">Bugun</h2>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard go={onNavigateTab} icon={Receipt} tone="bg-emerald-500" label="Tasdiqlash kutilmoqda" value={String(pending.length)} hint={pending.length ? som(pending.reduce((a, t) => a + t.amount, 0)) : 'hammasi ko‘rib chiqilgan'} tab="deposits" />
        <StatCard go={onNavigateTab} icon={Users} tone="bg-[#f2650f]" label="Bugungi yangi o‘quvchi" value={String(newToday)} hint={`jami ${students.length} ta`} tab="students" />
        <StatCard go={onNavigateTab} icon={MessageSquare} tone="bg-sky-500" label="Yangi murojaat" value={String(tickets)} tab="tickets" />
        <StatCard go={onNavigateTab} icon={Star} tone="bg-amber-500" label="Fikr tasdig‘ini kutmoqda" value={String(reviews)} tab="reviews" />
        <StatCard go={onNavigateTab} icon={Sparkles} tone="bg-violet-500" label="Bugungi AI so‘rovlari" value={String(aiToday)} tab="ai" />
      </div>

      <div className="liquid-glass rounded-[22px] p-5">
        <div className="flex items-center gap-2 text-[14.5px] font-bold text-ink dark:text-white"><BellRing className="h-4 w-4 text-[#f2650f]" /> Tarifi 3 kun ichida tugaydiganlar ({soon.length})</div>
        {soon.length === 0 ? (
          <p className="mt-2 text-[13px] text-ink-muted dark:text-stone-400">Hozircha yo‘q.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line/60 dark:divide-white/10">
            {soon.map(({ u, days }) => {
              const plan = db.vipPlans.find((p) => p.id === u.vipTier)?.name || u.vipTier.toUpperCase();
              const text = message(u.name, plan, days);
              return (
                <li key={u.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5 text-[13px]">
                  <span className="min-w-0"><b className="text-ink dark:text-white">{u.name} {u.surname}</b> <span className="text-ink-muted dark:text-stone-400">· {plan} · {days === 0 ? 'bugun tugaydi' : `${days} kun qoldi`}{u.telegramUsername ? ` · @${u.telegramUsername}` : ''}</span></span>
                  <button type="button" onClick={() => copy(u.id, text)} className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line bg-white/60 px-3.5 text-[12.5px] font-semibold text-ink dark:border-white/10 dark:bg-white/5 dark:text-white">
                    {copied === u.id ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />} {copied === u.id ? 'Nusxalandi' : 'Xabarni nusxalash'}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
};
