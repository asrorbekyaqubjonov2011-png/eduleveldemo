import { NextRequest, NextResponse } from 'next/server';
import { withDatabase } from '@/src/lib/dbStore';
import { requireOwner } from '@/src/lib/auth/guards';
import { getPool } from '@/src/lib/db/pool';
import { hashPassword } from '@/src/lib/auth/password';
import { generateUnlockCode } from '@/src/lib/levelTests/logic';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

/**
 * Owner view of a test: every attempt with name, class, status, score, percent, level, violations and time.
 * Optional ?status=in_progress|blocked|finished|expired|abandoned filters the list ("hozir ishlayotganlar").
 */
async function handleGet(req: NextRequest, ctx: Ctx) {
  const auth = requireOwner(req);
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;
  const status = new URL(req.url).searchParams.get('status');
  const allowed = new Set(['in_progress', 'blocked', 'finished', 'expired', 'abandoned']);
  const params: unknown[] = [id];
  let filter = '';
  if (status && allowed.has(status)) {
    params.push(status);
    filter = `and a.status = $2`;
  }
  const { rows } = await getPool().query(
    `select a.id, a.first_name, a.last_name, a.class_name, a.status, a.attempt_no, a.started_at, a.finished_at,
            a.deadline_at, a.score, a.max_score, a.percent, a.level_label, a.certificate_code, a.violations,
            a.blocked_at, a.user_id, (a.unlock_code_hash is not null) as has_unlock_code, a.unlock_code_expires_at,
            case when a.unlock_code_expires_at > now() then a.unlock_code_plain end as unlock_code
       from public.level_attempts a
      where a.test_id = $1 ${filter}
      order by a.started_at desc`,
    params
  );
  return NextResponse.json({ success: true, attempts: rows });
}

/** Owner issues a one-time unlock code for a blocked attempt. Valid 30 minutes. The plain code is returned once. */
async function handlePost(req: NextRequest, ctx: Ctx) {
  const auth = requireOwner(req);
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as { attemptId?: unknown };
  const attemptId = typeof body.attemptId === 'string' ? body.attemptId : '';
  if (!attemptId) return NextResponse.json({ success: false, message: 'Urinish ID kerak.' }, { status: 400 });
  const code = generateUnlockCode();
  const res = await getPool().query(
    `update public.level_attempts
        set unlock_code_hash = $3, unlock_code_plain = $4, unlock_code_expires_at = now() + interval '30 minutes'
      where id = $1 and test_id = $2 and status = 'blocked' returning id`,
    [attemptId, id, hashPassword(code), code]
  );
  if (!res.rowCount) return NextResponse.json({ success: false, message: 'Faqat bloklangan urinish uchun kod beriladi.' }, { status: 409 });
  return NextResponse.json({ success: true, unlockCode: code, expiresInMinutes: 30 });
}

export const GET = withDatabase(handleGet);
export const POST = withDatabase(handlePost);

/** Owner deletes one attempt so the student can take the test again (their other attempts are kept). Body: { attemptId } */
async function handleDelete(req: NextRequest, ctx: Ctx) {
  const auth = requireOwner(req);
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as { attemptId?: unknown };
  const attemptId = typeof body.attemptId === 'string' ? body.attemptId : '';
  if (!attemptId) return NextResponse.json({ success: false, message: 'Urinish ID kerak.' }, { status: 400 });
  const res = await getPool().query('delete from public.level_attempts where id = $1 and test_id = $2 returning id', [attemptId, id]);
  if (!res.rowCount) return NextResponse.json({ success: false, message: 'Urinish topilmadi.' }, { status: 404 });
  return NextResponse.json({ success: true });
}

export const DELETE = withDatabase(handleDelete);
