'use client';
import { SCROLL_MOTION } from '../../lib/motion/tokens';
import { useEffect } from 'react';
import { isLite, watchScrollPerformance } from '../../lib/motion/perf';
import { watchScrollState } from '../../lib/motion/scrollState';
import { watchOffscreenSections } from '../../lib/motion/offscreen';
import { subscribeScroll, wakeScrollEngine, type ScrollFrame } from '../../lib/motion/scrollEngine';
import { prefersReducedMotion } from '../../lib/motion';
import { DISTANCE, DURATION, EASE, STAGGER } from '../../lib/motion/tokens';

/**
 * Scroll motion for the whole site. Mounted once in App.tsx.
 *
 * Reveal. An element with data-reveal animates in the first time it reaches the viewport.
 * Variants: fade | rise | zoom | scale | left | right | blur | mask | headline (default: rise).
 * data-reveal-delay, data-reveal-duration and data-reveal-distance tune the motion.
 * The state is the data-in attribute. React re-renders do not remove it, so revealed content
 * never blinks back to hidden. The motion runs through the Web Animations API, so hover and
 * transition styles on the same element keep working.
 *
 * Auto-tagging. Inside landing sections (section[id]) and the student and owner panels
 * (main .animate-section), cards in grids, list items, table rows, headings, paragraphs and
 * images are tagged automatically. An element inside an already tagged element is left to its
 * parent. Opt out with data-no-reveal on the element or on any ancestor.
 *
 * Parallax. data-parallax="0.2" drifts an element at a fraction of the scroll speed.
 * Use it on decorative elements or wrappers, not on an element that has its own translate.
 * Where the browser runs scroll-linked CSS (html.sd-native), the drift is done by the browser; otherwise
 * the scroll engine (scrollEngine.ts) moves the elements, reading every position before writing any.
 *
 * Scrub. data-scrub on an element publishes its scroll progress (0 to 1) as --scrub.
 * Children read it with the .scrub-x class, which turns them into a progress bar.
 *
 * Without JavaScript nothing is hidden. With prefers-reduced-motion only gentle fades play.
 */

const TARGET = '[data-reveal]';
const SKIP = '[data-reveal], [data-no-reveal]';
const ROOTS = 'section[id], main .animate-section';

const DEFAULT_DISTANCE: Record<string, number> = { rise: DISTANCE.rise, zoom: DISTANCE.zoom, left: DISTANCE.side, right: DISTANCE.side, blur: DISTANCE.blur, drop: DISTANCE.drop, tilt: DISTANCE.tilt, flip: DISTANCE.flip, grow: 0 };

/** Start and end frames per variant. Only the properties a variant changes are listed. */
function frames(kind: string, d: number): [Keyframe, Keyframe] {
  switch (kind) {
    case 'fade':
      return [{ opacity: 0 }, { opacity: 1 }];
    case 'scale':
      return [
        { opacity: 0, scale: '1.22' },
        { opacity: 1, scale: '1' }
      ];
    case 'zoom':
      return [
        { opacity: 0, translate: `0px ${d}px`, scale: '0.8' },
        { opacity: 1, translate: '0px 0px', scale: '1' }
      ];
    case 'left':
      return [
        { opacity: 0, translate: `${-d}px 0px` },
        { opacity: 1, translate: '0px 0px' }
      ];
    case 'right':
      return [
        { opacity: 0, translate: `${d}px 0px` },
        { opacity: 1, translate: '0px 0px' }
      ];
    case 'blur':
      return [
        { opacity: 0, translate: `0px ${d}px`, filter: 'blur(18px)' },
        { opacity: 1, translate: '0px 0px', filter: 'blur(0px)' }
      ];
    case 'drop':
      return [
        { opacity: 0, translate: `0px ${-d}px` },
        { opacity: 1, translate: '0px 0px' }
      ];
    case 'grow':
      return [
        { opacity: 0, scale: '0.6', filter: 'blur(14px)' },
        { opacity: 1, scale: '1', filter: 'blur(0px)' }
      ];
    case 'tilt':
      return [
        { opacity: 0, transform: `perspective(1000px) translateY(${d}px) rotateX(32deg)`, transformOrigin: '50% 0%' },
        { opacity: 1, transform: 'perspective(1000px) translateY(0px) rotateX(0deg)', transformOrigin: '50% 0%' }
      ];
    case 'flip':
      return [
        { opacity: 0, transform: `perspective(1000px) translateX(${-d}px) rotateY(-48deg)`, transformOrigin: '0% 50%' },
        { opacity: 1, transform: 'perspective(1000px) translateX(0px) rotateY(0deg)', transformOrigin: '0% 50%' }
      ];
    case 'wipe':
      return [
        { clipPath: 'inset(0 100% 0 0 round 24px)' },
        { clipPath: 'inset(0 0 0 0 round 24px)' }
      ];
    case 'headline':
      if (isLite()) return [{ opacity: 0, transform: 'translateY(28px)' }, { opacity: 1, transform: 'translateY(0px)' }];
      return [
        { opacity: 0, filter: 'blur(14px)', transform: 'translateY(46px) scale(0.9)' },
        { opacity: 1, filter: 'blur(0px)', transform: 'translateY(0px) scale(1)' }
      ];
    case 'mask':
      return [
        { opacity: 1, clipPath: 'inset(0 0 100% 0)' },
        { opacity: 1, clipPath: 'inset(0 0 0 0)' }
      ];
    default:
      return [
        { opacity: 0, translate: `0px ${d}px` },
        { opacity: 1, translate: '0px 0px' }
      ];
  }
}

