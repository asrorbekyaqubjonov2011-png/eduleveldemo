# EDU LEVEL — Security audit

Scope: `app/api/[...path]/route.ts`, `src/lib/auth/*`, `src/lib/dbStore.ts`, client data flow. Verified with `scripts/security-test.mjs` (133 checks) plus the flow suites (see `TEST_REPORT.md`).

| Risk | Control | Verified by |
|---|---|---|
| Hardcoded owner backdoors | Removed. Owner = username + scrypt hash in DB; env only seeds/resets. | Legacy codes rejected; password-only login rejected. |
| Plaintext passwords | scrypt with per-user salt; startup + on-login migration; backup before writing. | Migration tests on a plaintext data copy; login works before/after. |
| Session theft / fixation | 256-bit random token, only SHA-256 stored, httpOnly, SameSite=Lax, Secure in production, 7-day expiry; revoked on logout, block, delete, owner password change. | Cookie flags checked; logout invalidates session. |
| CSRF | Writes rejected when `Sec-Fetch-Site: cross-site` or foreign `Origin`; SameSite=Lax. | Foreign Origin → 403; cross-site → 403; same origin passes. |
| Broken access control | Central `authorize()`: owner-only by default; explicit public and signed-in lists; ownership checks in handlers. | Anonymous → 401 and student → 403 on every owner route; IDOR checks (profile, lessons, flashcards, exam sessions, chat threads). |
| Answer-key exposure | Keys, explanations, evidence, transcripts stripped from `db/all`; returned only by `exams/review` for the caller's submitted attempt. | Exam flow + security matrix. |
| Score tampering | Server-side scoring; client score ignored; idempotent submit; late submit uses last autosave. | Exam flow. |
| Economy tampering (coins, VIP, rewards) | Server-validated actions, catalog on server, once-per-day/pack rules. | Flow tests (low balance blocked, rewards once). |
| Data leakage | `sanitizeDatabase` removes hashes, owner username (non-owner), AI keys, bot token, exam sessions, chat threads, usage, other users' contacts/balances, deposits, tickets, submissions, audit logs, drafts. | Security matrix. |
| Brute force | In-memory limits on login, register, Google, tickets, uploads, AI. | 429 observed. |
| Forged Google login | Firebase ID token verified (RS256, audience, issuer, expiry). | Forged request rejected. |
| AI abuse / key exposure | Server-only provider calls, per-user hourly limit, provider errors hidden from students. | Invalid-key test → 503 without key or provider detail. |
| Uploads | Image MIME whitelist and size limit, signed-in only. | Security matrix (anonymous 401). |
| Secrets in repo | `.env*` and `data/` gitignored; test scripts read credentials from env; handoff zip excludes them. | `git grep` for owner password returns nothing; zip listing checked. |

## Residual risks

- Rate limits and sessions are per process (memory/file): use a shared store before running several instances.
- File database without transactions: concurrent writes are serialized by Node's single thread but not crash-safe beyond atomic file replace.
- No Content-Security-Policy header yet; React escapes output and no `dangerouslySetInnerHTML` is used with user content.
- Supabase sync sends the password to Supabase at registration/login (existing integration, only when configured).
