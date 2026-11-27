'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Clock, LogOut, Minus, Plus, Wifi, WifiOff } from 'lucide-react';
import { cn } from '../ui/styles';
import { BodyPortal } from '../common/BodyPortal';

interface ExamShellProps {
  title: string;
  /** e.g. "IELTS · Mock" */
  kind?: string;
  candidate?: string;
  secondsLeft: number | null;
  saveState?: 'idle' | 'saving' | 'saved' | 'offline' | string;
  onFinish?: () => void;
  finishLabel?: string;
  finishDisabled?: boolean;
  /** Leaving keeps the attempt on the server (resume later) */
  onExit?: () => void;
  footer?: React.ReactNode;
  children: React.ReactNode;
  /** Lets children read the chosen text size */
  textScale?: number;
  onTextScale?: (n: number) => void;
}

export const formatClock = (secs: number) => {
  const s = Math.max(0, Math.floor(secs));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  return `${h ? h + ':' : ''}${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
};

/**
 * Full-screen, distraction-free exam frame (computer-delivered exam style):
 * candidate bar, server-synced countdown with 10 / 5 / 1 minute warnings,
 * autosave status, text size control and a bottom navigation slot.
 */
export const ExamShell: React.FC<ExamShellProps> = ({
  title,
  kind,
  candidate,
  secondsLeft,
  saveState,
  onFinish,
  finishLabel = 'Yakunlash',
  finishDisabled,
  onExit,
  footer,
  children,
  textScale = 1,
  onTextScale
}) => {
  const [toast, setToast] = useState<string | null>(null);
  const warned = useRef<Record<number, boolean>>({});

  // Lock page scroll while the exam is open
  useEffect(() => {
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = 'hidden';
    return () => {
      html.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    if (secondsLeft === null) return;
    for (const mark of [600, 300, 60]) {
      if (secondsLeft <= mark && secondsLeft > mark - 5 && !warned.current[mark]) {
        warned.current[mark] = true;
        setToast(mark === 60 ? 'Oxirgi 1 daqiqa qoldi' : `${mark / 60} daqiqa qoldi`);
        const t = setTimeout(() => setToast(null), 4500);
        return () => clearTimeout(t);
      }
    }
  }, [secondsLeft]);

  const low = secondsLeft !== null && secondsLeft <= 300;
  const critical = secondsLeft !== null && secondsLeft <= 60;

  return (
    <BodyPortal>
    <div className="app-theme fixed inset-0 z-[80] flex flex-col bg-[#f6f4f0] text-ink dark:bg-[#0b0a09] dark:text-white" role="dialog" aria-modal="true" aria-label={title}>
      {/* Candidate bar */}
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-line bg-white px-3 sm:h-16 sm:px-5 dark:border-white/10 dark:bg-[#141210]">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-b from-[#ffa149] to-[#f2650f] font-display text-[11px] font-extrabold text-white sm:flex">EL</span>
          <div className="min-w-0">
            <div className="truncate text-[13px] font-semibold sm:text-[14px]">{title}</div>
            <div className="truncate text-[11px] text-ink-muted dark:text-stone-400">
              {[kind, candidate].filter(Boolean).join(' · ')}
            </div>
          </div>
        </div>

        <div
          className={cn(
            'flex items-center gap-2 rounded-full border px-3 py-1.5 tabular-nums transition-colors sm:px-4',
            critical
              ? 'animate-pulse border-rose-500/50 bg-rose-500/12 text-rose-700 dark:text-rose-300'
              : low
                ? 'border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300'
                : 'border-line bg-[#f6f4f0] dark:border-white/10 dark:bg-white/[0.05]'
          )}
          role="timer"
          aria-live="off"
          aria-label="Qolgan vaqt"
        >
          <Clock className="h-4 w-4" />
          <span className="font-mono text-[15px] font-bold sm:text-[17px]">{secondsLeft === null ? '--:--' : formatClock(secondsLeft)}</span>
        </div>

        <div className="flex flex-1 items-center justify-end gap-1.5 sm:gap-2">
          <span className="hidden items-center gap-1.5 text-[11px] font-medium text-ink-muted md:flex dark:text-stone-400" aria-live="polite">
            {saveState === 'offline' ? <WifiOff className="h-3.5 w-3.5 text-amber-600" /> : <Wifi className="h-3.5 w-3.5 text-emerald-600" />}
            {saveState === 'saving' ? 'Saqlanmoqda…' : saveState === 'offline' ? 'Oflayn, qayta urinadi' : 'Saqlandi'}
          </span>
          {onTextScale ? (
            <div className="hidden items-center rounded-full border border-line sm:flex dark:border-white/10" aria-label="Matn o‘lchami">
              <button onClick={() => onTextScale(Math.max(0.9, +(textScale - 0.1).toFixed(1)))} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-ink/5 dark:hover:bg-white/10" aria-label="Matnni kichraytirish">
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="px-0.5 text-[11px] font-bold">Aa</span>
              <button onClick={() => onTextScale(Math.min(1.4, +(textScale + 0.1).toFixed(1)))} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-ink/5 dark:hover:bg-white/10" aria-label="Matnni kattalashtirish">
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : null}
          {onExit ? (
            <button onClick={onExit} className="inline-flex h-9 items-center gap-1.5 rounded-full px-2.5 text-[12px] font-semibold text-ink-muted hover:bg-ink/5 sm:px-3 dark:text-stone-400 dark:hover:bg-white/10" title="Chiqish (urinish saqlanadi, keyin davom ettirasiz)" aria-label="Chiqish">
              <LogOut className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Chiqish</span>
            </button>
          ) : null}
          {onFinish ? (
            <button
              onClick={onFinish}
              disabled={finishDisabled}
              className="inline-flex h-9 items-center rounded-full bg-ink px-4 text-[12.5px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50 sm:h-10 sm:px-5 dark:bg-white dark:text-ink"
            >
              {finishLabel}
            </button>
          ) : null}
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto" style={{ fontSize: `${textScale}rem` }}>
        {children}
      </main>

      {footer ? <footer className="shrink-0 border-t border-line bg-white dark:border-white/10 dark:bg-[#141210]">{footer}</footer> : null}

      {toast ? (
        <div className="pointer-events-none fixed left-1/2 top-20 z-[90] -translate-x-1/2 rounded-full bg-ink px-5 py-2.5 text-[13px] font-semibold text-white shadow-2xl dark:bg-white dark:text-ink" role="alert">
          {toast}
        </div>
      ) : null}
    </div>
    </BodyPortal>
  );
};
