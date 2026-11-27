import React from 'react';
import type { LucideIcon } from 'lucide-react';

/** Friendly placeholder for a list that has nothing in it yet: a small illustration, a title and a hint. */
export const EmptyState: React.FC<{ icon: LucideIcon; title: string; text?: string }> = ({ icon: Icon, title, text }) => (
  <div className="flex flex-col items-center justify-center rounded-[1.75rem] border border-dashed border-line/80 bg-white/50 px-6 py-14 text-center dark:border-white/10 dark:bg-white/[0.02]">
    <div className="relative flex h-24 w-24 items-center justify-center" aria-hidden="true">
      <svg viewBox="0 0 96 96" className="absolute inset-0 h-full w-full">
        <circle cx="48" cy="48" r="44" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 7" className="text-ember-500/30" />
        <circle cx="48" cy="48" r="32" className="fill-ember-500/10" />
        <circle cx="15" cy="30" r="4" className="fill-[#ffb36b]/70" />
        <circle cx="82" cy="64" r="5" className="fill-[#d9c4ff]/80" />
        <circle cx="70" cy="14" r="3" className="fill-[#9fd3ff]/80" />
      </svg>
      <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-white text-ember-600 shadow-[0_10px_24px_-12px_rgba(242,101,15,0.6)] dark:bg-white/10 dark:text-ember-400">
        <Icon className="h-6 w-6" />
      </span>
    </div>
    <p className="mt-4 font-display text-[15px] font-bold tracking-tight text-ink dark:text-white">{title}</p>
    {text ? <p className="mt-1 max-w-sm text-[12.5px] text-ink-muted dark:text-stone-400">{text}</p> : null}
  </div>
);
