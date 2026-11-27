import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/src/lib/db/pool';
import { ensureBootstrap } from '@/src/lib/db/bootstrap';
import { SESSION_COOKIE, resolveSession } from '@/src/lib/auth/session';
import { rateLimit } from '@/src/lib/auth/rateLimit';
import { judgeMeaning } from '@/src/lib/jev/judge';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const str = (v: unknown, n: number) => (typeof v === 'string' ? v.slice(0, n) : '');

/**
 * A student's typed answer checked by Jev (TypeSafe, through OpenRouter). Fast: an exact match needs no
 * model call, and a model call is about a tenth of a second. Signed-in students only.
 */
export async function POST(req: NextRequest) {
  if (req.headers.get('sec-fetch-site') === 'cross-site') return NextResponse.json({ success: false, message: 'So‘rov rad etildi.' }, { status: 403 });
  const pool = getPool();
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, message: 'So‘rov noto‘g‘ri.' }, { status: 400 });
  }
  try {
    await ensureBootstrap(pool);
    const token = req.cookies.get(SESSION_COOKIE)?.value || (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '') || null;
    const session = await resolveSession(pool, token);
    if (!session) return NextResponse.json({ success: false, message: 'Avval tizimga kiring.', code: 'UNAUTHORIZED' }, { status: 401 });
    const lim = rateLimit(`judge:${session.userId}`, 300, 60 * 60 * 1000);
    if (!lim.allowed) return NextResponse.json({ success: false, message: 'Juda ko‘p urinish. Birozdan so‘ng urinib ko‘ring.' }, { status: 429 });
    const features = await pool.query(`select value from public.site_settings where key = 'features'`);
    if (session.role !== 'owner' && features.rows[0]?.value?.aiEnabled === false) {
      return NextResponse.json({ success: false, code: 'AI_OFF', message: 'AI vaqtincha o‘chirib qo‘yilgan.' }, { status: 503 });
    }
    const word = str(body.word, 80).trim();
    const accepted = (Array.isArray(body.accepted) ? body.accepted : []).map((x: unknown) => str(x, 120).trim()).filter(Boolean).slice(0, 8);
    const given = str(body.given, 120);
    if (!word || accepted.length === 0) return NextResponse.json({ success: false, message: 'So‘z yoki to‘g‘ri javob berilmadi.' }, { status: 400 });
    const r = await judgeMeaning({ word, accepted, given });
    if (r.source === 'unavailable') {
      return NextResponse.json({ success: false, code: 'JEV_UNAVAILABLE', source: 'unavailable', message: 'Tekshiruv xizmati hozir ishlamayapti. Javobingiz mahalliy tekshiruv bilan baholandi.' }, { status: 503 });
    }
    return NextResponse.json({ success: true, match: r.match, source: r.source, probability: r.probability ?? null, ms: r.ms });
  } catch (e) {
    console.error('[ai-judge]', (e as Error)?.message);
    return NextResponse.json({ success: false, message: 'Server xatosi. Qayta urinib ko‘ring.' }, { status: 500 });
  }
}
