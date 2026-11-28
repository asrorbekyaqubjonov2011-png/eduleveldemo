import { NextRequest, NextResponse } from 'next/server';
import { withDatabase } from '@/src/lib/dbStore';
import { requireOwner } from '@/src/lib/auth/guards';
import { requireContext } from '@/src/lib/db/context';
import { placementReportRows, type ReportAttempt } from '@/src/lib/levelTests/reportRows';
import { buildDocx, buildXlsx } from '@/src/lib/office/documents';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

const fmtDate = (d: unknown) => (d ? new Date(d as string).toLocaleString('uz-UZ', { timeZone: 'Asia/Tashkent' }) : '');
const STATUS_UZ: Record<string, string> = {
  finished: 'Yakunlangan', in_progress: 'Ishlamoqda', blocked: 'Bloklangan', expired: 'Vaqti tugagan', abandoned: 'Tashlab ketilgan'
};

/**
 * Owner-only XLSX or DOCX report. The default includes all attempts.
 * The optional summary adds review notes and keeps the best graded result per confirmed account.
 */
async function handleGet(req: NextRequest, ctx: Ctx) {
  const auth = requireOwner(req);
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;
  const url = new URL(req.url);
  const format = url.searchParams.get('format') === 'docx' ? 'docx' : 'xlsx';

  const summary = url.searchParams.get('view') === 'summary';
  const pool = requireContext().client;
  const test = await pool.query('select title from public.level_tests where id = $1', [id]);
  if (!test.rowCount) return NextResponse.json({ success: false, message: 'Test topilmadi.' }, { status: 404 });
  const { rows: attempts } = await pool.query<ReportAttempt & {
    score: number | null; max_score: number | null; level_label: string | null;
    violations: number; started_at: string; finished_at: string | null; certificate_code: string | null;
  }>(
    `select a.id, a.user_id, a.first_name, a.last_name, a.class_name, a.status, a.score, a.max_score, a.percent, a.level_label,
            a.violations, a.started_at, a.finished_at, a.certificate_code
       from public.level_attempts a
      where a.test_id = $1
      order by a.last_name, a.first_name, a.started_at, a.id`,
    [id]
  );
  const rows = placementReportRows(attempts, summary);
  const finished = rows.filter((r) => r.status === 'finished');
  const avg = finished.length ? Math.round((finished.reduce((s, r) => s + Number(r.percent ?? 0), 0) / finished.length) * 100) / 100 : 0;
  const header = ['№', 'Ism', 'Familiya', 'Sinf', 'Urinishlar soni', 'Ball', 'Maks. ball', 'Foiz', 'Daraja', 'Holat', 'Ogohlantirish', 'Sertifikat', 'Boshlangan', 'Tugagan'];
  if (summary) header.push('Urinish ID', 'Qo‘lda tekshirish');
  const body = rows.map((r, i) => [
    i + 1, r.first_name, r.last_name, r.class_name, Number(r.student_attempts), r.score ?? '', r.max_score ?? '',
    r.percent == null ? '' : Number(r.percent), r.level_label ?? '', STATUS_UZ[r.status] ?? r.status, r.violations,
    r.certificate_code ?? '', fmtDate(r.started_at), fmtDate(r.finished_at), ...(summary ? [r.id, r.review] : [])
  ]);
  const safeTitle = String(test.rows[0].title).replace(/[^\p{L}\p{N} _-]+/gu, '').slice(0, 60) || 'hisobot';
  const filename = `${safeTitle}-${summary ? 'saralangan' : 'hisobot'}.${format}`;

  let buf: Buffer;
  let type: string;
  if (format === 'xlsx') {
    buf = buildXlsx('Natijalar', header, body as (string | number | null)[][]);
    type = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  } else {
    buf = buildDocx({
      paragraphs: [
        { text: test.rows[0].title, bold: true, size: 32 },
        { text: `Tasdiqlangan hisoblar: ${new Set(attempts.flatMap((r) => r.user_id ? [r.user_id] : [])).size} · jami urinishlar: ${attempts.length} · eksport qatorlari: ${rows.length} · yakunlangan: ${finished.length} · o‘rtacha foiz: ${avg}%` },
        { text: `Yaratilgan: ${fmtDate(new Date())}` }
      ],
      table: { header: summary ? [...header.slice(0, 10), ...header.slice(-2)] : header.slice(0, 11), rows: body.map((r) => summary ? [...r.slice(0, 10), ...r.slice(-2)] : r.slice(0, 11)) }
    });
    type = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  }
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      'Content-Type': type,
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      'Cache-Control': 'private, no-store'
    }
  });
}

export const GET = withDatabase(handleGet);
