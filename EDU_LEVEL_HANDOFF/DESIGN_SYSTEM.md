# EDU LEVEL — Design System (as implemented)

Source of truth: `app/globals.css` (tokens, materials, motion CSS) and `src/components/ui/` (primitives).
Tailwind CSS v4 (`@theme` tokens become utilities, e.g. `bg-night`, `text-ember-500`).

## Color

| Token | Value | Use |
|---|---|---|
| `--color-night` | `#07080b` | Dark canvas, cinematic sections |
| `--color-night-raised` | `#0e0f13` | Raised dark surfaces |
| `--color-cream` | `#fbf6ef` | Light canvas (`--page-bg` in light mode) |
| `--color-cream-deep` | `#f4eadd` | Deeper cream |
| `--color-paper` / `--color-paper-raised` | `#f7f4ef` / `#fdfbf8` | Legacy light surfaces |
| `--color-ink` / `--color-ink-soft` / `--color-ink-muted` | `#12100e` / `#1b1815` / `#6b655c` | Text on light |
| `--color-line` | `#e5dfd5` | Hairlines, borders (light) |
| `--color-ember-300…700` | `#ffcf8f` `#ffb45c` `#ff8a2b` `#ef6c12` `#c9540a` | Brand accent scale |
| `--color-sun-300/400` | `#ffe6a3` / `#ffd166` | Warm highlight |
| Primary gradient | `#ffa149 → #f2650f` | Primary buttons, active nav pill |
| Story copper | `#8f4012 → #c56a24 → #e39a52` (`.story-accent`) | Accent text over cream footage |
| Story cocoa | `#2b1d12` | Text over cream footage |
| Footage tints | `#e2cdb1`, `#e6d3b9` | Sampled from the two brand films |

`--page-bg` switches with theme: `#fbf6ef` (light) / `#07080b` (dark). Dark mode is class-based (`.dark` on `<html>`), toggled in the header and stored in `localStorage`.

Gradient text: `.word-ember` (bright, add `.on-dark` on photos/dark) and `.text-ember-gradient`; on light surfaces both switch to a deeper `#ff9a3c → #c9480a` ramp for contrast.

## Typography

| Role | Family | Treatment |
|---|---|---|
| Display / headings | Plus Jakarta Sans (`--font-display`) | 800 weight, tracking −0.035 to −0.045em, line-height 0.98–1.05 |
| Body / UI | DM Sans (`--font-sans`) | 400–600, 13–18px |
| Mono / numerals | Space Grotesk (`--font-mono`) | Counters, codes |

Scale (fluid `clamp`): hero `2.75rem → 5.6rem`; section titles `1.9rem → 3.4rem`; story titles `1.9rem → 3.2rem`; lead `1rem → 1.2rem`; eyebrow 11px uppercase, tracking 0.16em.

## Spacing & layout

- Shell: `max-w-[1240px] px-5 sm:px-8 lg:px-10` (`shell` in `ui/styles.ts`); hero uses `max-w-[1320px]`.
- Section rhythm: `py-14 → py-24`; pinned chapters are `100svh`.
- Breakpoints (Tailwind): `sm 640`, `md 768`, `lg 1024`, `xl 1280`, `2xl 1536`. Pinned/horizontal scenes run from `lg` up; below that they become vertical stacks.
- `.grid > *, .flex > * { min-width: 0 }` prevents column blow-outs on phones.

## Radii

`--radius-xs 0.5rem` · `sm 0.75rem` · `md 1rem` · `lg 1.25rem` · `xl 1.5rem` · `2xl 1.75rem` · `3xl 2rem` · `4xl 2.5rem`.
Cards 28–36px, inputs 16px, buttons/pills fully rounded.

## Shadows

`--shadow-ambient`, `--shadow-lift`, `--shadow-float` (theme-aware), `--shadow-ember` (accent glow). Primary buttons: `0 16–18px 36–40px -14px rgba(242,101,15,.8)` + inner top highlight.

## Liquid Glass materials

| Class | Blur | Use |
|---|---|---|
| `.glass-subtle` | 10px | Chips, segmented controls, eyebrows |
| `.glass-premium` | 20px | Panels, stat bars, cards, secondary buttons |
| `.glass-floating` | 24px | Navigation pill (scrolled), floating controls |
| `.glass-focused` | 24px, ~94% opaque | Modals, menus (max legibility) |
| `.glass-night` | 22px | Glass over photography/dark (hero, story chips) |
| `.glass-rim` | — | Adds a 1px specular gradient rim via mask |
| `.glass-1…4`, `.glass-dark` | 14–56px | Legacy levels still used inside dashboards |

Every material has a specular top edge (`inset 0 1px 0`). Blur drops to 14px under 640px, is removed for `prefers-reduced-transparency`, and falls back to opaque fills when `backdrop-filter` is unsupported.

## Buttons

- Primary: pill, `h-12…14`, gradient `#ffa149 → #f2650f`, white label, arrow nudges on hover.
- Secondary: `.glass-premium` / `.glass-night` pill.
- On cream footage: cocoa `#2b1d12` primary, translucent cream ghost.
- `Button` component (`ui/index.tsx`) variants: `primary`, `ember`, `glass`, `outline`, `ghost`; sizes `sm/md/lg/xl`.

## Motion

Tokens (CSS + `MOTION` in `src/lib/motion`): `--dur-instant 120ms`, `--dur-fast 200ms`, `--dur-base 360ms`, `--dur-slow 720ms`, `--dur-cinematic 1100ms`; easings `--ease-liquid (0.22,1,0.36,1)`, `--ease-glass (0.16,1,0.3,1)`, `--ease-expo (0.19,1,0.22,1)`.

Principles:
1. Scroll scenes are scrubbed and reversible (GSAP ScrollTrigger); nothing scroll-related runs on timers.
2. Only `transform`/`opacity` animate (short blur only on text exits).
3. Entrances: word masks for headlines, 24–28px rise for blocks, 70ms sibling stagger.
4. Inertial scrolling (Lenis) on the public page only; native scrolling on touch devices and in dashboards.
5. `prefers-reduced-motion`: pins, scrubs, parallax and smooth scroll are disabled; content is shown statically.

Implemented scenes: pinned hero (photo scale, copy lift, frame mask), horizontal skills story, parallax learning-path cards, impact line draw, two scroll-driven video chapters, header active pill tracking the current section.

## App theme (cabinet and owner panel)

- `.app-theme` (on the student cabinet, owner panel and exam layers) remaps Tailwind's cyan/teal/sky palettes to ember and indigo/violet/purple/blue to warm stone, so older views follow the brand. Emerald (success), amber (warning) and rose/red (error) are unchanged.
- `.page-hero` is the standard page heading card: cream gradient with a soft ember glow in light mode, near-black in dark mode; copy written for the old dark banners is re-coloured for contrast in light mode.
- Exam mode: neutral paper (`#f6f4f0` / `#0b0a09`), ink selection state instead of colour, one ember accent for primary actions, text size control (0.9–1.4×).
