import { NextRequest, NextResponse } from 'next/server';
import { withDatabase } from '@/src/lib/dbStore';
import { requireAuth } from '@/src/lib/auth/guards';
import { getPool } from '@/src/lib/db/pool';
import { verifyPassword } from '@/src/lib/auth/password';
import { isExpired, registerViolation } from '@/src/lib/levelTests/logic';
import { finalizeAttempt } from '@/src/lib/levelTests/finalize';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

async function ownAttempt(id: string, userId: string) {
  const res = await getPool().query(
    `select a.*, t.title, t.time_limit_seconds, t.require_fullscreen, t.max_violations, t.certificate_enabled,
            t.grading_rules, t.kind
       from public.level_attempts a join public.level_tests t on t.id = a.test_id
      where a.id = $1 and a.user_id = $2`,
    [id, userId]
  );
  return res.rows[0] ?? null;
}

/** Current state for the student: questions without answers, the saved answers and the deadline. Expires on time. */
async function handleGet(req: NextRequest, ctx: Ctx) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;
  const a = await ownAttempt(id, auth.userId);
  if (!a) return NextResponse.json({ success: false, message: 'Urinish topilmadi.' }, { status: 404 });
  if (a.status === 'in_progress' && isExpired(new Date(a.deadline_at), new Date())) {
    const r = await finalizeAttempt(a, 'expired');
    return NextResponse.json({ success: true, status: 'expired', result: r });
  }
  if (a.status !== 'in_progress') {
    return NextResponse.json({ success: true, status: a.status, result: { percent: a.percent, level: a.level_label, certificateCode: a.certificate_code, score: a.score, maxScore: a.max_score } });
  }
  const qs = await getPool().query('select id, prompt, options, points from public.level_questions where test_id = $1', [a.test_id]);
  const byId = new Map(qs.rows.map((q) => [q.id, q]));
  const order: string[] = Array.isArray(a.question_order) ? a.question_order : [];
  const questions = order.map((qid) => byId.get(qid)).filter(Boolean).map((q: any) => ({ id: q.id, prompt: q.prompt, options: q.options, points: q.points }));
  return NextResponse.json({
    success: true,
    status: 'in_progress',
    title: a.title,
    kind: a.kind,
    deadlineAt: a.deadline_at,
    requireFullscreen: a.require_fullscreen,
    maxViolations: a.max_violations,
    violations: a.violations,
    warningsLeft: Math.max(0, a.max_violations - a.violations),
    answers: a.answers ?? {},
    questions
  });
}

/** Saves one answer. Body: { questionId, choice }. Refused after the deadline or when blocked. */
async function handlePut(req: NextRequest, ctx: Ctx) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;
  const a = await ownAttempt(id, auth.userId);
  if (!a) return NextResponse.json({ success: false, message: 'Urinish topilmadi.' }, { status: 404 });
  if (a.status !== 'in_progress' || isExpired(new Date(a.deadline_at), new Date())) {
    return NextResponse.json({ success: false, message: 'Vaqt tugagan yoki urinish yopilgan.' }, { status: 409 });
  }
  const body = await req.json().catch(() => ({})) as { questionId?: unknown; choice?: unknown };
  const qid = typeof body.questionId === 'string' ? body.questionId : '';
  const choice = Number(body.choice);
  const allowed = Array.isArray(a.question_order) && a.question_order.includes(qid);
  if (!allowed || !Number.isInteger(choice) || choice < 0 || choice > 7) {
    return NextResponse.json({ success: false, message: 'Javob noto‘g‘ri.' }, { status: 400 });
  }
  await getPool().query(
    `update public.level_attempts set answers = answers || jsonb_build_object($2::text, $3::int) where id = $1 and status = 'in_progress'`,
    [id, qid, choice]
  );
  return NextResponse.json({ success: true });
}

/** Student finishes. Body: none. Returns the result the owner's rules give. */
async function handlePost(req: NextRequest, ctx: Ctx) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;
  const a = await ownAttempt(id, auth.userId);
  if (!a) return NextResponse.json({ success: false, message: 'Urinish topilmadi.' }, { status: 404 });
  if (a.status !== 'in_progress') return NextResponse.json({ success: false, message: 'Urinish allaqachon yopilgan.' }, { status: 409 });
  const r = await finalizeAttempt(a, isExpired(new Date(a.deadline_at), new Date()) ? 'expired' : 'finished');
  return NextResponse.json({ success: true, result: r });
}

/**
 * The client reports that the student left fullscreen or switched page. Each report is one violation. When the limit
 * is passed the attempt is blocked and an owner unlock code is needed.
 */
async function handlePatch(req: NextRequest, ctx: Ctx) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;
  const a = await ownAttempt(id, auth.userId);
  if (!a) return NextResponse.json({ success: false, message: 'Urinish topilmadi.' }, { status: 404 });
  if (a.status !== 'in_progress') return NextResponse.json({ success: true, status: a.status });
  const next = registerViolation(a.violations ?? 0, a.max_violations);
  await getPool().query(
    `update public.level_attempts set violations = $2,
            status = case when $3::boolean then 'blocked' else status end,
            blocked_at = case when $3::boolean then now() else blocked_at end
      where id = $1`,
    [id, next.violations, next.blocked]
  );
  return NextResponse.json({ success: true, status: next.blocked ? 'blocked' : 'in_progress', violations: next.violations, warningsLeft: next.warningsLeft, blocked: next.blocked });
}

export const GET = withDatabase(handleGet);
export const PUT = withDatabase(handlePut);
export const POST = withDatabase(handlePost);
export const PATCH = withDatabase(handlePatch);
