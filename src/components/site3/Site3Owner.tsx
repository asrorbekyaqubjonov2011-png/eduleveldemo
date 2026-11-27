import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { OwnerDashboard } from './OwnerDashboard';
import { SiteBuilderManager } from './SiteBuilderManager';
import { CoursesManager } from './CoursesManager';
import { ExercisesManager } from './ExercisesManager';
import { TestsManager } from './TestsManager';
import { ThematicPacksManager } from './ThematicPacksManager';
import { LevelTestsManager } from './LevelTestsManager';
import { ResultsManager } from './ResultsManager';
import { StudentsManager } from './StudentsManager';
import { VIPTariffsManager } from './VIPTariffsManager';
import { SupportTicketsManager } from './SupportTicketsManager';
import { AuditLogViewer } from './AuditLogViewer';
import { TeacherProfileManager } from './TeacherProfileManager';
import { ThemeBackgroundManager } from './ThemeBackgroundManager';
import { DepositsFinanceManager } from './DepositsFinanceManager';
import { TelegramBotManager } from './TelegramBotManager';
import { LiveStreamBroadcaster } from './LiveStreamBroadcaster';
import { ShopManager } from './ShopManager';
import { GlobalAnalyticsManager } from './GlobalAnalyticsManager';
import { DigitalBooksManager } from './DigitalBooksManager';
import { ReviewsManager } from './ReviewsManager';
import { FaqManager } from './FaqManager';
import { SeoContentManager } from './SeoContentManager';
import { OwnerSecurityManager } from './OwnerSecurityManager';
import { MessageSquareQuote, HelpCircle, KeyRound, Settings2, Newspaper, Search } from 'lucide-react';
import { OwnerSettingsManager } from './OwnerSettingsManager';
import { OwnerAiSection } from './OwnerAiSection';
import { NewsManager } from './NewsManager';
import {
  LayoutDashboard,
  Layers,
  PenTool,
  PlayCircle,
  Sparkles,
  Award,
  Users,
  CreditCard,
  BookOpen,
  MessageSquare,
  Shield,
  ArrowLeft,
  LogOut,
  Camera,
  Palette,
  Trophy,
  Clock,
  Code2,
  Wallet,
  Zap,
  Radio,
  Coins,
  TrendingUp,
  PanelLeftOpen,
  ChevronDown,
} from 'lucide-react';
import { renderWithAnimatedEmojis } from '../common/AnimatedSticker';
import { cn } from '../ui/styles';
import { OWNER_NAV_LOCKED } from '../../lib/ownerNav';

/**
 * Site3Owner — the control centre.
 *
 * Dark rail on an ivory canvas: identity at the top, grouped destinations,
 * then a status strip pinned to the bottom. The content column is a calm,
 * data-oriented stage with a consistent header per module.
 */
