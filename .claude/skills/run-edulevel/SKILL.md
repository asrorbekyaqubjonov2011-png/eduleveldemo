---
name: run-edulevel
description: Build, start, run, test and screenshot the EduLevel English-learning app (Next.js with Supabase Postgres). Use when asked to run the site, start the app, build it, test a flow, check Mashqlar or Edubek AI, or take screenshots of the student, owner or landing pages.
---

# run-edulevel

EduLevel is a Next.js 15 app (`app/`, `src/`) with one API route (`app/api/[...path]/route.ts`) and a Postgres database. Paths below are relative to the repository root.

The agent path is the driver, `driver.mjs` next to this file. It checks health, runs the scripted flows, and takes screenshots against a running server. Only the agent path has been verified; the human path is not covered here.

## Prerequisites (verified in this container)

- Bun (`/root/.bun/bin/bun`) and Node 22.
- Postgres 16 binaries in `/usr/lib/postgresql/16/bin` (install `postgresql-16` with apt on another machine).
- Playwright and Chromium are preinstalled at `/opt/pw-browsers/chromium`. Do not install Playwright again.

## Build

```
bun install --frozen-lockfile
npx next build
```

The repo uses `bun.lock`. Do not run `npm install`: it writes an untracked `package-lock.json`.

## Local database (no Supabase needed)

```
PGBIN=/usr/lib/postgresql/16/bin; D=$(mktemp -d /tmp/pgdata.XXXXXX); chmod 700 "$D"; chown -R postgres:postgres "$D"
su postgres -s /bin/bash -c "$PGBIN/initdb -D $D -U postgres --auth=trust > $D.initdb.log 2>&1; $PGBIN/pg_ctl -D $D -o '-p 5433 -k /tmp' -l $D.pg.log -w start"
psql -h /tmp -p 5433 -U postgres -q -c "create database edulevel;"
psql -h /tmp -p 5433 -U postgres -d edulevel -v ON_ERROR_STOP=1 -q -f supabase/migrations/0002_domain_schema.sql
```

Keep the `$D` path: it is the data directory. To start the same cluster again after a restart:

```
su postgres -s /bin/bash -c "/usr/lib/postgresql/16/bin/pg_ctl -D <your data dir> -o '-p 5433 -k /tmp' -l <your data dir>.pg2.log -w start"
```

## Run (agent path)

Start the server against the database. Pick any owner password for the test database:

```
DATABASE_URL=postgres://postgres@localhost:5433/edulevel OWNER_PASSWORD='TestOwner!2026' nohup npx next start -p 3400 > /tmp/next.log 2>&1 &
```

Then check it:

```
BASE=http://localhost:3400 node .claude/skills/run-edulevel/driver.mjs health
```

The server starts in about 1 second and prints `Ready`. The line "`next start` does not work with output: standalone" is a warning only; the server works.

Create a student account once (the driver's screenshot commands log in as this student):

```
curl -s -X POST http://localhost:3400/api/auth/register -H 'content-type: application/json' -d '{"name":"Test","surname":"Talaba","identifier":"+998901112233","password":"studentpass1","track":"ielts"}'
```

Driver commands (set `BASE`, `OWNER_PASSWORD`, `STUDENT_LOGIN`, `STUDENT_PASSWORD` first):

- `node .claude/skills/run-edulevel/driver.mjs health` — exits 0 when the database answers.
- `node .claude/skills/run-edulevel/driver.mjs flows` — runs `scripts/smoke-db.mjs` and `scripts/smoke-exercises.mjs`. Each run creates a new test student, so it can be repeated.
- `node .claude/skills/run-edulevel/driver.mjs shot <anon|student|owner> <desktop|mobile> <out.png> [label...]` — takes a screenshot at 1280 px (desktop) or 390 px (mobile). Each label is a visible text the driver clicks in order. Examples that were run:
  - Student dashboard: `shot student desktop out.png "Kabinetga o‘tish"`
  - Student Mashqlar tab (phone): `shot student mobile out.png "Kabinetga o‘tish" "Mashqlarni ochish"`
  - Owner panel: `shot owner desktop out.png "Owner Paneli"`
  - Landing page: `shot anon mobile out.png`

  The driver prints the horizontal overflow and console errors. It exits 1 if either is non-zero.

Other checks:

```
BASE=http://localhost:3400 OWNER_PASSWORD='TestOwner!2026' node scripts/smoke-db.mjs
BASE=http://localhost:3400 OWNER_PASSWORD='TestOwner!2026' node scripts/smoke-exercises.mjs
BASE_URL=http://localhost:3400 OWNER_SECRET='TestOwner!2026' STUDENT_LOGIN='+998901112233' STUDENT_PASSWORD='studentpass1' node scripts/security-test.mjs
npx tsc --noEmit -p .
npx eslint app src --quiet
```

Last verified results: security 132/132, database smoke all passing, Mashqlar 18/18, typecheck 0 errors, lint 0 errors.

To stop the server, find its PID and kill that PID. Do not use `pkill -f next`, which can kill the shell:

```
ps -eo pid,args | grep next-server | grep -v grep
kill <pid>
```

## Gotchas (seen while building this)

- A worker restart stops the local Postgres. Restart it with `pg_ctl` on the same data directory (see above). The data survives.
- When the shell dies, the server can stay alive as an orphan (parent PID 1) and keep holding the port. The next `next start` then fails with `EADDRINUSE`. Find the orphan with the `ps` command above and kill its PID.
- Every API request loads the whole database inside one transaction. That is fine at this size, but it is the first thing to change if the data grows.
- Anonymous `GET /api/db/all` hides private data (balances, deposits, tickets, other students). An empty database shows zero numbers on purpose.
- Banning a student revokes their sessions. A student who is banned gets a 403 with `code: BANNED` at login.
- Login with a wrong password returns 400 (not 401) by design.
- `GET /api/student/ai-threads` stores each student's Edubek conversations on the server.
- Mashqlar answer checks ignore case, extra spaces and final punctuation for gap answers. Short-answer questions are never auto-graded.
- Live AI calls need `GEMINI_API_KEY`. Without it the AI endpoints return `AI_NOT_CONFIGURED` (503). The AI output itself has not been checked against a real key.
- Image uploads need `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. Without them the upload returns 503 with a clear message. The upload has not been checked against a live Supabase bucket.
- The Supabase MCP `apply_migration` can ask a question that nobody answers, and then it times out. Do not retry it in the same turn. The schema in `supabase/migrations/0002_domain_schema.sql` can also be pasted into the Supabase SQL editor.

## Troubleshooting (errors actually hit)

- `503 DB_UNAVAILABLE` / "Ma’lumotlar bazasi bilan bog‘lanib bo‘lmadi" — Postgres is not running, or `DATABASE_URL` is wrong. Check with `psql -h /tmp -p 5433 -U postgres -c 'select 1'`.
- `EADDRINUSE: 3400` — an orphaned `next-server` holds the port. Kill its PID (see above).
- `Failed to load resource: 404` for `/favicon.ico` — fixed by `app/icon.svg`; not an app error.
- `smoke-db` reports "student registers → 400 already registered" — the script creates a new phone each run from `Date.now()`. If it still happens, the phone reference in the script was changed. Check that every use is the `PHONE` variable and not the literal string.
- `security-test` 132/132 needs the owner password in `OWNER_SECRET` (not `OWNER_PASSWORD`) and the student login in `STUDENT_LOGIN`.
