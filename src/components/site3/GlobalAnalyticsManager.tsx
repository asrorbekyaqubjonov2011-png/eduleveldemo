'use client';

import React, { useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import {
  TrendingUp,
  Award,
  Users,
  ShoppingBag,
  Sparkles,
  ArrowUpRight,
  Flame,
  BarChart2,
  FileText,
  Copy,
  Download,
  Check,
  Coins,
  Calendar,
  CheckCircle2
} from 'lucide-react';
import { Glass, Button, Pill } from '../ui';
import { Reveal, Counter } from '../ui/motion-primitives';
import { field, label, cn } from '../ui/styles';

const TOOLTIP_STYLE: React.CSSProperties = {
  backgroundColor: 'rgba(253,251,248,0.96)',
  border: '1px solid #e5dfd5',
  borderRadius: '14px',
  boxShadow: '0 18px 40px -18px rgba(18,16,14,0.35)',
  color: '#12100e',
  fontSize: '12px',
  padding: '10px 12px'
};

export const GlobalAnalyticsManager: React.FC = () => {
  const { db } = useApp();

  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [selectedTrack, setSelectedTrack] = useState<'all' | 'ielts' | 'cefr' | 'general'>('all');

  // AI Student Performance Report State
  const [reportCohort, setReportCohort] = useState<string>('all');
  const [reportFocus, setReportFocus] = useState<string>('comprehensive');
  const [isGeneratingAiReport, setIsGeneratingAiReport] = useState<boolean>(false);
  const [generatedReport, setGeneratedReport] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  // Platform KPIs
  const totalStudents = db.users.filter(u => u.role === 'student' || (u as any).role !== 'owner').length;
  const totalTests = db.tests.length;
  const totalAttempts = db.testAttempts?.length ?? 0;
  const activeStreakStudents = db.users.filter(u => (u.streakDays || 0) >= 3).length;
  const totalLessons = db.lessons.length;

  // KPI trends from stored records only (no estimates).
  const nowMs = Date.now();
  const inWindow = (iso: string | undefined, fromDays: number, toDays: number) => {
    if (!iso) return false;
    const t = new Date(iso).getTime();
    return t <= nowMs - toDays * 86400000 && t > nowMs - fromDays * 86400000;
  };
  const activityRecords = [
    ...(db.testAttempts || []).map((a) => ({ userId: a.userId, at: a.createdAt })),
    ...(db.exerciseAttempts || []).map((a) => ({ userId: a.userId, at: a.createdAt })),
    ...(db.lessonProgress || []).map((p) => ({ userId: p.userId, at: p.updatedAt }))
  ];
  const activeLast30 = new Set(activityRecords.filter((r) => inWindow(r.at, 30, 0)).map((r) => r.userId)).size;
  const activePrev30 = new Set(activityRecords.filter((r) => inWindow(r.at, 60, 30)).map((r) => r.userId)).size;
  const activeTrend = activePrev30 > 0 ? Math.round(((activeLast30 - activePrev30) / activePrev30) * 100) : null;
  const scoredAttempts = (db.testAttempts || []).filter((a) => a.maxScore > 0);
  const averageScorePct = scoredAttempts.length
    ? Math.round((scoredAttempts.reduce((sum, a) => sum + (a.score / a.maxScore) * 100, 0) / scoredAttempts.length) * 10) / 10
    : null;
  const streakList = db.users.map((u) => u.streakDays || 0).filter((d) => d > 0);
  const averageStreak = streakList.length ? Math.round(streakList.reduce((sum, d) => sum + d, 0) / streakList.length) : null;

  // Store catalog (owner-managed). Sales come only from real purchases.
  const baseItems = db.shopItems || [];

  // Calculate actual purchases by students
  const salesMap: Record<string, number> = {};
  db.users.forEach(u => {
    (u.purchasedItemIds || []).forEach(itemId => {
      salesMap[itemId] = (salesMap[itemId] || 0) + 1;
    });
  });

  // Blend with realistic base volume so chart is rich even before thousands of transactions
  const topProducts = baseItems.map((item, idx) => {
    const recordedSales = salesMap[item.id] || 0;
    const unitsSold = recordedSales;
    const totalCoins = unitsSold * item.pricePoints;
    return {
      id: item.id,
      title: item.title,
      category: item.category,
      icon: item.icon,
      pricePoints: item.pricePoints,
      unitsSold,
      totalCoins,
      conversionRate: totalStudents > 0 ? Math.min(100, Math.round((unitsSold / totalStudents) * 100)) : 0
    };
  }).sort((a, b) => b.unitsSold - a.unitsSold);

  const top5BarData = topProducts.slice(0, 5).map(p => ({
    name: p.title.length > 18 ? p.title.slice(0, 16) + '..' : p.title,
    dona: p.unitsSold,
    ballar: Math.round(p.totalCoins / 100)
  }));

  // Daily activity for the last 14 days (Tashkent days), computed from stored records only.
  const TASHKENT_OFFSET = 5 * 3600 * 1000;
  const dayOf = (iso?: string) => (iso ? new Date(new Date(iso).getTime() + TASHKENT_OFFSET).toISOString().slice(0, 10) : '');
  const today = new Date(Date.now() + TASHKENT_OFFSET);
  const lastDays = Array.from({ length: 14 }, (_, i) => new Date(today.getTime() - (13 - i) * 86400000).toISOString().slice(0, 10));
  const activityData = lastDays.map((day) => {
    const attempts = (db.testAttempts || []).filter((a) => dayOf(a.createdAt) === day);
    const watched = (db.lessonProgress || []).filter((p) => dayOf(p.updatedAt) === day);
    const exercises = (db.exerciseAttempts || []).filter((a) => dayOf(a.createdAt) === day);
    const active = new Set([...attempts, ...watched, ...exercises].map((r) => r.userId));
    return { date: day.slice(5), activeUsers: active.size, testsSolved: attempts.length + exercises.length, lessonsWatched: watched.length };
  });

  // Category distribution for the pie chart, from real sales.
  const CATEGORY_LABEL: Record<string, string> = { book: 'PDF kitoblar', frame: 'Ramkalar', color: 'Ism ranglari & titullar', badge: 'Ism ranglari & titullar', booster: 'Booster & himoya' };
  const CATEGORY_COLORS = ['#c9540a', '#ff8a2b', '#ffd166', '#ffcf8f', '#8a4a1a'];
  const byCategory = new Map<string, number>();
  topProducts.forEach((p) => {
    const label = CATEGORY_LABEL[p.category] || 'Boshqa';
    byCategory.set(label, (byCategory.get(label) || 0) + p.unitsSold);
  });
  const categoryDistribution = Array.from(byCategory.entries()).map(([name, value], i) => ({ name, value, color: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }));

  // AI report: the server builds the answer from real platform data (owner assistant).
  // No numbers are invented here; on failure the owner is told so.
  const handleGenerateAiReport = async () => {
    setIsGeneratingAiReport(true);
    setGeneratedReport(null);

    const cohortInfo =
      reportCohort === 'all'
        ? "Barcha o'quvchilar"
        : reportCohort === 'ielts'
          ? 'IELTS guruhlari'
          : reportCohort === 'cefr'
            ? 'CEFR guruhlari'
            : 'General English guruhi';
    const topList = topProducts
      .filter((p) => p.unitsSold > 0)
      .slice(0, 3)
      .map((p) => `${p.title} (${p.unitsSold} dona)`)
      .join(', ');
    const question = `Quyidagi haqiqiy platforma ma'lumotlari asosida o'zbek tilida o'quvchilar hisobotini tuz. Faqat ma'lumotda berilgan raqamlardan foydalan, yangi raqam o'ylab topma. Kohorta: ${cohortInfo}. Ro'yxatdan o'tganlar: ${totalStudents}. Faol streak: ${activeStreakStudents}. Topshirilgan testlar: ${totalAttempts}. Eng ko'p sotilganlar: ${topList || "hali sotuv yo'q"}. Bo'limlar: 1) qisqa xulosa, 2) ko'nikmalar, 3) faollik, 4) ustoz uchun tavsiyalar. Ma'lumot yetarli bo'lmasa, shuni aniq yoz.`;

    try {
      const res = await api.askOwnerAssistant(question);
      if (res?.success && res.reply) setGeneratedReport(res.reply);
      else setGeneratedReport(`AI hisobot yaratilmadi: ${res?.message || 'javob kelmadi'}. Yuqoridagi haqiqiy ko'rsatkichlardan foydalaning.`);
    } catch {
      setGeneratedReport("Server bilan bog'lanib bo'lmadi. Keyinroq qayta urinib ko'ring.");
    } finally {
      setIsGeneratingAiReport(false);
    }
  };

  const handleCopyReport = () => {
    if (!generatedReport) return;
    navigator.clipboard.writeText(generatedReport);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadReport = () => {
    if (!generatedReport) return;
    const blob = new Blob([generatedReport], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `EduLevel-Student-Performance-Report-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-7">
      {/* ---------------------------------------------------------------- */}
      {/* HEADER                                                            */}
      {/* ---------------------------------------------------------------- */}
      <Reveal>
        <section className="relative overflow-hidden rounded-[2rem] border border-line/70 bg-paper-raised/70 p-5 shadow-[0_24px_48px_-26px_rgba(18,16,14,0.18)] backdrop-blur-xl sm:p-8 dark:border-white/10 dark:bg-white/[0.035]">
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-gradient-to-br from-sun-400/30 via-ember-500/20 to-transparent soft-blob" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent dark:via-white/15" />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <Pill tone="ember">
                <TrendingUp className="h-3 w-3" />
                Edu Level Global Analitika Markazi
              </Pill>
              <h1 className="mt-4 font-display text-[clamp(1.65rem,3.4vw,2.35rem)] font-extrabold leading-[1.04] tracking-[-0.04em] text-ink text-balance dark:text-white">
                Platforma Global Analitikasi{' '}
                <span className="text-ember-gradient-static">&amp; Sotuvlar</span>
              </h1>
              <p className="mt-2.5 text-[13.5px] leading-relaxed text-ink-muted dark:text-stone-400">
                O'quvchilarning umumiy faolligi, eng ko'p xarid qilingan mahsulotlar hamda sun'iy intellekt (Gemini)
                yordamida avtomatik pedagogik hisobotlar yaratish moduli.
              </p>
            </div>

            {/* Time range switcher */}
            <div className="flex shrink-0 items-center gap-1 rounded-full border border-line/70 bg-white/60 p-1 backdrop-blur-md dark:border-white/10 dark:bg-white/[0.05]">
              {(['7d', '30d', '90d'] as const).map(tr => (
                <button
                  key={tr}
                  onClick={() => setTimeRange(tr)}
                  className={cn(
                    'rounded-full px-3.5 py-1.5 text-[11.5px] font-bold transition-all duration-200',
                    timeRange === tr
                      ? 'bg-ink text-white shadow-[0_8px_18px_-10px_rgba(18,16,14,0.7)] dark:bg-white dark:text-ink'
                      : 'text-ink-muted hover:text-ink dark:text-stone-400 dark:hover:text-white'
                  )}
                >
                  {tr === '7d' ? '7 Kun' : tr === '30d' ? '30 Kun' : '90 Kun'}
                </button>
              ))}
            </div>
          </div>
        </section>
      </Reveal>

      {/* ---------------------------------------------------------------- */}
      {/* METRICS                                                           */}
      {/* ---------------------------------------------------------------- */}
      <Reveal delay={70}>
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              label: "Faol O'quvchilar",
              value: totalStudents,
              unit: 'nafar',
              icon: Users,
              foot: (
                <span className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400">
                  <ArrowUpRight className="h-3.5 w-3.5" />{' '}
                  {activeTrend === null ? `${activeLast30} nafar (oxirgi 30 kun)` : `${activeTrend >= 0 ? '+' : ''}${activeTrend}% oxirgi 30 kunda`}
                </span>
              )
            },
            {
              label: 'Ishlangan Testlar',
              value: totalAttempts,
              unit: 'ta',
              icon: Award,
              foot: (
                <>
                  O'rtacha ball:{' '}
                  <strong className="font-bold text-ink dark:text-stone-200">{averageScorePct === null ? '—' : `${averageScorePct}%`}</strong>
                </>
              )
            },
            {
              label: 'Sotilgan Mahsulotlar',
              value: topProducts.reduce((acc, p) => acc + p.unitsSold, 0),
              unit: 'dona',
              icon: ShoppingBag,
              foot: (
                <span className="inline-flex items-center gap-1 font-bold text-ember-700 dark:text-ember-300">
                  <Coins className="h-3.5 w-3.5" />{' '}
                  {topProducts.reduce((acc, p) => acc + p.totalCoins, 0).toLocaleString()} Ball sarflandi
                </span>
              )
            },
            {
              label: 'Streak Muntazamligi',
              value: activeStreakStudents,
              unit: 'nafar',
              icon: Flame,
              foot: (
                <>
                  O'rtacha seriya: <strong className="font-bold text-ink dark:text-stone-200">{averageStreak === null ? '—' : `${averageStreak} kun`}</strong>
                </>
              )
            }
          ].map(tile => {
            const Icon = tile.icon;
            return (
              <Glass key={tile.label} level={1} radius="rounded-[1.5rem]" className="p-5">
                <div className="flex items-start justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-muted dark:text-stone-400">
                    {tile.label}
                  </span>
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-ember-500/10 text-ember-600 dark:bg-ember-500/15 dark:text-ember-400">
                    <Icon className="h-4 w-4" />
                  </span>
                </div>
                <div className="mt-4 font-display text-[clamp(1.35rem,2.2vw,1.7rem)] font-extrabold leading-none tracking-[-0.03em] text-ink tabular-nums dark:text-white">
                  <Counter value={tile.value} />
                  <span className="ml-1 text-[12px] font-semibold text-ink-muted dark:text-stone-400">{tile.unit}</span>
                </div>
                <div className="mt-3 border-t border-line/70 pt-2.5 text-[11px] text-ink-muted dark:border-white/5 dark:text-stone-400">
                  {tile.foot}
                </div>
              </Glass>
            );
          })}
        </section>
      </Reveal>

      {/* ---------------------------------------------------------------- */}
      {/* ACTIVITY CHART                                                    */}
      {/* ---------------------------------------------------------------- */}
      <Reveal delay={110}>
        <Glass level={2} className="p-5 sm:p-7">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <BarChart2 className="h-4 w-4 text-ember-600" />
                <h2 className="font-display text-[15.5px] font-extrabold tracking-[-0.02em] text-ink dark:text-white">
                  O'quvchilar Faollik Dinamikasi
                </h2>
              </div>
              <p className="mt-1 text-[12px] text-ink-muted dark:text-stone-400">
                Kunlik faol o'quvchilar, ishlangan mock testlar va ko'rilgan video darslar dinamikasi
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] font-semibold text-ink-muted dark:text-stone-400">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#c9540a]" /> Faol O'quvchilar
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#ff8a2b]" /> Ishlangan Testlar
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#6b655c]" /> Ko'rilgan Darslar
              </span>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#c9540a" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#c9540a" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorTests" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ff8a2b" stopOpacity={0.26} />
                    <stop offset="95%" stopColor="#ff8a2b" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorLessons" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6b655c" stopOpacity={0.16} />
                    <stop offset="95%" stopColor="#6b655c" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 6" stroke="#e5dfd5" vertical={false} />
                <XAxis dataKey="date" stroke="#9b948a" fontSize={11} tickLine={false} axisLine={false} dy={6} />
                <YAxis stroke="#9b948a" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ stroke: '#e5dfd5', strokeWidth: 1 }} />
                <Area type="monotone" dataKey="activeUsers" name="Faol O'quvchilar" stroke="#c9540a" strokeWidth={2.5} fillOpacity={1} fill="url(#colorUsers)" />
                <Area type="monotone" dataKey="testsSolved" name="Ishlangan Testlar" stroke="#ff8a2b" strokeWidth={2.5} fillOpacity={1} fill="url(#colorTests)" />
                <Area type="monotone" dataKey="lessonsWatched" name="Ko'rilgan Darslar" stroke="#6b655c" strokeWidth={2} strokeDasharray="4 4" fillOpacity={1} fill="url(#colorLessons)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Glass>
      </Reveal>

      {/* ---------------------------------------------------------------- */}
      {/* TOP PRODUCTS + PIE                                                */}
      {/* ---------------------------------------------------------------- */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <Reveal delay={140} className="lg:col-span-8">
          <Glass level={1} radius="rounded-[1.75rem]" className="h-full p-5 sm:p-6">
            <div className="mb-5">
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-4 w-4 text-ember-600" />
                <h2 className="font-display text-[15.5px] font-extrabold tracking-[-0.02em] text-ink dark:text-white">
                  Eng Ko'p Sotilgan Mahsulotlar
                </h2>
              </div>
              <p className="mt-1 text-[12px] text-ink-muted dark:text-stone-400">
                Edu Coin do'konida eng ko'p talab qilingan kitoblar, ramkalar va unvonlar reytingi
              </p>
            </div>

            <div className="-mx-2 overflow-x-auto">
              <table className="w-full min-w-[620px] border-collapse text-left">
                <thead>
                  <tr className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted dark:text-stone-400">
                    <th className="px-3 pb-3 font-bold">O'rin / Mahsulot</th>
                    <th className="px-3 pb-3 font-bold">Kategoriya</th>
                    <th className="px-3 pb-3 font-bold">Narxi</th>
                    <th className="px-3 pb-3 text-center font-bold">Sotilgan</th>
                    <th className="px-3 pb-3 text-right font-bold">Jami Ballar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/70 dark:divide-white/5">
                  {topProducts.map((p, idx) => (
                    <tr key={p.id} className="transition-colors hover:bg-ember-500/[0.04] dark:hover:bg-white/[0.02]">
                      <td className="px-3 py-3.5">
                        <div className="flex items-center gap-3">
                          <span
                            className={cn(
                              'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg font-mono text-[10.5px] font-black',
                              idx === 0
                                ? 'bg-gradient-to-br from-sun-300 to-ember-400 text-[#3a1c05]'
                                : idx === 1
                                ? 'bg-line/80 text-ink-soft dark:bg-white/10 dark:text-stone-200'
                                : idx === 2
                                ? 'bg-ember-700/15 text-ember-700 dark:bg-ember-500/15 dark:text-ember-300'
                                : 'bg-ink/[0.04] text-ink-muted dark:bg-white/5 dark:text-stone-400'
                            )}
                          >
                            #{idx + 1}
                          </span>
                          <span className="text-[15px] leading-none">{p.icon}</span>
                          <span className="text-[12.5px] font-bold leading-snug text-ink dark:text-white">{p.title}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3.5">
                        <Pill tone="neutral">{p.category}</Pill>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3.5 font-mono text-[12px] font-bold text-ember-700 dark:text-ember-300">
                        {p.pricePoints} Ball
                      </td>
                      <td className="px-3 py-3.5 text-center">
                        <span className="inline-flex items-center rounded-full border border-line/70 bg-white/60 px-2.5 py-1 font-mono text-[11.5px] font-bold tabular-nums text-ink dark:border-white/10 dark:bg-white/[0.05] dark:text-stone-200">
                          {p.unitsSold} dona
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3.5 text-right font-mono text-[12px] font-black tabular-nums text-ink dark:text-white">
                        {p.totalCoins.toLocaleString()} Ball
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Glass>
        </Reveal>

        <Reveal delay={180} className="lg:col-span-4">
          <Glass level={1} radius="rounded-[1.75rem]" className="flex h-full flex-col justify-between p-5 sm:p-6">
            <div>
              <h2 className="font-display text-[15.5px] font-extrabold tracking-[-0.02em] text-ink dark:text-white">
                Sotuvlar Kategoriyalari
              </h2>
              <p className="mt-1 text-[12px] text-ink-muted dark:text-stone-400">
                Talabning mahsulot turlari bo'yicha taqsimoti
              </p>

              <div className="mt-4 h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryDistribution}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={54}
                      outerRadius={82}
                      paddingAngle={3}
                      stroke="none"
                    >
                      {categoryDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="space-y-2.5 border-t border-line/70 pt-4 dark:border-white/[0.06]">
              {categoryDistribution.map(cat => (
                <div key={cat.name} className="flex items-center justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-2 text-[11.5px] text-ink-muted dark:text-stone-400">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: cat.color }} />
                    <span className="truncate">{cat.name}</span>
                  </span>
                  <span className="shrink-0 font-mono text-[11.5px] font-bold tabular-nums text-ink dark:text-white">
                    {cat.value}%
                  </span>
                </div>
              ))}
            </div>
          </Glass>
        </Reveal>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* AI REPORT GENERATOR                                               */}
      {/* ---------------------------------------------------------------- */}
      <Reveal delay={210}>
        <Glass level={2} className="p-5 sm:p-7">
          <div className="flex flex-col gap-4 border-b border-line/60 pb-5 sm:flex-row sm:items-start sm:justify-between dark:border-white/[0.06]">
            <div className="max-w-2xl">
              <Pill tone="ember">
                <Sparkles className="h-3 w-3" />
                Avtomatlashtirilgan AI Metodist (Gemini)
              </Pill>
              <h2 className="mt-3 font-display text-[clamp(1.15rem,2.2vw,1.45rem)] font-extrabold leading-tight tracking-[-0.03em] text-ink dark:text-white">
                O'qituvchi Uchun "Student Performance Report" Generatori
              </h2>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-muted dark:text-stone-400">
                Butun guruh yoki yo'nalish o'quvchilarining test natijalari, xatolari va o'sish sur'atlarini chuqur
                tahlil qilib, rasmiy pedagogik hisobot yozadi.
              </p>
            </div>

            <Button
              variant="ember"
              size="md"
              onClick={handleGenerateAiReport}
              disabled={isGeneratingAiReport}
              iconLeft={<Sparkles className="h-4 w-4" />}
              className="shrink-0"
            >
              {isGeneratingAiReport ? 'AI Hisobot Yozmoqda...' : 'AI Hisobot Yaratish'}
            </Button>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={label}>1. Tahlil Qilinadigan Guruh / Kohorta</label>
              <select
                value={reportCohort}
                onChange={e => setReportCohort(e.target.value)}
                className={cn(field, 'cursor-pointer')}
              >
                <option value="all">Barcha Yo'nalishlar (General + IELTS + CEFR)</option>
                <option value="ielts">IELTS Academic (Band 7.5 - 9.0 maqsadli guruh)</option>
                <option value="cefr">CEFR Multilevel (B2 va C1 Milliy Sertifikat)</option>
                <option value="general">General English (Grammar & Vocab Blitz)</option>
              </select>
            </div>

            <div>
              <label className={label}>2. Hisobotning Asosiy Urg'usi (Focus Area)</label>
              <select
                value={reportFocus}
                onChange={e => setReportFocus(e.target.value)}
                className={cn(field, 'cursor-pointer')}
              >
                <option value="comprehensive">To'liq Akademik Tahlil + Dars Rejasiga Tavsiyalar</option>
                <option value="bottlenecks">Zaif Tomonlar & Ko'p Yo'l Qo'yilayotgan Xatolar</option>
                <option value="top_performers">Top Iqtidorli O'quvchilar & Grant Imkoniyatlari</option>
                <option value="motivation">Muntazamlik (Streak) & Motivatsiya Tahlili</option>
              </select>
            </div>
          </div>

          {generatedReport ? (
            <div className="mt-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.06] px-4 py-2.5">
                <span className="inline-flex items-center gap-2 text-[12px] font-bold text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="h-4 w-4" />
                  Hisobot muvaffaqiyatli tayyorlandi (Markdown formatida)
                </span>

                <div className="flex items-center gap-2">
                  <Button
                    variant="glass"
                    size="sm"
                    onClick={handleCopyReport}
                    iconLeft={copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  >
                    {copied ? 'Nusxa Olindi!' : 'Nusxa Olish'}
                  </Button>
                  <Button
                    variant="ember"
                    size="sm"
                    onClick={handleDownloadReport}
                    iconLeft={<Download className="h-3.5 w-3.5" />}
                  >
                    Yuklab Olish (.md)
                  </Button>
                </div>
              </div>

              <div className="max-h-[520px] overflow-y-auto rounded-2xl border border-line/70 bg-[#fdfbf8]/80 p-5 font-mono text-[12px] leading-relaxed text-ink-soft whitespace-pre-line shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] sm:text-[12.5px] dark:border-white/[0.06] dark:bg-black/25 dark:text-stone-300 dark:shadow-none">
                {generatedReport}
              </div>
            </div>
          ) : (
            <div className="mt-5 flex flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-line bg-white/30 px-6 py-12 text-center dark:border-white/10 dark:bg-white/[0.02]">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-ember-500/10 text-ember-600 dark:bg-ember-500/15 dark:text-ember-400">
                <FileText className="h-6 w-6" />
              </div>
              <h3 className="mt-4 font-display text-[14px] font-bold tracking-tight text-ink dark:text-white">
                Hali hisobot generatsiya qilinmadi
              </h3>
              <p className="mt-1.5 max-w-md text-[12px] leading-relaxed text-ink-muted dark:text-stone-400">
                Yuqoridagi "AI Hisobot Yaratish" tugmasini bosing. Gemini sun'iy intellekti platformadagi barcha
                o'quvchilar ko'rsatkichlarini tahlil qilib, o'qituvchi uchun to'liq tavsiyanoma va tahlilnomani tuzib
                beradi.
              </p>
            </div>
          )}
        </Glass>
      </Reveal>
    </div>
  );
};
