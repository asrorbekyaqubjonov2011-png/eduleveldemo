import { NextRequest, NextResponse } from 'next/server';
import { withDatabase } from '@/src/lib/dbStore';
import { requireOwner } from '@/src/lib/auth/guards';
import { getPool } from '@/src/lib/db/pool';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

type QuestionInput = { prompt: string; options: string[]; correctIndex: number; points?: number; explanation?: string };

function parseQuestion(raw: any): { ok: true; q: QuestionInput } | { ok: false; error: string } {
  const prompt = typeof raw?.prompt === 'string' ? raw.prompt.trim().slice(0, 1000) : '';
  if (!prompt) return { ok: false, error: 'Savol matni bo‘sh bo‘lmasligi kerak.' };
  const options = Array.isArray(raw.options) ? raw.options.map((o: unknown) => String(o).trim().slice(0, 300)).filter(Boolean) : [];
  if (options.length < 2 || options.length > 8) return { ok: false, error: 'Har bir savolda 2 dan 8 gacha variant bo‘lishi kerak.' };
  const correct = Number(raw.correctIndex);
  if (!Number.isInteger(correct) || correct < 0 || correct >= options.length) return { ok: false, error: 'To‘g‘ri javob variantlar ichidan bo‘lishi kerak.' };
  const points = Math.min(100, Math.max(1, Math.floor(Number(raw.points) || 1)));
  return { ok: true, q: { prompt, options, correctIndex: correct, points, explanation: String(raw.explanation ?? '').slice(0, 1000) } };
}

/** Owner adds questions in bulk. Body: { questions: [{prompt, options, correctIndex, points?, explanation?}] } */
async function handlePost(req: NextRequest, ctx: Ctx) {
  const auth = requireOwner(req);
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const list = Array.isArray(body?.questions) ? body.questions : [];
  if (!list.length || list.length > 300) return NextResponse.json({ success: false, message: 'Savollar soni 1 dan 300 gacha bo‘lishi kerak.' }, { status: 400 });
  const parsed: ReturnType<typeof parseQuestion>[] = list.map((raw: unknown) => parseQuestion(raw));
  const bad = parsed.find((p) => !p.ok);
  if (bad && !bad.ok) return NextResponse.json({ success: false, message: bad.error }, { status: 400 });

  const pool = getPool();
  const exists = await pool.query('select 1 from public.level_tests where id = $1', [id]);
  if (!exists.rowCount) return NextResponse.json({ success: false, message: 'Test topilmadi.' }, { status: 404 });
  const start = await pool.query('select coalesce(max(position), -1) + 1 as p from public.level_questions where test_id = $1', [id]);
  let position = Number(start.rows[0]?.p ?? 0);
  const client = await pool.connect();
  try {
    await client.query('begin');
    for (const p of parsed) {
      if (!p.ok) continue;
      await client.query(
        `insert into public.level_questions (id, test_id, position, prompt, options, correct_index, points, explanation)
         values ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [`lq-${crypto.randomUUID()}`, id, position++, p.q.prompt, JSON.stringify(p.q.options), p.q.correctIndex, p.q.points, p.q.explanation]
      );
    }
    await client.query('commit');
  } catch (err) {
    await client.query('rollback');
    throw err;
  } finally {
    client.release();
  }
  return NextResponse.json({ success: true, added: parsed.length }, { status: 201 });
}

/** Owner deletes one question. Body: { questionId } */
/** Owner edits one question. Body: { questionId, prompt, options, correctIndex, points?, explanation? } */
async function handlePut(req: NextRequest, ctx: Ctx) {
  const auth = requireOwner(req);
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const qid = typeof body?.questionId === 'string' ? body.questionId : '';
  const parsed = parseQuestion(body);
  if (!qid) return NextResponse.json({ success: false, message: 'Savol ID kerak.' }, { status: 400 });
  if (!parsed.ok) return NextResponse.json({ success: false, message: parsed.error }, { status: 400 });
  const q = parsed.q;
  const res = await getPool().query(
    `update public.level_questions set prompt = $3, options = $4, correct_index = $5, points = $6, explanation = $7
      where id = $1 and test_id = $2 returning id`,
    [qid, id, q.prompt, JSON.stringify(q.options), q.correctIndex, q.points, q.explanation]
  );
  if (!res.rowCount) return NextResponse.json({ success: false, message: 'Savol topilmadi.' }, { status: 404 });
  return NextResponse.json({ success: true });
}

async function handleDelete(req: NextRequest, ctx: Ctx) {
  const auth = requireOwner(req);
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const qid = typeof body?.questionId === 'string' ? body.questionId : '';
  if (!qid) return NextResponse.json({ success: false, message: 'Savol ID kerak.' }, { status: 400 });
  const res = await getPool().query('delete from public.level_questions where id = $1 and test_id = $2 returning id', [qid, id]);
  if (!res.rowCount) return NextResponse.json({ success: false, message: 'Savol topilmadi.' }, { status: 404 });
  return NextResponse.json({ success: true });
}

export const POST = withDatabase(handlePost);
export const DELETE = withDatabase(handleDelete);
export const PUT = withDatabase(handlePut);
