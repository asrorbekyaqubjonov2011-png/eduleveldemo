# EDU LEVEL — Functionality audit

Status key: **Working** = exercised end to end here (API tests and/or browser) · **Partial** = works with stated gaps · **UNVERIFIED** = needs credentials or services not available in this environment · **Not implemented** = no real backend yet.

Tested against the production build (`next build && next start`) with a demo data copy (`EDULEVEL_DATA_DIR`), never the real `data/db.json`.

## Accounts and access

| Feature | Status | Notes |
|---|---|---|
| Student registration (one track: IELTS / CEFR / General) | Working | 4-step wizard (account → track → goal & daily time → confirm with edit links and consent), phone auto-format, e-mail/phone validation, password strength. Track validated server-side; blacklist checked; student cannot change own track (owner can). |
| Student login (phone/email + password), logout, session restore | Working | httpOnly session cookie, `auth/me` on reload. |
| Owner login (`jasurbek` + password) | Working | Password alone or wrong password rejected. |
| Owner changes password / login name | Working | Old password required; old password stops working; sessions revoked. |
| Plaintext password migration | Working | Startup + on-login rehash, backup written first. |
| Google sign-in | UNVERIFIED | Requires Firebase config; forged requests without a verified token are rejected (tested). |

## Learning

| Feature | Status | Notes |
|---|---|---|
| Track-scoped content (courses, lessons, tests, reading, listening) | Working | Course track derived from level; lessons inherit; other-track tests cannot be started. |
| Video lessons: native files, YouTube (IFrame API), resume position, progress | Working | Progress saved every 5 s / on pause; skipping does not count as watch time. Browser check with a local MP4. YouTube playback itself UNVERIFIED here (external network). |
| Seed lessons | Partial | Seed URLs are placeholders → honest “video coming soon” state until the owner sets real URLs. |
| Owner lesson management (edit, reorder, publish/draft, preview, subtitles, PDF, resources) | Working | Drafts hidden from students. |
| Reading exam (timed, autosave, resume, server scoring, review) | Working | Opens full-screen; timer survives reload; review only after submit. |
| Listening exam | Partial | Server-scored, transcripts only after start/submit. Seed tests have no recorded audio → labelled browser TTS. Owner UI for uploading listening audio: Not implemented (data field `audioUrl` exists). |
| Mock exams (MCQ) | Working | Full-screen exam mode (candidate bar, server timer with 10/5/1-minute warnings, autosave status, text size, question strip, flag for review, keyboard A–D / ← → / F), instructions with confirmation, pre-submit review grid, results with score ring and "only mistakes" filter. |
| Writing | Partial | Draft autosave, timer, word count, history. AI grading UNVERIFIED (no key); failure shows a clear error, nothing invented. |
| Speaking | Partial | Mic permission errors, recording playback/re-record, typed-answer mode. AI evaluation UNVERIFIED; pronunciation not scored. |
| Flashcards (create, edit, delete, SM-2 review on server, due-first order) | Working | Own cards only. |
| Test history / results | Working | Own attempts only. |
| Progress (one section: "Mening progressim") | Working | Replaces the former "Progress insight" and "O‘quv dinamikasi": KPIs, score trend, 4 skills vs target, daily activity (7/14/30 days), rank, lessons, recent attempts, next steps — from stored data only. |
| Band / CEFR conversion | Working | Only for test lengths with defined tables; otherwise raw points with a note. |

## AI

| Feature | Status | Notes |
|---|---|---|
| AI English Studio chat, translator, writing/speaking grading | UNVERIFIED | No provider key here. With an invalid key every endpoint returns `503 AI_UNAVAILABLE` and the UI shows the message. |
| AI chat threads (new, rename, delete, persisted per student on server) | Working | `GET/PUT student/ai-threads`; local copy kept as offline cache. |
| AI rate limits and usage tracking | Working | 40/h student, 120/h owner; `db.aiUsage`. |
| Owner AI test generator | Partial | Preview/edit before publish; template fallback clearly labelled. Real generation UNVERIFIED (no key). |

## Community, gamification, money

| Feature | Status | Notes |
|---|---|---|
| Global chat | Working | Identity from session; role cannot be spoofed. Message reporting: Not implemented (owner mute / ban / blacklist exist). |
| Clans: join | Working | Server-validated. Clan chat persistence and tournament registration: not re-verified in this pass (UNVERIFIED). |
| Daily quest, quiz pack rewards, coin shop, frames | Working | Server-validated; rewards once per day / per pack. |
| VIP purchase from balance | Working | Blocked when balance is low; plans read from owner-defined `vipPlans`. |
| Deposits (request → owner approve/reject) | Working | Always recorded for the caller, pending until owner action. Real payment gateway: Not implemented (manual transfer flow). |
| Reviews (student submits → owner moderates → testimonials marquee) | Working | Pending reviews hidden publicly. |
| FAQ (owner managed) | Working | |

## Owner panel

| Feature | Status | Notes |
|---|---|---|
| Dashboard, students (track, VIP, balance, block, mute/ban), finance, courses/lessons, tests, reading tests, results, VIP plans, shop, reviews, FAQ, site builder, theme, teacher profile, tickets, audit log, security | Working | All write endpoints owner-only (security matrix). |
| Pagination / server search in large tables | Partial | Client-side search/filter only. |
| Supabase sync | UNVERIFIED | Needs Supabase credentials. |

## Public site

| Feature | Status | Notes |
|---|---|---|
| Landing (hero, scroll-scrubbed video chapters, learning paths, skills, testimonials marquee, VIP, FAQ) | Working | Desktop 1440 and mobile 390, reduced-motion static layout. |
| Score calculator | Removed | As requested. |
