import { NextRequest, NextResponse } from 'next/server';
import { withDatabase } from '@/src/lib/dbStore';
import { requireOwner } from '@/src/lib/auth/guards';
import { requireContext } from '@/src/lib/db/context';
import { parseQuestionText } from '@/src/lib/levelTests/parseQuestions';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };
const MAX_BYTES = 5 * 1024 * 1024;

/**
 * Owner uploads a .txt or .docx file with questions. Nothing is saved unless ?commit=1 is given: the owner first sees
 * the parsed preview (and the lines that need fixing), then confirms. Questions are appended after the existing ones.
 */
async function handlePost(req: NextRequest, ctx: Ctx) {
  const auth = requireOwner(req);
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;
  const commit = new URL(req.url).searchParams.get('commit') === '1';

  const form = await req.formData().catch(() => null);
  const file = form?.get('file');
  if (!file || typeof file === 'string') return NextResponse.json({ success: false, message: 'Fayl tanlang (.txt yoki .docx).' }, { status: 400 });
  const name = (file as File).name || '';
  const buffer = Buffer.from(await (file as File).arrayBuffer());
  if (buffer.length === 0 || buffer.length > MAX_BYTES) {
    return NextResponse.json({ success: false, message: 'Fayl bo‘sh yoki 5 MB dan katta.' }, { status: 400 });
  }

  let text = '';
  if (/\.docx$/i.test(name)) {
    const mammoth = await import('mammoth');
    const result = await mammoth.extractRawText({ buffer });
    text = result.value;
  } else if (/\.txt$/i.test(name)) {
    text = buffer.toString('utf8');
  } else {
    return NextResponse.json({ success: false, message: 'Faqat .txt yoki .docx qabul qilinadi.' }, { status: 400 });
  }

  const parsed = parseQuestionText(text);
  if (!commit) {
    return NextResponse.json({
      success: true,
      preview: true,
      count: parsed.questions.length,
      questions: parsed.questions.slice(0, 200),
      errors: parsed.errors.slice(0, 200)
    });
  }
  if (parsed.questions.length === 0) {
    return NextResponse.json({ success: false, message: 'Saqlash uchun to‘g‘ri savol topilmadi.', errors: parsed.errors }, { status: 400 });
  }

  const pool = requireContext().client;
  const exists = await pool.query('select 1 from public.level_tests where id = $1', [id]);
  if (!exists.rowCount) return NextResponse.json({ success: false, message: 'Test topilmadi.' }, { status: 404 });
  const start = await pool.query('select coalesce(max(position), -1) + 1 as p from public.level_questions where test_id = $1', [id]);
  let position = Number(start.rows[0]?.p ?? 0);
  const client = pool;
  {
    for (const q of parsed.questions) {
      await client.query(
        `insert into public.level_questions (id, test_id, position, prompt, options, correct_index, points, explanation)
         values ($1,$2,$3,$4,$5,$6,1,'')`,
        [`lq-${crypto.randomUUID()}`, id, position++, q.prompt, JSON.stringify(q.options), q.correctIndex]
      );
    }
  }
  return NextResponse.json({ success: true, added: parsed.questions.length, skipped: parsed.errors.length, errors: parsed.errors.slice(0, 200) }, { status: 201 });
}

export const POST = withDatabase(handlePost);
