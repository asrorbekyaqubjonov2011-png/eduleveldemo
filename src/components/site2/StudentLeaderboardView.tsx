import React, { useMemo, useState } from 'react';
import { Flame, Search, Trophy } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { LearningTrack, User } from '../../types';

const TRACK_LABEL: Record<LearningTrack, string> = { ielts: 'IELTS', cefr: 'CEFR', general: 'General' };

/**
 * Ranking computed from real activity: points first, then XP.
 * Blocked accounts and students without any activity are not shown.
 */
export const StudentLeaderboardView: React.FC = () => {
  const { db, currentUser } = useApp();
  const [track, setTrack] = useState<'all' | LearningTrack>('all');
  const [query, setQuery] = useState('');

  const ranked = useMemo(() => {
    const list = (db.users as User[])
      .filter((u) => !u.isBlocked && ((u.points ?? 0) > 0 || (u.xp ?? 0) > 0 || (u.completedLessons?.length ?? 0) > 0))
      .filter((u) => track === 'all' || u.track === track)
      .sort((a, b) => (b.points ?? 0) - (a.points ?? 0) || (b.xp ?? 0) - (a.xp ?? 0) || a.registeredAt.localeCompare(b.registeredAt));
    return list;
  }, [db.users, track]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ranked;
    return ranked.filter((u) => `${u.name} ${u.surname}`.toLowerCase().includes(q));
  }, [ranked, query]);

  return (
    <section className="mx-auto max-w-4xl space-y-6 px-4 py-6">
      <header className="space-y-1">
        <h1 className="flex items-center gap-2 text-2xl font-extrabold text-ink dark:text-white">
          <Trophy className="h-6 w-6 text-ember-600" /> Reyting
        </h1>
        <p className="text-[13.5px] text-ink-muted dark:text-stone-400">
          Ballar va faollik asosida. Har bir ball real mashq va darslardan keladi.
        </p>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted/60" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ism bo‘yicha qidirish"
            aria-label="Ism bo‘yicha qidirish"
            className="h-11 w-full rounded-full border border-line/80 bg-white/80 pl-11 pr-4 text-[14px] text-ink outline-none focus:border-ember-500/60 dark:border-white/10 dark:bg-white/5 dark:text-white"
          />
        </div>
        <select
          value={track}
          onChange={(e) => setTrack(e.target.value as 'all' | LearningTrack)}
          aria-label="Yo‘nalish"
          className="h-11 rounded-full border border-line/80 bg-white/80 px-4 text-[14px] text-ink outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
        >
          <option value="all">Barcha yo‘nalishlar</option>
          <option value="ielts">IELTS</option>
          <option value="cefr">CEFR</option>
          <option value="general">General English</option>
        </select>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-line/80 p-10 text-center text-[14px] text-ink-muted dark:border-white/10 dark:text-stone-400">
          {ranked.length === 0 ? 'Hozircha reyting uchun faollik yo‘q. Birinchi mashqni bajaring!' : 'Qidiruv bo‘yicha natija topilmadi.'}
        </div>
      ) : (
        <ol className="divide-y divide-line/70 overflow-hidden rounded-3xl border border-line/80 bg-white/80 dark:divide-white/10 dark:border-white/10 dark:bg-white/[0.03]">
          {visible.slice(0, 100).map((u, index) => {
            const isMe = currentUser?.id === u.id;
            return (
              <li
                key={u.id}
                className={`grid grid-cols-[2.5rem_1fr_auto] items-center gap-3 px-4 py-3 sm:grid-cols-[3rem_1fr_auto_auto] ${isMe ? 'bg-ember-500/10' : ''}`}
              >
                <span className="text-center text-[15px] font-extrabold text-ink-muted dark:text-stone-400">{index + 1}</span>
                <div className="min-w-0">
                  <div className="truncate text-[14.5px] font-semibold text-ink dark:text-white">
                    {u.name} {u.surname}
                    {isMe ? <span className="ml-2 text-[11px] font-bold text-ember-700 dark:text-ember-300">Siz</span> : null}
                  </div>
                  <div className="text-[12px] text-ink-muted dark:text-stone-400">
                    {u.track ? TRACK_LABEL[u.track] : 'Yo‘nalish tanlanmagan'} · {u.completedLessons?.length ?? 0} ta dars
                  </div>
                </div>
                <div className="text-right text-[15px] font-extrabold text-ink dark:text-white">
                  {u.points ?? 0} <span className="text-[11px] font-semibold text-ink-muted">ball</span>
                </div>
                <div className="hidden items-center justify-end gap-1 text-[12.5px] text-ink-muted sm:flex dark:text-stone-400">
                  <Flame className="h-3.5 w-3.5 text-ember-500" /> {u.streakDays ?? 0} kun
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
};
