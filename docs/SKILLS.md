# Agent skills, evidence and review checklist

For the lead (who writes the agent briefs and merges) and the supervisor (who checks each branch before merge).
The rules come from the shared agent rules (COMMON.md). Read them together with this page.

## 1. Skills every agent must invoke

Invoke each with the Skill tool, at the point named. Skipping one is a failed report, even when the work was small.

| Skill | When it must be invoked | Evidence in the report |
|---|---|---|
| `superpowers:using-superpowers` | first thing in the session | name only |
| `superpowers:brainstorming` | before creating any new feature or component | the approach chosen and the open calls, in the plan |
| `superpowers:writing-plans` | any multi-step work; plan saved in the agent's scratchpad | path of the plan file |
| `superpowers:systematic-debugging` | every bug, before any code change | root cause in one sentence, with the command that showed it |
| `superpowers:test-driven-development` | logic that can be unit tested | the failing run (RED) and the passing run (GREEN) for each new test |
| `edulevel-premium-design` | any UI, motion or design work (the project's mandatory design rules) | the rules applied, and the screenshots that show them |
| `run-edulevel` | building, starting, driving or screenshotting the app | server port, build result, screenshot paths |
| `frontend-design:frontend-design` | distinctive visual design of a screen | name only, with the screen it changed |
| `design:design-critique` | judging a screen before reporting it done | the critique points and what was changed for each |
| `design:accessibility-review` | judging a screen before reporting it done | the findings (contrast, focus, touch size) and the fixes |
| `design:ux-copy` | any new Uzbek user-facing text | the strings changed, in Uzbek, with the apostrophe the repo uses |
| `dataviz` | any chart, graph or dashboard | the chart file or component, and its screenshot |
| `superpowers:verification-before-completion` | before any claim that something works | every command run, with its exit code and output summary |
| `superpowers:requesting-code-review` | before finishing, reviewing the agent's own diff against section 3 | the checklist with each line marked, and the diff stat |

After the work, the report lists every skill invoked and what it changed for that agent.

## 2. Roles A1 to A10

The brief lists the agent IDs and ports, not the roles. The role names below are the lead's to confirm.
"Role type" decides which extra skills and which evidence apply. Types:

- **UI**: screens, layout, motion, copy. Extra skills: `edulevel-premium-design`, `frontend-design:frontend-design`, `design:design-critique`, `design:accessibility-review`, `design:ux-copy`, `dataviz` (for charts). Evidence: screenshots at 1440 and 390 px, light and dark where the page has the toggle, and the QA matrix summary for the areas touched.
- **Data and API**: database, routes, auth, data integrity. Extra skills: `systematic-debugging`, `test-driven-development`, `run-edulevel`. Evidence: output of `scripts/qa/api-smoke.sh` with its counts, and the database query results before and after a data change.
- **Integration**: Telegram bot, webhooks, external services. Extra skills: `systematic-debugging`, `test-driven-development`, `run-edulevel`. Evidence: the fake Telegram recorded calls (`GET http://localhost:4555/_state`, counts only, no tokens) and the request and response for each flow.
- **Gate**: lint, typecheck, unit tests, security checks on a branch or on the reference server. Extra skills: `requesting-code-review`, `verification-before-completion`. Evidence: exact commands with exit codes and counts.
- **QA harness**: this folder (`scripts/qa`). Extra skills: `test-driven-development`. Evidence: `node --test scripts/qa/lib.test.mjs` counts, the `summary.md` path of a matrix run, `links.json` path, and the `api-smoke.sh` counts.

| Agent | Port | Role type (inferred; the lead confirms) | Role (lead to confirm) | Extra evidence the report must carry |
|---|---|---|---|---|
| A1 | 3101 | UI (public landing) | landing audit | landing screenshots at 1440 and 390 px, light and dark; `links.mjs` output if links changed |
| A2 | 3102 | UI (student cabinet) | student flows | matrix summary for `--areas student`; a student flow log |
| A3 | 3103 | UI (owner panel) | owner panel exploration | matrix summary for `--areas owner`; the owner items checked |
| A4 | 3104 | Data and API (default until the lead says otherwise) | not set in the brief | api-smoke counts |
| A5 | 3105 | Integration (Telegram bot) | bot and fake Telegram | fake Telegram `_state` counts; bot flow results |
| A6 | 3106 | QA harness | supervisor and QA harness | runner and link checker output, see `docs/QA.md` |
| A7 | none | Data and API (schema and columns) | database schema | column lists before and after; migration output |
| A8 | 3108 | UI (default until the lead says otherwise) | not set in the brief | matrix summary for the areas changed |
| A9 | 3109 | Data and API (access and data checks) | database and API analysis | api-smoke counts; the security-test summary line |
| A10 | 3000 (read-only) | Gate (reference server) | lint, typecheck, unit tests, security | eslint, tsc, unit and security counts from the reference server |

Every role also reports the commit hashes, the branch name, and the requests for other owners (COMMON.md, "Output").

## 3. Supervisor review checklist (before merge)

Run these on each branch against the base commit the lead names (`BASE`). A failed line blocks the merge until fixed or the lead accepts it in writing.

1. **Diff size.** `git diff --shortstat $BASE...<branch>`. More than 400 changed lines or more than 15 files: ask the agent to split the branch, unless the lead accepts the size in writing.
2. **Owned files only.** `git diff --name-only $BASE...<branch>` must list only the files the agent owns (its brief lists them). Any other file is a request for another owner, not a merge item.
3. **Tests.** Run the role's test commands from the report and check each exit code. Any test that failed in the agent's own run is named in the report. For the QA harness: `node --test scripts/qa/lib.test.mjs`.
4. **Lint.** `npx eslint app src --quiet` reports 0 errors, and `npx eslint <changed files>` reports no new error.
5. **Typecheck.** `npx tsc --noEmit -p .` reports 0 errors.
6. **Screenshots present.** For each UI change, every screenshot path in the report exists (`ls -l <path>`), covers 1440 and 390 px, and light and dark where the page has the theme toggle.
7. **No secrets.** `git diff $BASE...<branch> | grep -nE "TestOwner|speedpass|AIza|SERVICE_ROLE|BEGIN (RSA|PRIVATE) KEY|api[_-]?key\s*[:=]"` prints nothing. No `.env` file in the diff (`git diff --name-only $BASE...<branch> | grep -E '(^|/)\.env'` prints nothing).
8. **No production URLs.** `git diff $BASE...<branch> | grep -n "onrender.com"` prints nothing new. Only the existing fallback in `app/layout.tsx` is allowed. Production is read-only for agents.
9. **Edubek look unchanged.** `git diff --quiet $BASE...<branch> -- src/components/site2/EdubekAvatar.tsx public/edubek` exits 0. The brief says "character SVG"; this repo draws the character with `src/components/site2/EdubekAvatar.tsx` and the twelve `public/edubek/*.webp` files, so those are the protected files. Any change needs the owner's explicit request in the brief.
10. **No dead code.** The diff adds no commented-out code, no `TODO` left without an owner, no unused export, no file that nothing imports (check with `git diff $BASE...<branch> -- '*.ts' '*.tsx'` and `npx eslint` for unused variables).
11. **Motion rules.** Any new animation changes only `transform` and `opacity`, respects `prefers-reduced-motion`, and adds no scroll handler that reads layout on every frame (`edulevel-premium-design` rules).
12. **User-facing text.** New Uzbek Latin strings use the apostrophe the repo already uses (‘ or ’). Reports may be in English.
13. **Commit trailers.** Every commit on the branch ends with the two trailers from COMMON.md:
    `git log $BASE..<branch> --format=%B | grep -c "Co-Authored-By: Claude Haiku 5.5"` equals the commit count, and the `Claude-Session:` line is present for each.
14. **Nothing pushed or forced.** The branch was not pushed by the agent and no other branch was rewritten (check the report's commit list against `git reflog <branch>`).

## 4. How the QA harness is used in the checklist

- UI branch: `node scripts/qa/run-matrix.mjs --out <dir> --base <server> --areas <changed areas>` and attach `<dir>/summary.md`. Narrow `--widths` or `--routes` only with the lead's agreement; the full matrix is the default.
- Landing or link change: `node scripts/qa/links.mjs --base <server> --out <dir>` and attach `links.json`.
- API or data change: `QA_ENV_FILE=<env file> scripts/qa/api-smoke.sh --out <dir>` and attach the counts.
- The commands, environment variables and output format are in `docs/QA.md`.
