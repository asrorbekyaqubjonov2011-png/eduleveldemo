import React, { useRef, useState } from 'react';
import { useScrollFx } from '../../lib/motion/useScrollFx';
import { useApp } from '../../context/AppContext';
import {
  Users,
  MessageSquare,
  ArrowUpRight,
  Layers,
  Wallet,
  Zap,
  TrendingUp,
  PlayCircle,
  Trophy,
  Clock,
  Coins,
  Palette,
  Sparkles,
  type LucideIcon
} from 'lucide-react';
import { Glass, Button, Pill } from '../ui';
import { Reveal, Counter } from '../ui/motion-primitives';
import { OwnerToday } from './OwnerToday';

interface OwnerDashboardProps {
  onNavigateTab: (tab: string) => void;
}

interface QuickAction {
  tab: string;
  title: string;
  hint: string;
  icon: LucideIcon;
}

const QUICK_ACTIONS: QuickAction[] = [
  { tab: 'deposits', title: 'Depozitlar & Moliya', hint: 'Telegram bot, hisoblar va to‘lovlar', icon: Wallet },
  { tab: 'students', title: 'O‘quvchilar & Balans', hint: 'Telegram, qo‘shimcha tel, email va balans', icon: Users },
  { tab: 'news', title: 'Yangiliklar & VIP sovg‘a', hint: 'Yangilik e’lon qilish, hamma uchun VIP', icon: Trophy },
  { tab: 'ai', title: 'AI statistika & limit', hint: 'Modellar, tokenlar va kunlik vaqt', icon: Clock },
  { tab: 'shop_manager', title: 'Edu Coin Do‘koni', hint: 'Mahsulotlar, narxlar & kitoblar', icon: Coins },
  { tab: 'theme_bg', title: 'Orqa fon temalari', hint: 'Platforma foni va rangi', icon: Palette },
  { tab: 'tickets', title: 'Murojaatlar & Yordam', hint: 'Saytdan kelgan savollar va javoblar', icon: MessageSquare }
];

