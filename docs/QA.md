# QA scripts

Four scripts in `scripts/qa/` check a running EduLevel server from the outside. They need no new dependencies:

| Script | What it checks | Writes |
|---|---|---|
| `run-matrix.mjs` | every public page, every student-cabinet and owner-panel sidebar item, at 1440, 1024, 768 and 390 px, light and dark | `summary.json`, `summary.md`, `shots/*.png` |
| `links.mjs` | internal links return 200; `#anchors` resolve; section ids the landing needs exist | optional `links.json` |
| `api-smoke.sh` | runs `scripts/smoke-db.mjs`, `scripts/smoke-exercises.mjs`, `scripts/security-test.mjs` | three logs and a count table |
| `lib.mjs`, `lib.test.mjs` | shared helpers and their unit tests | nothing |

Every script prints one verdict line at the end and exits with a code that tells you why it stopped.

## Before you run anything

1. Build and start the server you want to test (the reference server on port 3000 is already running for the team):
   `npx next build`, then `npx next start -p <port>` with the environment from your agent env file.
2. Playwright is needed by `run-matrix.mjs` and `links.mjs`. The repo does not list it, so the scripts look for it in this order: `playwright`, `playwright-core`, then the folder in `QA_PLAYWRIGHT_DIR` (a `node_modules` folder). On this machine that is `QA_PLAYWRIGHT_DIR=/opt/node-tools/node_modules`.
3. Chromium: `QA_CHROMIUM_PATH` if set, otherwise `/opt/pw-browsers/chromium` when that file exists. Do not run `playwright install`.
4. Test accounts come from environment variables only. Nothing is written to the output that contains them.

| Variable | Used by | Default |
|---|---|---|
| `QA_STUDENT_LOGIN`, `QA_STUDENT_PASSWORD` | `run-matrix.mjs` student area | none (required for the student area) |
| `QA_OWNER_LOGIN` | `run-matrix.mjs` owner area | `jasurbek` |
| `QA_OWNER_PASSWORD` | `run-matrix.mjs` owner area | none (required for the owner area) |
| `QA_CHROMIUM_PATH` | both browser scripts | `/opt/pw-browsers/chromium` if it exists |
| `QA_PLAYWRIGHT_DIR` | both browser scripts | none |
| `QA_ENV_FILE` | `api-smoke.sh` | none; the file is sourced |
| `BASE_URL`, `OWNER_PASSWORD`, `OWNER_USER`, `STUDENT_LOGIN`, `STUDENT_PASSWORD` | `api-smoke.sh` | see below |

A `KEY=VALUE` file works for `node --env-file=<file>`. `QA_ENV_FILE` takes the same file (lines may start with `export`).

## 1. Matrix runner: `run-matrix.mjs`

```
node scripts/qa/run-matrix.mjs --out <dir> [--base http://localhost:3000] [--widths 1440,1024,768,390] \
  [--themes light,dark] [--areas public,student,owner] [--routes /,/ielts-tayyorgarlik] [--concurrency 2] [--no-full]
```

- `--out` is required. The folder gets `summary.json`, `summary.md` and `shots/`.
- `--areas public` visits the pages discovered from `app/**/page.tsx` plus a missing URL that must show the 404 page. Dynamic routes (`[param]`) are listed as not visited.
- `--areas student` logs in through `POST /api/auth/login`, opens the cabinet and clicks every visible sidebar item. Collapsed groups are expanded first.
- `--areas owner` does the same for the owner panel.
- Below 640 px the Menyu drawer is opened first. Below 1024 px the sidebar drawer is opened before each item.
- Dark views click the theme toggle (`Light/Dark rejim`) once per browser context. The SEO pages (`/cefr…`, `/ielts…`, `/ingliz…`) and the 404 page have no toggle, so their dark views are listed under "Not applicable" and not run.
- `--concurrency` is the number of browser contexts that run at once. Two is the default; more adds load on a shared machine.

**Exit codes:** 0 every view PASS; 1 at least one view FAIL; 2 setup problem (bad option, missing variable, browser did not start, login refused or rate limited).

**What a view checks** (each problem is one issue line in the summary):

- page errors, and console errors. `Failed to load resource` and `ResizeObserver loop` messages are ignored because they come from third-party fonts and the browser, not the app;
- same-origin HTTP status 400 and above on any request except the page navigation itself (401, 403 and 429 included, unless listed in `EXPECTED_HTTP` in the script);
- same-origin `/api` requests that failed without a response;
- document width larger than the window by more than 1 px (horizontal overflow);
- a page with fewer than 40 characters of visible text (blank);
- the visible text containing `undefined`, `NaN` or `[object Object]`;
- visible markup (`<tag>`) or HTML entities (`&amp;`) in the text;
- an image that did not load (SVG images are not checked);
- an empty document title (public pages only);
- the header's theme toggle and Menyu button covered by another element (not clickable);
- for sidebar items: the click did not happen, or the item did not become the active one.

