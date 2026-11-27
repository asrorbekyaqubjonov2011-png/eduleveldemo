'use client';
/**
 * The scroll engine: one frame loop for all script-driven scroll motion on the site.
 *
 * Subscribers (parallax, drift, reveal progress, scrubbed bars, the scroll progress line) register once.
 * While the page moves, one requestAnimationFrame loop runs them. Every subscriber reads layout in `read`,
 * then all of them write styles in `write`, so the browser lays the page out at most once per frame instead of
 * once per element. When the page stops, the loop sleeps and no frames are spent on an idle page.
 *
 * Scroll listeners exist only while something subscribes. A `write` that returns true keeps the loop running
 * for another frame (smoothing, a tail that is still moving). `wakeScrollEngine()` starts a frame for a change
 * that did not come from scrolling (new content, a resize of a panel).
 */

export interface ScrollFrame {
  /** Vertical scroll offset in CSS pixels. */
  y: number;
  /** Viewport height in CSS pixels. */
  vh: number;
  /** The largest scroll offset of this page. */
  max: number;
  /** Scroll direction of this frame: 1 down, -1 up, 0 still. */
  dir: -1 | 0 | 1;
  /** Frame time (performance.now()), in milliseconds. */
  now: number;
  /** Time since the previous frame, in milliseconds (0 on the first frame). */
  dt: number;
  /** Scroll speed in pixels per second over the last frame (signed: negative scrolls up). */
  velocity: number;
}

export interface ScrollSubscriber {
  /** Reads layout only. Every subscriber reads before any subscriber writes. */
  read?: (frame: ScrollFrame) => void;
  /** Writes styles only. Return true to run one more frame. */
  write?: (frame: ScrollFrame) => boolean | void;
}

/** How long the loop keeps running after the last scroll or resize event (covers a fling and its tail). */
const SETTLE_MS = 140;

const subscribers = new Set<ScrollSubscriber>();
let frameId = 0;
let awakeUntil = 0;
let lastY = -1;
let lastTime = 0;
let listening = false;

/**
 * The largest scroll offset, cached. Reading scrollHeight forces a layout, so it is read when it can change
 * (on subscribe, on resize, and when the document's own box changes size), not on every frame.
 */
let maxCache = 0;
const refreshMax = () => {
  maxCache = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
};
let sizeObserver: ResizeObserver | null = null;

const measure = (now: number): ScrollFrame => {
  const y = window.scrollY;
  const vh = window.innerHeight;
  // Without ResizeObserver the size is read every frame, as before.
  if (!sizeObserver) refreshMax();
  const max = maxCache;
  const dir = lastY < 0 || y === lastY ? 0 : y > lastY ? 1 : -1;
  const dt = lastTime ? now - lastTime : 0;
  const velocity = dt > 0 && lastY >= 0 ? ((y - lastY) * 1000) / dt : 0;
  lastY = y;
  lastTime = now;
  return { y, vh, max, dir, now, dt, velocity };
};

function frame(now: number) {
  frameId = 0;
  if (!subscribers.size) return;
  const f = measure(now);
  // Reads first for everyone, then writes: no subscriber's write can force a layout in another subscriber's read.
  for (const s of subscribers) s.read?.(f);
  let more = false;
  for (const s of subscribers) if (s.write?.(f)) more = true;
  if (more || now < awakeUntil) frameId = requestAnimationFrame(frame);
  else lastTime = 0;
}

/** Starts a frame now (if the loop sleeps) and keeps the loop awake for the settle window. */
export function wakeScrollEngine(): void {
  if (typeof window === 'undefined') return;
  awakeUntil = performance.now() + SETTLE_MS;
  if (!frameId && subscribers.size) frameId = requestAnimationFrame(frame);
}

const onScroll = () => wakeScrollEngine();
const onResize = () => {
  refreshMax();
  wakeScrollEngine();
};
const onVisibility = () => {
  if (document.visibilityState === 'visible') wakeScrollEngine();
};

function listen(on: boolean) {
  if (typeof window === 'undefined' || on === listening) return;
  listening = on;
  const method = on ? 'addEventListener' : 'removeEventListener';
  window[method]('scroll', onScroll, { passive: true });
  window[method]('resize', onResize);
  document[method]('visibilitychange', onVisibility);
  if (on) {
    refreshMax();
    if (typeof ResizeObserver !== 'undefined') {
      sizeObserver = new ResizeObserver(refreshMax);
      sizeObserver.observe(document.documentElement);
      sizeObserver.observe(document.body);
    }
  } else {
    sizeObserver?.disconnect();
    sizeObserver = null;
  }
}

/**
 * Subscribes to the scroll frame. Returns the function that unsubscribes (and stops the listeners when none is left).
 * A new subscriber gets one frame at once, so it can place itself without waiting for a scroll.
 */
export function subscribeScroll(subscriber: ScrollSubscriber): () => void {
  if (typeof window === 'undefined') return () => {};
  subscribers.add(subscriber);
  listen(true);
  wakeScrollEngine();
  return () => {
    subscribers.delete(subscriber);
    if (!subscribers.size) {
      listen(false);
      if (frameId) cancelAnimationFrame(frameId);
      frameId = 0;
      lastY = -1;
    }
  };
}
