'use client';
import React, { useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { cn } from '../ui/styles';

/** Owner-managed FAQ with smooth accordion (grid-rows height animation). */
export const FaqSection: React.FC = () => {
  const { db } = useApp();
  const all = [...(db.faqs || [])].filter((f) => f.isVisible).sort((a, b) => a.orderIndex - b.orderIndex);
  const [open, setOpen] = useState<string | null>(all[0]?.id || null);
  const [q, setQ] = useState('');
  const needle = q.trim().toLowerCase();
  const items = needle ? all.filter((f) => `${f.question} ${f.answer}`.toLowerCase().includes(needle)) : all;
  if (!all.length) return null;

  return (
    <section id="faq" aria-label="Savol-javoblar" className="relative bg-[var(--page-bg)] py-16 sm:py-24">
      <div className="mx-auto grid max-w-[1240px] gap-10 px-5 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:px-10">
        <div data-reveal>
          <span className="glass-subtle inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-ink-muted dark:text-stone-300">
            <span className="h-1.5 w-1.5 rounded-full bg-ember-500" /> FAQ
          </span>
          <h2 className="mt-5 font-display text-[clamp(2rem,4vw,3.1rem)] font-extrabold leading-[1.04] tracking-[-0.04em] text-ink dark:text-white">
            Ko‘p so‘raladigan <span className="word-ember">savollar</span>
          </h2>
          <p className="mt-4 max-w-[380px] text-[15px] leading-relaxed text-ink-muted dark:text-stone-400">
            Javob topmadingizmi? Telegram orqali yozing — ustoz shaxsan javob beradi.
          </p>
        </div>

        <div className="space-y-3">
          {all.length > 4 ? (
            <label className="flex items-center gap-2.5 rounded-full border border-line/80 bg-white/70 px-4 py-2.5 dark:border-white/10 dark:bg-white/[0.05]">
              <Search className="h-4 w-4 text-ink-muted" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Savollar ichidan qidirish…" aria-label="Savollarni qidirish" className="min-w-0 flex-1 bg-transparent text-[14px] text-ink outline-none placeholder:text-ink-muted/70 dark:text-white" />
            </label>
          ) : null}
          {items.length === 0 ? <p className="px-2 py-6 text-[14px] text-ink-muted dark:text-stone-400">“{q}” bo‘yicha savol topilmadi. Telegram orqali yozing.</p> : null}
          {items.map((f, i) => {
            const isOpen = open === f.id;
            return (
              <div
                key={f.id}
                data-reveal
                data-reveal-delay={String(i * 60)}
                className={cn('glass-premium overflow-hidden rounded-[24px] transition-shadow duration-500', isOpen && 'shadow-[0_24px_60px_-30px_rgba(242,101,15,0.45)]')}
              >
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : f.id)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
                >
                  <span className="font-display text-[16px] font-bold text-ink dark:text-white">{f.question}</span>
                  <span
                    className={cn(
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all duration-500',
                      isOpen ? 'rotate-45 bg-gradient-to-b from-[#ffa149] to-[#f2650f] text-white' : 'bg-ink/[0.05] text-ink dark:bg-white/10 dark:text-white'
                    )}
                  >
                    <Plus className="h-4 w-4" />
                  </span>
                </button>
                <div className={cn('grid transition-[grid-template-rows] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]', isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
                  <div className="overflow-hidden">
                    <p className="px-6 pb-6 text-[14.5px] leading-relaxed text-ink-muted dark:text-stone-400">{f.answer}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
