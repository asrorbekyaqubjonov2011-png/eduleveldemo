'use client';
import React, { useMemo, useRef } from 'react';
import { Star, Quote } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ensureGsap, gsap, prefersReducedMotion, subscribeScroll, useGSAP, type ScrollFrame } from '../../lib/motion';
import { cn } from '../ui/styles';

interface Card {
  id: string;
  name: string;
  subtitle?: string;
  text: string;
  rating?: number;
  badge?: string;
  photoUrl?: string;
}

/**
 * Testimonials marquee — two rows of real opinions drifting in opposite directions.
 * Sources: owner-approved reviews, plus stories from published certificate results.
 * Scroll velocity briefly speeds the rows up (and reverses with the scroll direction).
 */
export const TestimonialsMarquee: React.FC = () => {
  const { db } = useApp();
  const root = useRef<HTMLElement | null>(null);

  const cards: Card[] = useMemo(() => {
    const reviews: Card[] = (db.reviews || [])
      .filter((r) => r.status === 'approved' && r.text)
      .map((r) => ({ id: r.id, name: r.name, subtitle: r.subtitle, text: r.text, rating: r.rating, photoUrl: r.photoUrl }));
    const stories: Card[] = (db.studentResults || [])
      .filter((r) => r.isPublished && (r.story || r.description))
      .map((r) => ({
        id: 'res-' + r.id,
        name: r.studentName,
        subtitle: [r.certificateType, r.region].filter(Boolean).join(' · '),
        text: (r.story || r.description || '').trim(),
        badge: r.score,
        photoUrl: r.photoUrl
      }));
    return [...reviews, ...stories];
  }, [db.reviews, db.studentResults]);

  const rows = [cards];

  useGSAP(
    () => {
      ensureGsap();
      const el = root.current;
      if (!el || prefersReducedMotion()) return;
      const tracks = gsap.utils.toArray<HTMLElement>('.marquee-track', el);
      const tweens = tracks.map((t) =>
        gsap.fromTo(t, { xPercent: 0 }, { xPercent: -50, ease: 'none', duration: Math.max(28, t.children.length * 7), repeat: -1 })
      );
      // The drift runs only while the row is on screen and not under the reader's pointer: off screen it costs nothing.
      // On/off screen comes from an IntersectionObserver; the scroll engine adds the speed-up while the page moves.
      let visible = false;
      let hovered = false;
      const sync = () => tweens.forEach((tw) => (visible && !hovered ? tw.resume() : tw.pause()));
      const io = new IntersectionObserver(
        (entries) => {
          visible = entries[entries.length - 1]?.isIntersecting ?? false;
          sync();
        },
        { rootMargin: '0px 0px 0px 0px' }
      );
      io.observe(el);
      // Scroll velocity nudges the speed; direction follows the scroll direction.
      let decay: gsap.core.Tween | null = null;
      const unsubscribeScroll = subscribeScroll({
        write: (f: ScrollFrame) => {
          if (!visible || f.dir === 0) return;
          const v = Math.min(4, 1 + Math.abs(f.velocity) / 600);
          const dir = f.dir === -1 ? -1 : 1;
          tweens.forEach((tw) => tw.timeScale(v * dir));
          decay?.kill();
          decay = gsap.to(tweens, { timeScale: dir, duration: 1.2, ease: 'power2.out', delay: 0.05 });
        }
      });
      sync();
      const enter = () => {
        hovered = true;
        sync();
      };
      const leave = () => {
        hovered = false;
        sync();
      };
      el.addEventListener('mouseenter', enter);
      el.addEventListener('mouseleave', leave);
      return () => {
        io.disconnect();
        unsubscribeScroll();
        decay?.kill();
        el.removeEventListener('mouseenter', enter);
        el.removeEventListener('mouseleave', leave);
      };
    },
    { scope: root, dependencies: [cards.length] }
  );

  // The anchor section always renders so the "Fikrlar" menu link never points nowhere.
  const hasMarquee = cards.length >= 2;

  return (
    <section ref={root} id="testimonials" aria-label="O‘quvchilar fikrlari" className="relative overflow-hidden bg-[#0d1426] py-16 text-white sm:py-24">
      <div className="mx-auto max-w-[1240px] px-5 sm:px-8 lg:px-10" data-reveal>
        <span className="glass-subtle inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-ink-muted dark:text-stone-300">
          <span className="h-1.5 w-1.5 rounded-full bg-ember-500 shadow-[0_0_10px_rgba(255,138,43,0.9)]" />
          Fikrlar
        </span>
        <h2 className="mt-5 max-w-[640px] font-display text-[clamp(2rem,4.2vw,3.3rem)] font-extrabold leading-[1.03] tracking-[-0.04em] text-white">
          Ular nima <span className="word-ember">deydi</span>
        </h2>
      </div>

      {!hasMarquee ? (
        <p className="mt-8 max-w-[520px] text-[15px] leading-relaxed text-white/70">
          Tez orada o‘quvchilarimizning fikrlari shu yerda paydo bo‘ladi.
        </p>
      ) : null}
      {hasMarquee ? <div
        className="mt-10 space-y-5"
        style={{
          WebkitMaskImage: 'linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)',
          maskImage: 'linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)'
        }}
      >
        {rows.map((row, ri) => (
          <div key={ri} className="overflow-hidden motion-reduce:overflow-x-auto">
            <div className="marquee-track flex w-max gap-5 pr-5 will-change-transform">
              {(() => {
                // Each half of the loop must be wider than the screen, so short rows are repeated.
                const rep = Math.max(1, Math.ceil(6 / row.length));
                const half = Array.from({ length: rep }, () => row).flat();
                return [...half, ...half];
              })().map((c, i, all) => (
                <article
                  key={c.id + '-' + i}
                  aria-hidden={i >= all.length / 2 || i >= row.length ? true : undefined}
                  className="group relative flex w-[min(82vw,400px)] shrink-0 flex-col rounded-[28px] border border-amber-300/15 bg-white/[0.06] p-6 transition-transform duration-500 hover:-translate-y-1 hover:border-amber-300/40"
                >
                  <Quote className="absolute right-5 top-5 h-8 w-8 text-ember-500/15" />
                  <div className="flex items-center gap-3">
                    {c.photoUrl ? (
                      <img src={c.photoUrl} alt="" loading="lazy" className="h-11 w-11 rounded-full object-cover ring-2 ring-white/60 dark:ring-white/10" />
                    ) : (
                      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-b from-[#ffa149] to-[#f2650f] text-[15px] font-bold text-white">
                        {c.name.charAt(0)}
                      </span>
                    )}
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-white">{c.name}</div>
                      {c.subtitle ? <div className="truncate text-[12px] text-white/55">{c.subtitle}</div> : null}
                    </div>
                  </div>
                  {c.rating ? (
                    <div className="mt-4 flex gap-0.5 text-ember-500" aria-label={`${c.rating} yulduz`}>
                      {Array.from({ length: 5 }).map((_, k) => (
                        <Star key={k} className={cn('h-3.5 w-3.5', k < c.rating! ? 'fill-current' : 'opacity-25')} />
                      ))}
                    </div>
                  ) : c.badge ? (
                    <span className="mt-4 w-fit rounded-full bg-ember-500/12 px-3 py-1 text-[11.5px] font-semibold text-ember-700 dark:text-ember-300">{c.badge}</span>
                  ) : null}
                  <p className="mt-3 line-clamp-5 text-[14px] leading-relaxed text-white/80">{c.text}</p>
                </article>
              ))}
            </div>
          </div>
        ))}
      </div> : null}
    </section>
  );
};
