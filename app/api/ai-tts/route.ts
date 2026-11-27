import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/src/lib/db/pool';
import { ensureBootstrap } from '@/src/lib/db/bootstrap';
import { SESSION_COOKIE, resolveSession } from '@/src/lib/auth/session';
import { rateLimit } from '@/src/lib/auth/rateLimit';
import { speakGemini } from '@/src/lib/geminiTts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Edubek's spoken answer as WAV (Gemini TTS). Signed-in students only. Falls back in the page when this fails. */
export async function POST(req: NextRequest) {
  // Zero cost: the paid-or-quota-limited server voice is off unless the owner switches it on (ALLOW_GEMINI_TTS=1). The page then uses the free device voice.
  if (process.env.ALLOW_GEMINI_TTS !== '1') return NextResponse.json({ success: false, code: 'TTS_OFF', message: 'Server ovozi o‘chirilgan; qurilma ovozi ishlatiladi.' }, { status: 503 });
  if (req.headers.get('sec-fetch-site') === 'cross-site') return NextResponse.json({ success: false }, { status: 403 });
  const pool = getPool();
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, message: 'So‘rov noto‘g‘ri.' }, { status: 400 });
  }
  try {
    await ensureBootstrap(pool);
    const token = req.cookies.get(SESSION_COOKIE)?.value || null;
    const session = await resolveSession(pool, token);
    if (!session) return NextResponse.json({ success: false, message: 'Avval tizimga kiring.' }, { status: 401 });
    const lim = rateLimit(`tts:${session.userId}`, 240, 60 * 60 * 1000);
    if (!lim.allowed) return NextResponse.json({ success: false, message: 'Juda ko‘p ovoz so‘rovi.' }, { status: 429 });
    const text = typeof body.text === 'string' ? body.text : '';
    const mood = ['happy', 'sad', 'angry', 'surprised', 'calm'].includes(body.mood) ? body.mood : 'calm';
    const r = await speakGemini(text, mood);
    if (!r.ok) return NextResponse.json({ success: false, message: r.message }, { status: 503 });
    return new NextResponse(new Uint8Array(r.wav), {
      headers: { 'Content-Type': 'audio/wav', 'Cache-Control': 'private, max-age=600', 'X-Tts-Cache': r.cached ? 'hit' : 'miss' }
    });
  } catch (e) {
    console.error('[ai-tts]', (e as Error)?.message);
    return NextResponse.json({ success: false, message: 'Server xatosi.' }, { status: 500 });
  }
}
