import { NextRequest, NextResponse } from 'next/server';
import { withDatabase } from '@/src/lib/dbStore';
import { requireOwner } from '@/src/lib/auth/guards';
import { getPool } from '@/src/lib/db/pool';
import { hashPassword } from '@/src/lib/auth/password';
import { validateGradingRules, generateUnlockCode } from '@/src/lib/levelTests/logic';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

function bad(message: string, status = 400) {
  return NextResponse.json({ success: false, message }, { status });
}

/** The answer key (correct_index) is included for the owner only; never for students. */
async function handleGet(req: NextRequest, ctx: Ctx) {
  const auth = requireOwner(req);
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;
  const pool = getPool();
  const test = await pool.query('select * from public.level_tests where id = $1', [id]);
  if (!test.rowCount) return bad('Test topilmadi.', 404);
  const questions = await pool.query(
    'select id, position, prompt, options, correct_index, points, explanation from public.level_questions where test_id = $1 order by position, created_at',
    [id]
  );
  const { entry_code_hash: _h, entry_code_plain, ...row } = test.rows[0];
  return NextResponse.json({ success: true, test: { ...row, entry_code: entry_code_plain ?? null, has_entry_code: Boolean(test.rows[0].entry_code_hash) }, questions: questions.rows });
}

const EDITABLE = ['title', 'description', 'kind', 'access', 'status', 'time_limit_seconds', 'attempts_allowed', 'starts_at', 'ends_at',
  'grading_rules', 'certificate_enabled', 'shuffle_questions', 'require_fullscreen', 'max_violations'] as const;

/** Owner edits settings. Status changes: draft, published, closed. Publishing needs at least one question. */
async function handlePatch(req: NextRequest, ctx: Ctx) {
  const auth = requireOwner(req);
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;
  let body: Record<string, any>;
  try {
    body = await req.json();
  } catch {
    return bad('Noto‘g‘ri so‘rov.');
  }
  const map: Record<string, string> = {
    title: 'title', description: 'description', kind: 'kind', access: 'access', status: 'status',
    timeLimitSeconds: 'time_limit_seconds', attemptsAllowed: 'attempts_allowed', startsAt: 'starts_at', endsAt: 'ends_at',
    gradingRules: 'grading_rules', certificateEnabled: 'certificate_enabled', shuffleQuestions: 'shuffle_questions',
    requireFullscreen: 'require_fullscreen', maxViolations: 'max_violations'
  };
  const sets: string[] = [];
  const values: unknown[] = [];
  for (const [key, col] of Object.entries(map)) {
    if (!(key in body) || !(EDITABLE as readonly string[]).includes(col)) continue;
    let v: unknown = body[key];
    if (col === 'kind' && !['test', 'tournament'].includes(String(v))) return bad('Tur noto‘g‘ri.');
    if (col === 'access' && !['open', 'code'].includes(String(v))) return bad('Kirish turi noto‘g‘ri.');
    if (col === 'status' && !['draft', 'published', 'closed'].includes(String(v))) return bad('Holat noto‘g‘ri.');
    if (col === 'grading_rules') {
      const r = validateGradingRules(v);
      if (!r.ok) return bad(r.error);
      v = JSON.stringify(r.rules);
    }
    if (col === 'title' && (typeof v !== 'string' || !v.trim())) return bad('Nom bo‘sh bo‘lmasligi kerak.');
    if (col === 'time_limit_seconds') v = Math.min(14400, Math.max(60, Math.floor(Number(v) || 1800)));
    if (col === 'attempts_allowed') v = Math.min(10, Math.max(1, Math.floor(Number(v) || 1)));
    if (col === 'max_violations') v = Math.min(10, Math.max(0, Math.floor(Number(v) ?? 2)));
    if (col === 'starts_at' || col === 'ends_at') v = v ? new Date(v as string) : null;
    values.push(v);
    sets.push(`${col} = $${values.length}`);
  }
  const pool = getPool();
  if (body.status === 'published') {
    const q = await pool.query('select count(*)::int as n from public.level_questions where test_id = $1', [id]);
    if ((q.rows[0]?.n ?? 0) === 0) return bad('Testni nashr qilishdan oldin kamida bitta savol qo‘shing.');
  }
  // Removing the entry code: the test then needs no code (access open) and the stored hash is cleared.
  if (body.clearEntryCode === true) {
    sets.push('entry_code_hash = null', 'entry_code_plain = null');
    sets.push(`access = 'open'`);
  }
  if (!sets.length) return bad('O‘zgartirish yo‘q.');
  values.push(id);
  const res = await pool.query(
    `update public.level_tests set ${sets.join(', ')}, updated_at = now() where id = $${values.length} returning id`,
    values
  );
  if (!res.rowCount) return bad('Test topilmadi.', 404);
  return NextResponse.json({ success: true });
}

/** Owner regenerates the entry code. The new plain code is returned once; only the hash is stored. */
async function handlePost(req: NextRequest, ctx: Ctx) {
  const auth = requireOwner(req);
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;
  const code = generateUnlockCode();
  const res = await getPool().query(
    `update public.level_tests set entry_code_hash = $1, entry_code_plain = $3, access = 'code', updated_at = now() where id = $2 returning id`,
    [hashPassword(code), id, code]
  );
  if (!res.rowCount) return bad('Test topilmadi.', 404);
  return NextResponse.json({ success: true, entryCode: code });
}

/** Deletes a test with its questions and all attempts (foreign keys cascade). Export the report first if it must be kept. */
async function handleDelete(req: NextRequest, ctx: Ctx) {
  const auth = requireOwner(req);
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;
  const res = await getPool().query('delete from public.level_tests where id = $1 returning id', [id]);
  if (!res.rowCount) return bad('Test topilmadi.', 404);
  return NextResponse.json({ success: true });
}

export const GET = withDatabase(handleGet);
export const PATCH = withDatabase(handlePatch);
export const POST = withDatabase(handlePost);
export const DELETE = withDatabase(handleDelete);
