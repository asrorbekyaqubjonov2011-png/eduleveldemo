/**
 * Master switch for scroll-linked motion (reveal on scroll, parallax, scroll-scrubbed effects, inertial scrolling).
 * Off: every section is shown in its final place at once, and the page scrolls natively. Entrance animations on
 * page load (hero, buttons, hover) stay. Set to true to bring the scroll motion back.
 */
export const SCROLL_MOTION = true;

/**
 * Motion tokens: the durations, easings and stagger steps used across the site, in one place.
 *
 * The same values are mirrored as CSS custom properties in app/globals.css (block "A8 motion system"),
 * so a change here must be made there too. Durations are milliseconds unless the name ends in `S`
 * (seconds, for GSAP). Keep the set small: a new value is added here only when a second place needs it.
 */

/** How long a change takes, in milliseconds. */
export const DURATION = {
  /** Press and hover feedback. */
  instant: 120,
  /** Small state changes: a chip, a toggle, a tooltip. */
  fast: 200,
  /** Default transition: hover lifts, colour and shadow changes. */
  base: 360,
  /** Panels, sheets, the sidebar, route-level fades. */
  slow: 720,
  /** A whole surface changing colour (the page background when the theme changes). */
  surface: 700,
  /** Large surfaces and the opening sequence. */
  cinematic: 1100,
  /** One scroll reveal (ScrollReveals), default length. */
  reveal: 1000,
  /** A reveal that clips or wipes (mask, wipe). */
  revealWipe: 1200,
  /** A reveal under reduced motion: only a gentle fade plays. */
  revealReduced: 700,
  /** A headline word rising out of its mask (SplitText). */
  wordRise: 900,
  /** The fade that goes with a word rising (SplitText). */
  wordFade: 600,
} as const;

/** The same durations in seconds, for GSAP timelines and tweens. */
export const DURATION_S = {
  fast: DURATION.fast / 1000,
  base: DURATION.base / 1000,
  slow: DURATION.slow / 1000,
  cinematic: DURATION.cinematic / 1000,
} as const;

/** Easing curves. CSS strings for the Web Animations API and transitions, GSAP names below. */
export const EASE = {
  /** The house curve: quick start, long soft settle. Hover lifts and default transitions. */
  liquid: 'cubic-bezier(0.22, 1, 0.36, 1)',
  /** Reveals on scroll (ScrollReveals). */
  glass: 'cubic-bezier(0.16, 1, 0.3, 1)',
  /** Headline words rising into place. */
  expo: 'cubic-bezier(0.19, 1, 0.22, 1)',
  /** Linear motion without acceleration (marquees, rings, scrubbed values). */
  linear: 'linear',
} as const;

/** GSAP easing names, matching the CSS curves above in feel. */
export const GSAP_EASE = {
  out: 'power3.out',
  expo: 'expo.out',
  inOut: 'power2.inOut',
  none: 'none',
} as const;

/** Stagger between the siblings of one batch: a list or a grid enters one step after another. */
export const STAGGER = {
  /** Milliseconds between two reveals of one batch (ScrollReveals). */
  stepMs: 110,
  /** A batch never waits longer than this many steps, so a long list does not trickle in. */
  maxSteps: 9,
  /** Seconds between two GSAP staggered children (intro, hero). */
  gsapS: 0.07,
} as const;

/** The reveal distances in pixels, per kind of entrance (ScrollReveals). */
export const DISTANCE = {
  rise: 84,
  zoom: 56,
  side: 120,
  blur: 40,
  drop: 64,
  tilt: 56,
  flip: 48,
  default: 36,
} as const;
