'use client';
import React, { useEffect, useRef, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { ensureGsap, gsap, prefersReducedMotion, useGSAP } from '../../lib/motion';

interface IntroSplashProps {
  /** Server data is loaded. The intro ends only after both the animation and the data are ready. */
  ready: boolean;
  error?: boolean;
  onDone: () => void;
  onRetry?: () => void;
}

const WORDS = ['Learn', 'Practice', 'Improve'];

/**
 * First-visit opening sequence (once per browser session).
 * The London photograph already carries the EduLevel wordmark, so on wide screens only
 * a drawing mark and a progress line are added; on narrow screens, where the photo is
 * cropped, the wordmark is shown as text. Click or Escape skips; reduced motion gets a fade.
 */
export const IntroSplash: React.FC<IntroSplashProps> = ({ ready, error, onDone, onRetry }) => {
  const root = useRef<HTMLDivElement | null>(null);
  const tl = useRef<gsap.core.Timeline | null>(null);
  const [animDone, setAnimDone] = useState(false);

  useGSAP(
    () => {
      ensureGsap();
      const el = root.current;
      if (!el) return;
      const q = gsap.utils.selector(el);

      if (prefersReducedMotion()) {
        setAnimDone(true);
        return;
      }

      const t = gsap.timeline({ onComplete: () => setAnimDone(true) });
      t.timeScale(2.6); // the opening plays in about 1.3 s: the site is what the visitor came for
      tl.current = t;
      t.fromTo(q('[data-intro-bg]'), { scale: 1.22, opacity: 0 }, { scale: 1.02, opacity: 1, duration: 3.2, ease: 'power2.out' }, 0)
        .fromTo(q('[data-intro-veil]'), { opacity: 1 }, { opacity: 0.4, duration: 1.6, ease: 'power1.inOut' }, 0)
        .fromTo(q('[data-mark-ring]'), { strokeDashoffset: 327 }, { strokeDashoffset: 0, duration: 1.3, ease: 'power2.inOut' }, 0.25)
        .fromTo(q('[data-mark-fill]'), { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 0.8, ease: 'back.out(1.6)' }, 1.1)
        .fromTo(q('[data-intro-word]'), { yPercent: 115, opacity: 0, rotate: 4 }, { yPercent: 0, opacity: 1, rotate: 0, duration: 0.9, stagger: 0.07, ease: 'expo.out' }, 0.8)
        .fromTo(q('[data-intro-sub]'), { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }, 1.4)
        .fromTo(q('[data-intro-line]'), { scaleX: 0 }, { scaleX: 1, duration: 1.2, ease: 'expo.inOut' }, 1.1)
        .to(q('[data-intro-stage]'), { opacity: 0, y: -18, duration: 0.6, ease: 'power2.in' }, 2.7);

      gsap.to(q('[data-mark-fill]'), { scale: 1.06, duration: 1.6, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: 2 });

      return () => {
        t.kill();
        tl.current = null;
      };
    },
    { scope: root }
  );

  // The intro never holds the site: a click or key skips it, and after a short wait it opens even if the data is slow or failed.
  const [forced, setForced] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setForced(true), 2500);
    return () => clearTimeout(t);
  }, []);
  const skip = () => {
    setForced(true);
    if (tl.current) tl.current.progress(1);
    else setAnimDone(true);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter') skip();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!animDone || ((!ready || error) && !forced)) return;
    const el = root.current;
    if (!el || prefersReducedMotion()) {
      onDone();
      return;
    }
    gsap.to(el, { opacity: 0, duration: 0.4, ease: 'power2.inOut', onComplete: onDone });
  }, [animDone, ready, error, forced, onDone]);

  return (
    <div
      ref={root}
      role="status"
      aria-label="EduLevel yuklanmoqda"
      onClick={skip}
      className="fixed inset-0 z-[120] cursor-pointer overflow-hidden bg-[#07080b] text-white"
    >
      <div data-intro-bg className="absolute inset-[-4%] bg-cover bg-center" style={{ backgroundImage: 'url(/media/intro-london.webp)' }} />
      <div data-intro-veil className="absolute inset-0 bg-gradient-to-b from-[#07080b]/65 via-[#07080b]/30 to-[#07080b]/90" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,#07080b_100%)]" />
      <div className="absolute inset-x-0 top-0 h-[42%] bg-gradient-to-b from-[#07080b] via-[#07080b]/90 to-transparent sm:hidden" />

      <div data-intro-stage className="relative flex h-full flex-col items-center justify-center px-6 text-center sm:justify-end sm:pb-[12vh]">
        <svg viewBox="0 0 120 120" className="h-20 w-20 sm:h-24 sm:w-24" aria-hidden>
          <defs>
            <linearGradient id="intro-ring" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#ffd08a" />
              <stop offset="1" stopColor="#f2650f" />
            </linearGradient>
          </defs>
          <circle data-mark-ring cx="60" cy="60" r="52" fill="none" stroke="url(#intro-ring)" strokeWidth="3" strokeLinecap="round" strokeDasharray="327" strokeDashoffset="327" />
          <g data-mark-fill style={{ transformOrigin: '60px 60px' }}>
            <rect x="38" y="38" width="44" height="44" rx="14" fill="url(#intro-ring)" />
            <path d="M48 52h24M48 60h18M48 68h22" stroke="#07080b" strokeWidth="4" strokeLinecap="round" />
          </g>
        </svg>

        <div className="flex flex-col items-center sm:hidden">
          <h1 className="mt-7 flex overflow-hidden font-display text-[clamp(2.4rem,12vw,3.6rem)] font-extrabold leading-none tracking-[-0.04em]">
            {'EduLevel'.split('').map((c, i) => (
              <span key={i} className="inline-block overflow-hidden pb-[0.12em] -mb-[0.12em]">
                <span data-intro-word className="inline-block">
                  {c}
                </span>
              </span>
            ))}
          </h1>
          <p data-intro-sub className="mt-5 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-white/70">
            {WORDS.map((w, i) => (
              <React.Fragment key={w}>
                {i > 0 ? <span className="text-[#ffb274]">·</span> : null}
                <span>{w}</span>
              </React.Fragment>
            ))}
          </p>
        </div>

        <div data-intro-line className="mt-6 h-px w-44 origin-center bg-gradient-to-r from-transparent via-[#ffb274] to-transparent" />

        {error ? (
          <div className="mt-8 flex flex-col items-center gap-3">
            <p className="max-w-xs text-[14px] text-white/80">Server bilan bog‘lanib bo‘lmadi. Internetni tekshirib, qayta urinib ko‘ring.</p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRetry?.();
              }}
              className="inline-flex h-11 items-center gap-2 rounded-full bg-gradient-to-b from-[#ffa149] to-[#f2650f] px-6 text-[14px] font-semibold text-white"
            >
              <RotateCcw className="h-4 w-4" /> Qayta urinish
            </button>
          </div>
        ) : (
          <p className="mt-4 text-[10.5px] font-semibold uppercase tracking-[0.24em] text-white/45">O‘tkazib yuborish uchun bosing</p>
        )}
      </div>
    </div>
  );
};
