'use client';
import { useEffect } from 'react';
import Lenis from 'lenis';
import { ensureGsap, prefersReducedMotion } from '../../lib/motion';
import { perfPreference } from '../../lib/motion/perf';
import { SCROLL_MOTION } from '../../lib/motion/tokens';

/**
 * Inertial "motion" scrolling for long storytelling pages.
 * Lenis drives the native window scroll (so fixed/sticky elements and ScrollTrigger
 * keep working) and is ticked by GSAP so scrubbed scenes stay perfectly in sync.
 * Disabled for reduced motion and on touch devices (native momentum is better there).
 */
export function SmoothScroll({ enabled = true }: { enabled?: boolean }) {
  useEffect(() => {
    if (!SCROLL_MOTION || !enabled || prefersReducedMotion() || perfPreference() === 'lite') return;
    if (window.matchMedia('(pointer: coarse)').matches) return;
    const { gsap, ScrollTrigger } = ensureGsap();
    let stopped = false;
    const lenis = new Lenis({ duration: 1.15, easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), wheelMultiplier: 0.95 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.lagSmoothing(0);
    // The frame loop runs only while the page is moving: an idle page must not spend frames on smooth scrolling.
    let awake = false;
    const tick = (time: number) => {
      lenis.raf(time * 1000);
      if (!lenis.isScrolling) sleep();
    };
    const wake = () => {
      if (awake || stopped) return;
      awake = true;
      gsap.ticker.add(tick);
    };
    function sleep() {
      if (!awake) return;
      awake = false;
      gsap.ticker.remove(tick);
    }
    const inputs = ['wheel', 'touchstart', 'keydown', 'scroll'] as const;
    inputs.forEach((name) => window.addEventListener(name, wake, { passive: true }));
    wake();
    const stop = () => {
      if (stopped) return;
      stopped = true;
      sleep();
      inputs.forEach((name) => window.removeEventListener(name, wake));
      lenis.destroy();
    };
    // A device found to be slow gives scrolling back to the browser.
    window.addEventListener('edulevel:perf-lite', stop);
    return () => {
      window.removeEventListener('edulevel:perf-lite', stop);
      stop();
    };
  }, [enabled]);
  return null;
}
