/**
 * EDU LEVEL — Motion design constants.
 *
 * The project standardises on CSS transitions + CSS keyframes (see app/globals.css)
 * so that there is exactly one animation system and no competing libraries.
 * These values are shared by the UI primitives and by the scroll choreography.
 */

export const EASE_LIQUID = 'cubic-bezier(0.22, 1, 0.36, 1)';
export const EASE_GLASS = 'cubic-bezier(0.16, 1, 0.3, 1)';
export const EASE_OUT_EXPO = 'cubic-bezier(0.19, 1, 0.22, 1)';

/** Duration scale in milliseconds */
export const DUR = {
  instant: 120,
  fast: 220,
  base: 400,
  slow: 700,
  cinematic: 1100,
} as const;

export const DIST = {
  xs: 8,
  sm: 16,
  md: 24,
  lg: 40,
} as const;

/** Standard transition shorthands */
export const transitionRise = `opacity 700ms ${EASE_GLASS}, transform 700ms ${EASE_GLASS}, filter 700ms ease`;
export const transitionHover = `all 260ms ${EASE_LIQUID}`;
