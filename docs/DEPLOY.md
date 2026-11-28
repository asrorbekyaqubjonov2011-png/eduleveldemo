# EduLevel deployment

This file records the historical Render service configuration. The connected workspace no longer exposes service `srv-dc0qserm8hqs73fc4bt0`, and this repository's PR branch is different from the branch listed below. Confirm the live service in its own Render workspace before any production release. Keys, passwords and tokens live only in the Render dashboard, the Supabase project and the owner's password manager.

Last checked: 2026-11-23, after 11:04 UTC. Sources: the Render read-only API, the Supabase migration list, the production home page (GET) and a local build of this branch.

## 1. Production service

| Item | Value |
|---|---|
| Render service | `Edu-Level`, id `srv-dc0qserm8hqs73fc4bt0`, workspace "Asrorbek's workspace" (`tea-dbv71fs9v7es738sk5ig`) |
| Public URL | https://edu-level.onrender.com |
| Repository, branch | `asrorbekyaqubjonov11-cmyk/EduLevel`, branch `ccr-9d9be064-f56xo5` |
| Deploy trigger | Auto-deploy on every commit pushed to that branch. A push is a production deploy. |
| Region, runtime | singapore, node, 1 instance |
| Build command | `bun install && bun run build` |
| Start command | `bun run start` (runs `next start`; Render sets `PORT`, 10000 on this service) |
| Health check path | `/` |
| Instance plan | free at the historical read-only check. The reference Blueprint now requests free. |
| Database | Supabase project `qavdumqcxmauvgllplik`, pooled connection on port 6543 |

`render.yaml` is a reference copy of this service. Nothing in this repository syncs it to Render, and no Blueprint link is known. Treat the dashboard as the source of truth.

## 2. Environment variables (names only)

Set these in the Render dashboard for `Edu-Level`. `render.yaml` marks every secret with `sync: false`, so no value is committed.

Required:

| Name | Used for |
|---|---|
| `NODE_ENV` | `production` (set in `render.yaml`) |
| `DATABASE_URL` | Postgres connection (`src/lib/db/pool.ts`) |
| `OWNER_USERNAME` | owner login name; the code defaults to `jasurbek` (`src/lib/auth/guards.ts`) |
| `OWNER_PASSWORD` | creates the owner login on the first start when none exists (`src/lib/db/bootstrap.ts`) |
| `GEMINI_API_KEY` | Optional. Generation requires explicit confirmation of free-tier eligibility through `GEMINI_FREE_TIER_CONFIRMED=1`. |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | image storage (`src/lib/storage.ts`) |
| `TELEGRAM_BOT_TOKEN` | Telegram Bot API (`src/lib/telegramBot.ts`). Without it the owner's bot endpoints answer 503. |
| `TELEGRAM_WEBHOOK_SECRET` | sent to Telegram with `setWebhook` and checked on `POST /api/telegram/webhook` |
| `TELEGRAM_CRON_SECRET` | value of the `x-cron-secret` header for `POST /api/telegram/cron` |
| `NEXT_PUBLIC_SITE_URL` | public origin for canonical links, sitemap and bot links. Falls back to `RENDER_EXTERNAL_URL`. Set it to `https://edu-level.onrender.com`. |
| `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`, `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID` | Google sign-in web config (`src/lib/firebase.ts`). Next.js inlines these at build time, so a change needs a new build. |

Optional:

| Name | Used for |
|---|---|
| `OPENROUTER_API_KEY` | Jev answer checker (`src/lib/jev/client.ts`). Without it the check reports `no_key` and the caller falls back. |
| `GEMINI_MODEL`, `GEMMA_MODEL` | model overrides (`src/lib/universalAi.ts`) |
| `SUPABASE_STORAGE_BUCKET` | bucket name, default `edulevel-media` |
| `DATABASE_SSL_CA` | PEM certificate for strict TLS to the database |
| `FIREBASE_PROJECT_ID` | server-side fallback for the Firebase project id (`src/lib/auth/firebaseToken.ts`) |

One-time only:

- `OWNER_RESET_PASSWORD` sets a new owner password on the next start (`src/lib/db/bootstrap.ts`). Set it, deploy, then delete it.

Must not be set in production:

- `TELEGRAM_API_BASE` redirects the bot to the local fake Telegram server (`src/lib/telegramBot.ts`).
- `GOOGLE_GEMINI_BASE_URL` is a base-URL override that the `@google/genai` SDK reads. The local env file sets it for the fake Gemini.
- `DISABLE_HMR` is for development only (`next.config.ts`).