/** Already tagged, opted out, hidden from assistive tech, or inside something that is. */
function isTagged(el: Element): boolean {
  return (
    el.hasAttribute('data-reveal') ||
    el.hasAttribute('data-no-reveal') ||
    el.hasAttribute('data-parallax') ||
    el.hasAttribute('data-scrub') ||
    el.getAttribute('aria-hidden') === 'true' ||
    Boolean(el.parentElement?.closest(SKIP))
  );
}

/** Elements that already run their own inline motion (TiltCard, Magnetic, Parallax) are left alone. */
function tag(el: HTMLElement, kind: string, step?: number) {
  // Headlines animate on their own even inside a revealed block: the block rises, the words then grow into place.
  const own = kind === 'headline';
  if (own ? el.hasAttribute('data-reveal') || el.closest('[data-no-reveal]') : isTagged(el)) return;
  if (el.style.transform || el.style.opacity) return;
  // Grow from the side the text is aligned to, so a left-aligned headline does not slide sideways.
  if (own) {
    const align = getComputedStyle(el).textAlign;
    el.style.transformOrigin = align === 'center' ? '50% 100%' : align === 'right' || align === 'end' ? '100% 100%' : '0% 100%';
  }
  el.setAttribute('data-reveal', kind);
  if (step !== undefined) el.setAttribute('data-reveal-delay', String(Math.min(step, STAGGER.maxSteps) * STAGGER.stepMs));
}

function childrenOf(el: Element): HTMLElement[] {
  return Array.from(el.children).filter(
    (c): c is HTMLElement => c instanceof HTMLElement && c.getAttribute('aria-hidden') !== 'true'
  );
}

/**
 * Tags one root. Every candidate is collected first, then visited in document order, so an
 * ancestor is always tagged before its descendants: a list row or grid card animates as one
 * piece and its contents are left to it (no double reveal).
 */
