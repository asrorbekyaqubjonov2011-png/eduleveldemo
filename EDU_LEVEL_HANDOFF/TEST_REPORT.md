# EDU LEVEL — Test report

Date: 2026-11-19. Environment: Linux container, Node 22, Next.js 15.5 production build, Chromium (Playwright). Data: demo copy via `EDULEVEL_DATA_DIR` (2 demo students, owner `jasurbek`).

| Check | Command | Result |
|---|---|---|
| TypeScript | `npx tsc --noEmit -p .` | Pass (0 errors) |
| Production build | `npx next build` | Pass |
| ESLint | `npx eslint .` | 0 errors, 102 warnings (React Compiler advisories `set-state-in-effect`/`purity`/`immutability`, unused vars in older components). `react/no-unescaped-entities` disabled because Uzbek apostrophes are letters. |
| Unit tests (scoring, normalization, conversions, SM-2, levels) | `npx tsx --test src/lib/exam/scoring.test.ts src/lib/eduLogic.test.ts` | 13/13 pass |
| Security matrix | `node scripts/security-test.mjs` | 133/133 pass |
| Accounts, owner password change, economy, reviews, tracks | `node scripts/flows.mjs` | 24/24 pass |
| Exam engine (keys hidden, sessions, resume, autosave, scoring, idempotency, guests) | `node scripts/examflow.mjs` | 19/19 pass |
| Lesson progress and drafts | `node scripts/lessonflow.mjs` | 7/7 pass (skip check now measures the credited delta, so repeated runs stay valid) |
| Flashcards SM-2, AI threads, CSRF | `node scripts/fcflow.mjs` | 18/18 pass |
| AI failure handling (invalid `GEMINI_API_KEY`) | writing, speaking, translate, tutor | All `503 AI_UNAVAILABLE`, no fabricated output, no provider detail to students |
| Browser journeys (Playwright, 1440×900 and 390×844) | 23 screenshot routes: landing, courses, dashboard, course player, video, reading, listening, writing, speaking, mock exam + results, AI studio + chat, flashcards, community, VIP, profile, owner dashboard/students/courses/security, mobile | 0 page errors, 0 console errors |

## Design pass (progress, exam mode, light theme, registration)

- Playwright, light and dark, 1440×900 and 390×844: registration wizard (all 4 steps), login, unified progress page, every student tab, every owner tab, mock exam (instructions → keyboard answers → flag → review → submit → results), mobile exam. 0 page errors, 0 console errors.
- Found and fixed: full-screen exam layers sat under the site header (parent stacking context) → rendered through a body portal; light-mode banners with white/pale text → unified `page-hero` card with readable copy; off-brand cyan/indigo/violet/neon accents in older views → remapped to the brand palette inside the apps.

## Issues found and fixed in the QA pass

- Exam view opened mid-page on mobile, under the fixed header → sections and exams now open at the top.
- Provider error text (incl. "API key not valid") reached students → generic message for students, detail for owner only.
- AI test generator: only real multiple-choice questions go into mock tests; template fallback when AI is unavailable, labelled.
- Test scripts contained credentials → now read from environment variables.

## Not verified here

- Real Gemini responses, Firebase Google sign-in, Supabase sync, YouTube playback (credentials/external services unavailable).
- Payment gateway (none exists; deposits are manual transfers approved by the owner).
- Load / multi-instance behaviour.
