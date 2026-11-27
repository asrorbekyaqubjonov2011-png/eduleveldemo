# EduLevel database: access, indexes, storage, backups

Project: Supabase `qavdumqcxmauvgllplik` (region ap-southeast-1), PostgreSQL 17.12, plan **free**
(`get_organization`). Database size about 16 MB.

## 1. Who connects and how

- The Next.js server connects with `DATABASE_URL` (`src/lib/db/pool.ts`) as the Supabase **`postgres`** role.
  `postgres` has `rolbypassrls = true`, so row level security does not apply to the server.
- `SUPABASE_SERVICE_ROLE_KEY` (server only) is used for Supabase Storage uploads. The `service_role` role also bypasses RLS.
- Browsers never talk to the database directly. The anon key is not used by the app. `anon` and `authenticated`
  (PostgREST) have `rolbypassrls = false`.

## 2. Row level security

Migration `supabase/migrations/0003_rls_indexes.sql` enables RLS on the six tables that were exposed:
`uploads`, `telegram_chats`, `telegram_polls`, `telegram_poll_answers`, `telegram_quiz_sessions`, `telegram_link_codes`.

- No policies are created on purpose. Enabled RLS with no policy means `anon` and `authenticated` see **zero rows**
  and cannot write. The server is unaffected because it bypasses RLS.
- Verified on production: `rls_disabled_in_public` (ERROR) is gone.
- All 30 public tables now have RLS enabled. The `rls_enabled_no_policy` INFO lint lists all 30 (it listed 24 before).
  This is the same design as before (deny-all for browser roles), not a new problem. If the owner wants the INFO
  lint gone, explicit `using (false)` policies could be added. That was not done here.
- Do not add a policy that grants `anon` or `authenticated` access to any of these tables without a review. The
  tables hold answer sheets, payments, chat ids and private receipts.

## 3. Indexes (migration 0003)

The list was built from every `where`, `join` and `order by` in `src/lib/db/snapshot.ts`, `src/lib/telegramStore.ts`,
`src/lib/db/bootstrap.ts`, `src/lib/auth/session.ts`, `src/lib/uploadStore.ts` and `app/api/*`.

Added (all `create index if not exists`):

| Index | Why |
|---|---|
| `course_modules_course_id_idx`, `deposits_user_id_idx`, `lesson_progress_lesson_id_idx`, `reviews_user_id_idx`, `support_tickets_user_id_idx` | Foreign keys without an index (advisor `unindexed_foreign_keys`, now cleared). |
| `sessions_user_id_idx` | `revokeUserSessions` deletes by `user_id`. |
| `users_registered_idx (registered_at, id)`, `test_attempts_created_idx`, `user_records_created_idx`, `deposits_created_idx`, `support_tickets_created_idx`, `reviews_created_idx` | Full snapshot load sorts these tables by these columns on every request. |
| `telegram_chats_username_lower_idx (lower(username))` | `qualifyReferral`, `privateChatForUsername`. |
| `telegram_chats_referred_by_idx (referred_by)` | `referralCounts`, `topReferrers`. |
| `telegram_chats_private_chat_idx (chat_id) where chat_type = 'private' and not opted_out` | Subscriber batches and reminders. |
| `telegram_polls_chat_id_idx (chat_id)` | `groupLeaderboard` join filter. |
| `telegram_link_codes_expires_idx (expires_at)` | `createLinkCode` cleanup. |

Deliberately **not** added:
- ORDER BY columns of small content and config tables (`courses`, `course_modules`, `lessons`, `tests`,
  `content_items`, `vip_plans`, `site_sections`, `faqs`, `promo_codes`). They hold tens of rows, change only through the
  owner, and the planner would ignore an index. Revisit when `lessons` or `content_items` reach a few thousand rows.
- `sourceCounts` (`group by source`) on `telegram_chats`: a full aggregate of a small table.
- `telegram_chats.user_id`, `uploads.owner_id`, `uploads.visibility`, `exam_sessions.owner_key`: no query filters on them
  today. `sessions.is_owner`: only used by owner logout, a few rows.

