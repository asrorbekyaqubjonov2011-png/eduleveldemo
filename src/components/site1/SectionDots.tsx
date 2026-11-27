'use client';
import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';

const LABELS: Record<string, string> = {
  top: 'Bosh sahifa',
  news: 'Yangiliklar',
  books: 'Kitoblar',
  levels: 'Yo‘l xaritasi',
  results: 'Natijalar',
  testimonials: 'Fikrlar',
  vip: 'Tariflar',
  'teacher-bio': 'Ustoz',
  faq: 'Savol-javob',
  contact: 'Aloqa'
};

/** A slim dot rail on the right of wide screens: shows where the reader is and jumps to a section on click. */
export const SectionDots: React.FC = () => {
  const { db } = useApp();
  const [ids, setIds] = useState<string[]>([]);
  const [active, setActive] = useState('top');

  // The sections that exist right now (the owner can hide some), in page order.
  useEffect(() => {
    const t = window.setTimeout(() => {
      const found = Array.from(document.querySelectorAll<HTMLElement>('section[id]'))
        .map((s) => s.id)
        .filter((id) => LABELS[id]);
      setIds(found);
    }, 400);
    return () => window.clearTimeout(t);
  }, [db.siteSections, db.news, db.vipGift]);

  useEffect(() => {
    if (!ids.length) return;
    const visible = new Map<string, number>();
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => visible.set(e.target.id, e.isIntersecting ? e.intersectionRatio : 0));
        let best = '';
        let top = 0;
        visible.forEach((r, id) => {
          if (r > top) {
            top = r;
            best = id;
          }
        });
        if (best) setActive(best);
      },
      { threshold: [0.15, 0.4, 0.7] }
    );
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, [ids]);

  if (ids.length < 3) return null;
  return (
    <nav aria-label="Bo‘limlar" className="pointer-events-none fixed right-4 top-1/2 z-30 hidden -translate-y-1/2 xl:block">
      <ul className="pointer-events-auto flex flex-col items-end gap-3">
        {ids.map((id) => (
          <li key={id}>
            <button
              type="button"
              onClick={() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              aria-label={LABELS[id]}
              aria-current={active === id ? 'true' : undefined}
              className="group flex min-h-[28px] items-center gap-2.5 px-1"
            >
              <span className="rounded-full bg-ink/80 px-2.5 py-1 text-[11px] font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">{LABELS[id]}</span>
              <span className={`block rounded-full transition-all duration-300 ${active === id ? 'h-3 w-3 bg-[#f2650f] shadow-[0_0_0_4px_rgba(242,101,15,0.2)]' : 'h-2 w-2 bg-ink/25 group-hover:bg-ink/50 dark:bg-white/30'}`} />
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
};
