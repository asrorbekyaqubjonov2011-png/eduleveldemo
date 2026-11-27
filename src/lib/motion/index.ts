'use client';
/**
 * EDU LEVEL motion layer.
 *  - GSAP for tweens and timelines (intro, hero, marquee), with useGSAP for cleanup.
 *  - One scroll engine (scrollEngine.ts) for everything that follows the scroll position. Its frame loop sleeps
 *    when the page is still.
 *  - ScrollTrigger is registered on first use only: once registered, its own frame loop never sleeps.
 *  - Durations, easings and staggers come from tokens.ts.
 * Everything respects prefers-reduced-motion.
 */
import { gsap } from 'gsap';
import { ScrollTrigger as ScrollTriggerPlugin } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { DURATION_S, GSAP_EASE, STAGGER } from './tokens';

export { subscribeScroll, wakeScrollEngine } from './scrollEngine';
export type { ScrollFrame, ScrollSubscriber } from './scrollEngine';
export { DURATION, DURATION_S, EASE, GSAP_EASE, STAGGER, DISTANCE } from './tokens';

let coreRegistered = false;
let triggerRegistered = false;

function registerCore() {
  if (coreRegistered || typeof window === 'undefined') return;
  gsap.registerPlugin(useGSAP);
  gsap.defaults({ ease: GSAP_EASE.out, duration: 0.9 });
  coreRegistered = true;
}

function registerTrigger() {
  if (triggerRegistered || typeof window === 'undefined') return;
  gsap.registerPlugin(ScrollTriggerPlugin);
  triggerRegistered = true;
}

/**
 * ScrollTrigger, registered the first time a trigger is created. The methods that only refresh or update
 * existing triggers do nothing until then, so a page without triggers never starts ScrollTrigger's frame loop.
 */
const scrollTrigger = {
  create: (vars: Parameters<typeof ScrollTriggerPlugin.create>[0]) => {
    registerTrigger();
    return ScrollTriggerPlugin.create(vars);
  },
  refresh: (safe?: boolean) => {
    if (triggerRegistered) ScrollTriggerPlugin.refresh(safe);
  },
  update: () => {
    if (triggerRegistered) ScrollTriggerPlugin.update();
  },
  getAll: () => (triggerRegistered ? ScrollTriggerPlugin.getAll() : []),
};

/** Registers GSAP (and useGSAP) once and returns it with the lazy ScrollTrigger. Safe to call on every render. */
export function ensureGsap() {
  registerCore();
  return { gsap, ScrollTrigger: scrollTrigger as unknown as typeof ScrollTriggerPlugin };
}

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    if (window.localStorage.getItem('edulevel_motion') === 'reduced') return true; // the reader's own choice in Profile > Ko‘rinish
  } catch {
    /* storage blocked */
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Motion tokens for GSAP and for code that works in seconds. Same values as tokens.ts, kept for existing callers. */
export const MOTION = {
  fast: DURATION_S.fast,
  base: DURATION_S.base,
  slow: DURATION_S.slow,
  cinematic: DURATION_S.cinematic,
  stagger: STAGGER.gsapS,
  ease: GSAP_EASE,
} as const;

export { gsap, useGSAP };