**Reading `summary.md`:**

- The verdict line is first: `Verdict: PASS` or `FAIL`, with the counts.
- The table has one row per view: area, view name (the sidebar label, or the page path), width, theme, verdict, number of issues, and links to the screenshot (`shots/<id>.png`) and, for public pages, the full-page screenshot (`shots/<id>-full.png`).
- "Failures" repeats every issue of each failing view.
- "Not applicable" lists the dark views skipped because the page has no toggle.
- "Not visited" lists dynamic routes.
- View ids are `<area>-<width>-<theme>-<NN>-<slug>`, the same as the screenshot names.

`summary.json` has the same data (`meta`, `totals`, `views`), for scripts.

**Runtime:** the last full matrix run (320 views, 16 dark views not applicable) took 547 s (about 9 minutes) at `--concurrency 2` with the machine under load (load average about 10). Keep the matrix under 15 minutes by narrowing `--areas` or `--widths` for a quick check, not by changing the checks.

**Known findings that a run reports (not script bugs):**

- Text `<yangi>` was in the reference database when the last run was made (a news item whose title contains it). Every run flags it on the landing and on the owner's news and audit pages until the content is changed. It is data, not code.
- At 1024 px the landing header's desktop navigation covers the theme toggle, so the toggle cannot be clicked. The runner reports this as "control not clickable" and the theme toggle click as failed. This is a layout defect for the header owner.

## 2. Link and anchor check: `links.mjs`

```
node scripts/qa/links.mjs [--base http://localhost:3000] [--out <dir>] [--max-pages 8] [--ids top,books,faq]
```

- The landing is rendered in a browser, then every public page from `app/` is rendered too (up to `--max-pages`, the landing included).
- Every same-origin link is requested with GET (redirects followed); each must return 200.
- Every `#id` must exist on the page it points to.
- The section ids in `--ids` must exist on the landing. The default list is `top,books,results,testimonials,vip,teacher-bio,faq,contact`, the ids the header menu and buttons scroll to.
- External links, `mailto:`, `tel:`, `/api/` and `/_next/` are not checked. The count is printed.
- `--out` writes `links.json` with the same problems, notes and counts.

Output: one line per problem (`FAIL <kind> <from> -> <to>: <reason>`), notes for anchors on pages that were not rendered, and a final `PASS` or `FAIL` line.

**Exit codes:** 0 no problems; 1 problems found; 2 setup problem.

## 3. API smoke: `api-smoke.sh`

```
QA_ENV_FILE=<env file> scripts/qa/api-smoke.sh [--out <dir>]
```

The script runs the three repository scripts from the repo root and prints one row per script, then the totals and the log folder. The layout is:

```
script              exit   PASS   FAIL   SKIP
smoke-db              <n>    <n>    <n>    <n>
smoke-exercises       <n>    <n>    <n>    <n>
security-test         <n>    <n>    <n>    <n>
total                        <n>    <n>    <n>
logs: <dir>
RESULT: PASS | FAIL
```

The numbers come from the run; this page does not carry a result.

It counts lines that start with `PASS`, `FAIL` or `SKIP`. `RESULT: FAIL` is printed when any script exits non-zero or any line starts with `FAIL`. Read the log for the detail.

- `BASE_URL` (default `http://localhost:3000`) is the server. `OWNER_PASSWORD` (or `QA_OWNER_PASSWORD`) is required; it also becomes `OWNER_SECRET`.
- `STUDENT_LOGIN` and `STUDENT_PASSWORD` (or the `QA_` versions) are optional. Without them the security test prints SKIP for the student checks.

**Side effects, by design of the repository scripts:**

- `smoke-db.mjs` and `smoke-exercises.mjs` create a course, a lesson, students and an exercise in the target database. Use a test database.
- `security-test.mjs` sends a burst of wrong passwords to check the login limiter. Run it against a test server, or after the other agents are done, because the limiter is shared per process.

**Exit codes:** 0 every script exits 0 and nothing failed; 1 a script failed; 2 setup problem (missing owner password, `QA_ENV_FILE` not found, no `node`).

## 4. Unit tests

```
node --test scripts/qa/lib.test.mjs
```

They cover argument parsing, route discovery from `app/`, the judgement of a view, link classification and `slugify`. They need no server.

## Adding an expected HTTP status

When an endpoint must answer 401, 403 or 429 for a view, add a rule to `EXPECTED_HTTP` in `run-matrix.mjs`:
`{ status: 403, path: '/api/owner/', areas: ['owner'] }`. The rule matches the path prefix and the area. Keep the list short and say why in the commit.