Existing indexes the advisor reports as unused (not dropped, because changes are additive only):
`users_points_idx`, `exam_sessions_owner_idx` (no code filters on `owner_key`), `deposits_status_idx`,
`support_tickets_status_idx`. Review them after two to four weeks of traffic before any drop.

Measured (`EXPLAIN ANALYZE`, PostgreSQL 16 on the local test database; synthetic data 100k users and 200k telegram chats,
inside a transaction that was rolled back; see the report for raw output):
- Users snapshot sort: about 290 to 370 ms before, 18 to 31 ms after (sequential scan + external sort replaced by an index scan).
- Telegram username lookup: about 52 to 56 ms before, 0.01 to 0.04 ms after.
- Telegram subscriber batch: already fast before (primary key on `chat_id` gives the order), about the same after.

The production dataset is small (users 13, telegram_chats 6), so the planner still uses sequential scans on most
tables today. The indexes matter when the tables grow.

### Main cost is the full snapshot load (not in this migration)

`loadDatabase` (`src/lib/db/snapshot.ts`) reads every table on each request (`select * ... order by ...`).
`pg_stat_statements` on production shows the top queries are these full loads, about 3,400 calls each. Indexes do not
remove that cost. Route-level loads of only the tables each request needs would. This is an application change, see section 8.

## 4. Storage

Facts checked on production (SELECT only):

- Buckets: exactly one, `edulevel-media`. There is no separate "teacher photo" bucket. Teacher photos, lesson material
  and digital books all go to this bucket (`SUPABASE_STORAGE_BUCKET`, default `edulevel-media`).
- `public = true`, `file_size_limit = 26214400` (25 MiB), `allowed_mime_types = null` (no MIME allowlist).
- Objects: 13 files, about 2.6 MB total, largest about 1.2 MB, MIME types `image/jpeg` and `image/png`.
- `storage.objects` has RLS **enabled** and **zero policies**. So `anon` and `authenticated` cannot list or read
  objects through the Storage API. Listing is not exposed. No storage advisor is raised.
- Public object URLs (`/storage/v1/object/public/edulevel-media/...`) work for anyone who has the URL. This is intended:
  the site shows these files by URL.

Upload limits in place:
- Bucket: 25 MiB maximum object size (set when the bucket was created by `ensureBucket`).
- App (`src/lib/storage.ts`): images 6 MB max, PDFs 25 MB max, type checked from magic bytes (PNG, JPEG, WEBP, GIF, PDF).
- Bucket MIME allowlist: not set. The server is the only writer (service role), so the risk is low.

### Gaps found

1. **Private files are written to the public bucket (code bug, not fixed here).** `src/lib/storage.ts`, `uploadObject()`:
   when `visibility === 'private'` (receipts) and the Supabase upload succeeds, the code does not return. It falls through
   and also saves the bytes in `public.uploads`. So a receipt ends up as a public object in `edulevel-media`, reachable
   by its URL. The path has 48 random bits, so it is hard to guess, but it is still public.
   Fix (for the owner of `src/lib/storage.ts`): skip Supabase entirely for private uploads:
   ```ts
   const cfg = supabaseConfig();
   if (cfg && (opts.visibility ?? 'public') === 'public') { /* existing Supabase block */ }
   return saveUpload(bytes, mime, opts.ownerId || 'system', opts.visibility ?? 'public');
   ```
   Existing private objects in the bucket are not identified by the database (it stores only `/api/uploads/<id>`).
   Listing the bucket would be needed to find them. Deleting them is a data change, so it needs the owner's decision.
2. **No bucket MIME allowlist.** Owner action in the Supabase dashboard (Storage, edulevel-media, allowed MIME types
   `image/png, image/jpeg, image/webp, image/gif, application/pdf`), or a change in `ensureBucket` that updates existing
   buckets. Not done with SQL: it would be an `UPDATE` on an existing `storage.buckets` row, which this task does not allow.
