'use client';

import React, { useMemo, useRef, useState } from 'react';
import { useScrollFx } from '../../lib/motion/useScrollFx';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar } from 'recharts';
import { ArrowRight, BookOpen, Clock, Flame, Headphones, Mic, PenTool, PlayCircle, Target, TrendingUp, Trophy } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { computeStudentAnalytics, attemptPercent, Skill } from '../../lib/studentAnalytics';
import { getRankByXp, ACADEMIC_RANKS } from '../../lib/eduLogic';
import { cn } from '../ui/styles';

interface ProgressViewProps {
  onNavigateTab?: (tab: string) => void;
}

const MICRO = 'text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-muted dark:text-stone-500';
const CARD = 'rounded-[24px] border border-line/80 bg-white/80 p-5 sm:p-6 dark:border-white/[0.07] dark:bg-white/[0.03]';
const SKILL_META: Record<Skill, { icon: React.ElementType; tab: string; label: string }> = {
  Reading: { icon: BookOpen, tab: 'reading', label: 'Reading' },
  Listening: { icon: Headphones, tab: 'listening', label: 'Listening' },
  Writing: { icon: PenTool, tab: 'writing', label: 'Writing' },
  Speaking: { icon: Mic, tab: 'speaking', label: 'Speaking' }
};

const fmtMin = (m: number) => (m >= 60 ? `${Math.floor(m / 60)} soat ${m % 60} daq` : `${m} daq`);

