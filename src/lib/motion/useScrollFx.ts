'use client';
import { useEffect, type RefObject } from 'react';
import { prefersReducedMotion } from './index';
import { subscribeScroll, type ScrollFrame } from './scrollEngine';
import { SCROLL_MOTION } from './tokens';

type Kind = 'dash' | 'bar' | 'rise';
interface Item {
  node: HTMLElement;
  kind: Kind;
  /** The element whose position drives the effect. */
  trigger: HTMLElement;
  /** Seconds for the motion to catch up with the scroll (0 = follows at once). */
  scrub: number;
  /** Progress 0 to 1 as the scroll wants it, and as it is shown (eased towards the wanted value). */
  want: number;
  shown: number;
}

/** Progress of `top` from `from` (a fraction of the viewport, measured down from the top) to `to`, clamped to 0..1. */
const progressBetween = (top: number, vh: number, from: number, to: number) => {
  const span = (from - to) * vh;
  return span <= 0 ? 0 : Math.min(1, Math.max(0, (from * vh - top) / span));
};

/**
 * Scroll-scrubbed effects inside `scope`, driven by the scroll engine (one frame loop for the page, asleep when still):
 *  - [data-dash-parallax]  background image drifts against the scroll (yPercent -5 to 5)
 *  - [data-scrub-bar]      bar fills (scaleX 0 to 1) as it enters the viewport, 0.5 s behind the scroll
 *  - [data-scrub-rise]     element rises (56 px to 0) and fades in with the scroll position, 0.6 s behind
 * [data-parallax] is handled by ScrollReveals, which lets the browser move it wherever it can.
 * Reversible, cleaned up on unmount and disabled for reduced motion.
 */
export function useScrollFx(scope: RefObject<HTMLElement | null>, dependencies: unknown[] = []) {
  useEffect(() => {
    if (!SCROLL_MOTION) return;
    const el = scope.current;
    if (!el || prefersReducedMotion()) return;
    const items: Item[] = [];
    el.querySelectorAll<HTMLElement>('[data-dash-parallax]').forEach((node) => {
      items.push({ node, kind: 'dash', trigger: node.parentElement || node, scrub: 0, want: 0, shown: 0 });
    });
    el.querySelectorAll<HTMLElement>('[data-scrub-bar]').forEach((node) => {
      node.style.transformOrigin = 'left center';
      items.push({ node, kind: 'bar', trigger: node, scrub: 0.5, want: 0, shown: 0 });
    });
    el.querySelectorAll<HTMLElement>('[data-scrub-rise]').forEach((node) => {
      items.push({ node, kind: 'rise', trigger: node, scrub: 0.6, want: 0, shown: 0 });
    });
    if (!items.length) return;

    let lastDt = 0;
    const unsubscribe = subscribeScroll({
      read: (f: ScrollFrame) => {
        lastDt = f.dt;
        for (const it of items) {
          if (!it.node.isConnected) continue;
          const r = it.trigger.getBoundingClientRect();
          const top = r.top;
          if (it.kind === 'dash') {
            it.want = Math.min(1, Math.max(0, (f.vh - top) / (f.vh + r.height)));
          } else if (it.kind === 'bar') {
            it.want = progressBetween(top, f.vh, 0.96, 0.62);
          } else {
            it.want = progressBetween(top, f.vh, 0.98, 0.7);
          }
        }
      },
      write: () => {
        let moving = false;
        for (const it of items) {
          if (!it.node.isConnected) continue;
          // Exponential catch-up: after `scrub` seconds the shown value is within 0.1 % of the wanted one.
          const k = it.scrub ? 1 - Math.pow(0.001, lastDt / (it.scrub * 1000)) : 1;
          it.shown += (it.want - it.shown) * k;
          if (Math.abs(it.want - it.shown) > 0.0005) moving = true;
          else it.shown = it.want;
          const p = it.shown;
          if (it.kind === 'dash') {
            it.node.style.transform = `translate3d(0, ${(-5 + 10 * p).toFixed(2)}%, 0)`;
          } else if (it.kind === 'bar') {
            it.node.style.transform = `scaleX(${p.toFixed(4)})`;
          } else {
            it.node.style.transform = `translate3d(0, ${((1 - p) * 56).toFixed(2)}px, 0)`;
            it.node.style.opacity = p.toFixed(4);
          }
        }
        return moving;
      },
    });
    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);
}