Set by Render itself, do not set them: `PORT`, `RENDER_EXTERNAL_URL`.

Not read by the code: `APP_URL` appears in `.env.example`, but the app reads `NEXT_PUBLIC_SITE_URL`.

Locally, copy `.env.example` to `.env.local`. `.env*` files are git-ignored except `.env.example`.

## 3. Build and start

```
bun install
bun run build      # next build
bun run start      # next start (uses PORT on Render)
```

Every start prints `"next start" does not work with "output: standalone" configuration`. The cause is `output: 'standalone'` in `next.config.ts`, not in `package.json`. Removing that line clears the warning, because the service runs `next start`, not the standalone server. Owner of `next.config.ts`: A9.

## 4. Scripts (`package.json`)

| Script | Command | Last result (2026-11-23) |
|---|---|---|
| `dev` | `next dev` | not run |
| `build` | `next build` | exit 0, 14 routes |
| `start` | `next start` | `/` returns 200 locally |
| `typecheck` | `tsc --noEmit` | exit 0 |
| `lint` | `eslint .` | exit 0, 0 errors, 84 warnings |
| `test` | `bun test src` | 22 pass, 0 fail, 4 files |
| `test:security` | `node scripts/security-test.mjs` | syntax checked; not run (see below) |
| `verify` | typecheck, lint, test, build, in that order | release gate (section 8) |
| `clean` | `next clean` | not run |

Notes:

- The four test files use the `node:test` API. `node --test` cannot run them: their imports have no file extension, and Node 22 fails with `ERR_MODULE_NOT_FOUND`. `bun test` runs them. Render already uses bun.
- `test:security` needs `BASE_URL`, `OWNER_SECRET`, `OWNER_USER`, `STUDENT_LOGIN` and `STUDENT_PASSWORD` (`OTHER_STUDENT_ID` is optional). It sends 12 wrong logins to test the login limiter, and it calls the AI endpoints, which spend Gemini quota. Run it only against a local copy of the data, never against production. Its default `BASE_URL` is `http://localhost:3000`, a shared reference server, so always set `BASE_URL` explicitly.

## 5. Release checklist

1. **Branch.** Release from `ccr-9d9be064-f56xo5`. A push to that branch deploys production, so steps 2 to 5 come before the push.
2. **Gate.** `bun run verify` exits 0.
3. **Security test, local copy only.** `BASE_URL=<local copy> OWNER_SECRET=... OWNER_USER=... STUDENT_LOGIN=... STUDENT_PASSWORD=... bun run test:security`. No `FAIL` lines.
4. **Migrations.** Apply new files in `supabase/migrations/` in file-name order, before the code that needs them goes live. Check the applied list for project `qavdumqcxmauvgllplik`. On 2026-11-23 it showed `0001_init` and `domain_schema_0002`. The app also runs its own idempotent DDL (`create table if not exists`, `add column if not exists`) for the `telegram_*` tables (`src/lib/telegramStore.ts`) and the `uploads` table (`src/lib/uploadStore.ts`); those need no manual step.
5. **Environment check.** In the Render dashboard, confirm required names in section 2 and the free-tier eligibility of every enabled AI model. Never paste values into chat, commits or docs.
6. **Deploy.** Auto-deploy starts on push. The deploy is finished when `list_deploys` shows `live` and the log shows `Your service is live`. Use a manual deploy only if auto-deploy did not start. Clear the build cache only for a build problem.
7. **Smoke test.** GET only; agents do not log in to production. `https://edu-level.onrender.com/`, `/ingliz-tili-darslari`, `/ielts-tayyorgarlik`, `/cefr-tayyorgarlik`, `/robots.txt` and `/sitemap.xml` return 200. The first request after an idle period can take about 25 s on the free plan. Open `/` in a browser: no console errors. The owner logs in personally to check the owner panel.
8. **Webhook re-set.** Needed after any change to `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET` or the public URL. The owner runs "connect webhook" in the owner panel, which calls `POST /api/owner/telegram-webhook`. Check it with the same route and body `{"action":"info"}`, which only reads: `url` must be `https://edu-level.onrender.com/api/telegram/webhook` and `lastError` must be null.
9. **Cron check.** The outside scheduler calls `POST https://edu-level.onrender.com/api/telegram/cron?job=reminders` daily and `?job=digest` weekly, with the `x-cron-secret` header. Check the scheduler's last responses (200 with `success: true`). The safe manual check is a request without the header, which must return 403 `{"ok":false}`. A manual call with the secret sends real messages to subscribers, so make one only when the owner asks.
10. **After release.** For 30 minutes, watch the error-level logs (`list_logs` with `level: error`). Treat quota and database errors as release problems.

