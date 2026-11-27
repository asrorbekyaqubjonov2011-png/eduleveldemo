'use client';
import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ArrowRight, Users, Award, GraduationCap, Headphones, PenLine, BookOpen, MousePointer2, Mic } from 'lucide-react';
import { ensureGsap, prefersReducedMotion, useGSAP, gsap, MOTION } from '../../lib/motion';
import { imageKitUrl } from '../../lib/media/imageUrl';

const HEADLINE_TOP = ['Learn', 'Smarter.'];
const HEADLINE_BOTTOM = ['Achieve', 'Bigger.'];

/** Counts up to a real value from the instructor profile. Respects reduced motion. */
const CountUp: React.FC<{ value: number }> = ({ value }) => {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (prefersReducedMotion()) {
      setN(value);
      return;
    }
    const start = performance.now();
    const dur = 1400;
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / dur);
      setN(Math.round(value * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{n.toLocaleString('en-US')}</>;
};

/**
 * HeroSection: a bright, living first screen.
 * Layers: a soft mesh of drifting colour light, a dot grid, a shimmering headline,
 * liquid-glass badges and a floating instructor card that tilts with the pointer.
 * Entrance is a staggered GSAP timeline; everything is disabled for reduced motion.
 */
export const HeroSection: React.FC = () => {
  const { db, currentUser, setActiveSite } = useApp();
  const root = useRef<HTMLElement | null>(null);
  const card = useRef<HTMLDivElement | null>(null);

  const heroSection = db.siteSections.find((s) => s.key === 'hero');
  const t = db.teacherProfile;
  const students = t.studentsCount ?? 0;
  const certs = t.nationalCertCount ?? 0;
  const grants = t.grantCount ?? 0;
  const stats = [
    { icon: Users, value: students, label: 'Faol o‘quvchilar' },
    { icon: Award, value: certs, label: 'IELTS 7.5+ & C1' },
    { icon: GraduationCap, value: grants, label: 'Grant yutganlar' }
  ].filter((s) => s.value > 0);
  const avatars = (db.studentResults || []).filter((r) => r.isPublished && r.photoUrl).slice(0, 3);
  const initials = (t.name || 'E').split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

  useGSAP(
    () => {
      ensureGsap();
      const el = root.current;
      if (!el) return;
      const q = gsap.utils.selector(el);

      if (prefersReducedMotion()) {
        gsap.set(q('[data-hero-in], [data-hero-card], [data-hero-chip]'), { opacity: 1, y: 0, scale: 1 });
        return;
      }

      const intro = gsap.timeline({ defaults: { ease: MOTION.ease.expo } });
      intro
        .fromTo(q('.hero-blob'), { scale: 0.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 1.8, stagger: 0.12, ease: 'power2.out' }, 0)
        .fromTo(q('[data-hero-badge]'), { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8 }, 0.2)
        .fromTo(q('.hero-word > span'), { yPercent: 115 }, { yPercent: 0, duration: 1.1, stagger: 0.09 }, 0.35)
        .fromTo(q('[data-hero-in]'), { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, stagger: 0.1 }, 0.75)
        .fromTo(q('[data-hero-card]'), { y: 70, opacity: 0, rotate: 4 }, { y: 0, opacity: 1, rotate: 0, duration: 1.3 }, 0.55)
        .fromTo(q('[data-hero-chip]'), { scale: 0.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.7, stagger: 0.12, ease: 'back.out(1.6)' }, 1.1);

      // Pointer tilt on the instructor card (fine pointers only).
      const c = card.current;
      if (c && window.matchMedia('(pointer: fine)').matches) {
        const rx = gsap.quickTo(c, 'rotationX', { duration: 0.6, ease: 'power3.out' });
        const ry = gsap.quickTo(c, 'rotationY', { duration: 0.6, ease: 'power3.out' });
        const onMove = (e: PointerEvent) => {
          const r = c.getBoundingClientRect();
          const x = (e.clientX - r.left) / r.width - 0.5;
          const y = (e.clientY - r.top) / r.height - 0.5;
          ry(x * 3);
          rx(-y * 3);
        };
        const onLeave = () => {
          rx(0);
          ry(0);
        };
        window.addEventListener('pointermove', onMove);
        el.addEventListener('pointerleave', onLeave);
        return () => {
          window.removeEventListener('pointermove', onMove);
          el.removeEventListener('pointerleave', onLeave);
        };
      }
    },
    { scope: root }
  );

  if (heroSection && !heroSection.isVisible) return null;

  const start = () => {
    if (currentUser) setActiveSite('site2_lms');
    else setActiveSite('auth');
  };

  return (
    <section
      ref={root}
      id="top"
      aria-label="Edu Level"
      className="relative isolate min-h-[100svh] overflow-hidden bg-[#fbf6ef] text-ink dark:bg-[#07080b] dark:text-white"
    >
      {/* Living mesh of coloured light */}
      <div aria-hidden="true" className="absolute inset-0">
        <span className="hero-blob" style={{ left: '-12%', top: '-20%', width: '62vmax', height: '62vmax', background: 'radial-gradient(circle, #ffb36b 0%, rgba(255,179,107,0) 68%)', animation: 'auroraA 16s ease-in-out infinite' }} />
        <span className="hero-blob" style={{ right: '-14%', top: '-14%', width: '56vmax', height: '56vmax', background: 'radial-gradient(circle, #9fd3ff 0%, rgba(159,211,255,0) 68%)', animation: 'auroraB 19s ease-in-out infinite' }} />
        <span className="hero-blob" style={{ left: '-8%', bottom: '-30%', width: '50vmax', height: '50vmax', background: 'radial-gradient(circle, #d9c4ff 0%, rgba(217,196,255,0) 68%)', animation: 'auroraC 22s ease-in-out infinite' }} />
        <span className="hero-blob" style={{ right: '18%', bottom: '-18%', width: '36vmax', height: '36vmax', background: 'radial-gradient(circle, #ffcfa6 0%, rgba(255,207,166,0) 68%)', animation: 'auroraA 13s ease-in-out infinite' }} />
        <div className="hero-dots absolute inset-0" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#fbf6ef] to-transparent dark:from-[#07080b]" />
      </div>

      <div className="relative z-10 mx-auto grid min-h-[100svh] max-w-[1320px] items-center gap-12 px-5 pb-28 pt-32 sm:px-8 lg:grid-cols-[1.12fr_0.88fr] lg:gap-8 lg:px-12">
        {/* Copy */}
        <div className="hero-scroll-text max-w-[720px]">
          <div
            data-hero-badge
            className="liquid-glass relative inline-flex items-center gap-2.5 rounded-full py-1.5 pl-2 pr-4 text-[12.5px] font-semibold text-ink/85 dark:text-white/90"
          >
            <span className="relative flex h-5 w-5 items-center justify-center rounded-full bg-[#ff8a2b]/20">
              <span className="h-2 w-2 rounded-full bg-[#ff7a1a] shadow-[0_0_12px_2px_rgba(255,138,43,0.7)]" />
            </span>
            International Learning Platform
            <span className="hidden text-ink/30 sm:inline">·</span>
            <span className="hidden text-[#c4520a] dark:text-[#ffc982] sm:inline">IELTS · CEFR · General English</span>
          </div>

          <h2 className="mt-7 font-display text-[clamp(2.7rem,6.5vw,5.3rem)] font-extrabold leading-[0.96] tracking-[-0.045em]">
            <span className="block">
              {HEADLINE_TOP.map((w, i) => (
                <span key={w} className={`hero-word inline-block overflow-hidden pb-[0.22em] -mb-[0.22em] align-bottom${i < 1 ? ' mr-[0.24em]' : ''}`}>
                  <span className="inline-block">
                    {w}
                    {i < HEADLINE_TOP.length - 1 ? ' ' : ''}
                  </span>
                </span>
              ))}
            </span>
            <span className="block">
              {HEADLINE_BOTTOM.map((w, i) => (
                <span key={w} className={`hero-word inline-block overflow-hidden pb-[0.3em] -mb-[0.3em] align-bottom${i < 1 ? ' mr-[0.24em]' : ''}`}>
                  <span className="hero-shimmer inline-block pb-[0.3em] -mb-[0.3em]">
                    {w}
                    {i < HEADLINE_BOTTOM.length - 1 ? ' ' : ''}
                  </span>
                </span>
              ))}
            </span>
          </h2>

          <p data-hero-in className="mt-6 max-w-[540px] text-[clamp(1rem,1.5vw,1.2rem)] leading-relaxed text-ink-muted dark:text-white/75">
            IELTS, CEFR va General English uchun yagona ta’lim hamkoringiz — AI bilan mashq qiling, har kuni izchil o‘sing va
            global maqsadlaringizga yeting.
          </p>

          <div data-hero-in className="mt-9 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={start}
              className="hero-cta group relative inline-flex h-14 items-center gap-2.5 overflow-hidden rounded-full bg-gradient-to-b from-[#ffa149] to-[#f2650f] px-7 text-[15px] font-semibold text-white shadow-[0_18px_40px_-14px_rgba(242,101,15,0.85),inset_0_1px_0_rgba(255,255,255,0.35)]"
            >
              <span aria-hidden="true" className="hero-cta-sheen absolute inset-0" />
              <span className="relative">{currentUser ? 'Kabinetga o‘tish' : 'O‘qishni boshlash'}</span>
              <ArrowRight className="relative h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </button>
            <a
              href="#books"
              className="liquid-glass relative inline-flex h-14 items-center rounded-full px-6 text-[15px] font-semibold text-ink dark:text-white"
            >
              Kitoblarni ko‘rish
            </a>
          </div>

          {stats.length > 0 ? (
            <div
              data-hero-in
              className="liquid-glass relative mt-10 grid max-w-[600px] rounded-[24px] px-2 py-4 sm:px-3"
              style={{ gridTemplateColumns: `repeat(${stats.length}, minmax(0, 1fr))` }}
            >
              {stats.map((s) => (
                <div key={s.label} className="flex items-center gap-3 border-r border-ink/10 px-3 last:border-r-0 dark:border-white/10 sm:px-5">
                  <s.icon className="hidden h-6 w-6 shrink-0 text-[#ff7a1a] sm:block" />
                  <div className="min-w-0">
                    <div className="font-display text-[clamp(1.15rem,2.2vw,1.7rem)] font-extrabold leading-none tracking-tight tabular-nums">
                      <CountUp value={s.value} />+
                    </div>
                    <div className="mt-1.5 truncate text-[11.5px] text-ink-muted dark:text-white/60">{s.label}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        {/* Instructor card with floating liquid chips */}
        <div className="hero-scroll-card relative mx-auto w-full max-w-[380px] lg:mx-0 lg:justify-self-end" style={{ perspective: 1200 }}>
          <span aria-hidden="true" className="hero-ring pointer-events-none absolute -inset-5 rounded-[44px]" />
          <span data-hero-chip style={{ animationDelay: '0s' }} className="liquid-glass hero-chip hero-chip-float absolute -left-1 top-[14%] z-20 sm:-left-10 flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-bold text-ink dark:text-white">
            <Headphones className="h-4 w-4 text-[#ff7a1a]" /> Listening
          </span>
          <span data-hero-chip style={{ animationDelay: '-0.9s' }} className="liquid-glass hero-chip hero-chip-float absolute -right-6 top-[6%] z-20 hidden items-center gap-2 rounded-full px-4 py-2 text-[13px] font-bold text-ink dark:text-white sm:flex">
            <Mic className="h-4 w-4 text-[#ff7a1a]" /> Speaking
          </span>
          <span data-hero-chip style={{ animationDelay: '-1.7s' }} className="liquid-glass hero-chip hero-chip-float absolute -right-1 bottom-[20%] z-20 sm:-right-8 flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-bold text-ink dark:text-white">
            <PenLine className="h-4 w-4 text-[#ff7a1a]" /> Writing AI
          </span>

          <div ref={card} data-hero-card className="liquid-glass relative rounded-[32px] p-3 [transform-style:preserve-3d]">
            <div className="relative h-[360px] overflow-hidden rounded-[24px]">
              {t.photoUrl ? (
                <img src={imageKitUrl(t.photoUrl)} alt={t.name} className="h-full w-full object-cover" loading="eager" fetchPriority="high" decoding="async" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#ffe2c4] via-[#ffc08a] to-[#ff9a5c]" aria-hidden="true">
                  <span className="font-display text-[96px] font-extrabold leading-none tracking-tight text-[#12100e]/80">{initials}</span>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#12100e]/75 via-[#12100e]/5 to-transparent" />
              <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-[#12100e]/70 px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#ffc982] backdrop-blur-md">
                Bosh metodist
              </span>
              <div className="absolute inset-x-4 bottom-4 text-white">
                <div className="font-display text-[20px] font-bold leading-tight">{t.name}</div>
                <div className="mt-1 line-clamp-2 text-[12px] leading-snug text-white/80">{t.title}</div>
              </div>
            </div>
            <div className="flex items-center justify-between px-2 pb-1 pt-3">
              <div className="flex -space-x-2">
                {avatars.map((a) => (
                  <img key={a.id} src={a.photoUrl} alt="" className="h-8 w-8 rounded-full border-2 border-white object-cover" loading="lazy" />
                ))}
              </div>
              <div className="text-right text-[11.5px] leading-tight text-ink-muted dark:text-white/70" style={students > 0 ? undefined : { visibility: 'hidden' }}>
                <span className="font-bold text-ink dark:text-white">{t.experienceYears} yil</span> tajriba
                <br />
                {students.toLocaleString('en-US')}+ o‘quvchi
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll hint */}
      <div className="hero-scroll-hint absolute inset-x-0 bottom-6 z-10 flex justify-center">
        <div className="liquid-glass relative flex items-center gap-2.5 rounded-full px-4 py-2 text-[12px] font-medium text-ink/75 dark:text-white/75">
          <MousePointer2 className="h-3.5 w-3.5 animate-scroll-hint" />
          Pastga suring
        </div>
      </div>
    </section>
  );
};
