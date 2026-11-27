'use client';
import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { prefersReducedMotion, subscribeScroll, type ScrollFrame } from '../../lib/motion';
import { EdubekAvatar, type EdubekMood } from '../site2/EdubekAvatar';

/** Learning path: CEFR level and the IELTS band it leads to. These are targets, not statistics. */
const STEPS = [
  { level: 'B1', band: '5.5', title: 'Asos', text: 'Kundalik mavzular, sodda matnlar va asosiy grammatika.', color: '#ffb36b' },
  { level: 'B2', band: '6.0', title: 'O‘rta', text: 'Murakkabroq matnlar, akademik lug‘at va Writing Task 2 asoslari.', color: '#ff8a3d' },
  { level: 'C1', band: '7.5', title: 'Ilg‘or', text: 'Akademik Reading va Listening, chuqur Writing va Speaking mashqlari.', color: '#f0557a' },
  { level: 'C1+', band: '8.0', title: 'Mahorat', text: 'Mock imtihonlar va har bir ko‘nikma bo‘yicha batafsil tahlil.', color: '#8b5cf6' }
];

/** Road geometry in SVG units. */
const VB_W = 1000;
const VB_H = 380;
const ROAD = 'M 70 250 C 190 70, 330 80, 420 190 S 610 330, 700 190 S 860 40, 935 120';
/** Where each station sits along the road (0 = start, 1 = end). */
const STOPS = [0.04, 0.36, 0.67, 0.98];
const CONFETTI = ['#ffb36b', '#ff7a3d', '#f0557a', '#8b5cf6', '#ffe08a'];
/** The road is sampled this many times, once; the scroll walk then looks a point up instead of measuring the path. */
const ROAD_SAMPLES = 240;

type Burst = { id: number; x: number; y: number; parts: { a: number; d: number; c: string }[] };

/**
 * Landing section: a playful road from B1 to C1+.
 * Scroll moves Edubek along the road; each station lights up when he reaches it and
 * a burst of colour marks the arrival. On phones the same steps show as a vertical path.
 */
