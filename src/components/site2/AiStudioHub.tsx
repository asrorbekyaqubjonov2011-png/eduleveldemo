'use client';
import React, { useState } from 'react';
import { ArrowLeft, ArrowUpRight, Languages, MessageSquare, Wrench } from 'lucide-react';
import { EdubekTools } from './EdubekTools';
import { EdubekChat } from './EdubekChat';
import { SmartTranslatorFlashcards } from './SmartTranslatorFlashcards';
import { useAiClock } from '../../lib/useAiClock';
import { useApp } from '../../context/AppContext';

type View = 'hub' | 'edubek' | 'translator' | 'tools';

const CARDS: { id: Exclude<View, 'hub'>; title: string; text: string; icon: typeof MessageSquare }[] = [
  {
    id: 'edubek',
    title: 'Edubek',
    text: 'Ingliz tili bo‘yicha suhbatlashing. Dars tanlasangiz, javoblar o‘sha darsning konspektiga tayanadi.',
    icon: MessageSquare
  },
  {
    id: 'translator',
    title: 'Lug‘at & Blitz',
    text: 'So‘zlarni tarjima qiling, kartochkalar bilan takrorlang va blitz o‘yinida tezlikni oshiring.',
    icon: Languages
  },
  {
    id: 'tools',
    title: 'Vositalar',
    text: 'IELTS ball hisoblagich, yozish va speaking taymeri, nafas, pomodoro, talaffuz va kunlik so‘z. AI vaqti tugagan bo‘lsa ham ishlaydi.',
    icon: Wrench
  }
];

const AiTimeBar: React.FC = () => {
  const c = useAiClock();
  if (!c.ready || c.limitMinutes === 0) return null;
  const used = Math.min(c.limitMinutes * 60, c.usedSeconds);
  const pct = Math.min(100, (used / (c.limitMinutes * 60)) * 100);
  const left = Math.max(0, Math.ceil((c.remainingSeconds ?? 0) / 60));
  const over = c.remainingSeconds === 0;
  return (
    <div role="status" className={`rounded-2xl border px-4 py-3 ${over ? 'border-rose-300/60 bg-rose-500/10' : 'border-line/80 bg-white/70 dark:border-white/10 dark:bg-white/[0.03]'}`}>
      <div className="flex items-center justify-between text-[12.5px] font-semibold text-ink dark:text-white">
        <span>{over ? 'Bugungi AI vaqtingiz tugadi' : `Bugungi AI vaqti: ${left} daqiqa qoldi`}</span>
        <span className="text-ink-muted dark:text-stone-400">{Math.floor(used / 60)} / {c.limitMinutes} daq</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink/10 dark:bg-white/10">
        <div className={`h-full rounded-full transition-[width] duration-700 ${over ? 'bg-rose-500' : 'bg-gradient-to-r from-[#ffa149] to-[#f2650f]'}`} style={{ width: `${pct}%` }} />
      </div>
      {over ? <p className="mt-2 text-[12px] text-ink-muted dark:text-stone-400">Ertaga qayta urinib ko‘ring yoki yuqoriroq tarifga o‘ting: AI vaqti tarifga bog‘liq.</p> : null}
    </div>
  );
};

/** AI section entry: pick Edubek (chat) or the vocabulary tools. */
export const AiStudioHub: React.FC = () => {
  const { db } = useApp();
  const [view, setView] = useState<View>('hub');
  const visibleCards = CARDS.filter((c) => !(c.id === 'translator' && (db.features as Record<string, unknown> | undefined)?.blitzEnabled === false));

  if (view === 'hub') {
    return (
      <div className="mx-auto max-w-4xl space-y-8 py-2">
        <header className="space-y-2">
          <h1 className="text-3xl font-extrabold tracking-tight text-ink dark:text-white">AI</h1>
          <p className="text-[14px] text-ink-muted dark:text-stone-400">Qaysi yordamchi bilan ishlaymiz?</p>
        </header>
        <AiTimeBar />
        <div className="grid gap-4 sm:grid-cols-2">
          {visibleCards.map((c, i) => {
            const Icon = c.icon;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setView(c.id)}
                style={{ animationDelay: `${i * 80}ms` }}
                className="animate-section group relative flex flex-col justify-between gap-10 overflow-hidden rounded-[1.75rem] border border-line/80 bg-white/70 p-6 text-left transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:border-[#f2650f]/40 hover:shadow-[0_24px_50px_-28px_rgba(242,101,15,0.55)] dark:border-white/10 dark:bg-white/[0.03]"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-b from-[#ffa149] to-[#f2650f] text-white shadow-[0_12px_28px_-12px_rgba(242,101,15,0.8)] transition-transform duration-500 group-hover:rotate-[-6deg] group-hover:scale-105">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="space-y-2">
                  <span className="flex items-center justify-between gap-3">
                    <span className="text-xl font-extrabold text-ink dark:text-white">{c.title}</span>
                    <ArrowUpRight className="h-5 w-5 text-ink-muted transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-[#f2650f]" />
                  </span>
                  <span className="block text-[13.5px] leading-relaxed text-ink-muted dark:text-stone-400">{c.text}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const title = view === 'edubek' ? 'Edubek' : view === 'tools' ? 'Vositalar' : 'Lug‘at & Blitz';
  return (
    <div className="space-y-5">
      <button
        type="button"
        onClick={() => setView('hub')}
        className="flex items-center gap-2 rounded-full px-2 py-1.5 text-[13px] font-semibold text-ink-muted transition-colors hover:text-ink dark:text-stone-400 dark:hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" /> AI
        <span aria-hidden className="text-ink-muted/60">/</span>
        <span className="text-ink dark:text-white">{title}</span>
      </button>
      {view === 'tools' ? null : <AiTimeBar />}
      <div key={view} className="animate-section">
        {view === 'edubek' ? <EdubekChat /> : view === 'tools' ? <EdubekTools /> : <SmartTranslatorFlashcards />}
      </div>
    </div>
  );
};
