import { EmptyState } from '../ui/EmptyState';
import React, { useEffect, useState } from 'react';
import { ReviewComposer } from './ReviewComposer';
import { peekPendingPlan } from '../../lib/vipHandoff';
import { useApp } from '../../context/AppContext';
import { StudentDashboard } from './StudentDashboard';
import { CoursePlayerView } from './CoursePlayerView';
import { MockExamPlayer } from './MockExamPlayer';
import { ExercisesView } from './ExercisesView';
import { AiStudioHub } from './AiStudioHub';
import { SmartTranslatorFlashcards } from './SmartTranslatorFlashcards';
import { DigitalLibraryView } from './DigitalLibraryView';
import { StudentSubscriptionsView } from './StudentSubscriptionsView';
import { StudentProfileView } from './StudentProfileView';
import { StudentLeaderboardView } from './StudentLeaderboardView';
import { ProgressView } from './ProgressView';
import { ThematicQuizPacksView } from './ThematicQuizPacksView';
import { LevelTestsView } from './LevelTestsView';
import { StudentCoinShop } from './StudentCoinShop';
import {
  LayoutDashboard,
  PlayCircle,
  Award,
  Sparkles,
  History,
  CreditCard,
  User,
  ArrowLeft,
  ShieldCheck,
  Trophy,
  Code2,
  Wallet,
  LogOut,
  BookOpen,
  PenTool,
  Mic,
  MessageSquare,
  BarChart2,
  Layers,
  Swords,
  Headphones,
  ShoppingBag,
  Target,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronDown,
  Search,
} from 'lucide-react';
import { renderWithAnimatedEmojis } from '../common/AnimatedSticker';
import { cn } from '../ui/styles';

/**
 * Site2LMS — student workspace shell.
 *
 * A calm left rail with grouped destinations (Primary / Examinations / AI &
 * Library / Community / Account), a persistent identity card, and a content
 * column that breathes. The rail collapses to an icon bar on desktop and
 * becomes a slide-over drawer on mobile.
 */
