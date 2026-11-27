'use client';
import React from 'react';
import { BookOpen, Flame, GraduationCap, Medal, Sparkles, Target, Trophy, Zap } from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { getRankByXp } from '../../../lib/eduLogic';

interface Badge {
  id: string;
  icon: React.ElementType;
  title: string;
  text: string;
  value: number;
  goal: number;
}

const Tile: React.FC<{ label: string; value: string; hint?: string }> = ({ label, value, hint }) => (
  <div className="rounded-2xl border border-line/80 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.04]">
    <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted dark:text-stone-400">{label}</div>
    <div className="mt-1 font-display text-[22px] font-extrabold tabular-nums text-ink dark:text-white">{value}</div>
    {hint ? <div className="text-[12px] text-ink-muted dark:text-stone-500">{hint}</div> : null}
  </div>
);


/** Real numbers only: everything below is counted from the student's own records. */
export const StatsScreen: React.FC = () => {
  const { db, currentUser } = useApp();
  if (!currentUser) return null;
  const attempts = (db.testAttempts || []).filter((a) => a.userId === currentUser.id);
  const pct = (a: { score: number; maxScore: number }) => Math.round((a.score / (a.maxScore || 1)) * 100);
  const best = attempts.length ? Math.max(...attempts.map(pct)) : 0;
  const avg = attempts.length ? Math.round(attempts.reduce((s, a) => s + pct(a), 0) / attempts.length) : 0;
  const lessons = currentUser.completedLessons?.length || 0;
  const streak = currentUser.streakDays || 0;
  const xp = currentUser.xp || 0;
  const books = currentUser.readBookIds?.length || 0;
  const rank = getRankByXp(xp);

  const badges: Badge[] = [
    { id: 'first', icon: Sparkles, title: 'Birinchi qadam', text: 'Birinchi darsni tugatish', value: lessons, goal: 1 },
    { id: 'lessons', icon: GraduationCap, title: 'Dars ustasi', text: '10 ta darsni tugatish', value: lessons, goal: 10 },
    { id: 'tests', icon: Target, title: 'Test jangchisi', text: '3 ta test topshirish', value: attempts.length, goal: 3 },
    { id: 'ace', icon: Medal, title: 'A’lochi', text: 'Testda 90% va undan yuqori', value: best, goal: 90 },
    { id: 'streak3', icon: Flame, title: 'Izchil', text: '3 kun ketma-ket', value: streak, goal: 3 },
    { id: 'streak7', icon: Flame, title: 'Haftalik olov', text: '7 kun ketma-ket', value: streak, goal: 7 },
    { id: 'streak30', icon: Flame, title: 'Oylik chempion', text: '30 kun ketma-ket', value: streak, goal: 30 },
    { id: 'xp500', icon: Zap, title: 'Tajribali', text: '500 XP to‘plash', value: xp, goal: 500 },
    { id: 'xp2000', icon: Trophy, title: 'Ustoz shogirdi', text: '2000 XP to‘plash', value: xp, goal: 2000 },
    { id: 'books', icon: BookOpen, title: 'Kitobxon', text: '3 ta kitob o‘qish', value: books, goal: 3 }
  ];
  const earned = badges.filter((b) => b.value >= b.goal).length;

  // Tests handed in during the last seven days, oldest first.
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.now() + 5 * 3600_000 - (6 - i) * 86400_000).toISOString().slice(0, 10);
    return { d, n: attempts.filter((a) => (a.createdAt || '').slice(0, 10) === d).length };
  });
  const maxN = Math.max(1, ...days.map((x) => x.n));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Tile label="Daraja" value={rank.title} hint={`${xp} XP`} />
        <Tile label="Ketma-ket kunlar" value={`${streak}`} hint="har kuni mashq qiling" />
        <Tile label="Tugatilgan darslar" value={`${lessons}`} />
        <Tile label="Topshirilgan testlar" value={`${attempts.length}`} />
        <Tile label="O‘rtacha natija" value={attempts.length ? `${avg}%` : '—'} />
        <Tile label="Eng yaxshi natija" value={attempts.length ? `${best}%` : '—'} />
      </div>

      <section className="rounded-[22px] border border-line/80 bg-white/70 p-5 dark:border-white/10 dark:bg-white/[0.04]">
        <h2 className="text-[14px] font-bold text-ink dark:text-white">So‘nggi 7 kunda topshirilgan testlar</h2>
        <div className="mt-4 flex h-28 items-end gap-2" role="img" aria-label="Kunlik testlar grafigi">
          {days.map((x) => (
            <div key={x.d} className="flex h-full flex-1 flex-col items-center justify-end gap-1" title={`${x.d}: ${x.n} ta`}>
              <div className={`w-full rounded-t-md transition-[height] duration-700 ${x.n ? 'bg-gradient-to-t from-[#f2650f] to-[#ffa149]' : 'bg-ink/10 dark:bg-white/10'}`} style={{ height: `${x.n ? Math.max(14, (x.n / maxN) * 100) : 6}%` }} />
              <span className="text-[10px] text-ink-muted dark:text-stone-500">{x.d.slice(8)}</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-[14px] font-bold text-ink dark:text-white">Yutuqlar: {earned} / {badges.length}</h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {badges.map((b) => {
            const done = b.value >= b.goal;
            const Icon = b.icon;
            return (
              <li key={b.id} className={`flex items-center gap-3.5 rounded-2xl border p-3.5 ${done ? 'border-[#f2650f]/40 bg-[#f2650f]/[0.06]' : 'border-line/80 bg-white/60 dark:border-white/10 dark:bg-white/[0.03]'}`}>
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${done ? 'bg-gradient-to-b from-[#ffb45c] to-[#ef6c12] text-white shadow-[0_10px_22px_-10px_rgba(239,108,18,0.8)]' : 'bg-ink/[0.06] text-ink-muted dark:bg-white/10'}`}><Icon className="h-5 w-5" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13.5px] font-bold text-ink dark:text-white">{b.title}</span>
                  <span className="block text-[12px] text-ink-muted dark:text-stone-400">{b.text}</span>
                  {!done ? (
                    <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-ink/10 dark:bg-white/10"><span className="block h-full rounded-full bg-[#f2650f]" style={{ width: `${Math.min(100, (b.value / b.goal) * 100)}%` }} /></span>
                  ) : null}
                </span>
                <span className="shrink-0 text-[11.5px] font-bold tabular-nums text-ink-muted dark:text-stone-400">{done ? '✓' : `${Math.min(b.value, b.goal)}/${b.goal}`}</span>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
};
