# EDU LEVEL — Technical handoff

## Stack (installed versions)

- Next.js 15.5 (App Router, `output: 'standalone'`), React 19.3, TypeScript 5.9
- Tailwind CSS 4.1 (`@tailwindcss/postcss`), tw-animate-css
- Motion: GSAP 3.13 + ScrollTrigger, `@gsap/react` 2.1, Lenis 1.3.26, `motion` 12 (component interactions)
- Charts: Recharts 3.10 · Icons: lucide-react
- AI: `@google/genai` + multi-provider helper `src/lib/universalAi.ts` (server side)
- Optional integrations: Supabase JS 2.118 (sync), Firebase 13 (Google sign-in, Workspace hub)

## Structure

```
app/
  layout.tsx, page.tsx            -> loads src/App.tsx client-side
  globals.css                     -> design system (tokens, glass, motion CSS)
  api/[...path]/route.ts          -> the only runtime API (GET/POST/PUT/DELETE)
src/
  App.tsx                         -> area switcher (landing / student / admin / auth)
  context/AppContext.tsx          -> app state, API calls, URL hash routing
  lib/auth/*                      -> password hashing, sessions, guards, rate limit, Google token check
  lib/dbStore.ts                  -> JSON file database (data/db.json), atomic writes, password migration
  lib/motion/, lib/studentAnalytics.ts, lib/eduLogic.ts, lib/video.ts
  components/site1/*              -> public site
  components/site2/*              -> student cabinet
  components/site3/*              -> owner/admin panel
  components/auth/AuthPage.tsx, components/common/*, components/ui/*
public/media/                     -> hero/landing photos (WebP), scroll films (MP4 + small + posters)
scripts/migrate-passwords.mjs     -> one-shot password migration (dry-run supported)
scripts/security-test.mjs         -> auth/authorization test matrix
server.ts                         -> LEGACY Express backend, disabled unless LEGACY_EXPRESS_SERVER=1
```

## Routes

Single Next route `/`; areas are selected by URL hash (back/forward work):
`/` landing · `/#/student` student cabinet · `/#/admin` owner panel · `/#/auth` sign-in. Inside the cabinet/panel, tabs are client state.

API: `/api/*` handled by `app/api/[...path]/route.ts`.
- Public: `GET db/all` (sanitized per caller), `GET auth/me`, `GET ai/status`, `GET supabase/status`, `POST auth/login|register|google|logout`, `POST support-tickets`, `POST exams/start|save|review`, `POST test-attempts` (guests get a guest key).
- Signed-in (ownership checked in the handler): `student/economy`, `student/profile`, `lessons/progress`, `lessons/toggle-complete`, `flashcards` (+ `PUT/DELETE flashcards/:id`), `GET/PUT student/ai-threads`, `clans/join`, `reviews/submit`, `chat/global`, `deposits/request`, `upload`, `ai/grade-writing|evaluate-speaking|translate-3level|chat-tutor`.
- Owner only: everything else (content, finance approval, users, VIP plans, reviews/FAQ moderation, shop, settings, AI key, site builder, owner password).

## Exam engine

- `POST exams/start` creates a server session (`db.examSessions`) with the deadline; the timer counts down from server time (clock offset corrected), survives reloads and resumes.
- Answers autosave locally (`exam:<sessionId>`) and to the server (`exams/save`, debounced).
- `POST test-attempts` scores on the server (`src/lib/exam/scoring.ts`), is idempotent per session, and after the deadline uses the last autosave.
- Answer keys, explanations, evidence and listening transcripts are stripped from `db/all` for non-owners and returned only by `exams/review` for a submitted attempt of the caller.
- Band/CEFR conversions are shown only for test lengths whose tables exist (IELTS Reading/Listening 40, CEFR reading 35); otherwise the score is raw points with a note.

## AI

- Provider calls happen only on the server (`src/lib/universalAi.ts`). Missing key → `503 AI_NOT_CONFIGURED`; provider failure/timeout (45 s) → `503 AI_UNAVAILABLE`. No fabricated fallback output. Provider error detail is logged and shown only to the owner.
- Limits: 40 requests/hour per student, 120 for the owner. Usage per user/day/operation in `db.aiUsage` (owner only).
- Writing/speaking results are saved with `isAiEstimate: true` and labelled as AI estimates. Pronunciation is not scored.
- Owner AI test generator: generated tests are previewed and edited before publishing; on AI failure the owner may load a curated template, clearly labelled "not AI output".

## Security model

