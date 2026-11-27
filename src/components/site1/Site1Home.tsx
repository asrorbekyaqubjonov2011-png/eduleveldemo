import React, { useRef } from 'react';
import { useScrollFx } from '../../lib/motion/useScrollFx';
import { useApp } from '../../context/AppContext';
import { HeroSection } from './HeroSection';
import { PublicBooksPreviewSection } from './PublicBooksPreviewSection';
import { VIPPricingSection } from './VIPPricingSection';
import { TeacherBioSection } from './TeacherBioSection';
import { ContactSupportSection } from './ContactSupportSection';
import { MockExamPlayer } from '../site2/MockExamPlayer';
import { TestimonialsMarquee } from './TestimonialsMarquee';
import { FaqSection } from './FaqSection';
import { LevelsSection } from './LevelsSection';
import { ResultsSection } from './ResultsSection';
import { NewsSection } from './NewsSection';

/**
 * Site1Home — the public landing page.
 *
 * Sections follow the owner's Site Builder settings (db.siteSections):
 * hidden sections are not rendered and the order follows orderIndex.
 */
export const Site1Home: React.FC = () => {
  const { db, activeTestId, setActiveTestId, setActiveSite } = useApp();
  const rootRef = useRef<HTMLDivElement | null>(null);
  useScrollFx(rootRef);

  if (activeTestId) {
    return (
      <div className="min-h-screen bg-[var(--page-bg)] px-4 pb-10 pt-28 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <MockExamPlayer testId={activeTestId} onClose={() => setActiveTestId(null)} />
        </div>
      </div>
    );
  }

  const openAuth = () => setActiveSite('auth');

  const blocks: Record<string, React.ReactNode> = {
    hero: <HeroSection />,
    news: <NewsSection />,
    levels: <LevelsSection />,
    books: <PublicBooksPreviewSection onOpenAuth={openAuth} />,
    results: <ResultsSection />,
    testimonials: <TestimonialsMarquee />,
    vip: <VIPPricingSection />,
    teacher: <TeacherBioSection />,
    faq: <FaqSection />,
    contact: <ContactSupportSection />
  };

  const configured = [...(db.siteSections || [])].sort((a, b) => a.orderIndex - b.orderIndex || Number(b.key === 'hero') - Number(a.key === 'hero'));
  const order = configured.length ? configured : Object.keys(blocks).map((key, i) => ({ key, isVisible: true, orderIndex: i }));
  const rendered = new Set<string>();

  return (
    <div ref={rootRef} className="min-h-screen bg-[var(--page-bg)] text-ink transition-colors dark:text-stone-100">
      {order.map((s) => {
        if (!s.isVisible || !blocks[s.key] || rendered.has(s.key)) return null;
        rendered.add(s.key);
        return <React.Fragment key={s.key}>{blocks[s.key]}</React.Fragment>;
      })}
    </div>
  );
};