3. **Two-bucket model does not exist** in the code. If the owner wants separate buckets for private material, that is a design change.

No storage policy was added or changed. The current state (RLS on, no policies) is already the safe default.

## 5. Backups and data safety

What Supabase provides depends on the plan. **This project is on the free plan** (`get_organization`). On the free
plan Supabase does not provide automated daily backups or point-in-time recovery. Confirm in the dashboard
(Project Settings, Billing, and Database, Backups). If there are no backups, the only protection is a dump made by us.

What to check now:
- Dashboard: Database, Backups. Note whether any backup exists and its date.
- Free projects can be **paused after a period of inactivity**. A paused project cannot be used. Keep the app in use or upgrade.
- Storage files are **not** in a database dump. Back them up separately (section 6, step 6).
- Owner decision: upgrade to a paid plan (daily backups, point-in-time recovery) or schedule our own `pg_dump`
  (for example a weekly Render cron job writing to a private bucket). Until one of these exists, the data is not backed up.

## 6. Restore procedure (plain steps)

Never restore on top of production. Restore into a new, empty Supabase project first.

1. **Take a dump** (from a machine with PostgreSQL 17 client tools; keep the connection string in an environment
   variable, never in a file that is committed):
   ```bash
   pg_dump "$SOURCE_DATABASE_URL" --schema=public --format=custom --no-owner --no-acl --file edulevel-$(date +%F).dump
   ```
   Use the session connection (port 5432) in the Supabase dashboard connection string.
2. **Check the file**: `pg_restore --list edulevel-YYYY-MM-DD.dump | head -50` must list tables such as `users` and `telegram_chats`.
3. **Create a new Supabase project** (same region, ap-southeast-1) and note its connection string as `$TARGET_DATABASE_URL`.
4. **Restore the public schema** into it:
   ```bash
   pg_restore --no-owner --no-acl --dbname "$TARGET_DATABASE_URL" edulevel-YYYY-MM-DD.dump
   ```
5. **Compare row counts** with production for each table (`select count(*)` from users, sessions, courses, lessons,
   deposits, telegram_chats, audit_logs and the others). They must match the dump time.
6. **Copy storage files**: download every object in `edulevel-media` (dashboard, or the Storage API with the service role
   key from the environment) and upload to the new project's bucket with the same paths. Create the bucket first with
   `public = true` and the same size limit.
7. **Fix URLs if the project URL changed.** Database rows and the site store full public URLs
   (`https://<project-ref>.supabase.co/storage/v1/object/public/...`). If the new project has a different ref, update
   these values, or keep the old project available for the old URLs.
8. **Point the app**: set `DATABASE_URL` (and `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) on Render to the new project and redeploy.
   Keep the old project untouched until the new one works.
9. **Verify**: owner login, a student login, a course page, a teacher photo, a deposit list. Run `scripts/smoke-db.mjs` against the new environment
   only if it holds test data, not real students.

Recovery point: with a manual dump, the recovery point is the time of the last dump. Dump before any risky change.

## 7. Verification log (this change)

- Local (edulevel, PostgreSQL 16): `smoke-db.mjs` against the reference server showed 12 PASS before and after the migration.
- Local: migration applied with `psql -1 -v ON_ERROR_STOP=1`, re-run succeeded (idempotent).
- Local RLS probe: a non-bypass role saw 200,020 rows of `telegram_chats` before the migration and 0 after.
- Production: `0003_rls_indexes` applied (listed by `list_migrations`). Advisors before and after: see the report.

## 8. Requests for other owners

- `src/lib/storage.ts`: stop uploading private files to Supabase (fix in section 4).
- `src/lib/db/snapshot.ts` and `src/lib/dbStore.ts`: stop loading the whole database on every request. The biggest real cost in production.
- Owner: choose a backup plan (section 5) and set the bucket MIME allowlist (section 4).
- Review the four unused indexes listed in section 3 after a few weeks of traffic.
