/**
 * Endless decorative loops (glows, twinkles, road dashes, blinks, stickers) run only where the reader can see them.
 * An element that is off screen has its endless animations paused, so an idle page spends no frames on them.
 * Scroll-linked animations are left alone: they follow the scroll position by themselves.
 *
 * Watched elements: the landing sections (section[id]), the panels' content (main .animate-section), and every
 * element that carries an endless animation of its own. The last group is found again after DOM changes, so a
 * sticker in a chat list or a card in a table is paused just like a section is.
 */
const SCAN_DELAY_MS = 250;

const isEndless = (a: Animation) => {
  const timing = a.effect?.getComputedTiming?.();
  return Boolean(timing && timing.iterations === Infinity);
};

/** Animations this module paused. Only these are resumed: a pause set by the page (scrolling, reduced motion) stays. */
const pausedHere = new WeakSet<Animation>();

const pauseEndless = (el: Element, paused: boolean) => {
  if (typeof el.getAnimations !== 'function') return;
  for (const a of el.getAnimations({ subtree: true })) {
    if (!isEndless(a)) continue;
    if (paused) {
      if (a.playState === 'running') {
        a.pause();
        pausedHere.add(a);
      }
    } else if (pausedHere.has(a)) {
      pausedHere.delete(a);
      if (a.playState === 'paused') a.play();
    }
  }
};

export function watchOffscreenSections(): () => void {
  if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') return () => {};
  const watched = new Set<Element>();
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const off = !entry.isIntersecting;
        if (entry.target.hasAttribute('data-offscreen') === off) continue;
        entry.target.toggleAttribute('data-offscreen', off);
        pauseEndless(entry.target, off);
      }
    },
    { rootMargin: '160px 0px' }
  );
  const watch = (el: Element) => {
    if (watched.has(el)) return;
    watched.add(el);
    io.observe(el);
  };

  // Only static containers are observed. Observing an element that itself moves (an animated sticker, the
  // Edubek dock) makes the browser recompute its intersection on every frame, which costs more than it saves.
  const scan = () => {
    document.querySelectorAll('section[id], main .animate-section').forEach(watch);
    // Elements that left the page are no longer watched.
    for (const el of watched) {
      if (!el.isConnected) {
        io.unobserve(el);
        watched.delete(el);
      }
    }
  };

  let timer = 0;
  const schedule = () => {
    if (timer) return;
    timer = window.setTimeout(() => {
      timer = 0;
      scan();
    }, SCAN_DELAY_MS);
  };
  // New content (tabs, route changes, a chat message with a sticker) is picked up as it appears.
  const mo = new MutationObserver(schedule);
  mo.observe(document.body, { childList: true, subtree: true });
  scan();

  return () => {
    window.clearTimeout(timer);
    mo.disconnect();
    io.disconnect();
    watched.clear();
  };
}
