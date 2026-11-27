'use client';
import { useEffect } from 'react';

/**
 * Measures this page view's Core Web Vitals (LCP, CLS, INP) and TTFB and sends them once when the page is hidden.
 * Only numbers and two labels leave the browser (home or content page, phone or computer): no URL, no id, no text.
 */
export function RumReporter() {
  useEffect(() => {
    if (typeof PerformanceObserver === 'undefined') return;
    let lcp: number | null = null;
    let cls = 0;
    let sessionValue = 0;
    let sessionEntries: { t: number }[] = [];
    const interactions = new Map<number, number>();
    const observers: PerformanceObserver[] = [];
    const observe = (type: string, cb: (entries: PerformanceEntryList) => void, extra: Record<string, unknown> = {}) => {
      try {
        const po = new PerformanceObserver((list) => cb(list.getEntries()));
        po.observe({ type, buffered: true, ...extra } as PerformanceObserverInit);
        observers.push(po);
      } catch {
        /* this browser does not report it */
      }
    };
    observe('largest-contentful-paint', (es) => {
      const last = es[es.length - 1] as PerformanceEntry | undefined;
      if (last) lcp = last.startTime;
    });
    observe('layout-shift', (es) => {
      for (const e of es as unknown as { value: number; hadRecentInput: boolean; startTime: number }[]) {
        if (e.hadRecentInput) continue;
        const prev = sessionEntries[sessionEntries.length - 1];
        if (prev && e.startTime - prev.t < 1000 && e.startTime - sessionEntries[0].t < 5000) {
          sessionValue += e.value;
        } else {
          sessionValue = e.value;
          sessionEntries = [];
        }
        sessionEntries.push({ t: e.startTime });
        cls = Math.max(cls, sessionValue);
      }
    });
    observe('event', (es) => {
      for (const e of es as unknown as { interactionId?: number; duration: number }[]) {
        if (!e.interactionId) continue;
        interactions.set(e.interactionId, Math.max(interactions.get(e.interactionId) || 0, e.duration));
      }
    }, { durationThreshold: 40 });

    let sent = false;
    const send = () => {
      if (sent) return;
      sent = true;
      const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
      const durations = [...interactions.values()].sort((a, b) => a - b);
      // INP: the slowest interaction, or the 98th percentile once there are many.
      const inp = durations.length ? durations[Math.min(durations.length - 1, Math.floor(durations.length * 0.98))] : null;
      const body = JSON.stringify({
        lcp,
        cls: lcp === null && cls === 0 ? null : cls,
        inp,
        ttfb: nav ? nav.responseStart : null,
        page: window.location.pathname === '/' ? 'home' : 'content',
        device: window.matchMedia('(max-width: 767px)').matches || /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent) ? 'mobile' : 'desktop'
      });
      try {
        navigator.sendBeacon('/api/rum', new Blob([body], { type: 'application/json' }));
      } catch {
        /* measuring must never break the page */
      }
    };
    const onHide = () => {
      if (document.visibilityState === 'hidden') send();
    };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', send);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', send);
      observers.forEach((o) => o.disconnect());
    };
  }, []);
  return null;
}
