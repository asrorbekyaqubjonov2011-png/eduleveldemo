import { NextRequest, NextResponse } from 'next/server';
import { withDatabase } from '@/src/lib/dbStore';
import { requireOwner } from '@/src/lib/auth/guards';
import { requireContext } from '@/src/lib/db/context';
import { ownerAssistantReply, AiUnavailableError } from '@/src/lib/universalAi';

export const dynamic = 'force-dynamic';

/**
 * Owner asks the AI for a written report on level tests and tournaments. The numbers are computed here from the
 * database; the AI only writes the Uzbek text around them. Body: { testId?: string, question?: string }.
 * Without testId the report covers every test. Students are never named in the summary, only counted by class.
 */
async function handlePost(req: NextRequest) {
  const auth = requireOwner(req);
  if (auth instanceof NextResponse) return auth;
  const body = (await req.json().catch(() => ({}))) as { testId?: unknown; question?: unknown };
  const testId = typeof body.testId === 'string' && body.testId ? body.testId : null;
  const question = typeof body.question === 'string' && body.question.trim() ? body.question.trim().slice(0, 500) : 'Ushbu natijalar bo‘yicha qisqa, aniq hisobot yozing.';
  const pool = requireContext().client;

  const tests = await pool.query(
    `select t.id, t.title, t.kind, t.status, t.grading_rules,
            (select count(*)::int from public.level_questions q where q.test_id = t.id) as questions
       from public.level_tests t where ($1::text is null or t.id = $1) order by t.created_at`,
    [testId]
  );
  if (testId && !tests.rowCount) return NextResponse.json({ success: false, message: 'Test topilmadi.' }, { status: 404 });

  const attempts = await pool.query(
    `select a.test_id, a.status, a.percent, a.level_label, a.violations, a.class_name, a.first_name, a.last_name
       from public.level_attempts a where ($1::text is null or a.test_id = $1)`,
    [testId]
  );
  const byTest = new Map<string, any[]>();
  for (const a of attempts.rows) byTest.set(a.test_id, [...(byTest.get(a.test_id) || []), a]);

  const lines: string[] = [];
  for (const t of tests.rows) {
    const list = byTest.get(t.id) || [];
    const done = list.filter((a) => a.status === 'finished');
    const pct = done.map((a) => Number(a.percent)).filter((n) => Number.isFinite(n));
    const avg = pct.length ? Math.round((pct.reduce((s, n) => s + n, 0) / pct.length) * 10) / 10 : null;
    const levels: Record<string, number> = {};
    for (const a of done) levels[a.level_label || 'belgilanmagan'] = (levels[a.level_label || 'belgilanmagan'] || 0) + 1;
    const blocked = list.filter((a) => a.status === 'blocked').length;
    const violators = list.filter((a) => (a.violations ?? 0) > 0).length;
    const byClass: Record<string, { n: number; sum: number }> = {};
    for (const a of done) {
      const c = a.class_name || '—';
      byClass[c] ??= { n: 0, sum: 0 };
      byClass[c].n += 1;
      byClass[c].sum += Number(a.percent) || 0;
    }
    const classLine = Object.entries(byClass).map(([c, v]) => `${c}: ${v.n} ta, o‘rtacha ${Math.round(v.sum / v.n)}%`).join('; ');
    lines.push(
      `Test: ${t.title} (${t.kind === 'tournament' ? 'turnir' : 'test'}, holat: ${t.status}, savollar: ${t.questions}). ` +
      `Urinishlar: ${list.length}, yakunlangan: ${done.length}, bloklangan: ${blocked}, ogohlantirish olgan: ${violators}. ` +
      `O‘rtacha foiz: ${avg ?? 'yo‘q'}. Darajalar: ${Object.entries(levels).map(([k, v]) => `${k} — ${v}`).join(', ') || 'yo‘q'}. ` +
      `Sinflar bo‘yicha: ${classLine || 'yo‘q'}.`
    );
  }
  if (!lines.length) lines.push('Hozircha hech qanday test yoki turnir yaratilmagan.');
  const summary = lines.join('\n');

  try {
    const answer = await ownerAssistantReply({ question, summary });
    return NextResponse.json({ success: true, answer, summary });
  } catch (err) {
    if (err instanceof AiUnavailableError) {
      return NextResponse.json({ success: false, message: 'AI hozir ulanmagan. Hisobot raqamlari quyida.', summary }, { status: 503 });
    }
    throw err;
  }
}

export const POST = withDatabase(handlePost);
