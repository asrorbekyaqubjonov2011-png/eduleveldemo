import { NextRequest, NextResponse } from 'next/server';
import { withDatabase } from '@/src/lib/dbStore';
import { requireAuth } from '@/src/lib/auth/guards';
import { getPool } from '@/src/lib/db/pool';
import { verifyPassword } from '@/src/lib/auth/password';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

/**
 * Student enters the owner's unlock code for a blocked attempt. Body: { code }.
 * The code is single use: it is cleared on success, and it expires after 30 minutes.
 * The attempt continues with its remaining time; violations already counted are kept.
 */
async function handlePost(req: NextRequest, ctx: Ctx) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as { code?: unknown };
  const code = typeof body.code === 'string' ? body.code.trim().slice(0, 12) : '';
  if (!/^\d{6}$/.test(code)) return NextResponse.json({ success: false, message: 'Kod 6 xonali raqam bo‘lishi kerak.' }, { status: 400 });

  const pool = getPool();
  const res = await pool.query(
    'select id, status, unlock_code_hash, unlock_code_expires_at from public.level_attempts where id = $1 and user_id = $2',
    [id, auth.userId]
  );
  const a = res.rows[0];
  if (!a) return NextResponse.json({ success: false, message: 'Urinish topilmadi.' }, { status: 404 });
  if (a.status !== 'blocked' || !a.unlock_code_hash) return NextResponse.json({ success: false, message: 'Bu urinish bloklanmagan.' }, { status: 409 });
  if (!a.unlock_code_expires_at || new Date(a.unlock_code_expires_at).getTime() < Date.now()) {
    return NextResponse.json({ success: false, message: 'Kod muddati tugagan. Owner yangi kod berishi kerak.' }, { status: 410 });
  }
  if (!verifyPassword(code, a.unlock_code_hash).ok) return NextResponse.json({ success: false, message: 'Kod noto‘g‘ri.' }, { status: 403 });

  // Single use: the status and the hash change in one guarded update.
  const done = await pool.query(
    `update public.level_attempts set status = 'in_progress', unlock_code_hash = null, unlock_code_plain = null, unlock_code_expires_at = null, blocked_at = null
      where id = $1 and status = 'blocked' and unlock_code_hash is not null returning id`,
    [id]
  );
  if (!done.rowCount) return NextResponse.json({ success: false, message: 'Kod allaqachon ishlatilgan.' }, { status: 409 });
  return NextResponse.json({ success: true });
}

export const POST = withDatabase(handlePost);
