import { NextRequest, NextResponse } from 'next/server';
import { withDatabase } from '@/src/lib/dbStore';
import { requireAuth } from '@/src/lib/auth/guards';
import { requireContext } from '@/src/lib/db/context';
import { finalizeAttempt } from '@/src/lib/levelTests/finalize';
import { verifyPassword } from '@/src/lib/auth/password';
import { attemptDeadline, canStartAttempt, isExpired } from '@/src/lib/levelTests/logic';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

const clean = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/[\u0000-\u001f]/g, '').trim().slice(0, max) : '');

/**
 * Starts (or resumes) an attempt. Body: { firstName, lastName, className, entryCode? }.
 * Blocked attempts are returned as 423 so the student sees the lock screen and the owner's unlock flow.
 */
async function handlePost(req: NextRequest, ctx: Ctx) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  if (auth.role === 'owner') return NextResponse.json({ success: false, message: 'Owner testni topshirmaydi. Testni owner panelda ko‘rishingiz mumkin.' }, { status: 403 });
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const firstName = clean(body.firstName, 60);
  const lastName = clean(body.lastName, 60);
  const className = clean(body.className, 30);
  if (!firstName || !lastName || !className) {
    return NextResponse.json({ success: false, message: 'Ism, familiya va sinfni kiriting.' }, { status: 400 });
  }

  const pool = requireContext().client;
  await pool.query('select pg_advisory_xact_lock(727003, hashtext($1))', [id + ':' + auth.userId]);
  const testRes = await pool.query(
    `select * from public.level_tests t where t.id = $1 and t.status = 'published'
       and (t.starts_at is null or t.starts_at <= now()) and (t.ends_at is null or t.ends_at > now())`,
    [id]
  );
  const test = testRes.rows[0];
  if (!test) return NextResponse.json({ success: false, message: 'Test hozir ochiq emas.' }, { status: 404 });

  if (test.access === 'code') {
    const code = clean(body.entryCode, 12);
    if (!code || !verifyPassword(code, test.entry_code_hash).ok) {
      return NextResponse.json({ success: false, message: 'Kod noto‘g‘ri.' }, { status: 403 });
    }
  }

  // Resume the open attempt, or report a block. Expired attempts are closed here.
  const open = await pool.query(
    `select * from public.level_attempts where test_id = $1 and user_id = $2 and status in ('in_progress','blocked')
      order by started_at desc limit 1 for update`,
    [id, auth.userId]
  );
  const current = open.rows[0];
  if (current) {
    if (current.status === 'blocked') {
      return NextResponse.json({ success: false, code: 'BLOCKED', attemptId: current.id, message: 'Siz bloklangansiz. Owner beradigan kodni kiriting.' }, { status: 423 });
    }
    if (!isExpired(new Date(current.deadline_at), new Date())) {
      return NextResponse.json({ success: true, attemptId: current.id, resumed: true, deadlineAt: current.deadline_at });
    }
    await finalizeAttempt({ ...current, grading_rules: test.grading_rules, certificate_enabled: test.certificate_enabled }, 'expired');
  }

  const made = await pool.query(
    `select count(*)::int as n from public.level_attempts where test_id = $1 and user_id = $2 and status <> 'in_progress'`,
    [id, auth.userId]
  );
  if (!canStartAttempt(made.rows[0]?.n ?? 0, test.attempts_allowed)) {
    return NextResponse.json({ success: false, message: 'Bu testni boshlash uchun urinishlar tugagan.' }, { status: 409 });
  }

  const qRes = await pool.query('select id from public.level_questions where test_id = $1 order by position', [id]);
  if (!qRes.rowCount) return NextResponse.json({ success: false, message: 'Testda savollar yo‘q.' }, { status: 409 });
  const ids: string[] = qRes.rows.map((r) => r.id);
  if (test.shuffle_questions) {
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }
  }
  const startedAt = new Date();
  const deadline = attemptDeadline(startedAt, test.time_limit_seconds, test.ends_at ? new Date(test.ends_at) : null);
  const attemptId = `la-${crypto.randomUUID()}`;
  await pool.query(
    `insert into public.level_attempts (id, test_id, user_id, first_name, last_name, class_name, attempt_no, started_at, deadline_at, question_order)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [attemptId, id, auth.userId, firstName, lastName, className, (made.rows[0]?.n ?? 0) + 1, startedAt, deadline, JSON.stringify(ids)]
  );
  return NextResponse.json({ success: true, attemptId, resumed: false, deadlineAt: deadline.toISOString() }, { status: 201 });
}

export const POST = withDatabase(handlePost);
