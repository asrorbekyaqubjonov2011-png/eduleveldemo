import { useEffect, useState } from 'react';
import { api } from '../services/api';

export interface AiClock {
  /** Minutes per day this student's plan allows (0 = no limit). */
  limitMinutes: number;
  usedSeconds: number;
  remainingSeconds: number | null;
  ready: boolean;
}

/**
 * Today's AI time. While the AI section is open and the tab is visible it reports to the server
 * every 30 seconds, which is what the time is counted from.
 */
export function useAiClock(): AiClock {
  const [clock, setClock] = useState<AiClock>({ limitMinutes: 0, usedSeconds: 0, remainingSeconds: null, ready: false });
  useEffect(() => {
    let alive = true;
    const apply = (r: Awaited<ReturnType<typeof api.aiClock>>) => {
      if (!alive || !r?.success) return;
      setClock({ limitMinutes: r.limitMinutes ?? 0, usedSeconds: r.usedSeconds ?? 0, remainingSeconds: r.remainingSeconds ?? null, ready: true });
    };
    api.aiClock(false).then(apply).catch(() => {});
    const tick = () => {
      if (document.visibilityState === 'visible') api.aiClock(true).then(apply).catch(() => {});
    };
    const id = window.setInterval(tick, 30_000);
    // The clock also runs between ticks so the display counts down smoothly.
    const sec = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      setClock((c) => (c.ready && c.remainingSeconds !== null ? { ...c, usedSeconds: c.usedSeconds + 1, remainingSeconds: Math.max(0, c.remainingSeconds - 1) } : c));
    }, 1000);
    return () => {
      alive = false;
      window.clearInterval(id);
      window.clearInterval(sec);
    };
  }, []);
  return clock;
}