export const Site3Owner: React.FC = () => {
  const { setActiveSite, setIsOwnerAuth, db, refreshDb } = useApp();
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Auto-refresh DB every 4s while in admin panel (preserved)
  React.useEffect(() => {
    refreshDb();
    const interval = setInterval(() => {
      refreshDb();
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const pendingDepositsCount = (db.depositTransactions || []).filter((t) => t.status === 'pending').length;
  const nonOwnerUsersCount = (db.users || []).filter((u) => u.role === 'student' || (u as any).role !== 'owner').length;

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    setMobileNavOpen(false);
    refreshDb();
  };

  const coinOn = db.features?.coinEnabled !== false;
  const navGroups = [
    {
      title: 'Umumiy',
      items: [
        { id: 'dashboard', label: 'Boshqaruv paneli', icon: LayoutDashboard },
        { id: 'ai', label: 'AI', icon: Sparkles },
        { id: 'global_analytics', label: 'Global analitika', icon: TrendingUp },
        { id: 'deposits', label: 'Depozitlar & moliya', icon: Wallet, badge: pendingDepositsCount > 0 ? `${pendingDepositsCount}` : undefined },
        { id: 'telegram_bot', label: 'Telegram bot', icon: Radio },
        { id: 'livestream', label: 'Telegram jonli efir', icon: Radio, badge: db.liveStream?.isLive ? 'LIVE' : undefined },
      ],
    },
    {
      title: "O'quvchilar",
      items: [
        { id: 'students', label: "O'quvchilar & balans", icon: Users, badge: `${nonOwnerUsersCount}` },
        { id: 'shop_manager', label: 'Edu Coin do‘koni', icon: Coins },
      ],
    },
    {
      title: 'Kontent',
      items: [
        { id: 'courses', label: 'Kurslar & darslar', icon: PlayCircle },
        { id: 'digital_books', label: 'Kutubxona', icon: BookOpen },
        { id: 'tests', label: 'Mock testlar', icon: Award },
        { id: 'thematic_packs', label: 'Test paketlari', icon: Layers },
        { id: 'level_tests', label: 'Levelni aniqlash', icon: Award },
        { id: 'exercises', label: 'Mashqlar', icon: PenTool },
        { id: 'results', label: 'Sertifikat natijalari', icon: Award },
        { id: 'vip', label: 'VIP tariflar', icon: CreditCard },
        { id: 'news', label: 'Yangiliklar & VIP sovg‘a', icon: Newspaper },
        { id: 'seo', label: 'SEO sahifalar', icon: Search },
      ],
    },
    {
      title: 'Brend & tizim',
      items: [
        { id: 'theme_bg', label: 'Orqa fon temalari', icon: Palette },
        { id: 'teacher_profile', label: 'Ustoz profili', icon: Camera },
        { id: 'settings', label: 'Sozlamalar', icon: Settings2 },
        { id: 'site_builder', label: 'Sayt konstruktori', icon: Layers },
        { id: 'reviews', label: 'Fikrlar', icon: MessageSquareQuote, badge: (db.reviews || []).filter((r) => r.status === 'pending').length ? `${(db.reviews || []).filter((r) => r.status === 'pending').length}` : undefined },
        { id: 'faq', label: 'Savol-javoblar', icon: HelpCircle },
        { id: 'tickets', label: 'Murojaatlar', icon: MessageSquare },
        { id: 'audit', label: 'Audit jurnali', icon: Shield },
        { id: 'security', label: 'Login & parol', icon: KeyRound },
      ],
    },
  ];
  // The owner chooses which sections show and what they are called (Sozlamalar → Owner paneli bo‘limlari).
  const hiddenOwnerNav = new Set<string>(db.features?.ownerNavHidden || []);
  const ownerNavNames = db.features?.ownerNavLabels || {};
  const visibleNavGroups = navGroups
    .map((g) => ({
      ...g,
      items: g.items
        .filter((it) => !hiddenOwnerNav.has(it.id) || OWNER_NAV_LOCKED.includes(it.id))
        .map((it) => ({ ...it, label: ownerNavNames[it.id]?.trim() || it.label }))
    }))
    .filter((g) => g.items.length > 0);

  const handleLogout = () => {
    setIsOwnerAuth(false);
    setActiveSite('site1_open');
  };

  const currentLabel =
    navGroups.flatMap((g) => g.items).find((i) => i.id === activeTab)?.label || 'Boshqaruv paneli';

  /* ------------------------------------------------------------------ */
  /* Rail                                                                */
  /* ------------------------------------------------------------------ */
  const Rail = (
    <div className="flex h-full flex-col">
      {/* Identity */}
      <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.06] p-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-ember-400 to-ember-700 text-[12px] font-black text-white">
            {(db.teacherProfile?.name || 'EL').slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="truncate text-[12.5px] font-bold text-white">{db.teacherProfile?.name || 'Edu Level'}</div>
            <div className="mt-0.5 flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.1em] text-ember-300">
              <Shield className="h-2.5 w-2.5" />
              Super admin
            </div>
          </div>
        </div>

        <div
          className="mt-3 flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] px-2.5 py-2 text-left transition-colors hover:bg-white/[0.09]"
        >
          <span className="flex items-center gap-1.5 text-[11px] font-semibold text-white/80">
            <Zap className="h-3.5 w-3.5 text-ember-300" />
            Universal AI
          </span>
          <span className="rounded bg-ember-400 px-1.5 py-0.5 text-[8.5px] font-black uppercase text-[#241a10]">
            Gemini
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="mt-4 flex-1 space-y-4 overflow-y-auto pb-3 no-scrollbar">
        {visibleNavGroups.map((group) => (
          <div key={group.title}>
            <div className="mb-1.5 px-2 text-[9px] font-bold uppercase tracking-[0.16em] text-white/25">
              {group.title}
            </div>
            <div className="space-y-0.5">
              {group.items.filter((item) => item.id !== 'shop_manager' || coinOn).map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleTabChange(item.id)}
                    className={cn(
                      'flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-all',
                      isActive
                        ? 'bg-gradient-to-b from-[#ffa149] to-[#f2650f] text-white shadow-[0_10px_24px_-10px_rgba(242,101,15,0.85)]'
                        : 'text-white/55 hover:bg-white/[0.07] hover:text-white'
                    )}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={isActive ? 2.3 : 1.9} />
                    <span className="flex-1 truncate text-[12px] font-semibold">
                      {renderWithAnimatedEmojis(item.label)}
                    </span>
                    {item.badge ? (
                      <span
                        className={cn(
                          'rounded px-1.5 py-0.5 text-[8.5px] font-black uppercase tracking-wide',
                          isActive ? 'bg-[#12100e] text-white' : 'bg-white/10 text-white/70'
                        )}
                      >
                        {item.badge}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer actions */}
      <div className="space-y-0.5 border-t border-white/10 pt-3">
        <button
          onClick={() => setActiveSite('site1_open')}
          className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-[12px] font-medium text-white/55 transition-colors hover:bg-white/[0.07] hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Ochiq sayt
        </button>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-[12px] font-semibold text-rose-300 transition-colors hover:bg-rose-500/10"
        >
          <LogOut className="h-3.5 w-3.5" />
          Chiqish
        </button>
      </div>
    </div>
  );

  return (
    <div className="app-theme relative flex min-h-[calc(100vh-80px)] bg-transparent">
      {/* Desktop rail — dark, always-on identity for "control centre" */}
      <aside className="sticky top-[82px] hidden h-[calc(100vh-96px)] w-[244px] shrink-0 self-start px-3 pb-3 lg:block">
        <div className="flex h-full flex-col rounded-[1.5rem] bg-[#151311] p-2.5 shadow-[0_30px_60px_-30px_rgba(0,0,0,0.8)] ring-1 ring-white/[0.06]">
          {Rail}
        </div>
      </aside>

      {/* Mobile rail */}
      <div className={cn('fixed inset-0 z-[80] lg:hidden', mobileNavOpen ? 'pointer-events-auto' : 'pointer-events-none')}>
        <div
          onClick={() => setMobileNavOpen(false)}
          className={cn('absolute inset-0 bg-ink/45 backdrop-blur-sm transition-opacity', mobileNavOpen ? 'opacity-100' : 'opacity-0')}
        />
        <div
          className={cn(
            'absolute left-0 top-0 h-full w-[280px] bg-[#151311] p-3 transition-transform duration-400',
            mobileNavOpen ? 'translate-x-0' : '-translate-x-full'
          )}
          style={{ transitionTimingFunction: 'cubic-bezier(0.22,1,0.36,1)' }}
        >
          {Rail}
        </div>
      </div>

      {/* Content */}
      <main className="min-w-0 flex-1 px-4 pb-16 pt-4 sm:px-6 lg:px-8">
        <div className="mb-4 flex items-center gap-2 lg:hidden">
          <button
            onClick={() => setMobileNavOpen(true)}
            className="glass-1 flex h-9 items-center gap-2 rounded-full px-3.5 text-[12.5px] font-semibold text-ink dark:text-white"
          >
            <PanelLeftOpen className="h-3.5 w-3.5" />
            {currentLabel}
            <ChevronDown className="h-3 w-3 opacity-50" />
          </button>
        </div>

        <div key={activeTab} className="mx-auto max-w-6xl animate-section">
          {activeTab === 'dashboard' && <OwnerDashboard onNavigateTab={setActiveTab} />}
          {activeTab === 'global_analytics' && <GlobalAnalyticsManager />}
          {activeTab === 'deposits' && <DepositsFinanceManager />}
          {activeTab === 'telegram_bot' && <TelegramBotManager />}
          {activeTab === 'livestream' && <LiveStreamBroadcaster />}
          {activeTab === 'teacher_profile' && <TeacherProfileManager />}
          {activeTab === 'theme_bg' && <ThemeBackgroundManager />}
          {activeTab === 'ai' && <OwnerAiSection />}
          {activeTab === 'exercises' && <ExercisesManager />}
          {activeTab === 'settings' && <OwnerSettingsManager />}
          {activeTab === 'students' && <StudentsManager />}
          {activeTab === 'shop_manager' && <ShopManager />}
          {activeTab === 'results' && <ResultsManager />}
          {activeTab === 'courses' && <CoursesManager />}
          {activeTab === 'digital_books' && <DigitalBooksManager />}
          {activeTab === 'tests' && <TestsManager />}
          {activeTab === 'thematic_packs' && <ThematicPacksManager />}
          {activeTab === 'level_tests' && <LevelTestsManager />}
          {activeTab === 'site_builder' && <SiteBuilderManager />}
          {activeTab === 'vip' && <VIPTariffsManager />}
          {activeTab === 'news' && <NewsManager />}
          {activeTab === 'tickets' && <SupportTicketsManager />}
          {activeTab === 'audit' && <AuditLogViewer />}
          {activeTab === 'reviews' && <ReviewsManager />}
          {activeTab === 'faq' && <FaqManager />}
          {activeTab === 'seo' && <SeoContentManager />}
          {activeTab === 'security' && <OwnerSecurityManager />}
        </div>
      </main>

    </div>
  );
};
