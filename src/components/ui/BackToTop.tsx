'use client';
import { useEffect, useRef } from 'react';
import { ArrowUp } from 'lucide-react';
import { subscribeScroll } from '../../lib/motion/scrollEngine';

const CIRCUMFERENCE = 2 * Math.PI * 20;

/**
 * Floating button whose ring fills as the page is scrolled. It appears after the first screen.
 * The scroll engine drives it: the scroll offset and the page's scrollable height come from the engine (the height
 * is cached there), and the ring and the button are written straight to the DOM. No React state changes per frame.
 */
export function BackToTop() {
  const button = useRef<HTMLButtonElement | null>(null);
  const ring = useRef<SVGCircleElement | null>(null);

  useEffect(() => {
    let progress = -1;
    let shown: boolean | null = null;
    return subscribeScroll({
      write: (f) => {
        const p = f.max > 0 ? Math.min(1, f.y / f.max) : 0;
        if (p !== progress) {
          progress = p;
          ring.current?.setAttribute('stroke-dashoffset', String(CIRCUMFERENCE * (1 - p)));
        }
        const visible = p > 0.06;
        if (visible !== shown) {
          shown = visible;
          const el = button.current;
          if (el) {
            el.style.opacity = visible ? '1' : '0';
            el.style.translate = visible ? '0 0' : '0 24px';
            el.style.pointerEvents = visible ? '' : 'none';
          }
        }
      },
    });
  }, []);

  return (
    <button
      ref={button}
      type="button"
      aria-label="Tepaga qaytish"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      style={{ opacity: 0, translate: '0 24px', pointerEvents: 'none' }}
      className="glass-4 fixed bottom-5 right-5 z-[55] flex h-12 w-12 items-center justify-center rounded-full text-ink shadow-lg transition-all duration-500 hover:-translate-y-0.5 dark:text-white"
    >
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 48 48" aria-hidden="true">
        <circle cx="24" cy="24" r="20" fill="none" stroke="currentColor" strokeOpacity="0.14" strokeWidth="3" />
        <circle
          ref={ring}
          cx="24"
          cy="24"
          r="20"
          fill="none"
          stroke="#f2650f"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE}
        />
      </svg>
      <ArrowUp className="h-4 w-4" />
    </button>
  );
}
