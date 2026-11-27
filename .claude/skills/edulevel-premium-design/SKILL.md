---
name: edulevel-premium-design
description: Rules for building or changing any EduLevel (and FayzulloMath) UI — premium minimal Apple-style design, Liquid Glass, GSAP scroll motion, scroll-scrubbed background videos, real data only, and how to communicate with the owner. Use for every UI, animation, page or section task in this repo.
---

# EduLevel premium design & workflow

## Communication (owner's standing request)
- Work silently. Do not narrate steps, do not send screenshots or images, do not write long reports.
- Reply only when blocked, when a decision is truly needed, or when the whole task is done — then 3–6 short lines (Uzbek is fine).
- Never stop at a plan: implement, verify in the browser yourself, commit, push.

## Visual language
- Palette: night `#07080b` / cream `#fbf6ef` canvases, ember accent `#ffa149 → #f2650f`, copper `#c56a24` on cream footage, ink `#12100e`, cocoa text `#2b1d12` on cream.
- Type: Plus Jakarta Sans (display, extrabold, tracking −0.04em), DM Sans (body). Headlines short, two lines, last words in `.word-ember` (add `.on-dark` on dark/photo backgrounds).
- Materials (`app/globals.css`): `.glass-subtle`, `.glass-premium`, `.glass-floating`, `.glass-focused`, `.glass-night`, `.glass-rim`. Use blur selectively (nav, floating cards, modals), never on every card.
- Buttons: pill, ember gradient primary; glass secondary; 48–56px tall on landing.
- Photography: self-hosted WebP in `public/media`, warm grade overlay, gradient veils for legibility.

## Motion
- GSAP + ScrollTrigger via `src/lib/motion` (`ensureGsap`, `useGSAP`, `prefersReducedMotion`). Every scene must be scrubbed and reversible, cleaned up on unmount, disabled for reduced motion.
- Entrance reveals: wrap blocks in `<Reveal>` or add `data-reveal` (`fade|rise|zoom|scale|left|right|blur|mask`, optional `data-reveal-delay` in ms). Landing sections, the student panel and the owner panel are tagged automatically by `ScrollReveals`; opt out with `data-no-reveal`. Scroll-linked: `data-parallax="0.2"` on decorative elements, `data-scrub` on a section plus `.scrub-x` on a child for progress bars. Never put a second `translate` or `transform` on a `data-parallax` element.
- Pinned scenes: never put `transform`, `filter` or `will-change` on ancestors of pinned sections (breaks `position: fixed`). Keep `body { overflow-x: clip }`.
- Only animate transform/opacity (and short blur on text exits).

## Scroll-driven background video
- Component: `src/components/site1/ScrollVideoStory.tsx` (+ chapters in `StoryChapters.tsx`).
- The video never autoplays; `currentTime` follows scroll progress with a lerp. Text scenes are `{from, to, eyebrow, title, text, actions}` in 0–1 progress.
- Prepare footage with ffmpeg: crop watermarks/cursors, `-an`, H.264, `-g 4..5` (short GOP for seeking), `+faststart`, a 960px `-sm` variant for phones, a WebP poster; sample the dominant colour and pass it as `tint`.
- Show the film in a feathered 16:9 stage so baked-in typography is never covered; copy sits in its own column.

## Data & security
- Never show invented numbers. Stats, charts and bands come from `db` (see `src/lib/studentAnalytics.ts`); show an empty state when there is no data.
- Keep the five+ existing VIP plans and prices from data. Never fake payments.
- All writes go through `app/api/[...path]/route.ts` guards (`authorize`, owner-only by default). No secrets in code or git; env names in `.env.example`.

## Verification checklist
`npx tsc --noEmit -p .`, `npx next build`, `npx tsx --test src/lib/eduLogic.test.ts`, `node scripts/security-test.mjs` (against a data copy via `EDULEVEL_DATA_DIR`), Playwright pass at 1440 / 1024 / 768 / 390 in dark and light: no console errors, no horizontal overflow, pinned scenes visible.