export const OwnerDashboard: React.FC<OwnerDashboardProps> = ({ onNavigateTab }) => {
  const { db } = useApp();

  const totalStudents = db.users.filter(u => u.role === 'student').length;
  const activeVIPs = db.users.filter(u => u.role === 'student' && u.vipTier !== 'free').length;
  const totalCourses = db.courses.length;
  const totalLessons = db.lessons.length;
  const totalTests = db.tests.length;
  const totalResults = db.studentResults?.length || 0;
  const newTickets = db.supportTickets.filter(t => t.status === 'new').length;

  const totalDepositsSum = (db.depositTransactions || [])
    .filter(t => t.status === 'completed' && t.amount > 0)
    .reduce((acc, t) => acc + t.amount, 0);

  const pendingDepositsCount = (db.depositTransactions || []).filter(t => t.status === 'pending').length;
  const totalStudentBalances = db.users
    .filter(u => u.role === 'student')
    .reduce((acc, u) => acc + (u.balance || 0), 0);

  const rootRef = useRef<HTMLDivElement | null>(null);
  useScrollFx(rootRef);

  return (
    <div ref={rootRef} className="space-y-8">
      {/* ---------------------------------------------------------------- */}
      {/* HEADER                                                            */}
      {/* ---------------------------------------------------------------- */}
      <Reveal>
        <section className="relative overflow-hidden rounded-[2rem] border border-line/70 bg-paper-raised/70 px-5 py-6 shadow-[0_24px_48px_-24px_rgba(18,16,14,0.16)] backdrop-blur-xl sm:px-8 sm:py-8 dark:border-white/10 dark:bg-white/[0.035]">
          {/* ambient washes */}
          <div className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full bg-gradient-to-br from-sun-400/35 via-ember-500/20 to-transparent soft-blob" />
          <div className="pointer-events-none absolute -bottom-32 left-1/3 h-64 w-64 rounded-full bg-gradient-to-tr from-ember-300/25 to-transparent soft-blob" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent dark:via-white/15" />

          <div className="relative flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-line/80 bg-white/70 px-3.5 py-1.5 text-[10.5px] font-bold uppercase tracking-[0.16em] text-ink-muted backdrop-blur-md dark:border-white/10 dark:bg-white/[0.05] dark:text-stone-400">
                <Sparkles className="h-3.5 w-3.5 text-ember-600" />
                Platforma Boshqaruv Markazi
              </span>

              <h1 className="mt-4 font-display text-[clamp(1.75rem,3.6vw,2.5rem)] font-extrabold leading-[1.03] tracking-[-0.04em] text-ink text-balance dark:text-white">
                Xush kelibsiz, {db.teacherProfile?.name || 'ustoz'}{' '}
                <span className="text-ember-gradient-static">ustoz!</span>
              </h1>

              <p className="mt-3 text-[13.5px] leading-relaxed text-ink-muted dark:text-stone-400">
                Barcha o‘quvchilar, Telegram bot depozitlari, hamyon hisoblari, yangi kurslar, testlar, reyting va sayt
                ko‘rinishini shu yerdan to‘liq boshqaring.
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11.5px] font-medium text-ink-muted dark:text-stone-400">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  {activeVIPs} nafar VIP faol
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-ember-500" />
                  {totalLessons} ta video dars
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-ink/40 dark:bg-white/40" />
                  {totalTests} ta test · {totalResults} ta natija
                </span>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2.5 lg:max-w-[300px] lg:justify-end">
              <Button
                variant="ember"
                size="md"
                onClick={() => onNavigateTab('global_analytics')}
                iconLeft={<TrendingUp className="h-4 w-4" />}
                title="Global Analitika, Sotuvlar va AI Performance Report"
              >
                Global Analitika
              </Button>
              <Button
                variant="glass"
                size="md"
                iconLeft={<Zap className="h-4 w-4 text-ember-600" />}
                title="AI xizmati holati (kalit GEMINI_API_KEY orqali)"
              >
                AI Dvigateli
                <span className="ml-0.5 rounded-full bg-ember-500/12 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ember-700 dark:bg-ember-500/15 dark:text-ember-300">
                  GEMINI
                </span>
              </Button>
              <Button
                variant="outline"
                size="md"
                onClick={() => onNavigateTab('deposits')}
                iconLeft={<Wallet className="h-4 w-4" />}
              >
                Moliya & Depozitlar
              </Button>
              <Button
                variant="outline"
                size="md"
                onClick={() => onNavigateTab('site_builder')}
                iconLeft={<Layers className="h-4 w-4" />}
              >
                Sayt Konstruktori
              </Button>
            </div>
          </div>
        </section>
      </Reveal>

      <OwnerToday onNavigateTab={onNavigateTab} />

      {/* ---------------------------------------------------------------- */}
      {/* KPI GRID                                                          */}
      {/* ---------------------------------------------------------------- */}
      <Reveal delay={80}>
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Glass
            level={1}
            radius="rounded-[1.5rem]"
            sheen
            onClick={() => onNavigateTab('deposits')}
            className="group cursor-pointer p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_28px_56px_-24px_rgba(18,16,14,0.24)]"
          >
            <div className="flex items-start justify-between">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-ember-500/10 text-ember-600 dark:bg-ember-500/15 dark:text-ember-400">
                <Wallet className="h-[18px] w-[18px]" />
              </span>
              <ArrowUpRight className="h-4 w-4 text-ink-muted/40 transition-colors group-hover:text-ember-600" />
            </div>
            <div className="mt-5 font-display text-[clamp(1.35rem,2.2vw,1.7rem)] font-extrabold leading-none tracking-[-0.03em] text-ink tabular-nums dark:text-white">
              <Counter value={totalDepositsSum} />
              <span className="ml-1 text-[12px] font-semibold text-ink-muted dark:text-stone-400">so‘m</span>
            </div>
            <div className="mt-2 text-[11.5px] font-semibold uppercase tracking-[0.1em] text-ink-muted dark:text-stone-400">
              Telegram Bot Depozitlari
            </div>
            <div className="mt-3 border-t border-line/70 pt-2.5 text-[11px] dark:border-white/5">
              {pendingDepositsCount > 0 ? (
                <span className="inline-flex items-center gap-1.5 font-bold text-ember-700 dark:text-ember-300">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ember-500" />
                  {pendingDepositsCount} ta kutilayotgan so‘rov
                </span>
              ) : (
                <span className="text-ink-muted dark:text-stone-400">Barcha depozitlar tasdiqlangan</span>
              )}
            </div>
          </Glass>

          <Glass
            level={1}
            radius="rounded-[1.5rem]"
            sheen
            onClick={() => onNavigateTab('students')}
            className="group cursor-pointer p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_28px_56px_-24px_rgba(18,16,14,0.24)]"
          >
            <div className="flex items-start justify-between">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink/[0.05] text-ink dark:bg-white/10 dark:text-white">
                <Users className="h-[18px] w-[18px]" />
              </span>
              <ArrowUpRight className="h-4 w-4 text-ink-muted/40 transition-colors group-hover:text-ember-600" />
            </div>
            <div className="mt-5 font-display text-[clamp(1.35rem,2.2vw,1.7rem)] font-extrabold leading-none tracking-[-0.03em] text-ink tabular-nums dark:text-white">
              <Counter value={totalStudents} />
              <span className="ml-1 text-[12px] font-semibold text-ink-muted dark:text-stone-400">nafar</span>
            </div>
            <div className="mt-2 text-[11.5px] font-semibold uppercase tracking-[0.1em] text-ink-muted dark:text-stone-400">
              Jami O‘quvchilar
            </div>
            <div className="mt-3 border-t border-line/70 pt-2.5 text-[11px] text-ink-muted dark:border-white/5 dark:text-stone-400">
              Balans jami:{' '}
              <strong className="font-mono font-bold text-ink dark:text-stone-200">
                {totalStudentBalances.toLocaleString()} so‘m
              </strong>
            </div>
          </Glass>

          <Glass
            level={1}
            radius="rounded-[1.5rem]"
            sheen
            onClick={() => onNavigateTab('courses')}
            className="group cursor-pointer p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_28px_56px_-24px_rgba(18,16,14,0.24)]"
          >
            <div className="flex items-start justify-between">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink/[0.05] text-ink dark:bg-white/10 dark:text-white">
                <PlayCircle className="h-[18px] w-[18px]" />
              </span>
              <ArrowUpRight className="h-4 w-4 text-ink-muted/40 transition-colors group-hover:text-ember-600" />
            </div>
            <div className="mt-5 font-display text-[clamp(1.35rem,2.2vw,1.7rem)] font-extrabold leading-none tracking-[-0.03em] text-ink tabular-nums dark:text-white">
              <Counter value={totalCourses} />
              <span className="ml-1 text-[12px] font-semibold text-ink-muted dark:text-stone-400">ta kurs</span>
            </div>
            <div className="mt-2 text-[11.5px] font-semibold uppercase tracking-[0.1em] text-ink-muted dark:text-stone-400">
              Kurslar va Darslar
            </div>
            <div className="mt-3 border-t border-line/70 pt-2.5 text-[11px] text-ink-muted dark:border-white/5 dark:text-stone-400">
              {totalLessons} ta video dars yuklangan
            </div>
          </Glass>

          <Glass
            level={1}
            radius="rounded-[1.5rem]"
            sheen
            onClick={() => onNavigateTab('tickets')}
            className="group cursor-pointer p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_28px_56px_-24px_rgba(18,16,14,0.24)]"
          >
            <div className="flex items-start justify-between">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-ember-500/10 text-ember-600 dark:bg-ember-500/15 dark:text-ember-400">
                <MessageSquare className="h-[18px] w-[18px]" />
              </span>
              <ArrowUpRight className="h-4 w-4 text-ink-muted/40 transition-colors group-hover:text-ember-600" />
            </div>
            <div className="mt-5 font-display text-[clamp(1.35rem,2.2vw,1.7rem)] font-extrabold leading-none tracking-[-0.03em] text-ink tabular-nums dark:text-white">
              <Counter value={newTickets} />
              <span className="ml-1 text-[12px] font-semibold text-ink-muted dark:text-stone-400">ta yangi</span>
            </div>
            <div className="mt-2 text-[11.5px] font-semibold uppercase tracking-[0.1em] text-ink-muted dark:text-stone-400">
              Yangi Murojaatlar
            </div>
            <div className="mt-3 border-t border-line/70 pt-2.5 text-[11px] text-ink-muted dark:border-white/5 dark:text-stone-400">
              Saytdan yuborilgan savollar
            </div>
          </Glass>
        </section>
      </Reveal>

      {/* ---------------------------------------------------------------- */}
      {/* QUICK ACTIONS + AUDIT                                             */}
      {/* ---------------------------------------------------------------- */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <Reveal delay={120} className="lg:col-span-7">
          <Glass level={1} radius="rounded-[1.75rem]" className="h-full p-5 sm:p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="font-display text-[16px] font-extrabold tracking-[-0.02em] text-ink dark:text-white">
                  Tezkor Boshqaruv Amallari
                </h2>
                <p className="mt-0.5 text-[12px] text-ink-muted dark:text-stone-400">
                  Eng ko‘p ishlatiladigan bo‘limlarga bir bosishda o‘tish
                </p>
              </div>
              <Pill tone="neutral">{QUICK_ACTIONS.length} bo‘lim</Pill>
            </div>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {QUICK_ACTIONS.map(action => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.tab}
                    onClick={() => onNavigateTab(action.tab)}
                    className="group flex items-start gap-3 rounded-2xl border border-line/60 bg-white/40 px-3.5 py-3 text-left transition-all duration-200 hover:-translate-y-px hover:border-ember-500/40 hover:bg-white/70 hover:shadow-[0_12px_28px_-16px_rgba(18,16,14,0.25)] dark:border-white/[0.07] dark:bg-white/[0.03] dark:hover:border-ember-400/30 dark:hover:bg-white/[0.06]"
                  >
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-ember-500/[0.08] text-ember-600 transition-colors group-hover:bg-ember-500 group-hover:text-white dark:bg-white/[0.06] dark:text-ember-400 dark:group-hover:bg-ember-500 dark:group-hover:text-white">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[12.5px] font-bold text-ink dark:text-white">
                        {action.title}
                      </span>
                      <span className="mt-0.5 block truncate text-[11px] text-ink-muted dark:text-stone-400">
                        {action.hint}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </Glass>
        </Reveal>

        <Reveal delay={180} className="lg:col-span-5">
          <Glass level={1} radius="rounded-[1.75rem]" className="flex h-full flex-col p-5 sm:p-6">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-[16px] font-extrabold tracking-[-0.02em] text-ink dark:text-white">
                  So‘nggi Administrator Amallari
                </h2>
                <p className="mt-0.5 text-[12px] text-ink-muted dark:text-stone-400">Audit jurnalidan so‘nggi yozuvlar</p>
              </div>
              <button
                onClick={() => onNavigateTab('audit')}
                className="shrink-0 text-[11.5px] font-bold text-ember-700 transition-colors hover:text-ember-600 dark:text-ember-400 dark:hover:text-ember-300"
              >
                To‘liq jurnal →
              </button>
            </div>

            <div className="flex-1 space-y-2">
              {db.auditLogs.slice(0, 4).map(log => (
                <div
                  key={log.id}
                  className="rounded-xl border border-line/50 bg-white/40 px-3.5 py-2.5 transition-colors hover:bg-white/70 dark:border-white/[0.06] dark:bg-white/[0.025] dark:hover:bg-white/[0.05]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="line-clamp-2 text-[12px] font-semibold leading-snug text-ink dark:text-white">
                      {log.details}
                    </span>
                    <span className="shrink-0 font-mono text-[10px] tabular-nums text-ink-muted/80 dark:text-stone-500">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="mt-1 truncate text-[10px] text-ink-muted dark:text-stone-500">
                    {log.actor} · {log.action} · {log.entity}
                  </div>
                </div>
              ))}
              {db.auditLogs.length === 0 && (
                <p className="py-8 text-center text-[12px] text-ink-muted dark:text-stone-400">
                  Hozircha audit yozuvlari yo‘q.
                </p>
              )}
            </div>
          </Glass>
        </Reveal>
      </div>

    </div>
  );
};