export const LevelsSection: React.FC = () => {
  const { db } = useApp();
  const sec = db.siteSections.find((s) => s.key === 'levels');
  const root = useRef<HTMLElement | null>(null);
  const stage = useRef<HTMLDivElement | null>(null);
  const road = useRef<SVGPathElement | null>(null);
  const mascot = useRef<HTMLDivElement | null>(null);
  const prevLit = useRef(0);
  const [points, setPoints] = useState<{ x: number; y: number }[]>([]);
  const [lit, setLit] = useState(0);
  const [mood, setMood] = useState<EdubekMood>('idle');
  const [bursts, setBursts] = useState<Burst[]>([]);

  // The road draws itself the first time the section comes into view.
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    if (prefersReducedMotion()) {
      el.setAttribute('data-in', '');
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          el.setAttribute('data-in', '');
          io.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Road samples (SVG units) and station positions on the road, measured once.
  const samples = useRef<{ x: number; y: number }[]>([]);
  useEffect(() => {
    const path = road.current;
    if (!path) return;
    const L = path.getTotalLength();
    const s: { x: number; y: number }[] = [];
    for (let i = 0; i <= ROAD_SAMPLES; i += 1) {
      const pt = path.getPointAtLength((i / ROAD_SAMPLES) * L);
      s.push({ x: pt.x, y: pt.y });
    }
    samples.current = s;
    setPoints(
      STOPS.map((p) => {
        const pt = path.getPointAtLength(p * L);
        return { x: pt.x, y: pt.y };
      })
    );
  }, []);

  // Scroll walk: Edubek follows the road while the stage moves through the viewport. One scroll subscription;
  // the stage's place and size are measured on load and on resize, and each frame only writes what changed.
  useEffect(() => {
    const st = stage.current;
    if (!st) return;
    if (prefersReducedMotion()) {
      setLit(STOPS.length);
      return;
    }
    // The road is drawn by scroll position, in step with Edubek's walk.
    const drawn = Array.from(st.querySelectorAll<SVGPathElement>('.levels-road-base, .levels-road, .levels-road-mask'));
    const dash = st.querySelector<SVGPathElement>('.levels-road-dash');
    const m = mascot.current;
    let docTop = 0;
    let width = 0;
    let height = 0;
    let halfW = 0;
    let halfH = 0;
    let vw = -1;
    let vh = -1;
    let dirty = true;
    const measure = () => {
      const r = st.getBoundingClientRect();
      docTop = r.top + window.scrollY;
      width = r.width;
      height = r.height;
      if (m) {
        halfW = m.offsetWidth / 2;
        halfH = m.offsetHeight / 2;
      }
      vw = window.innerWidth;
      vh = window.innerHeight;
      dirty = false;
    };
    const sizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => (dirty = true)) : null;
    sizeObserver?.observe(document.body);
    let lastOffset = NaN;
    let lastDash = '';
    let lastIndex = -1;
    let lastLit = -1;
    let lastMood = '';
    const unsubscribe = subscribeScroll({
      read: () => {
        if (dirty || window.innerHeight !== vh || window.innerWidth !== vw) measure();
      },
      write: (f: ScrollFrame) => {
        const top = docTop - f.y;
        const p = Math.min(1, Math.max(0, (f.vh - top) / (f.vh + height)));
        const t = Math.min(1, Math.max(0, (p - 0.1) / 0.8));
        const offset = 1 - t;
        if (offset !== lastOffset) {
          lastOffset = offset;
          drawn.forEach((seg) => seg.style.setProperty('stroke-dashoffset', String(offset)));
        }
        const dashOpacity = t > 0.01 ? '0.9' : '0';
        if (dash && dashOpacity !== lastDash) {
          lastDash = dashOpacity;
          dash.style.setProperty('opacity', dashOpacity);
        }
        const index = Math.round(t * ROAD_SAMPLES);
        const pt = samples.current[index];
        if (m && pt && index !== lastIndex) {
          lastIndex = index;
          // Moved with transform only: no left/top change, so no layout on each step.
          const x = (pt.x / VB_W) * width - halfW;
          const y = (pt.y / VB_H) * height - halfH;
          m.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
        }
        const count = STOPS.filter((s) => t >= s - 0.005).length;
        if (count !== lastLit) {
          lastLit = count;
          setLit(count);
        }
        const nextMood = t >= 0.995 ? 'happy' : 'idle';
        if (nextMood !== lastMood) {
          lastMood = nextMood;
          setMood(nextMood);
        }
      }
    });
    return () => {
      unsubscribe();
      sizeObserver?.disconnect();
    };
  }, []);

  // Each new station reached sends a burst of confetti from that station.
  useEffect(() => {
    if (lit <= prevLit.current) {
      prevLit.current = lit;
      return;
    }
    const pt = points[lit - 1];
    prevLit.current = lit;
    if (!pt) return;
    const id = Date.now() + lit;
    const parts = Array.from({ length: 18 }, (_, i) => ({
      a: (i / 18) * Math.PI * 2 + Math.random() * 0.35,
      d: 46 + Math.random() * 50,
      c: CONFETTI[i % CONFETTI.length]
    }));
    setBursts((b) => [...b, { id, x: pt.x, y: pt.y, parts }]);
    window.setTimeout(() => setBursts((b) => b.filter((x) => x.id !== id)), 1500);
  }, [lit, points]);

  return (
    <section ref={root} id="levels" aria-labelledby="levels-title" data-scrub className="levels-root relative isolate overflow-hidden py-20 sm:py-28">
      {/* Playful background: drifting colour, twinkling stars */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <span className="levels-blob" data-parallax="0.22" style={{ left: '-6%', top: '8%', width: 420, height: 420, background: '#ffd1a8' }} />
        <span className="levels-blob" data-parallax="-0.16" style={{ right: '-8%', top: '34%', width: 380, height: 380, background: '#cbb8ff', animationDelay: '-6s' }} />
        <span className="levels-blob" data-parallax="0.3" style={{ left: '34%', bottom: '-12%', width: 320, height: 320, background: '#ffb0c8', animationDelay: '-11s' }} />
        <span className="levels-star" style={{ left: '12%', top: '18%' }} />
        <span className="levels-star" style={{ left: '78%', top: '12%', animationDelay: '-1.2s' }} />
        <span className="levels-star" style={{ left: '88%', top: '62%', animationDelay: '-2s' }} />
        <span className="levels-star" style={{ left: '22%', top: '78%', animationDelay: '-0.6s' }} />
      </div>

      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="mx-auto max-w-2xl text-center" data-reveal="rise">
          <span className="inline-flex items-center gap-2 rounded-full border border-line/80 bg-white/60 px-3.5 py-1.5 text-[11.5px] font-bold uppercase tracking-[0.14em] text-[#c4520a] dark:border-white/10 dark:bg-white/[0.04] dark:text-[#ffc982]">
            Yo‘l xaritasi
          </span>
          <h2 id="levels-title" className="mt-5 font-display text-[clamp(2rem,4.4vw,3.2rem)] font-extrabold leading-[1.04] tracking-[-0.035em] text-ink dark:text-white">
            {sec?.title || 'B1 dan C1 gacha — bosqichma-bosqich'}
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-ink-muted dark:text-white/65">
            {sec?.subtitle || 'Har bir bosqich aniq maqsad balli bilan. Qayerda turganingizni bilib, keyingi qadamni rejalang.'}
          </p>
        </div>

        {/* Scroll progress through the section: ScrollReveals sets --scrub from the section's position. */}
        <div aria-hidden="true" className="mx-auto mt-8 h-1.5 max-w-xs overflow-hidden rounded-full bg-[#f2650f]/[0.14] dark:bg-white/10">
          <span className="scrub-x block h-full w-full rounded-full bg-gradient-to-r from-[#ffb36b] via-[#f0557a] to-[#8b5cf6]" />
        </div>

        {/* Desktop: the road. Edubek walks it as you scroll. */}
        <div ref={stage} className="levels-stage relative mx-auto mt-6 hidden h-[400px] max-w-5xl md:block">
          <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
            <defs>
              <linearGradient id="levelsRoad" x1="0" x2="1" y1="0" y2="0">
                <stop offset="0" stopColor="#ffb36b" />
                <stop offset="0.5" stopColor="#ff7a3d" />
                <stop offset="1" stopColor="#8b5cf6" />
              </linearGradient>
              {/* Same drawing as the road: the dashed centre line only shows where the road has been drawn. */}
              <mask id="levelsDrawMask" maskUnits="userSpaceOnUse" x="0" y="0" width={VB_W} height={VB_H}>
                <path d={ROAD} pathLength={1} fill="none" stroke="#ffffff" strokeWidth="18" strokeLinecap="round" className="levels-road-mask" />
              </mask>
            </defs>
            <path ref={road} d={ROAD} pathLength={1} fill="none" stroke="url(#levelsRoad)" strokeWidth="36" strokeLinecap="round" className="levels-road-base" opacity="0.25" />
            <path d={ROAD} pathLength={1} fill="none" stroke="url(#levelsRoad)" strokeWidth="14" strokeLinecap="round" className="levels-road" />
            <path d={ROAD} fill="none" stroke="#ffffff" strokeWidth="4" strokeDasharray="14 16" strokeLinecap="round" className="levels-road-dash" mask="url(#levelsDrawMask)" />
          </svg>

          {STEPS.map((st, i) => {
            const pt = points[i];
            if (!pt) return null;
            const on = lit > i;
            const above = i % 2 === 0;
            const align = i === 0 ? 'left-0' : i === STEPS.length - 1 ? 'right-0' : 'left-1/2 -translate-x-1/2';
            return (
              <div
                key={st.level}
                className="levels-station absolute z-10"
                style={{ left: `${(pt.x / VB_W) * 100}%`, top: `${(pt.y / VB_H) * 100}%`, transform: 'translate(-50%, -50%)' }}
              >
                <span
                  className={`flex h-16 w-16 items-center justify-center rounded-full font-display text-[17px] font-extrabold text-white transition-all duration-700 ${on ? 'levels-pop opacity-100' : 'opacity-45 grayscale'}`}
                  style={{
                    background: `linear-gradient(160deg, ${st.color}, #e8457a)`,
                    boxShadow: on ? `0 0 0 6px rgba(255,255,255,0.75), 0 18px 36px -12px ${st.color}` : '0 0 0 4px rgba(255,255,255,0.6)'
                  }}
                >
                  {st.level}
                </span>
                <div
                  className={`absolute w-[236px] rounded-2xl border border-white/70 bg-white/90 p-4 shadow-xl backdrop-blur transition-all duration-700 ${align} ${above ? 'bottom-[calc(100%+14px)]' : 'top-[calc(100%+14px)]'} ${on ? 'translate-y-0 opacity-100' : `pointer-events-none opacity-0 ${above ? 'translate-y-3' : '-translate-y-3'}`}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-muted">{st.title}</span>
                    <span className="rounded-full bg-ink px-2.5 py-1 text-[11px] font-bold text-white">IELTS {st.band}</span>
                  </div>
                  <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">{st.text}</p>
                </div>
              </div>
            );
          })}

          {/* Edubek: the traveller on the road */}
          <div ref={mascot} className="levels-mascot pointer-events-none absolute left-0 top-0 z-20" style={{ transform: 'translate3d(0, 0, 0)' }}>
            <EdubekAvatar mood={mood} size={84} />
          </div>

          {bursts.map((b) =>
            b.parts.map((p, k) => (
              <span
                key={`${b.id}-${k}`}
                className="levels-part absolute z-30 h-2.5 w-2.5 rounded-full"
                style={{
                  left: `${(b.x / VB_W) * 100}%`,
                  top: `${(b.y / VB_H) * 100}%`,
                  background: p.c,
                  ['--dx' as string]: `${Math.cos(p.a) * p.d}px`,
                  ['--dy' as string]: `${Math.sin(p.a) * p.d}px`
                } as React.CSSProperties}
              />
            ))
          )}
        </div>
        <p className="mt-2 hidden text-center text-[13px] text-ink-muted md:block">Edubek yo‘l bo‘ylab yuradi: scroll qiling va bosqichlarni oching.</p>

        {/* Phones: the same steps as a vertical path */}
        <ol className="mt-10 space-y-5 md:hidden">
          {STEPS.map((st, i) => (
            <li key={st.level} data-reveal="left" data-reveal-delay={i * 120} className="flex gap-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full font-display text-[16px] font-extrabold text-white" style={{ background: `linear-gradient(160deg, ${st.color}, #e8457a)` }}>
                {st.level}
              </span>
              <div className="flex-1 rounded-2xl border border-line/70 bg-white/85 p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-muted dark:text-white/55">{st.title}</span>
                  <span className="rounded-full bg-ink px-2.5 py-1 text-[11px] font-bold text-white">IELTS {st.band}</span>
                </div>
                <p className="mt-2 text-[13.5px] leading-relaxed text-ink-muted dark:text-white/65">{st.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
};
