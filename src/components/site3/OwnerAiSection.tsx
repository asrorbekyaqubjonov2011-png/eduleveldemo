'use client';
import React, { useState } from 'react';
import { BarChart3, Clock, GitBranch, MessageSquare, Plug, ShieldCheck, Sparkles } from 'lucide-react';
import { cn } from '../ui/styles';
import { OwnerAiChat } from './OwnerAiChat';
import { AIQuizGenerator } from './AIQuizGenerator';
import { OwnerAiStats } from './OwnerAiStats';
import { OwnerAiLimits } from './OwnerAiLimits';
import { OwnerAiProviders } from './OwnerAiProviders';
import { OwnerAiRouting } from './OwnerAiRouting';
import { OwnerEnvCheck } from './OwnerEnvCheck';

type Tab = 'chat' | 'quiz' | 'stats' | 'limits' | 'providers' | 'routing' | 'env';

const TABS: { id: Tab; label: string; hint: string; icon: typeof MessageSquare }[] = [
  { id: 'chat', label: 'Yordamchi', hint: 'Platforma haqida savol bering', icon: MessageSquare },
  { id: 'quiz', label: 'Test yaratish', hint: 'Darsdan AI bilan test tuzing', icon: Sparkles },
  { id: 'stats', label: 'Statistika', hint: 'Qaysi model qancha token sarflayapti va qanchalik tez ishlayapti', icon: BarChart3 },
  { id: 'limits', label: 'Vaqt limiti', hint: 'Har bir tarif kuniga qancha AI ishlatishi mumkin', icon: Clock },
  { id: 'providers', label: 'Provayderlar', hint: 'Qaysi AI ulangan, zaxira tartibi va har birini sinash', icon: Plug },
  { id: 'routing', label: 'Marshrutlash', hint: 'Har bir AI vazifasi uchun birinchi va zaxira provayder, benchmark', icon: GitBranch },
  { id: 'env', label: 'Sozlama tekshiruvi', hint: 'Render muhit o‘zgaruvchilari va ulanishlar holati', icon: ShieldCheck }
];

/** The one AI section for the owner: an assistant and the lesson test generator. */
export const OwnerAiSection: React.FC = () => {
  const [tab, setTab] = useState<Tab>('chat');

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-ink dark:text-white">AI</h2>
          <p className="mt-1 text-[13.5px] text-ink-muted dark:text-stone-400">{TABS.find((t) => t.id === tab)?.hint}</p>
        </div>
        <div role="tablist" aria-label="AI bo‘limlari" className="inline-flex max-w-full overflow-x-auto rounded-full border border-line/80 bg-white/70 p-1 dark:border-white/10 dark:bg-white/[0.04]">
          {TABS.map((t) => {
            const active = tab === t.id;
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                role="tab"
                aria-selected={active}
                onClick={() => setTab(t.id)}
                className={cn(
                  'relative flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-[13px] font-semibold transition-colors',
                  active ? 'text-white dark:text-ink' : 'text-ink-muted hover:text-ink dark:text-stone-400 dark:hover:text-white'
                )}
              >
                {active ? <span aria-hidden className="absolute inset-0 -z-0 rounded-full bg-ink shadow-[0_8px_20px_-10px_rgba(18,16,14,0.7)] transition-all duration-500 dark:bg-white" /> : null}
                <Icon className="relative h-4 w-4" />
                <span className="relative">{t.label}</span>
              </button>
            );
          })}
        </div>
      </header>

      <div key={tab} className="animate-msg" role="tabpanel">
        {tab === 'chat' ? <OwnerAiChat /> : tab === 'quiz' ? <AIQuizGenerator /> : tab === 'stats' ? <OwnerAiStats /> : tab === 'limits' ? <OwnerAiLimits /> : tab === 'routing' ? <OwnerAiRouting /> : tab === 'env' ? <OwnerEnvCheck /> : <OwnerAiProviders />}
      </div>
    </div>
  );
};