/** One place for a student's progress: scores, skills, activity, lessons and next steps — real data only. */
export const ProgressView: React.FC<ProgressViewProps> = ({ onNavigateTab }) => {
  const { db, currentUser } = useApp();
  const [range, setRange] = useState<7 | 14 | 30>(14);
  const a = useMemo(() => computeStudentAnalytics(db, currentUser, range), [db, currentUser, range]);
  const track = currentUser?.track || 'general';
  const xp = currentUser?.xp ?? 0;
  const rank = getRankByXp(xp);
  const nextRank = ACADEMIC_RANKS.find((r) => r.minXp > xp);
  const rankPct = nextRank ? Math.round(((xp - rank.minXp) / Math.max(1, nextRank.minXp - rank.minXp)) * 100) : 100;

  // Video lessons of the student's track
  const trackLessons = (db.lessons || []).filter((l: any) => !l.track || l.track === track);
  const doneLessons = trackLessons.filter((l) => currentUser?.completedLessons?.includes(l.id)).length;
  const watching = (db.lessonProgress || [])
    .filter((p) => p.userId === currentUser?.id && p.duration > 0 && p.position / p.duration < 0.95)
    .sort((x, y) => y.updatedAt.localeCompare(x.updatedAt))
    .slice(0, 1)[0];
  const watchingLesson = watching ? trackLessons.find((l) => l.id === watching.lessonId) : undefined;

  const latest = a.progression[a.progression.length - 1];
  const first = a.progression[0];
  const trend = latest && first && a.progression.length > 1 ? latest.score - first.score : null;
  const scored = a.skills.filter((s) => s.samples > 0);
  const weakest = scored.length ? [...scored].sort((x, y) => x.studentScore - y.studentScore)[0] : null;
  const untouched = a.skills.find((s) => s.samples === 0);
  const recent = a.attempts.slice().reverse().slice(0, 6);
  const activeDays = a.daily.filter((d) => d.streakActive).length;
  const [shared, setShared] = useState(false);
  /** A short, honest summary of the last days, ready to paste into a chat. */
  const shareProgress = () => {
    const text = `Edu Level: ${currentUser?.name || 'men'} — daraja ${rank.title}, ${xp} XP, ${currentUser?.streakDays || 0} kun ketma-ket, ${doneLessons} ta dars tugatildi. Birga o‘rganamizmi? ${window.location.origin}`;
    const done = () => { setShared(true); setTimeout(() => setShared(false), 1800); };
    if (navigator.share) navigator.share({ title: 'Edu Level', text }).then(done).catch(() => {});
    else navigator.clipboard?.writeText(text).then(done).catch(() => {});
  };

  const headline =
    track === 'ielts' && a.latestBand !== null
      ? { value: a.latestBand.toFixed(1), label: 'Taxminiy band (oxirgi test)' }
      : track === 'cefr' && latest
        ? { value: latest.cefr, label: 'Taxminiy daraja (oxirgi test)' }
        : latest
          ? { value: `${latest.score}%`, label: 'Oxirgi natija' }
          : { value: '—', label: 'Hali test topshirilmagan' };

  const steps: { title: string; text: string; tab: string }[] = [];
  if (!a.attempts.length) steps.push({ title: 'Birinchi mock imtihon', text: 'Darajangizni aniqlash uchun bitta to‘liq testdan boshlang.', tab: 'tests' });
  if (weakest) steps.push({ title: `${weakest.skill} ustida ishlang`, text: `Eng past ko‘nikma: o‘rtacha ${weakest.studentScore}%. Shu bo‘limda yana bitta test bajaring.`, tab: SKILL_META[weakest.skill].tab });
  if (untouched) steps.push({ title: `${untouched.skill} hali baholanmagan`, text: 'To‘liq tasavvur uchun bu ko‘nikmani ham sinab ko‘ring.', tab: SKILL_META[untouched.skill].tab });
  if (watchingLesson) steps.push({ title: 'Darsni davom ettiring', text: watchingLesson.title, tab: 'courses' });
  else if (trackLessons.length && doneLessons < trackLessons.length) steps.push({ title: 'Video darslar', text: `${trackLessons.length - doneLessons} ta dars qoldi.`, tab: 'courses' });

  const rootRef = useRef<HTMLDivElement | null>(null);
  useScrollFx(rootRef);

  return (
    <div ref={rootRef} className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className={MICRO}>{track.toUpperCase()} · Mening progressim</span>
          <h2 className="mt-2 font-display text-[clamp(1.6rem,3vw,2.2rem)] font-extrabold leading-[1.05] tracking-[-0.035em] text-ink dark:text-white">
            Natijalar va <span className="word-ember">o‘sish</span>
          </h2>
        </div>
        <div className="inline-flex rounded-full border border-line/80 bg-white/70 p-1 dark:border-white/10 dark:bg-white/[0.04]" role="tablist" aria-label="Davr">
          {([7, 14, 30] as const).map((d) => (
            <button
              key={d}
              role="tab"
              aria-selected={range === d}
              onClick={() => setRange(d)}
              className={cn(
                'h-8 rounded-full px-3.5 text-[12px] font-semibold transition-colors',
                range === d ? 'bg-ink text-white dark:bg-white dark:text-ink' : 'text-ink-muted hover:text-ink dark:text-stone-400 dark:hover:text-white'
              )}
            >
              {d} kun
            </button>
          ))}
        </div>
      </div>

      <div className="-mt-2 flex justify-end">
        <button type="button" onClick={shareProgress} className="inline-flex h-9 items-center gap-2 rounded-full border border-line/80 bg-white/70 px-4 text-[12.5px] font-semibold text-ink hover:bg-white dark:border-white/10 dark:bg-white/[0.05] dark:text-white">
          {shared ? '✓ Nusxalandi' : 'Natijamni ulashish'}
        </button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { icon: Target, value: headline.value, label: headline.label },
          { icon: TrendingUp, value: a.averagePercent !== null ? `${a.averagePercent}%` : '—', label: `O‘rtacha natija · ${a.attempts.length} test` },
          { icon: Clock, value: fmtMin(a.totalMinutes), label: `Testlarda · ${range} kun` },
          { icon: Flame, value: `${a.streakDays}`, label: `Kunlik seriya · ${activeDays} faol kun` }
        ].map((k) => (
          <div key={k.label} className={cn(CARD, 'p-4 sm:p-5')}>
            <k.icon className="h-4 w-4 text-ember-600 dark:text-ember-400" />
            <div className="mt-3 font-display text-[clamp(1.35rem,2.4vw,1.85rem)] font-extrabold tracking-[-0.03em] text-ink tabular-nums dark:text-white">{k.value}</div>
            <div className="mt-1 text-[12px] leading-snug text-ink-muted dark:text-stone-400">{k.label}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        {/* Score trend */}
        <section className={CARD}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className={MICRO}>Natijalar dinamikasi</span>
              <h3 className="mt-1 font-display text-[17px] font-bold text-ink dark:text-white">Oxirgi {a.progression.length || 0} ta test</h3>
            </div>
            {trend !== null ? (
              <span className={cn('rounded-full px-2.5 py-1 text-[11.5px] font-semibold', trend >= 0 ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'bg-red-500/10 text-red-600 dark:text-red-300')}>
                {trend >= 0 ? '+' : ''}
                {trend}%
              </span>
            ) : null}
          </div>
          {a.progression.length ? (
            <div className="mt-4 h-[220px] text-ink-muted">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={a.progression} margin={{ top: 8, right: 6, left: -22, bottom: 0 }}>
                  <defs>
                    <linearGradient id="pv-fill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ff8a2b" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#ff8a2b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 6" stroke="rgba(148,138,124,0.25)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#8f887e' }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#8f887e' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: 14, border: '1px solid rgba(148,138,124,0.3)', fontSize: 12 }}
                    formatter={(v: any) => [`${v}%`, 'Natija']}
                    labelFormatter={(_, p: any) => p?.[0]?.payload?.testName || ''}
                  />
                  <Area type="monotone" dataKey="score" stroke="#f2650f" strokeWidth={2.4} fill="url(#pv-fill)" dot={{ r: 3, fill: '#f2650f' }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <Empty text="Test topshirganingizdan keyin natijalar grafigi shu yerda paydo bo‘ladi." action="Mock imtihonni boshlash" onClick={() => onNavigateTab?.('tests')} />
          )}
        </section>

        {/* Skills */}
        <section className={CARD}>
          <span className={MICRO}>Ko‘nikmalar</span>
          <h3 className="mt-1 font-display text-[17px] font-bold text-ink dark:text-white">4 ko‘nikma bo‘yicha</h3>
          <div className="mt-5 space-y-4">
            {a.skills.map((s) => {
              const M = SKILL_META[s.skill];
              return (
                <button key={s.skill} onClick={() => onNavigateTab?.(M.tab)} className="group block w-full text-left">
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="flex items-center gap-2 font-semibold text-ink dark:text-white">
                      <M.icon className="h-3.5 w-3.5 text-ink-muted dark:text-stone-400" />
                      {M.label}
                    </span>
                    <span className="tabular-nums text-ink-muted dark:text-stone-400">
                      {s.samples ? `${s.studentScore}% · ${s.samples} ta` : 'baholanmagan'}
                    </span>
                  </div>
                  <div className="relative mt-2 h-2 overflow-hidden rounded-full bg-ink/[0.06] dark:bg-white/[0.07]">
                    <div data-scrub-bar className="h-full rounded-full bg-gradient-to-r from-[#ffb45c] to-[#ef6c12] transition-[width] duration-700" style={{ width: `${s.studentScore}%` }} />
                    <span className="absolute top-0 h-full w-px bg-ink/30 dark:bg-white/40" style={{ left: `${s.targetScore}%` }} title="Maqsad" />
                  </div>
                </button>
              );
            })}
          </div>
          <p className="mt-4 text-[11.5px] text-ink-muted dark:text-stone-500">Chiziq — maqsad darajangiz. Writing/Speaking: AI bahosi (taxminiy).</p>
        </section>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_1fr_1fr]">
        {/* Activity */}
        <section className={cn(CARD, 'lg:col-span-2')}>
          <span className={MICRO}>Faollik</span>
          <h3 className="mt-1 font-display text-[17px] font-bold text-ink dark:text-white">Kunlik o‘quv vaqti</h3>
          {a.daily.some((d) => d.minutes > 0 || d.lessonsDone > 0) ? (
            <div className="mt-4 h-[170px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={a.daily} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 6" stroke="rgba(148,138,124,0.22)" vertical={false} />
                  <XAxis dataKey={range > 14 ? 'dateStr' : 'day'} tick={{ fontSize: 10.5, fill: '#8f887e' }} axisLine={false} tickLine={false} interval={range > 14 ? 4 : 0} />
                  <YAxis tick={{ fontSize: 10.5, fill: '#8f887e' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip cursor={{ fill: 'rgba(148,138,124,0.1)' }} contentStyle={{ borderRadius: 14, fontSize: 12 }} formatter={(v: any) => [`${v} daq`, 'Vaqt']} />
                  <Bar dataKey="minutes" radius={[8, 8, 3, 3]} fill="#ff8a2b" maxBarSize={26} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <Empty text={`So‘nggi ${range} kunda test faolligi yo‘q.`} />
          )}
        </section>

        {/* Rank + lessons */}
        <section className={cn(CARD, 'flex flex-col gap-5')}>
          <div>
            <span className={MICRO}>Unvon</span>
            <div className="mt-2 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-ember-500/10 text-ember-600 dark:text-ember-400">
                <Trophy className="h-4.5 w-4.5" />
              </span>
              <div className="min-w-0">
                <div className="truncate font-semibold text-ink dark:text-white">{rank.title}</div>
                <div className="text-[12px] text-ink-muted dark:text-stone-400 tabular-nums">
                  {xp} XP{nextRank ? ` · keyingisiga ${nextRank.minXp - xp}` : ' · eng yuqori'}
                </div>
              </div>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-ink/[0.06] dark:bg-white/[0.07]">
              <div data-scrub-bar className="h-full rounded-full bg-ink dark:bg-white" style={{ width: `${rankPct}%` }} />
            </div>
          </div>
          <div>
            <span className={MICRO}>Video darslar</span>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="font-display text-[26px] font-extrabold tracking-[-0.03em] text-ink tabular-nums dark:text-white">{doneLessons}</span>
              <span className="text-[13px] text-ink-muted dark:text-stone-400">/ {trackLessons.length} tugallangan</span>
            </div>
            <button onClick={() => onNavigateTab?.('courses')} className="mt-2 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-ember-700 hover:underline dark:text-ember-400">
              <PlayCircle className="h-3.5 w-3.5" /> {watchingLesson ? 'Davom ettirish' : 'Darslarga o‘tish'}
            </button>
          </div>
        </section>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        {/* Recent attempts */}
        <section className={CARD}>
          <div className="flex items-center justify-between">
            <div>
              <span className={MICRO}>Oxirgi testlar</span>
              <h3 className="mt-1 font-display text-[17px] font-bold text-ink dark:text-white">Topshirilgan sinovlar</h3>
            </div>
            {a.attempts.length > 6 ? (
              <button onClick={() => onNavigateTab?.('profile')} className="text-[12.5px] font-semibold text-ink-muted hover:text-ink dark:text-stone-400 dark:hover:text-white">
                Hammasi →
              </button>
            ) : null}
          </div>
          {recent.length ? (
            <ul className="mt-3 divide-y divide-line/70 dark:divide-white/[0.06]">
              {recent.map((t) => {
                const pct = attemptPercent(t);
                return (
                  <li key={t.id} className="flex items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13.5px] font-semibold text-ink dark:text-white">{t.testTitle}</div>
                      <div className="text-[11.5px] text-ink-muted dark:text-stone-500">
                        {new Date(t.createdAt).toLocaleDateString('uz-UZ')} · {t.correctCount}/{t.totalQuestions} to‘g‘ri · {Math.max(1, Math.round((t.timeSpentSeconds || 0) / 60))} daq
                      </div>
                    </div>
                    <span
                      className={cn(
                        'shrink-0 rounded-full px-2.5 py-1 text-[12px] font-bold tabular-nums',
                        pct >= 70 ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : pct >= 45 ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300' : 'bg-red-500/10 text-red-600 dark:text-red-300'
                      )}
                    >
                      {pct}%
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <Empty text="Hali sinov topshirilmagan." />
          )}
        </section>

        {/* Next steps */}
        <section className={CARD}>
          <span className={MICRO}>Keyingi qadamlar</span>
          <h3 className="mt-1 font-display text-[17px] font-bold text-ink dark:text-white">Tavsiya</h3>
          <div className="mt-3 space-y-2">
            {(steps.length ? steps : [{ title: 'Ajoyib!', text: 'Barcha ko‘nikmalar baholangan. Natijani oshirish uchun mock imtihonlarni davom ettiring.', tab: 'tests' }]).slice(0, 4).map((s) => (
              <button
                key={s.title}
                onClick={() => onNavigateTab?.(s.tab)}
                className="group flex w-full items-center gap-3 rounded-2xl border border-transparent px-3 py-3 text-left transition-colors hover:border-line hover:bg-ink/[0.02] dark:hover:border-white/10 dark:hover:bg-white/[0.03]"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px] font-semibold text-ink dark:text-white">{s.title}</div>
                  <div className="line-clamp-2 text-[12px] text-ink-muted dark:text-stone-400">{s.text}</div>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-ink-muted transition-transform group-hover:translate-x-0.5 dark:text-stone-500" />
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

const Empty: React.FC<{ text: string; action?: string; onClick?: () => void }> = ({ text, action, onClick }) => (
  <div className="mt-4 flex min-h-[150px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-line px-6 text-center dark:border-white/10">
    <p className="max-w-xs text-[13px] text-ink-muted dark:text-stone-400">{text}</p>
    {action ? (
      <button onClick={onClick} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-ink px-4 text-[12.5px] font-semibold text-white dark:bg-white dark:text-ink">
        {action} <ArrowRight className="h-3.5 w-3.5" />
      </button>
    ) : null}
  </div>
);
