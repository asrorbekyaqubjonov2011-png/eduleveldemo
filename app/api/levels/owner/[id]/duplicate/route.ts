import { NextRequest, NextResponse } from 'next/server';
import { withDatabase } from '@/src/lib/dbStore';
import { requireOwner } from '@/src/lib/auth/guards';
import { requireContext } from '@/src/lib/db/context';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

/** Copies a test with all its questions as a draft. Attempts and the entry code are not copied (the copy gets no code). */
async function handlePost(req: NextRequest, ctx: Ctx) {
  const auth = requireOwner(req);
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;
  const pool = requireContext().client;
  const src = await pool.query('select * from public.level_tests where id = $1', [id]);
  if (!src.rowCount) return NextResponse.json({ success: false, message: 'Test topilmadi.' }, { status: 404 });
  const t = src.rows[0];
  const newId = `lvl-${crypto.randomUUID()}`;
  const client = pool;
  {
    await client.query(
      `insert into public.level_tests
         (id, kind, title, description, access, status, time_limit_seconds, attempts_allowed, starts_at, ends_at,
          grading_rules, certificate_enabled, shuffle_questions, require_fullscreen, max_violations, created_by)
       values ($1,$2,$3,$4,'open','draft',$5,$6,null,null,$7,$8,$9,$10,$11,$12)`,
      [newId, t.kind, `${t.title} (nusxa)`.slice(0, 160), t.description, t.time_limit_seconds, t.attempts_allowed,
       JSON.stringify(t.grading_rules ?? []), t.certificate_enabled, t.shuffle_questions, t.require_fullscreen, t.max_violations, auth.userId ?? null]
    );
    const qs = await client.query('select prompt, options, correct_index, points, explanation, position from public.level_questions where test_id = $1 order by position', [id]);
    for (const q of qs.rows) {
      await client.query(
        `insert into public.level_questions (id, test_id, position, prompt, options, correct_index, points, explanation)
         values ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [`lq-${crypto.randomUUID()}`, newId, q.position, q.prompt, JSON.stringify(q.options), q.correct_index, q.points, q.explanation]
      );
    }
    return NextResponse.json({ success: true, id: newId, questions: qs.rowCount }, { status: 201 });
  }
}

export const POST = withDatabase(handlePost);