function tagRoot(root: HTMLElement, landing: boolean) {
  type Candidate = { el: HTMLElement; kind: string; step?: number };
  const found: Candidate[] = [];
  const cardKinds = landing ? ['zoom', 'tilt', 'grow'] : ['zoom', 'grow'];
  root.querySelectorAll<HTMLElement>('[class*="grid-cols-"], .grid').forEach((grid) => {
    const cards = childrenOf(grid);
    if (cards.length > 1) cards.forEach((el, step) => found.push({ el, kind: cardKinds[step % cardKinds.length], step }));
  });
  root.querySelectorAll<HTMLElement>('ul, ol').forEach((list) => {
    const items = childrenOf(list);
    if (items.length > 1) items.forEach((el, step) => found.push({ el, kind: landing ? (step % 2 ? 'right' : 'left') : 'rise', step }));
  });
  root.querySelectorAll<HTMLElement>('tbody tr').forEach((el, step) => {
    if (step < 40) found.push({ el, kind: 'left', step });
  });
  root.querySelectorAll<HTMLElement>('h1, h2').forEach((el) => {
    if (el.textContent?.trim()) found.push({ el, kind: landing ? 'headline' : 'mask' });
  });
  root.querySelectorAll<HTMLElement>('h3, h4').forEach((el) => found.push({ el, kind: 'rise' }));
  root.querySelectorAll<HTMLElement>('img').forEach((el) => found.push({ el, kind: landing ? 'wipe' : 'scale' }));
  if (landing) {
    root.querySelectorAll<HTMLElement>('p').forEach((el) => {
      if ((el.textContent ?? '').trim().length >= 24 && !el.closest('button, a, label')) found.push({ el, kind: 'blur' });
    });
  }
  found.sort((a, b) => (a.el.compareDocumentPosition(b.el) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
  found.forEach(({ el, kind, step }) => tag(el, kind, step));
  // Landing headings drift with the scroll, so the page keeps moving after each reveal.
  if (landing) {
    root.querySelectorAll<HTMLElement>('h2').forEach((h) => {
      if (!h.hasAttribute('data-drift') && !h.closest('[data-no-reveal]')) h.setAttribute('data-drift', '0.04');
      if (!h.hasAttribute('data-grow') && !h.closest('[data-no-reveal]')) h.setAttribute('data-grow', '');
    });
  }
}

function tagAll() {
  document.querySelectorAll<HTMLElement>(ROOTS).forEach((root) => {
    if (!root.closest(SKIP)) tagRoot(root, root.matches('section[id]'));
  });
}

/** Whether a mutation brought in elements (text-only changes, such as a nav label, need no tagging). */
function addsElements(records: MutationRecord[]): boolean {
  for (const r of records) {
    for (const n of Array.from(r.addedNodes)) if (n instanceof Element) return true;
  }
  return false;
}

export function ScrollReveals() {
  useEffect(() => {
    // Reduced motion keeps gentle fades (nothing moves, drifts or scales) so the page never looks static.
    const reduced = prefersReducedMotion();
    const html = document.documentElement;
    html.classList.add('motion-ready');
    if (!SCROLL_MOTION) html.classList.add('motion-static');
    // Browsers with CSS scroll timelines move parallax, drift and growth by themselves, off the main thread:
    // that is smooth even on weak computers, so the script only does it where the browser cannot.
    const native = typeof CSS !== 'undefined' && CSS.supports('animation-timeline: view()');
    if (native && !reduced && SCROLL_MOTION) html.classList.add('sd-native');
    html.classList.toggle('motion-off', reduced);
    const seen = new WeakSet<Element>();

    /** Plays the entrance once. The step (position in its batch) sets the stagger unless data-reveal-delay is given. */
    const show = (el: HTMLElement, step: number) => {
      if (el.hasAttribute('data-in')) return;
      el.setAttribute('data-in', '');
      if (typeof el.animate !== 'function') return;
      // Lite devices get the same entrances without blur filters.
      const kind = reduced ? 'fade' : isLite() && (el.dataset.reveal === 'blur' || el.dataset.reveal === 'tilt' || el.dataset.reveal === 'flip') ? 'rise' : el.dataset.reveal || 'rise';
      const d = Number(el.dataset.revealDistance) || DEFAULT_DISTANCE[kind] || DISTANCE.default;
      const duration = Number(el.dataset.revealDuration) || (reduced ? DURATION.revealReduced : (kind === 'mask' || kind === 'wipe' ? DURATION.revealWipe : DURATION.reveal) * (isLite() ? 0.8 : 1));
      const custom = el.dataset.revealDelay;
      const delay = custom && Number.isFinite(Number(custom)) ? Number(custom) : Math.min(step, STAGGER.maxSteps) * STAGGER.stepMs;
      el.animate(frames(kind, d), { duration, delay, easing: EASE.glass, fill: 'backwards' });
    };

    const io = new IntersectionObserver(
      (entries) => {
        let step = 0;
        for (const entry of entries) {
          // Still below the fold: keep watching. Above it (scrolled past): reveal.
          if (!entry.isIntersecting && entry.boundingClientRect.top >= 0) continue;
          const el = entry.target as HTMLElement;
          io.unobserve(el);
          show(el, step++);
        }
      },
      { rootMargin: '0px 0px -6% 0px', threshold: 0.01 }
    );

    const inView = (el: Element) => {
      const r = el.getBoundingClientRect();
      return r.bottom > 0 && r.top < window.innerHeight * 0.94;
    };

    /** New [data-reveal] elements. Those already on screen play at once, so nothing flashes hidden first. */
    const observeNew = () => {
      const fresh: HTMLElement[] = [];
      document.querySelectorAll<HTMLElement>(TARGET).forEach((el) => {
        if (seen.has(el) || el.hasAttribute('data-in')) return;
        seen.add(el);
        fresh.push(el);
      });
      // Read every position before writing, so the browser lays the page out only once.
      const onScreen = fresh.map((el) => inView(el));
      let step = 0;
      fresh.forEach((el, i) => {
        if (onScreen[i]) show(el, step++);
        else io.observe(el);
      });
    };

    // The elements the scroll frame moves. Kept up to date by sync(), so a frame never queries the document.
    let parallax: HTMLElement[] = [];
    let grows: HTMLElement[] = [];
    let scrubs: HTMLElement[] = [];
    let progressBars: HTMLElement[] = [];
    const collect = () => {
      parallax = Array.from(document.querySelectorAll<HTMLElement>('[data-parallax], [data-drift]'));
      grows = Array.from(document.querySelectorAll<HTMLElement>('[data-grow]'));
      scrubs = Array.from(document.querySelectorAll<HTMLElement>('[data-scrub]'));
      progressBars = Array.from(document.querySelectorAll<HTMLElement>('[data-scroll-progress]'));
    };

    // Read phase results, applied in the write phase.
    let moves: [HTMLElement, string][] = [];
    let growth: [HTMLElement, string][] = [];
    let scrubValues: [HTMLElement, string][] = [];
    let progress = '';
    const scrollMoves = !reduced && !native; // JS offsets only where the browser cannot run them natively
    const read = (f: ScrollFrame) => {
      moves = [];
      growth = [];
      scrubValues = [];
      if (scrollMoves) {
        // Every position is read before any is written: a read between two style writes makes the browser lay the page out again.
        for (const el of parallax) {
          if (!el.isConnected) continue;
          const r = el.getBoundingClientRect();
          if (r.bottom < -f.vh || r.top > f.vh * 2) continue; // far off screen
          const speed = Number(el.dataset.parallax || el.dataset.drift) || 0.15;
          moves.push([el, `0px ${((r.top + r.height / 2 - f.vh / 2) * -speed).toFixed(1)}px`]);
        }
        // Page progress (0 to 1) moves the background light, so the whole page seems to travel with the reader.
        progress = (f.max > 0 ? Math.min(1, Math.max(0, f.y / f.max)) : 0).toFixed(4);
        // Headlines swell from 88% to full size while they travel from the bottom of the screen to its upper third.
        for (const el of grows) {
          if (!el.isConnected) continue;
          const r = el.getBoundingClientRect();
          if (r.bottom < -f.vh || r.top > f.vh * 1.5) continue;
          growth.push([el, (0.88 + 0.12 * Math.min(1, Math.max(0, (f.vh - r.top) / (f.vh * 0.62)))).toFixed(3)]);
        }
      }
      for (const el of scrubs) {
        if (!el.isConnected) continue;
        const r = el.getBoundingClientRect();
        scrubValues.push([el, Math.min(1, Math.max(0, (f.vh - r.top) / (f.vh + r.height))).toFixed(3)]);
      }
    };
    const write = () => {
      for (const [el, y] of moves) el.style.setProperty('translate', y);
      if (scrollMoves) {
        for (const el of progressBars) el.style.setProperty('--sp', progress);
        for (const [el, s] of growth) el.style.setProperty('scale', s);
      }
      for (const [el, p] of scrubValues) el.style.setProperty('--scrub', p);
      return false;
    };
    // Browsers without a scroll-driven layer: parallax, growth and progress are read and written by the scroll engine.
    // Otherwise the engine still runs for the scrubbed progress values, and only while the page moves.
    const unsubscribe = subscribeScroll({ read, write });

    let syncFrame = 0;
    const sync = () => {
      syncFrame = 0;
      tagAll();
      // Images that are still loading wait invisible and fade in when they arrive (cached ones are left alone).
      document.querySelectorAll<HTMLImageElement>('img:not([data-img])').forEach((img) => {
        if (img.complete) return;
        img.dataset.img = 'wait';
        const done = () => { img.dataset.img = 'ready'; };
        img.addEventListener('load', done, { once: true });
        img.addEventListener('error', done, { once: true });
      });
      if (native) document.querySelectorAll<HTMLElement>('[data-parallax]:not([style*="--sd"])').forEach((el) => el.style.setProperty('--sd', el.dataset.parallax || '0.15'));
      observeNew();
      collect();
      wakeScrollEngine();
    };
    // Content rendered later (tabs, lists, chat messages, route changes) is tagged and animated too. Only added
    // elements count: a text change (a nav label, a counter) brings in no new reveal target and is ignored.
    const mo = new MutationObserver((records) => {
      if (!addsElements(records) || syncFrame) return;
      syncFrame = requestAnimationFrame(sync);
    });
    mo.observe(document.body, { childList: true, subtree: true });

    // Moving to lite mid-visit: put the scroll-driven offsets back to rest.
    const onLite = () => {
      document.querySelectorAll<HTMLElement>('[data-parallax], [data-drift], [data-grow]').forEach((el) => {
        el.style.removeProperty('translate');
        el.style.removeProperty('scale');
      });
      document.querySelectorAll<HTMLElement>('[data-scroll-progress]').forEach((el) => el.style.removeProperty('--sp'));
    };
    window.addEventListener('edulevel:perf-lite', onLite);
    const stopWatch = watchScrollPerformance();
    const stopScrollState = watchScrollState();
    const stopOffscreen = watchOffscreenSections();

    sync();

    return () => {
      io.disconnect();
      mo.disconnect();
      unsubscribe();
      stopWatch();
      stopScrollState();
      stopOffscreen();
      window.removeEventListener('edulevel:perf-lite', onLite);
      if (syncFrame) cancelAnimationFrame(syncFrame);
      html.classList.remove('motion-ready', 'sd-native', 'motion-off', 'motion-static');
      document.querySelectorAll<HTMLElement>('[data-scroll-progress]').forEach((el) => el.style.removeProperty('--sp'));
    };
  }, []);

  return null;
}
