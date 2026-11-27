import { subscribeScroll } from './scrollEngine';

/**
 * Performance tier of this device. "full" gets every effect; "lite" keeps the page just as readable
 * and animated but drops the costly parts (live blur behind glass, blur filters, parallax, infinite
 * ambient motion, inertial scrolling). A device is "lite" when it says so (few cores, little memory,
 * data saver), when the reader chose it (?perf=lite), or when scrolling here is measured to drop
 * frames. The choice is remembered. ?perf=full forces everything on for this visit.
 */
const KEY = 'edulevel_perf';
let tier: 'full' | 'lite' | null = null;

const apply = () => document.documentElement.classList.toggle('perf-lite', tier === 'lite');

export function perfTier(): 'full' | 'lite' {
  if (typeof window === 'undefined') return 'full';
  if (tier) return tier;
  let t: 'full' | 'lite' = 'full';
  const q = new URLSearchParams(window.location.search).get('perf');
  if (q === 'lite' || q === 'full') {
    t = q;
  } else {
    try {
      const saved = window.localStorage.getItem(KEY);
      if (saved === 'lite') t = 'lite';
      else if (window.sessionStorage.getItem('edulevel_perf_session') === 'lite') t = 'lite';
      else if (saved === 'full') {
        tier = 'full';
        apply();
        return 'full'; // the reader chose full effects: no device guessing
      }
    } catch {
      /* storage blocked: decide from the device alone */
    }
    const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
    // Weak phones: few cores or little memory (the common budget Android has 4 cores and 3-4 GB, so either signal counts).
    const cores = nav.hardwareConcurrency ?? 8;
    const mem = nav.deviceMemory ?? 8;
    if (t === 'full' && (mem <= 3 || (cores <= 4 && mem <= 4) || (cores <= 2 && mem <= 4) || nav.connection?.saveData)) t = 'lite';
  }
  tier = t;
  apply();
  return t;
}

export const isLite = () => perfTier() === 'lite';

/** The reader's choice in Profile: 'auto' lets the device decide, 'lite' and 'full' fix it. Takes effect on the next page load. */
export function perfPreference(): 'auto' | 'lite' | 'full' {
  try {
    const v = window.localStorage.getItem(KEY);
    return v === 'lite' || v === 'full' ? v : 'auto';
  } catch {
    return 'auto';
  }
}
export function setPerfPreference(p: 'auto' | 'lite' | 'full'): void {
  try {
    if (p === 'auto') window.localStorage.removeItem(KEY);
    else window.localStorage.setItem(KEY, p);
  } catch {
    /* storage blocked: the choice cannot be kept */
  }
}

/** Switches to lite for good (this device) and tells the animation code. */
export function goLite(): void {
  if (typeof window === 'undefined' || perfTier() === 'lite') return;
  tier = 'lite';
  // Only this visit: a slow moment must not make the site plain for good (the reader's choice is kept in Profile).
  try {
    window.sessionStorage.setItem('edulevel_perf_session', 'lite');
  } catch {
    /* ignore */
  }
  apply();
  window.dispatchEvent(new Event('edulevel:perf-lite'));
}

/** A frame longer than this is slow. Two stretches of 30 frames in which most frames are slow switch the device to lite. */
const SLOW_FRAME_MS = 40;
const SAMPLE = 30;

/**
 * Watches the frames the scroll engine produces while the reader scrolls. When most frames in two separate
 * stretches of 30 frames take longer than 40 ms (under 25 fps), the device is moved to lite. Returns a function that stops it.
 */
export function watchScrollPerformance(): () => void {
  if (typeof window === 'undefined' || perfPreference() === 'full' || new URLSearchParams(window.location.search).get('perf') === 'full') return () => {};
  let total = 0;
  let slow = 0;
  let strikes = 0;
  let unsubscribe = () => {};
  unsubscribe = subscribeScroll({
    write: (f) => {
      // A tab that was in the background produces one huge gap: not a measure of the page.
      if (f.dt > 0 && f.dt < 500) {
        total += 1;
        if (f.dt > SLOW_FRAME_MS) slow += 1;
      }
      if (total >= SAMPLE) {
        strikes = slow / total > 0.3 ? strikes + 1 : Math.max(0, strikes - 1);
        total = 0;
        slow = 0;
        if (strikes >= 2) {
          goLite();
          unsubscribe();
        }
      }
      return false;
    },
  });
  return () => unsubscribe();
}