export const Site2LMS: React.FC = () => {
  const {
    db,
    currentUser,
    activeCourseId,
    setActiveCourseId,
    activeTestId,
    setActiveTestId,
    setActiveSite,
    updateStudentProfile,
    logout,
  } = useApp();

  const userTrack = currentUser?.track || 'cefr';
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [mashqSkill, setMashqSkill] = useState<'reading' | 'listening' | 'speaking' | 'writing'>('reading');
  // Each section (and a launched exam) opens at the top of the page.
  useEffect(() => {
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'auto' });
  }, [activeTab, activeTestId]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    main: true,
    exam: true,
    ai: true,
    community: true,
    account: true,
  });

  const coinOn = db.features?.coinEnabled !== false;
  const navCategories = [
    {
      key: 'main',
      title: 'Asosiy',
      items: [
        { id: 'dashboard', label: 'Boshqaruv paneli', icon: LayoutDashboard },
        { id: 'progress', label: 'Mening progressim', icon: BarChart2 },
        { id: 'courses', label: 'Video darslar', icon: PlayCircle },
      ],
    },
    {
      key: 'exam',
      title: 'Imtihonlar',
      items: [
        { id: 'mashqlar', label: 'Mashqlar', icon: PenTool },
        { id: 'tests', label: 'Mock imtihonlar', icon: Award },
        { id: 'thematic_packs', label: 'Test paketlari', icon: Layers },
        { id: 'level_tests', label: 'Levelni aniqlash', icon: Award },
      ],
    },
    {
      key: 'ai',
      title: 'AI va kutubxona',
      items: [
        { id: 'ai_studio', label: 'AI', icon: Sparkles },
        { id: 'library', label: 'Raqamli kutubxona', icon: BookOpen },
      ],
    },
    {
      key: 'account',
      title: 'Hisob',
      items: [
        { id: 'profile', label: 'Shaxsiy profil', icon: User },
        { id: 'vip', label: 'VIP tariflar', icon: CreditCard },
        { id: 'leaderboard', label: 'Reyting', icon: Trophy },
        { id: 'coin_shop', label: 'Edu Coin do‘koni', icon: ShoppingBag },
      ],
    },
  ];

  // Menu items the owner switched off in Sozlamalar. The profile is always available.
  const hiddenNav = new Set<string>(db.features?.navHidden || []);
  if (db.features?.aiEnabled === false) hiddenNav.add('ai_studio');
  const visibleCategories = navCategories
    .map((c) => ({ ...c, items: c.items.filter((i) => i.id === 'profile' || !hiddenNav.has(i.id)) }))
    .filter((c) => c.items.length > 0);

  const activeLabel =
    navCategories.flatMap((c) => c.items).find((i) => i.id === activeTab)?.label || 'Kabinet';

  // A plan chosen on the landing page opens the subscriptions tab right after sign-in.
  useEffect(() => {
    if (peekPendingPlan()) setActiveTab('vip');
  }, []);

  // If activeTestId is set, launch MockExamPlayer full-width
  if (activeTestId) {
    return (
      <div className="app-theme min-h-screen bg-transparent px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <MockExamPlayer testId={activeTestId} onClose={() => setActiveTestId(null)} />
        </div>
      </div>
    );
  }

  // Old skill tabs (reading, listening, writing, speaking) now live inside Mashqlar.
  const goTab = (id: string) => {
    setActiveCourseId(null);
    if (id === 'reading' || id === 'listening' || id === 'writing' || id === 'speaking') {
      setMashqSkill(id);
      setActiveTab('mashqlar');
    } else {
      setActiveTab(id === 'progress_insight' ? 'progress' : id);
    }
    setMobileNavOpen(false);
  };

  /* ------------------------------------------------------------------ */
  /* Rail                                                                */
  /* ------------------------------------------------------------------ */
  const Rail = (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Identity card */}
      {!isSidebarCollapsed ? (
        <div className="glass-1 rounded-2xl p-3">
          <button onClick={() => goTab('profile')} className="flex w-full items-center gap-3 rounded-xl text-left" aria-label="Profilni ochish">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-ember-400 to-ember-700 text-[13px] font-black text-white shadow-[0_8px_18px_-8px_rgba(239,108,18,0.8)]">
              {currentUser?.name?.slice(0, 2).toUpperCase() || 'EL'}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-bold text-ink dark:text-white">
                {currentUser?.name} {currentUser?.surname}
              </span>
              <span className="mt-0.5 block truncate text-[11px] font-semibold text-ember-600 dark:text-ember-400">
                {currentUser?.vipTier && currentUser.vipTier !== 'none' && currentUser.vipTier !== 'free'
                  ? `VIP ${String(currentUser.vipTier).toUpperCase()}`
                  : 'Oddiy tarif'}
                {' · '}
                {userTrack === 'cefr' ? 'CEFR' : userTrack === 'general' ? 'General' : 'IELTS'}
              </span>
            </span>
          </button>

          <div className="mt-2.5 grid grid-cols-2 gap-1.5">
            <button onClick={() => goTab('profile')} className="rounded-xl bg-emerald-500/10 px-2.5 py-1.5 text-left transition-colors hover:bg-emerald-500/15" title="Hisob va depozit">
              <span className="block text-[9px] font-semibold uppercase tracking-wider text-ink-muted dark:text-stone-400">Hisob</span>
              <span className="block truncate font-mono text-[12px] font-bold tabular-nums text-emerald-700 dark:text-emerald-400">{(currentUser?.balance || 0).toLocaleString('en-US')}</span>
            </button>
            {coinOn && <button onClick={() => goTab('coin_shop')} className="rounded-xl bg-amber-500/10 px-2.5 py-1.5 text-left transition-colors hover:bg-amber-500/15" title="Edu Coin do‘koni">
              <span className="block text-[9px] font-semibold uppercase tracking-wider text-ink-muted dark:text-stone-400">Coin</span>
              <span className="block truncate font-mono text-[12px] font-bold tabular-nums text-amber-700 dark:text-amber-400">{currentUser?.coins ?? 0}</span>
            </button>}
          </div>
        </div>
      ) : (
        <div className="mb-3 flex flex-col items-center gap-2">
          <button
            onClick={() => goTab('profile')}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-ember-400 to-ember-700 text-[11px] font-black text-white"
            title={currentUser?.name}
          >
            {currentUser?.name?.slice(0, 2).toUpperCase() || 'EL'}
          </button>
        </div>
      )}

      {/* Nav groups */}
      <nav className="mt-4 min-h-0 flex-1 space-y-3 overflow-y-auto pb-3 no-scrollbar">
        {visibleCategories.map((cat) => {
          const open = openGroups[cat.key] ?? true;
          return (
            <div key={cat.key}>
              {!isSidebarCollapsed ? (
                <button
                  onClick={() => setOpenGroups((g) => ({ ...g, [cat.key]: !open }))}
                  className="mb-1 flex w-full items-center justify-between px-2 text-[9.5px] font-bold uppercase tracking-[0.14em] text-ink-muted/70 dark:text-stone-500"
                >
                  {cat.title}
                  <ChevronDown className={cn('h-3 w-3 transition-transform', !open && '-rotate-90')} />
                </button>
              ) : (
                <div className="mx-auto mb-1 h-px w-6 bg-line dark:bg-white/10" />
              )}

              {open && (
                <div className="space-y-0.5">
                  {cat.items.filter((item) => item.id !== 'coin_shop' || coinOn).map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id && !activeCourseId;
                    return (
                      <button
                        key={item.id}
                        onClick={() => goTab(item.id)}
                        title={isSidebarCollapsed ? item.label : undefined}
                        className={cn(
                          'group relative flex w-full items-center rounded-xl transition-all',
                          isSidebarCollapsed ? 'justify-center p-2.5' : 'gap-2.5 px-2.5 py-2',
                          isActive
                            ? 'bg-gradient-to-b from-[#ffa149] to-[#f2650f] text-white shadow-[0_10px_24px_-10px_rgba(242,101,15,0.85)]'
                            : 'text-ink-muted hover:bg-ink/[0.045] hover:text-ink dark:text-stone-400 dark:hover:bg-white/[0.06] dark:hover:text-white'
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" strokeWidth={isActive ? 2.2 : 1.9} />
                        {!isSidebarCollapsed && (
                          <span className="truncate text-[12.5px] font-semibold">
                            {renderWithAnimatedEmojis(item.label)}
                          </span>
                        )}
                        {isSidebarCollapsed && (
                          <span className="pointer-events-none absolute left-full z-50 ml-2 whitespace-nowrap rounded-lg bg-ink px-2.5 py-1.5 text-[11px] font-semibold text-white opacity-0 shadow-xl transition-opacity group-hover:opacity-100 dark:bg-white dark:text-ink">
                            {item.label}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer actions */}
      <div className="space-y-0.5 border-t border-line/70 pt-3 dark:border-white/10">
        <button
          onClick={() => setActiveSite('site1_open')}
          className={cn(
            'flex w-full items-center rounded-xl text-[12px] font-medium text-ink-muted transition-colors hover:bg-ink/[0.045] hover:text-ink dark:text-stone-400 dark:hover:bg-white/[0.06] dark:hover:text-white',
            isSidebarCollapsed ? 'justify-center p-2.5' : 'gap-2 px-2.5 py-2'
          )}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {!isSidebarCollapsed && <span>Ochiq sayt</span>}
        </button>
        <button
          onClick={logout}
          className={cn(
            'flex w-full items-center rounded-xl text-[12px] font-semibold text-rose-600 transition-colors hover:bg-rose-500/[0.08] dark:text-rose-400',
            isSidebarCollapsed ? 'justify-center p-2.5' : 'gap-2 px-2.5 py-2'
          )}
        >
          <LogOut className="h-3.5 w-3.5" />
          {!isSidebarCollapsed && <span>Chiqish</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="app-theme relative flex min-h-[calc(100vh-80px)] bg-transparent text-ink transition-colors dark:text-stone-100">
      {/* Desktop rail */}
      <aside
        className={cn(
          'sticky top-[82px] hidden h-[calc(100vh-96px)] shrink-0 flex-col self-start px-3 pb-3 lg:flex',
          isSidebarCollapsed ? 'w-[76px]' : 'w-[248px]'
        )}
      >
        <div className="glass-2 no-scrollbar flex h-full flex-col overflow-y-auto rounded-[1.5rem] p-2.5">
          <div className="mb-2 flex items-center justify-end">
            <button
              onClick={() => setIsSidebarCollapsed((v) => !v)}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-ink/[0.06] hover:text-ink dark:text-stone-400 dark:hover:bg-white/10 hover:dark:text-white"
              title={isSidebarCollapsed ? 'Menyuni ochish' : 'Menyuni yig‘ish'}
            >
              {isSidebarCollapsed ? <PanelLeftOpen className="h-3.5 w-3.5" /> : <PanelLeftClose className="h-3.5 w-3.5" />}
            </button>
          </div>
          {Rail}
        </div>
      </aside>

      {/* Mobile drawer */}
      <div
        className={cn(
          'fixed inset-0 z-[80] lg:hidden',
          mobileNavOpen ? 'pointer-events-auto' : 'pointer-events-none'
        )}
      >
        <div
          onClick={() => setMobileNavOpen(false)}
          className={cn(
            'absolute inset-0 bg-ink/40 backdrop-blur-sm transition-opacity duration-300',
            mobileNavOpen ? 'opacity-100' : 'opacity-0'
          )}
        />
        <div
          className={cn(
            'absolute left-0 top-0 h-full w-[286px] bg-paper p-3 shadow-2xl transition-transform duration-400 dark:bg-[#171512]',
            mobileNavOpen ? 'translate-x-0' : '-translate-x-full'
          )}
          style={{ transitionTimingFunction: 'cubic-bezier(0.22,1,0.36,1)' }}
        >
          {Rail}
        </div>
      </div>

      {/* Content column */}
      <main className="min-w-0 flex-1 px-4 pb-16 pt-4 sm:px-6 lg:px-8">
        {/* Mobile top bar */}
        <div className="mb-4 flex items-center gap-2 lg:hidden">
          <button
            onClick={() => setMobileNavOpen(true)}
            className="glass-1 flex h-9 items-center gap-2 rounded-full px-3.5 text-[12.5px] font-semibold text-ink dark:text-white"
          >
            <PanelLeftOpen className="h-3.5 w-3.5" />
            {activeLabel}
          </button>
        </div>

        <div key={activeCourseId ? `course-${activeCourseId}` : activeTab} className="mx-auto max-w-6xl animate-section">
          {activeCourseId ? (
            <CoursePlayerView
              courseId={activeCourseId}
              onBack={() => setActiveCourseId(null)}
              onOpenTest={(tId) => setActiveTestId(tId)}
            />
          ) : activeTab === 'dashboard' ? (
            <div className="space-y-8">
              <StudentDashboard
                onNavigateTab={(tab) => goTab(tab)}
                onOpenCourse={(cId) => setActiveCourseId(cId)}
                onOpenTest={(tId) => setActiveTestId(tId)}
              />
              <ReviewComposer />
            </div>
          ) : activeTab === 'coin_shop' ? (
            <StudentCoinShop />
          ) : activeTab === 'progress' ? (
            <ProgressView onNavigateTab={(tab) => goTab(tab)} />
          ) : activeTab === 'mashqlar' ? (
            <ExercisesView key={mashqSkill} initialSkill={mashqSkill} />
          ) : activeTab === 'level_tests' ? (
            <LevelTestsView />
          ) : activeTab === 'thematic_packs' ? (
            <ThematicQuizPacksView />
          ) : activeTab === 'ai_studio' ? (
            <AiStudioHub />
          ) : activeTab === 'translator' ? (
            <SmartTranslatorFlashcards />
          ) : activeTab === 'library' ? (
            <DigitalLibraryView />
          ) : activeTab === 'courses' ? (
            <div className="space-y-6">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <span className="inline-flex rounded-full border border-ember-500/25 bg-ember-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-ember-700 dark:text-ember-400">
                    {userTrack} yo'nalishi
                  </span>
                  <h1 className="mt-3 font-display text-[28px] font-extrabold leading-tight tracking-[-0.03em] text-ink dark:text-white">
                    Video darslar
                  </h1>
                  <p className="mt-1 text-[13.5px] text-ink-muted">
                    Har bir darsni ko'rib, testdan kamida 70% to'plang va navbatdagi darsni oching.
                  </p>
                </div>
              </div>

              {db.courses.filter((c) => c.track === userTrack).length === 0 ? (
                <EmptyState
                  icon={PlayCircle}
                  title="Bu yo‘nalishda video darslar hali yo‘q."
                  text="Ustoz yangi darslarni qo‘shgach, ular shu yerda chiqadi. Shu orada Mashqlar va AI yordamchi bilan mashq qilishingiz mumkin."
                />
              ) : null}

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                {db.courses
                  .filter((c) => c.track === userTrack)
                  .map((course) => (
                    <button
                      key={course.id}
                      onClick={() => setActiveCourseId(course.id)}
                      className="glass-1 group flex flex-col justify-between rounded-[1.5rem] p-5 text-left transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_28px_50px_-26px_rgba(18,16,14,0.35)]"
                    >
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-ember-600 dark:text-ember-400">
                          {course.level}
                        </div>
                        <h3 className="mt-2 font-display text-[16px] font-bold leading-snug tracking-tight text-ink dark:text-white">
                          {course.title}
                        </h3>
                        <p className="mt-2 line-clamp-2 text-[12.5px] leading-relaxed text-ink-muted">
                          {course.description}
                        </p>
                      </div>
                      <div className="mt-5 flex items-center justify-between border-t border-line/70 pt-3.5 dark:border-white/10">
                        <span className="text-[11.5px] font-medium text-ink-muted">{course.lessonsCount} ta dars</span>
                        <span className="text-[12px] font-bold text-ember-600 transition-transform group-hover:translate-x-0.5 dark:text-ember-400">
                          Ochish →
                        </span>
                      </div>
                    </button>
                  ))}
              </div>
            </div>
          ) : activeTab === 'leaderboard' ? (
            <StudentLeaderboardView />
          ) : activeTab === 'tests' ? (
            <div className="space-y-6">
              <div>
                <span className="inline-flex rounded-full border border-ember-500/25 bg-ember-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-ember-700 dark:text-ember-400">
                  {userTrack} mock imtihonlar
                </span>
                <h1 className="mt-3 font-display text-[28px] font-extrabold leading-tight tracking-[-0.03em] text-ink dark:text-white">
                  To'liq imtihon simulyatsiyalari
                </h1>
                <p className="mt-1 text-[13.5px] text-ink-muted">
                  Rasmiy standartlar va vaqt cheklovi bo'yicha to'liq sinov.
                </p>
              </div>

              {db.tests.filter((t) => t.track === userTrack).length === 0 ? (
                <EmptyState
                  icon={Award}
                  title="Bu yo‘nalishda mock imtihonlar hali yo‘q."
                  text="Ustoz imtihonlarni e’lon qilgach, ular shu yerda chiqadi. Shu orada Mashqlar bo‘limida mashq qilib turing."
                />
              ) : null}

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                {db.tests
                  .filter((t) => t.track === userTrack)
                  .map((test) => (
                    <div key={test.id} className="glass-1 flex flex-col justify-between rounded-[1.5rem] p-5">
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-ember-600 dark:text-ember-400">
                          {test.type === 'mock'
                            ? `${userTrack} mock`
                            : test.type === 'diagnostic'
                            ? 'Diagnostik test'
                            : 'Quiz'}
                        </div>
                        <h3 className="mt-2 font-display text-[16px] font-bold leading-snug tracking-tight text-ink dark:text-white">
                          {test.title}
                        </h3>
                        <p className="mt-2 text-[12.5px] leading-relaxed text-ink-muted">{test.description}</p>
                        {(() => {
                          const mine = (db.testAttempts || []).filter((a) => a.testId === test.id && a.userId === currentUser?.id);
                          if (!mine.length) return null;
                          const best = Math.max(...mine.map((a) => Math.round((a.score / (a.maxScore || 1)) * 100)));
                          return <span className="mt-3 inline-flex rounded-full bg-emerald-500/12 px-2.5 py-1 text-[11.5px] font-bold text-emerald-700 dark:text-emerald-300">✓ Topshirilgan · eng yaxshi natija {best}% · {mine.length} marta</span>;
                        })()}
                      </div>
                      <div className="mt-5 flex items-center justify-between border-t border-line/70 pt-3.5 dark:border-white/10">
                        <span className="text-[11.5px] font-medium text-ink-muted">
                          {test.durationMinutes} daqiqa · maks {test.maxScore} ball
                        </span>
                        <button
                          onClick={() => setActiveTestId(test.id)}
                          className="h-9 rounded-full bg-ink px-4 text-[12px] font-bold text-white transition-opacity hover:opacity-90 dark:bg-white dark:text-ink"
                        >
                          {(db.testAttempts || []).some((a) => a.testId === test.id && a.userId === currentUser?.id) ? 'Qayta topshirish →' : 'Boshlash →'}
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ) : activeTab === 'vip' ? (
            <StudentSubscriptionsView />
          ) : (
            <StudentProfileView onNavigateTab={(tab) => goTab(tab)} />
          )}
        </div>
      </main>
    </div>
  );
};
