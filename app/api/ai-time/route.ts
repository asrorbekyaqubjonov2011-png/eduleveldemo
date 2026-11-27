import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/src/lib/db/pool';
import { ensureBootstrap } from '@/src/lib/db/bootstrap';
import { SESSION_COOKIE, resolveSession } from '@/src/lib/auth/session';
import { aiMinutesFor, beatAiTime, readAiSeconds, type AiLimits } from '@/src/lib/aiTime';

/**
 * The student's AI clock. POST counts the time the AI section has been open (the page calls it every
 * 30 seconds while the section is visible); GET only reads. Both answer with what is left today.
 * It never loads the whole database, so the call stays small.
 */
async function handle(req: NextRequest, count: boolean) {
  if (count && req.headers.get('sec-fetch-site') === 'cross-site') return NextResponse.json({ success: false }, { status: 403 });
  const pool = getPool();
  try {
    await ensureBootstrap(pool);
    const token = req.cookies.get(SESSION_COOKIE)?.value || (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '') || null;
    const session = await resolveSession(pool, token);
    if (!session) return NextResponse.json({ success: false, message: 'Avval tizimga kiring.' }, { status: 401 });
    if (session.role === 'owner') return NextResponse.json({ success: true, limitMinutes: 0, usedSeconds: 0, remainingSeconds: null });
    const { rows } = await pool.query('select vip_tier, vip_expires_at from public.users where id = $1', [session.userId]);
    const limitRow = await pool.query(`select value from public.site_settings where key = 'ai_limits'`);
    const minutes = aiMinutesFor(limitRow.rows[0]?.value as AiLimits | undefined, { vipTier: rows[0]?.vip_tier, vipExpiresAt: rows[0]?.vip_expires_at ? new Date(rows[0].vip_expires_at).toISOString() : null });
    const used = count ? await beatAiTime(session.userId) : await readAiSeconds(session.userId);
    return NextResponse.json({
      success: true,
      limitMinutes: minutes,
      usedSeconds: used,
      remainingSeconds: minutes > 0 ? Math.max(0, minutes * 60 - used) : null
    });
  } catch (e) {
    console.warn('[ai-time]', (e as Error)?.message);
    return NextResponse.json({ success: false, message: 'Vaqtni hisoblab bo‘lmadi.' }, { status: 503 });
  }
}

export const POST = (req: NextRequest) => handle(req, true);
export const GET = (req: NextRequest) => handle(req, false);
