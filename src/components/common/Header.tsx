import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { subscribeScroll } from '../../lib/motion/scrollEngine';
import { prefersReducedMotion } from '../../lib/motion';
import {
  Sun,
  Moon,
  Globe,
  LogOut,
  ShieldCheck,
  User as UserIcon,
  Check,
  ChevronDown,
  Search,
  Sparkles,
  Menu,
  X,
} from 'lucide-react';
import { Language } from '../../types';
import { EduLevelLogo } from './EduLevelLogo';
import { cn } from '../ui/styles';

interface HeaderProps {
  onOpenAuthModal: (mode: 'login' | 'register' | 'creator') => void;
  onOpenOwnerModal?: () => void;
  onOpenCommandPalette?: () => void;
  /** 'floating' = transparent glass bar over the cinematic hero */
  variant?: 'floating' | 'solid';
}

interface NavLink {
  label: string;
  target?: string;
  onClick?: () => void;
  children?: { label: string; description?: string; target?: string; onClick?: () => void }[];
}

export const Header: React.FC<HeaderProps> = ({
  onOpenAuthModal,
  onOpenOwnerModal,
  onOpenCommandPalette,
  variant = 'solid',
}) => {
  const {
    db,
    activeSite,
    setActiveSite,
    currentUser,
    isOwnerAuth,
    theme,
    toggleTheme,
    language,
    setLanguage,
    logout,
    t,
  } = useApp();

  const [showLangMenu, setShowLangMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const mobileMenuButton = useRef<HTMLButtonElement>(null);
  const clickCountRef = useRef(0);
  const lastClickTimeRef = useRef(0);

  const languages: { code: Language; label: string; sub: string; flag: string }[] = [
    { code: 'uz', label: "O'zbekcha", sub: 'Lotin', flag: '🇺🇿' },
    { code: 'uz_cyrl', label: 'Ўзбекча', sub: 'Кирилл', flag: '🇺🇿' },
    { code: 'en', label: 'English', sub: 'Global', flag: '🇬🇧' },
  ];

  /* Scroll state — bar gains its glass body once the page moves */
  const [activeNav, setActiveNav] = useState('Bosh sahifa');
  React.useEffect(() => {
    // Section id → the nav label that lights up while that section is on screen (labels must match navLinksAll).
    const SECTION_TO_NAV: [string, string][] = [
      ['top', 'Bosh sahifa'],
      ['news', 'Yangiliklar'],
      ['books', 'Kitoblar'],
      ['results', 'Natijalar'],
      ['testimonials', 'Fikrlar'],
      ['vip', 'VIP'],
      ['teacher-bio', 'Ustoz'],
      ['faq', 'Savollar']
    ];
    // Section tops are measured (a layout read) only when they can have moved: on mount, on resize, when the
    // page's size changes, and for a section that was not on the page yet. Each scroll frame then reads no layout.
    const tops: { label: string; id: string; docTop: number | null }[] =SECTION_TO_NAV.map(([id, label]) => ({ label, id, docTop: null }));
    let vw = -1;
    let vh = -1;
    let dirty = true;
    const measureAll = () => {
      vw = window.innerWidth;
      vh = window.innerHeight;
      dirty = false;
      for (const t of tops) {
        const el = document.getElementById(t.id);
        t.docTop = el ? el.getBoundingClientRect().top + window.scrollY : null;
      }
    };
    const sizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => (dirty = true)) : null;
    sizeObserver?.observe(document.body);
    const unsubscribe = subscribeScroll({
      read: (f) => {
        if (dirty || f.vh !== vh || window.innerWidth !== vw) measureAll();
        // A section that was not on the page yet: find it now (no layout read until it is there).
        for (const t of tops) if (t.docTop === null) {
          const el = document.getElementById(t.id);
          if (el) t.docTop = el.getBoundingClientRect().top + window.scrollY;
        }
      },
      write: (f) => {
        setScrolled(f.y > 16);
        let current = 'Bosh sahifa';
        let best = -Infinity;
        for (const t of tops) {
          if (t.docTop === null) continue;
          const top = t.docTop - f.y;
          if (top <= 140 && top > best) {
            best = top;
            current = t.label;
          }
        }
        setActiveNav(current);
      }
    });
    return () => {
      unsubscribe();
      sizeObserver?.disconnect();
    };
  }, []);

  // 5-CLICK SECRET OWNER TRIGGER (preserved exactly)
  const handleLogoClick = () => {
    const now = Date.now();
    if (now - lastClickTimeRef.current < 1500) {
      clickCountRef.current += 1;
    } else {
      clickCountRef.current = 1;
    }
    lastClickTimeRef.current = now;

    if (clickCountRef.current >= 5) {
      clickCountRef.current = 0;
      if (onOpenOwnerModal) onOpenOwnerModal();
      else onOpenAuthModal('creator');
    } else {
      setActiveSite('site1_open');
    }
  };

  const scrollToSection = (e: React.MouseEvent | null, sectionId: string) => {
    e?.preventDefault();
    const behavior = prefersReducedMotion() ? 'auto' : 'smooth';
    setOpenMenu(null);
    setMobileOpen(false);
    if (activeSite !== 'site1_open') {
      setActiveSite('site1_open');
      setTimeout(() => {
        document.getElementById(sectionId)?.scrollIntoView({ behavior, block: 'start' });
      }, 180);
    } else {
      document.getElementById(sectionId)?.scrollIntoView({ behavior, block: 'start' });
    }
  };

  const goDashboard = () => {
    setMobileOpen(false);
    if (isOwnerAuth) setActiveSite('site3_owner');
    else if (currentUser) setActiveSite('site2_lms');
    else onOpenAuthModal('login');
  };

  const goRegister = () => {
    setMobileOpen(false);
    onOpenAuthModal('register');
  };

  /* ---------------------------------------------------------------- */
  /* Navigation model                                                  */
  /* ---------------------------------------------------------------- */
  const hasNews = (db?.news || []).some((n) => n.published) || !!(db?.vipGift && db.vipGift.active && Date.parse(db.vipGift.endsAt) > Date.now());
  const navLinksAll: NavLink[] = [
    { label: 'Bosh sahifa', onClick: () => scrollToSection(null, 'top') },
    ...(hasNews ? [{ label: 'Yangiliklar', target: 'news' }] : []),
    { label: 'Kitoblar', target: 'books' },
    { label: 'Natijalar', target: 'results' },
    { label: 'Fikrlar', target: 'testimonials' },
    { label: 'VIP', target: 'vip' },
    { label: 'Ustoz', target: 'teacher-bio' },
    ...((db?.faqs || []).some(faq => faq.isVisible) ? [{ label: 'Savollar', target: 'faq' }] : []),
  ];
  // A link is shown only while its landing section is visible (the owner switches sections off in Sozlamalar).
  const SECTION_BY_TARGET: Record<string, string> = { news: 'news', books: 'books', results: 'results', testimonials: 'testimonials', vip: 'vip', 'teacher-bio': 'teacher', faq: 'faq' };
  const hiddenSections = new Set((db?.siteSections || []).filter((s) => !s.isVisible).map((s) => s.key));
  const navLinks: NavLink[] = navLinksAll.filter((l) => !l.target || !SECTION_BY_TARGET[l.target] || !hiddenSections.has(SECTION_BY_TARGET[l.target]));

  /* ---------------------------------------------------------------- */
  /* Styles                                                            */
  /* ---------------------------------------------------------------- */
  const isFloating = variant === 'floating';
  // Over the hero the bar is light liquid glass; only the dark theme keeps white text over the hero.
  const overDark = variant === 'floating' && !scrolled && theme === 'dark';
  const bodyClass = cn(
    'transition-all duration-500',
    overDark ? 'glass-night vision-header-glass relative rounded-full' : 'liquid-glass vision-header-glass relative rounded-full',
    // Once the page scrolls under the bar it turns solid, so text from sections below never shows through the logo.
    scrolled && !overDark && 'header-solid'
  );

  const linkClass = cn(
    'relative flex items-center gap-1 rounded-full px-3.5 py-2 text-[13px] font-semibold transition-colors',
    overDark
      ? 'text-white/80 hover:bg-white/10 hover:text-white'
      : 'text-ink-muted hover:bg-ink/[0.05] hover:text-ink dark:text-stone-400 dark:hover:bg-white/5 dark:hover:text-white'
  );

  const activePill =
    '!bg-gradient-to-b !from-[#ffa149] !to-[#f2650f] !text-white shadow-[0_8px_20px_-8px_rgba(242,101,15,0.8)]';
  const navActive = (label: string) => activeSite === 'site1_open' && activeNav === label;

  const iconBtn = cn(
    'flex h-9 w-9 items-center justify-center rounded-full border transition-colors',
    overDark
      ? 'border-white/16 bg-white/8 text-white/85 hover:bg-white/15 hover:text-white'
      : 'border-line bg-white/55 text-ink-muted hover:text-ink dark:border-white/10 dark:bg-white/5 dark:text-stone-400 dark:hover:text-white'
  );

  return (
    <header
      onKeyDown={(event) => {
        if (event.key !== 'Escape') return;
        if (mobileOpen) {
          setMobileOpen(false);
          mobileMenuButton.current?.focus();
        }
        setOpenMenu(null);
        setShowLangMenu(false);
      }}
      className={cn(
        'top-0 z-50 w-full transition-[padding] duration-500',
        isFloating ? 'fixed inset-x-0 pt-3 sm:pt-4' : 'sticky py-2 sm:py-3',
        isFloating && scrolled && 'pt-2 sm:pt-2.5'
      )}
    >
      <div className="mx-auto w-full max-w-[1280px] px-3 sm:px-5">
        <div className={cn('flex items-center justify-between gap-3 px-2.5 py-2 sm:px-3.5', bodyClass)}>
          {/* Brand */}
          <button
            onClick={handleLogoClick}
            className="shrink-0 cursor-pointer select-none whitespace-nowrap transition-transform active:scale-95"
            title="Edu Level — IELTS, CEFR & General English"
            aria-label="Edu Level bosh sahifa"
          >
            <EduLevelLogo size="md" variant={overDark ? 'white' : 'aurora'} showSubtitle={false} />
          </button>

          {/* Desktop navigation */}
          <nav className="hidden items-center gap-0.5 xl:flex" aria-label="Asosiy navigatsiya">
            {navLinks.map((item) =>
              item.children ? (
                <div
                  key={item.label}
                  className="relative"
                  onMouseEnter={() => setOpenMenu(item.label)}
                  onMouseLeave={() => setOpenMenu(null)}
                >
                  <button
                    className={cn(linkClass, navActive(item.label) && activePill)}
                    aria-expanded={openMenu === item.label}
                    onClick={(event) => setOpenMenu(event.detail === 0 && openMenu === item.label ? null : item.label)}
                  >
                    {item.label}
                    <ChevronDown
                      className={cn(
                        'h-3.5 w-3.5 transition-transform duration-300',
                        openMenu === item.label && 'rotate-180'
                      )}
                    />
                  </button>

                  <div
                    inert={openMenu !== item.label}
                    className={cn(
                      'absolute left-1/2 top-full w-[280px] -translate-x-1/2 pt-2 transition-all duration-300',
                      openMenu === item.label
                        ? 'pointer-events-auto translate-y-0 opacity-100'
                        : 'pointer-events-none -translate-y-1 opacity-0'
                    )}
                  >
                    <div className="glass-4 overflow-hidden rounded-2xl p-1.5">
                      {item.children.map((child) => (
                        <button
                          key={child.label}
                          onClick={() => {
                            setOpenMenu(null);
                            if (child.onClick) child.onClick();
                            else if (child.target) scrollToSection(null, child.target);
                          }}
                          className="group flex w-full items-start gap-2.5 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-ember-500/[0.08]"
                        >
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-ember-500/70 transition-transform group-hover:scale-125" />
                          <span className="min-w-0">
                            <span className="block text-[13px] font-semibold text-ink dark:text-white">
                              {child.label}
                            </span>
                            {child.description ? (
                              <span className="mt-0.5 block text-[11.5px] leading-snug text-ink-muted dark:text-stone-400">
                                {child.description}
                              </span>
                            ) : null}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  key={item.label}
                  onClick={() => (item.onClick ? item.onClick() : item.target && scrollToSection(null, item.target))}
                  className={cn(linkClass, navActive(item.label) && activePill)}
                  aria-current={navActive(item.label) ? 'page' : undefined}
                >
                  {item.label}
                </button>
              )
            )}
          </nav>

          {/* Actions */}
          <div className="flex shrink-0 items-center gap-1.5">
            {/* Search */}
            {onOpenCommandPalette ? (
              <div className="relative hidden sm:block">
                <div
                  className={cn(
                    'flex items-center overflow-hidden rounded-full border transition-all duration-300',
                    showSearch ? 'w-52' : 'w-9',
                    overDark
                      ? 'border-white/16 bg-white/8'
                      : 'border-line bg-white/55 dark:border-white/10 dark:bg-white/5'
                  )}
                >
                  <button
                    onClick={() => {
                      setShowSearch((s) => !s);
                      setTimeout(() => inputRef.current?.focus(), 120);
                    }}
                    className={cn('h-9 w-9 shrink-0', overDark ? 'text-white/85' : 'text-ink-muted')}
                    aria-label="Qidiruv"
                  >
                    <Search className="mx-auto h-4 w-4" />
                  </button>
                  <input
                    ref={inputRef}
                    placeholder="Qidirish…"
                    aria-label="Saytdan qidirish"
                    className={cn(
                      'h-9 w-full bg-transparent pr-2 text-[12.5px] outline-none',
                      overDark
                        ? 'text-white placeholder:text-white/50'
                        : 'text-ink placeholder:text-ink-muted/60 dark:text-white'
                    )}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') onOpenCommandPalette();
                      if (e.key === 'Escape') setShowSearch(false);
                    }}
                  />
                </div>
              </div>
            ) : null}

            {/* Language */}
            <div className="relative hidden sm:block">
              <button
                onClick={() => setShowLangMenu(!showLangMenu)}
                className={cn(iconBtn, 'w-auto gap-1 px-2.5')}
                aria-label="Tilni almashtirish"
              >
                <span className="text-[13px]">{language === 'en' ? '🇬🇧' : '🇺🇿'}</span>
                <ChevronDown className={cn('h-3 w-3 transition-transform', showLangMenu && 'rotate-180')} />
              </button>

              {showLangMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowLangMenu(false)} />
                  <div className="glass-4 absolute right-0 z-50 mt-2 w-48 rounded-2xl p-1.5">
                    {languages.map((l) => {
                      const selected = language === l.code;
                      return (
                        <button
                          key={l.code}
                          onClick={() => {
                            setLanguage(l.code);
                            setShowLangMenu(false);
                          }}
                          className={cn(
                            'flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-[12.5px] transition-colors',
                            selected
                              ? 'bg-ember-500/10 font-bold text-[#c9540a] dark:text-[#ffb45c]'
                              : 'font-medium text-ink hover:bg-ink/5 dark:text-stone-300 dark:hover:bg-white/5'
                          )}
                        >
                          <span className="flex items-center gap-2">
                            <span className="text-sm">{l.flag}</span>
                            <span>{l.label}</span>
                          </span>
                          {selected && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Theme */}
            <button onClick={toggleTheme} className={iconBtn} aria-label="Light/Dark rejim">
              {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </button>

            {/* Account */}
            {isOwnerAuth ? (
              <div className="hidden items-center gap-1.5 sm:flex">
                <button
                  onClick={() => setActiveSite('site3_owner')}
                  className="flex h-9 items-center gap-1.5 rounded-full bg-gradient-to-b from-[#FFB45C] to-[#EF6C12] px-3.5 text-[12.5px] font-bold text-white shadow-[0_8px_22px_-10px_rgba(239,108,18,0.8)] transition-all hover:brightness-105"
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>{t('btn_owner_panel')}</span>
                </button>
                <button onClick={logout} className={iconBtn} title={t('btn_logout')}>
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : currentUser ? (
              <div className="hidden items-center gap-1.5 sm:flex">
                <button
                  onClick={() => setActiveSite('site2_lms')}
                  className="flex h-9 max-w-[190px] items-center gap-1.5 rounded-full bg-ink px-3.5 text-[12.5px] font-bold text-white transition-opacity hover:opacity-90 dark:bg-white dark:text-ink"
                >
                  <UserIcon className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{currentUser.name}</span>
                </button>
                <button onClick={logout} className={iconBtn} title={t('btn_logout')}>
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="hidden items-center gap-1.5 sm:flex">
                <button
                  onClick={() => onOpenAuthModal('login')}
                  className={cn(
                    'flex h-9 items-center rounded-full px-3.5 text-[12.5px] font-semibold transition-colors',
                    overDark
                      ? 'border border-white/16 text-white/90 hover:bg-white/10'
                      : 'text-ink-muted hover:bg-ink/5 hover:text-ink dark:text-stone-300 dark:hover:bg-white/5'
                  )}
                >
                  {t('btn_login')}
                </button>
                <button
                  onClick={goRegister}
                  className="group flex h-9 items-center gap-1.5 rounded-full bg-gradient-to-b from-[#FFB45C] to-[#EF6C12] px-4 text-[12.5px] font-bold text-white shadow-[0_8px_22px_-10px_rgba(239,108,18,0.85)] transition-all hover:brightness-105"
                >
                  <span>{t('btn_register')}</span>
                  <Sparkles className="h-3 w-3 transition-transform group-hover:rotate-12" />
                </button>
              </div>
            )}

            {/* Mobile menu */}
            <button
              ref={mobileMenuButton}
              onClick={() => setMobileOpen((v) => !v)}
              className={cn(iconBtn, 'xl:hidden')}
              aria-label="Menyu"
              aria-controls="edulevel-mobile-navigation"
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Mobile drawer */}
        <div
          id="edulevel-mobile-navigation"
          inert={!mobileOpen}
          className={cn(
            'xl:hidden overflow-y-auto overscroll-contain transition-all duration-300',
            mobileOpen ? 'mt-2 max-h-[min(620px,calc(100dvh-90px))] opacity-100' : 'max-h-0 opacity-0'
          )}
        >
          <div className="vision-mobile-navigation rounded-2xl border p-3">
            <div className="space-y-0.5">
              {navLinks.map((item) => (
                <div key={item.label}>
                  <button
                    onClick={() => {
                      if (item.onClick) item.onClick();
                      else if (item.target) scrollToSection(null, item.target);
                    }}
                    className="w-full rounded-xl px-3 py-2.5 text-left text-[13.5px] font-semibold text-ink transition-colors hover:bg-ink/5 dark:text-white dark:hover:bg-white/5"
                  >
                    {item.label}
                  </button>
                  {item.children ? (
                    <div className="ml-3 border-l border-line/70 pl-3 dark:border-white/10">
                      {item.children.map((child) => (
                        <button
                          key={child.label}
                          onClick={() => {
                            setMobileOpen(false);
                            if (child.onClick) child.onClick();
                            else if (child.target) scrollToSection(null, child.target);
                          }}
                          className="block w-full rounded-lg px-2 py-2 text-left text-[12.5px] font-medium text-ink-muted transition-colors hover:text-ink dark:text-stone-400 dark:hover:text-white"
                        >
                          {child.label}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>

            <div className="mt-3 flex items-center gap-2 border-t border-line/70 pt-3 dark:border-white/10">
              {isOwnerAuth ? (
                <button
                  onClick={() => {
                    setMobileOpen(false);
                    setActiveSite('site3_owner');
                  }}
                  className="flex h-10 flex-1 items-center justify-center gap-2 rounded-full bg-ink text-[13px] font-bold text-white dark:bg-white dark:text-ink"
                >
                  <UserIcon className="h-4 w-4" />
                  Owner paneli
                </button>
              ) : currentUser ? (
                <button
                  onClick={goDashboard}
                  className="flex h-10 flex-1 items-center justify-center gap-2 rounded-full bg-ink text-[13px] font-bold text-white dark:bg-white dark:text-ink"
                >
                  <UserIcon className="h-4 w-4" />
                  Kabinet
                </button>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setMobileOpen(false);
                      onOpenAuthModal('login');
                    }}
                    className="h-10 flex-1 rounded-full border border-line text-[13px] font-semibold text-ink dark:border-white/15 dark:text-white"
                  >
                    Kirish
                  </button>
                  <button
                    onClick={goRegister}
                    className="h-10 flex-1 rounded-full bg-gradient-to-b from-[#FFB45C] to-[#EF6C12] text-[13px] font-bold text-white"
                  >
                    Boshlash
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
