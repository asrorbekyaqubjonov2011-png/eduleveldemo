import { NextRequest, NextResponse } from 'next/server';
import { withDatabase } from '@/src/lib/dbStore';
import { requireAuth, getAuth } from '@/src/lib/auth/guards';
import { getPool } from '@/src/lib/db/pool';

export const dynamic = 'force-dynamic';

/**
 * Student list of published level tests and tournaments the time window allows. Never includes answers, entry-code
 * hashes or other students' data. The owner lists everything from /api/levels/owner.
 */
async function handleGet(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  const pool = getPool();
  const tests = await pool.query(
    `select t.id, t.kind, t.title, t.description, t.access, t.time_limit_seconds, t.attempts_allowed,
            t.starts_at, t.ends_at, t.require_fullscreen, t.max_violations,
            (t.entry_code_hash is not null) as has_entry_code,
            (select count(*)::int from public.level_questions q where q.test_id = t.id) as question_count
       from public.level_tests t
      where t.status = 'published'
        and (t.starts_at is null or t.starts_at <= now())
        and (t.ends_at is null or t.ends_at > now())
      order by t.kind, t.created_at desc`
  );
  const mine = await pool.query(
    `select test_id, status, attempt_no, percent, level_label, certificate_code, finished_at, started_at
       from public.level_attempts where user_id = $1 order by started_at desc`,
    [auth.userId]
  );
  return NextResponse.json({ success: true, tests: tests.rows, myAttempts: mine.rows, viewerRole: getAuth(req)?.role ?? 'student' });
}

export const GET = withDatabase(handleGet);
