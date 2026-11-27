import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/src/lib/db/pool';
import { ensureBootstrap } from '@/src/lib/db/bootstrap';
import { SESSION_COOKIE, OWNER_ID, hashToken } from '@/src/lib/auth/session';
import { rateLimit } from '@/src/lib/auth/rateLimit';
import { streamTutorAnswer, type TutorParams } from '@/src/lib/universalAi';
import { availableFallbacks } from '@/src/lib/aiRouter';
import { aiCallStore, readAiStats, recordAiStats, statsDay, type AiCallRecord } from '@/src/lib/aiStats';
import { aiMinutesFor, costSom, readAiSeconds, type AiLimits } from '@/src/lib/aiTime';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const json = (body: Record<string, unknown>, status: number) => NextResponse.json({ success: false, ...body }, { status });
const str = (v: unknown, n: number) => (typeof v === 'string' ? v.slice(0, n) : '');

/**
 * Edubek's streamed answer without loading the whole database: the person, the settings and (when picked)
 * the lesson are read in one parallel step, then the model starts. This is the fast path for chat and for
 * spoken conversation; every rule of the normal route (plan time, owner switches, budget) is kept.
 */
export async function POST(req: NextRequest) {
  if (req.headers.get('sec-fetch-site') === 'cross-site') return json({ message: 'So‘rov rad etildi.' }, 403);
  const pool = getPool();
  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ message: 'So‘rov noto‘g‘ri.' }, 400);
  }
  try {
    await ensureBootstrap(pool);
    const token = req.cookies.get(SESSION_COOKIE)?.value || (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '') || null;
    // One round trip for the session, its user and the two settings this route needs (it used to be three).
    const tokenHash = token ? hashToken(token) : null;
    const head = tokenHash
      ? await pool.query(
          `select s.is_owner, s.user_id, u.name, u.vip_tier, u.vip_expires_at, u.track,
                  (select json_object_agg(x.key, x.value) from public.site_settings x where x.key in ('features', 'ai_limits')) as settings
             from public.sessions s
             left join public.users u on u.id = s.user_id
            where s.token_hash = $1 and s.expires_at > now()`,
          [tokenHash]
        )
      : { rows: [] as any[] };
    const row = head.rows[0];
    if (!row) return json({ message: 'Avval tizimga kiring.', code: 'UNAUTHORIZED' }, 401);
    const owner = !!row.is_owner;
    const who = owner ? OWNER_ID : row.user_id;

    const lim = rateLimit(`ai:${who}`, owner ? 300 : 120, 60 * 60 * 1000);
    if (!lim.allowed) return json({ message: 'Juda ko‘p so‘rov. Birozdan so‘ng urinib ko‘ring.' }, 429);

    const userMessage = str(body.userMessage, body.mode === 'explain' ? 8000 : 4000).trim();
    if (!userMessage) return json({ message: 'Savol bo‘sh' }, 400);
    const lessonId = str(body.lessonId, 80);

    // The lesson lookup starts now and is awaited only when it is needed.
    const lessonQuery = lessonId
      ? pool.query('select title, lesson_code, description, notes_markdown, homework, track, is_published from public.lessons where id = $1', [lessonId]).catch(() => ({ rows: [] as any[] }))
      : Promise.resolve({ rows: [] as any[] });
    const settings = new Map<string, any>(Object.entries(row.settings || {}));
    const features = settings.get('features') || {};
    const limits = settings.get('ai_limits') as AiLimits | undefined;
    const user = owner || row.name == null ? undefined : { name: row.name, vip_tier: row.vip_tier, vip_expires_at: row.vip_expires_at, track: row.track };

    if (!owner && features.aiEnabled === false) return json({ code: 'AI_OFF', message: 'AI vaqtincha o‘chirib qo‘yilgan.' }, 503);
    if (!owner) {
      const minutes = aiMinutesFor(limits, { vipTier: user?.vip_tier, vipExpiresAt: user?.vip_expires_at ? new Date(user.vip_expires_at).toISOString() : null });
      if (minutes > 0 && (await readAiSeconds(who)) >= minutes * 60) {
        return json({ code: 'AI_TIME_LIMIT', message: `Bugungi AI vaqtingiz tugadi (${minutes} daqiqa). Ertaga qayta urinib ko‘ring yoki tarifingizni oshiring.` }, 429);
      }
      if ((limits?.capSom || 0) > 0) {
        const month = statsDay().slice(0, 7);
        const stats = await readAiStats();
        const used = costSom(Object.entries(stats.days || {}).filter(([d]) => d.startsWith(month)).map(([, v]) => v), limits);
        if (used >= (limits?.capSom || 0)) return json({ code: 'AI_BUDGET', message: 'AI uchun oylik mablag‘ tugadi. Keyingi oyda yana ishlaydi.' }, 503);
      }
    }

    let lesson: TutorParams['lesson'];
    if (lessonId) {
      const l = (await lessonQuery).rows[0];
      if (!l || l.is_published === false) return json({ message: 'Dars topilmadi' }, 404);
      if (!owner && l.track && user?.track && l.track !== user.track) return json({ message: 'Ruxsat yo‘q' }, 403);
      lesson = { title: l.title, code: l.lesson_code || undefined, description: l.description, notes: l.notes_markdown || undefined, homework: l.homework || undefined };
    }

    const key = (process.env.GEMINI_API_KEY || '').trim();
    // Gemini is the primary provider; without it the fallback providers (Groq, DeepSeek, OpenRouter, Mistral) still answer.
    if (!key && availableFallbacks(process.env).length === 0) {
      return json({ code: 'AI_NOT_CONFIGURED', message: owner ? 'AI xizmati sozlanmagan: serverda GEMINI_API_KEY yoki zaxira kalit kerak.' : 'AI xizmati hozircha ulanmagan. Birozdan so‘ng qayta urinib ko‘ring.' }, 503);
    }

    const history = (Array.isArray(body.history) ? body.history : [])
      .slice(-10)
      .map((m: any) => ({ sender: m?.sender === 'ai' ? ('ai' as const) : ('user' as const), text: str(m?.text, 1500) }))
      .filter((m: { text: string }) => m.text.trim());
    const params: TutorParams = {
      userMessage,
      lesson,
      history,
      studentName: owner ? 'Ustoz' : user?.name || 'do‘st',
      vipTier: user?.vip_tier || 'individual',
      mode: body.mode === 'explain' ? 'explain' : 'tutor',
      level: ['A2', 'B1', 'B2', 'C1'].includes(body.level) ? body.level : undefined,
      simple: body.simple === true,
      talk: body.talk === true,
      scenario: /^[a-z_]{2,30}$/.test(str(body.scenario, 30)) ? str(body.scenario, 30) : undefined,
      mood: ['angry', 'sad', 'happy'].includes(body.mood) ? body.mood : undefined,
      context: str(body.context, 400) || undefined,
      apiKey: key
    };

    const enc = new TextEncoder();
    const calls: AiCallRecord[] = [];
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        // A first invisible byte opens the connection at once, so no proxy waits for the model before it lets the page listen.
        controller.enqueue(enc.encode('​'));
        // One deadline for the whole answer: if no word was written in 45 s the request is cancelled and the student is told,
        // instead of waiting for a proxy to drop the connection. The student's own stop/leave also cancels it.
        const inner = new AbortController();
        req.signal.addEventListener('abort', () => inner.abort(), { once: true });
        let emitted = false;
        let timedOut = false;
        const deadline = setTimeout(() => { if (!emitted) { timedOut = true; inner.abort(); } }, 45_000);
        void aiCallStore.run({ calls }, async () => {
          try {
            const full = await streamTutorAnswer(params, (piece) => { if (piece) { emitted = true; controller.enqueue(enc.encode(piece)); } }, inner.signal);
            if (!emitted && !req.signal.aborted) {
              controller.enqueue(enc.encode('\u0001' + (timedOut ? 'Edubek hozir band. Birozdan so‘ng qayta urinib ko‘ring.' : full ? '' : 'Edubek bo‘sh javob qaytardi. Qayta urinib ko‘ring.')));
            }
          } catch (e: any) {
            console.error('[ai-stream]', e?.detail || e?.message);
            controller.enqueue(enc.encode('\u0001' + (e?.message || 'AI xizmati javob bermadi. Birozdan so‘ng qayta urinib ko‘ring.')));
          } finally {
            clearTimeout(deadline);
            try {
              controller.close();
            } catch {
              /* the page already left */
            }
            void recordAiStats(calls, { op: 'chat-tutor', userId: who });
          }
        });
      }
    });
    return new NextResponse(stream, {
      headers: { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', 'X-Accel-Buffering': 'no', 'Content-Encoding': 'identity' }
    });
  } catch (e) {
    console.error('[ai-stream] failed', (e as Error)?.message);
    return json({ code: 'SERVER_ERROR', message: 'Server xatosi. Qayta urinib ko‘ring.' }, 500);
  }
}