- Passwords: scrypt (`scrypt$N$r$p$salt$hash`). Plaintext values are migrated automatically on startup (a backup `data/db.json.bak-<timestamp>` is written first) and on successful login. Manual: `node scripts/migrate-passwords.mjs [--dry-run]`.
- Owner access: username + password. Username in `db.ownerUsername` (default `jasurbek`, or `OWNER_USERNAME`); password hash in `db.ownerPasswordHash`, changed in Admin → Login & parol (old password required; all sessions revoked). `OWNER_PASSWORD` only seeds the first hash; `OWNER_RESET_PASSWORD` forces a new hash on start.
- Sessions: random 256-bit token, only its SHA-256 stored (`data/sessions.json`), httpOnly + SameSite=Lax cookie (`Secure` in production), 7-day expiry, revoked on logout, block, delete and owner password change.
- CSRF: every POST/PUT/DELETE is rejected (403 `CSRF`) when `Sec-Fetch-Site: cross-site` or the `Origin` host differs from the request host; together with SameSite=Lax cookies.
- Authorization: central `authorize()` in the route — owner-only by default, ownership checks for student actions, chat identity taken from the session.
- Google sign-in requires a verified Firebase ID token (RS256 signature, audience, issuer, expiry).
- Rate limits on login, register, Google, tickets, uploads and AI. Uploads: image MIME whitelist, size limit.
- `/api/db/all` never returns password hashes, owner username (to non-owners), AI keys, exam sessions, chat threads, answer keys, other users' contacts/balances, deposits, tickets, submissions or audit logs.
- No secrets in the repository; Firebase/Supabase/AI keys come from env.

## Environment variables (names only)

`OWNER_USERNAME`, `OWNER_PASSWORD` (seed), `OWNER_RESET_PASSWORD` (recovery), `GEMINI_API_KEY`, `APP_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_S3_ACCESS_KEY`, `SUPABASE_S3_SECRET_KEY`, `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`, `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID`, optional `EDULEVEL_DATA_DIR` (alternate data folder for tests), `LEGACY_EXPRESS_SERVER`.

## Design & animation architecture

- Tokens and materials live in `app/globals.css`; see `DESIGN_SYSTEM.md`.
- `ScrollReveals` marks `<html class="motion-ready">` and reveals `[data-reveal]` via IntersectionObserver (content stays visible without JS).
- GSAP scenes use `useGSAP` with `gsap.matchMedia()` so pinning/horizontal scrolling only run on `lg+`, and everything is reverted on unmount.
- Scroll films: `ScrollVideoStory` pins a section, maps scroll progress to `video.currentTime` with a lerp (never autoplays), and fades timed copy scenes. Footage is encoded with a short GOP (4–5 frames) for smooth seeking; a 960px file is used on phones.
- Lenis smooth scrolling is enabled on the landing page only (desktop pointers), ticked by GSAP.
- Rule learned the hard way: ancestors of pinned sections must not have `transform`, `filter` or `will-change`; `body` uses `overflow-x: clip`.

## Commands

```
bun install            # or npm install
npm run dev            # http://localhost:3000
npm run build && npm start
npx tsc --noEmit -p .
npx eslint .
npx tsx --test src/lib/exam/scoring.test.ts src/lib/eduLogic.test.ts
node scripts/migrate-passwords.mjs --dry-run
# against a running instance that uses a COPY of the data (EDULEVEL_DATA_DIR=...):
BASE_URL=http://localhost:3000 OWNER_SECRET=… STUDENT_LOGIN=… STUDENT_PASSWORD=… node scripts/security-test.mjs
STUDENT_PASSWORD=… OWNER_SECRET=… node scripts/flows.mjs <studentPhone>
STUDENT_PASSWORD=… OWNER_SECRET=… node scripts/examflow.mjs <studentPhone>
STUDENT_PASSWORD=… OWNER_SECRET=… node scripts/lessonflow.mjs <studentPhone>
STUDENT_PASSWORD=… node scripts/fcflow.mjs <studentPhone> <otherStudentPhone>
```
The login limiter is in memory: running all suites back to back from one IP can hit 429; restart the server between runs.

## Verification

See `TEST_REPORT.md`, `SECURITY_AUDIT.md` and `FUNCTIONALITY_AUDIT.md`.

## Known limitations

- `data/db.json` is a file database: fine for one server, not for multi-instance/serverless hosting. `data/` is gitignored (contains personal data).
- Supabase sync, Google sign-in and AI need their credentials; none were available here, so those integrations are UNVERIFIED against the real services (AI failure handling was verified with an invalid key).
- `server.ts` is a legacy duplicate backend and is intentionally disabled.
- Seed lessons point to a placeholder video; they show “video coming soon” until the owner sets real URLs.
- Seed listening tests have no recorded audio; they play browser text-to-speech, labelled as such, until the owner uploads audio.
- ESLint: 0 errors; ~100 warnings remain (React Compiler advisories and unused vars in older components).
- The brand films contain baked-in typography ("SEDU LEVEL"); it can only be changed in the source footage.
