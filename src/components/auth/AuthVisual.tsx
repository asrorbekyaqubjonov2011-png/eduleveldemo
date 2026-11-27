'use client';
import React, { useEffect, useRef } from 'react';
import { Flame, Mic, Play, Sparkles, Headphones, PenLine } from 'lucide-react';
import { prefersReducedMotion } from '../../lib/motion';

/** Heights (%) of the speaking waveform bars. Decorative only. */
const WAVE = [34, 62, 46, 84, 56, 92, 40, 74, 52, 88, 44, 70, 60, 96, 38, 66];

/** Depth factor for the pointer parallax: bigger = moves more. */
const depth = (d: number): React.CSSProperties => ({ ['--d' as string]: d } as React.CSSProperties);

/**
 * Visual field of the auth page: a bright colour field, a light beam, floating study
 * cards that follow the pointer with depth, and a rotating badge. Purely decorative:
 * it shows no data and no invented numbers.
 */
export const AuthVisual: React.FC = () => {
  const root = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = root.current;
    if (!el || prefersReducedMotion() || !window.matchMedia('(pointer: fine)').matches) return;
    let raf = 0;
    let tx = 0;
    let ty = 0;
    let x = 0;
    let y = 0;
    const loop = () => {
      x += (tx - x) * 0.09;
      y += (ty - y) * 0.09;
      el.style.setProperty('--px', x.toFixed(4));
      el.style.setProperty('--py', y.toFixed(4));
      raf = Math.abs(tx - x) + Math.abs(ty - y) > 0.0008 ? requestAnimationFrame(loop) : 0;
    };
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(loop);
    };
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      tx = (e.clientX - r.left) / r.width - 0.5;
      ty = (e.clientY - r.top) / r.height - 0.5;
      kick();
    };
    const onLeave = () => {
      tx = 0;
      ty = 0;
      kick();
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    el.addEventListener('pointerleave', onLeave);
    return () => {
      window.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={root} aria-hidden="true" className="absolute inset-0 overflow-hidden">
      <div className="auth-field absolute inset-0" />
      <span className="auth-orb auth-orb-1" />
      <span className="auth-orb auth-orb-2" />
      <span className="auth-orb auth-orb-3" />
      <span className="auth-beam" />
      <div className="auth-dots absolute inset-0" />
      <div className="grain absolute inset-0" />

      {/* Rotating badge with circular text */}
      <div className="auth-depth absolute right-[7%] top-[2%] h-28 w-28" style={depth(0.5)}>
        <svg className="auth-spin h-full w-full" viewBox="0 0 120 120">
          <defs>
            <path id="auth-circle" d="M60,60 m-45,0 a45,45 0 1,1 90,0 a45,45 0 1,1 -90,0" />
          </defs>
          <text fill="#ffffff" fontSize="10" fontWeight="700" letterSpacing="2.6">
            <textPath href="#auth-circle">LEARN · PRACTICE · IMPROVE · LEVEL UP ·</textPath>
          </text>
        </svg>
        <span className="absolute inset-0 m-auto flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#e8457a] shadow-[0_10px_24px_-10px_rgba(60,20,80,0.6)]">
          <Sparkles className="h-5 w-5" />
        </span>
      </div>

      {/* Video lesson card with a moving progress bar */}
      <div className="auth-depth absolute right-[7%] top-[17%] w-[240px]" style={depth(1)}>
        <div className="auth-float auth-float-a rounded-[26px] p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-[#e8457a] shadow-[0_10px_24px_-10px_rgba(60,20,80,0.6)]">
              <Play className="h-5 w-5 translate-x-[1px] fill-current" />
            </span>
            <span className="min-w-0">
              <span className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-white/80">Video dars</span>
              <span className="block truncate text-[14px] font-bold text-white">Present Simple</span>
            </span>
          </div>
          <span className="mt-4 block h-2 overflow-hidden rounded-full bg-white/35">
            <span className="auth-progress block h-full w-full rounded-full bg-white" />
          </span>
        </div>
      </div>

      {/* Streak badge */}
      <div className="auth-depth absolute left-[7%] top-[32%]" style={depth(0.7)}>
        <div className="auth-float auth-float-b flex items-center gap-2.5 rounded-full py-2.5 pl-2.5 pr-5">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#ff7a3d] text-white">
            <Flame className="auth-flame h-5 w-5" />
          </span>
          <span className="text-[14px] font-bold text-white">Streak davom etsin</span>
        </div>
      </div>

      {/* Speaking waveform */}
      <div className="auth-depth absolute right-[9%] top-[43%] w-[270px]" style={depth(1.25)}>
        <div className="auth-float auth-float-c rounded-[26px] p-4">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-[13px] font-bold text-white">
              <Mic className="h-4 w-4" /> Speaking
            </span>
            <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/85">
              <span className="auth-live h-1.5 w-1.5 rounded-full bg-white" /> jonli
            </span>
          </div>
          <div className="mt-3 flex h-12 items-end gap-[4px]">
            {WAVE.map((h, i) => (
              <span
                key={i}
                className="auth-bar flex-1 rounded-full bg-white"
                style={{ height: `${h}%`, animationDelay: `${(i % 5) * 0.12}s`, animationDuration: `${1 + (i % 4) * 0.22}s` }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Skill chips */}
      <div className="auth-depth absolute left-[9%] top-[54%]" style={depth(0.9)}>
        <div className="flex gap-2">
          {[
            { icon: Headphones, label: 'Listening' },
            { icon: PenLine, label: 'Writing' }
          ].map((s, i) => (
            <span key={s.label} className={`auth-float auth-float-${i === 0 ? 'd' : 'a'} flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-bold text-white`}>
              <s.icon className="h-3.5 w-3.5" /> {s.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
