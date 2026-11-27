import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/common/Header';
import { Footer } from './components/common/Footer';
import { Site1Home } from './components/site1/Site1Home';
import dynamic from 'next/dynamic';

// The student cabinet, the owner panel and the sign-in page are separate downloads: a visitor to the
// public page does not pay for them, and a signed-in person gets theirs loaded in parallel at start.
const loadingBlock = () => <div className="flex min-h-[40vh] items-center justify-center text-[13px] text-ink-muted">Yuklanmoqda…</div>;
const Site2LMS = dynamic(() => import('./components/site2/Site2LMS').then((m) => m.Site2LMS), { ssr: false, loading: loadingBlock });
const Site3Owner = dynamic(() => import('./components/site3/Site3Owner').then((m) => m.Site3Owner), { ssr: false, loading: loadingBlock });
const AuthPage = dynamic(() => import('./components/auth/AuthPage').then((m) => m.AuthPage), { ssr: false, loading: loadingBlock });
import { AppBackground } from './components/common/AppBackground';
import { SiteTransitionWrapper } from './components/common/SiteTransitionWrapper';
import { CommandPaletteModal } from './components/common/CommandPaletteModal';
import { ScrollProgress } from './components/ui/motion-primitives';
import { HeroLoading } from './components/site1/HeroStatic';
import { ScrollReveals } from './components/ui/ScrollReveals';
import { SmoothScroll } from './components/ui/SmoothScroll';
import { BackToTop } from './components/ui/BackToTop';
import { EdubekDock } from './components/site1/EdubekDock';
import { SectionDots } from './components/site1/SectionDots';
import { ensureGsap } from './lib/motion';

const AppContent: React.FC = () => {
  const { activeSite, setActiveSite, currentUser, isOwnerAuth, dbReady, dbError, refreshDb } = useApp();
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [studentAuthMode, setStudentAuthMode] = useState<'login' | 'register' | 'creator'>('login');

  // Recalculate scroll scenes when the visible area changes, and start each area at the top.
  useEffect(() => {
    window.scrollTo({ top: 0 });
    const id = window.setTimeout(() => ensureGsap().ScrollTrigger.refresh(), 450);
    return () => window.clearTimeout(id);
  }, [activeSite]);

  // Global Cmd+K / Ctrl+K shortcut for Command Palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowCommandPalette((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Warm the downloads this person will need next, so entering the cabinet feels instant.
  useEffect(() => {
    if (currentUser) void import('./components/site2/Site2LMS');
    if (isOwnerAuth) void import('./components/site3/Site3Owner');
  }, [currentUser, isOwnerAuth]);
  useEffect(() => {
    if (currentUser || isOwnerAuth) return;
    const idle = (window as unknown as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
    const warm = () => void import('./components/auth/AuthPage');
    if (idle) idle(warm, { timeout: 6000 });
    else window.setTimeout(warm, 4000);
  }, [currentUser, isOwnerAuth]);

  // Keep public content available while the database loads or fails. Never expose a protected view before auth.
  if (!dbReady && activeSite === 'site1_open') {
    return <HeroLoading error={Boolean(dbError)} onRetry={() => void refreshDb()}/>;
  }
  if (!dbReady && activeSite !== 'auth') {
    return <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <p role="status">{dbError ? 'Ma’lumotlar yuklanmadi.' : 'Kabinet yuklanmoqda…'}</p>
      {dbError && <button type="button" onClick={() => void refreshDb()} className="rounded-xl bg-ember-600 px-5 py-3 font-semibold text-white">Qayta urinish</button>}
      <button type="button" onClick={() => setActiveSite('site1_open')} className="min-h-11 underline">Bosh sahifa</button>
    </div>;
  }

  // Dedicated Auth Page Route
  if (activeSite === 'auth') {
    return (
      <div className="relative min-h-screen">
        <AppBackground />
        <div className="relative z-10">
          <AuthPage initialMode={studentAuthMode} onBackToHome={() => setActiveSite('site1_open')} />
        </div>
      </div>
    );
  }

  const isLanding = activeSite === 'site1_open';

  return (
    <div className="relative flex min-h-screen flex-col font-sans text-ink selection:bg-ember-500/20 selection:text-ink dark:text-stone-100">
      <AppBackground />
      <ScrollReveals />
      <SmoothScroll enabled={isLanding} />
      <ScrollProgress />
      {isLanding && <BackToTop />}
      {isLanding && <EdubekDock />}
      {isLanding && <SectionDots />}

      <div className="relative flex flex-1 flex-col">
        <Header
          variant={isLanding ? 'floating' : 'solid'}
          onOpenAuthModal={(m) => {
            setStudentAuthMode(m);
            setActiveSite('auth');
          }}
          onOpenOwnerModal={() => {
            setStudentAuthMode('creator');
            setActiveSite('auth');
          }}
          onOpenCommandPalette={() => setShowCommandPalette(true)}
        />

        <SiteTransitionWrapper activeKey={activeSite}>
          {isLanding && <Site1Home />}

          {/* Student Dashboard Route */}
          {activeSite === 'site2_lms' &&
            (currentUser ? (
              <Site2LMS />
            ) : (
              <AuthPage initialMode="login" onBackToHome={() => setActiveSite('site1_open')} />
            ))}

          {/* Owner Super Admin Dashboard Route */}
          {activeSite === 'site3_owner' &&
            (isOwnerAuth ? (
              <Site3Owner />
            ) : (
              <AuthPage initialMode="creator" onBackToHome={() => setActiveSite('site1_open')} />
            ))}
        </SiteTransitionWrapper>

        {isLanding && (
          <Footer
            onOpenOwnerModal={() => {
              setStudentAuthMode('creator');
              setActiveSite('auth');
            }}
          />
        )}

        {/* Global Command Palette (Cmd+K / Ctrl+K) */}
        <CommandPaletteModal
          isOpen={showCommandPalette}
          onClose={() => setShowCommandPalette(false)}
        />
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