## 6. Live state (read-only check, 2026-11-23)

- **Access.** The connected Render account lists one workspace, "Asrorbek's workspace", and `Edu-Level` is in it. The "Chess's workspace" entry with the Fayzullomath service is no longer visible.
- **Deploys.** The service was created 2026-11-21 14:44 UTC. Its latest deploy, `dep-dc1tdrbtqb8s73av8fc0` for commit `5bbd241`, has been `live` since 06:04:50 UTC. The whole event history has no failed build and no failed deploy. The only non-success is a canceled deploy at 2026-11-21 14:50 UTC, superseded by a newer commit.
- **Health.** `GET /` returned HTTP 200 on the first request, after 25.1 s.
- **Plan.** The Render API reports the instance plan as `free` (build plan `starter`). Free instances spin down when idle, and the restarts at 08:09 and 10:51 UTC (each followed by `Running 'bun run start'` after a long gap) fit that. The brief and `render.yaml` say `starter`. Upgrading costs money, so the owner decides.
- **Logs, last 200 lines and the 7-day error log:**
  - Gemini quota: `429 ... generate_content_free_tier_requests, limit: 20` at 07:13:17 and 07:17:46 UTC (gemini-3.8-flash) and 07:42:20 UTC (`ai-stream`). The production key is on the free tier, so AI features stop when its quota runs out. **Owner action: attach a billed Gemini key to `GEMINI_API_KEY`.**
  - Gemini overload: `503 ... high demand` on gemini-3.8-flash and gemma-4-26b-a4b-it at 04:27 UTC and between 07:05 and 07:42 UTC. Transient.
  - AI timeouts: `AI so'rovi 12/25 soniyada javob bermadi` between 07:06 and 07:13 UTC.
  - Database: `[db] request failed ... bigint` at 05:40:15 and 05:40:35 UTC (value `500000000000000000000` out of range) and at 05:41:53 UTC (`1e+39`, code 22P02). A numeric input reached a bigint column without validation. Not seen after 05:41 UTC. The deploy live at that time was `46c2df2`; check whether `5bbd241` changed the validation.
  - Startup: the standalone warning (section 3) on every start. No crash, no restart loop.
  - Telegram: `[telegram] total=...` lines are normal. The slowest was 4667 ms at 06:06 UTC.
- **Duplicate service.** `EduLevel`, id `srv-dbv741e7bikc73fp86dg`, `edulevel-hdk8.onrender.com`, Ohio, free plan, **suspended by the user**. It has the same repository and branch, auto-deploy on, and no health check path. It is not used. Resuming it would deploy the same code to a second public URL. Owner decision: keep or delete.

## 7. Open items

| # | Item | Owner |
|---|---|---|
| 1 | Confirm free-tier eligibility before enabling Gemini generation | owner |
| 2 | Verify the live free instance still fits the Render memory limit | owner |
| 3 | `output: 'standalone'` in `next.config.ts` causes the start warning: remove it | A9 |
| 4 | Numeric API inputs reach bigint columns unvalidated (5e20 and 1e39 errors at 05:40 UTC): validate before the query | API owner |
| 5 | `.env.example`: remove `APP_URL` (not read by the code) and list `OPENROUTER_API_KEY` as optional | not owned by A4 |
| 6 | Duplicate suspended service `edulevel-hdk8`: keep or delete | owner |
| 7 | `eslint-config-next` 16.0.8 is paired with `next` 15.5.29: check the pairing before the next upgrade | lead |
| 8 | `raceFirst.test.ts` checks wall-clock time (under 300 ms) and can fail on a loaded machine: rerun before blaming the code | test owner |
| 9 | 84 lint warnings and 0 errors, documented in the comments of `eslint.config.mjs` | later |

## 8. Local verification

Run on 2026-11-23 in the A4 worktree, with the local test environment (no production values):

- `bun run typecheck`: exit 0.
- `bun run lint`: exit 0, 0 errors, 84 warnings.
- `bun run test`: 22 pass, 0 fail, 4 files.
- `bun run build`: exit 0, Next.js 15.5.29, 14 routes, first-load JS 103 to 107 kB.
- `next start -p 3104` with the same environment: `/`, `/ingliz-tili-darslari`, `/ielts-tayyorgarlik`, `/cefr-tayyorgarlik`, `/robots.txt` and `/sitemap.xml` all return 200. The home HTML contains 13 `undefined` strings, all inside the Next.js flight payload (`$undefined` placeholders), none in visible text.
- `bun run verify` (typecheck, lint, test, build in one command): exit 0.
