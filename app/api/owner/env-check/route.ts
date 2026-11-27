import { NextRequest, NextResponse } from 'next/server';
import { withDatabase } from '@/src/lib/dbStore';
import { requireOwner } from '@/src/lib/auth/guards';
import { getPool } from '@/src/lib/db/pool';

export const dynamic = 'force-dynamic';

interface Item { name: string; set: boolean; ok: boolean; note?: string }
const has = (n: string) => Boolean((process.env[n] || '').trim());
const item = (name: string, ok = true, note?: string): Item => ({ name, set: has(name), ok: has(name) && ok, note: has(name) ? note : 'Render’da qo‘yilmagan' });

/**
 * Owner-only configuration check. Reports which environment variables are set and whether they look right, and makes
 * two harmless live checks (database `select 1`, Telegram `getWebhookInfo`). Values are never returned.
 */
async function handleGet(req: NextRequest) {
  const auth = requireOwner(req);
  if (auth instanceof NextResponse) return auth;

  const bunnyEnabled = (process.env.BUNNY_STREAM_ENABLED || '').trim();
  const libId = (process.env.BUNNY_LIBRARY_ID || '').trim();
  const supaUrl = (process.env.SUPABASE_URL || '').trim();
  const supaKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  const keyKind = !supaKey ? 'yo‘q' : supaKey.startsWith('sb_secret_') ? 'yangi sb_secret kaliti' : supaKey.startsWith('eyJ') ? 'eski service_role (JWT)' : 'noma’lum format';

  let db: { ok: boolean; ms: number | null; note: string } = { ok: false, ms: null, note: 'DATABASE_URL yo‘q' };
  if (has('DATABASE_URL')) {
    const t0 = Date.now();
    try {
      await getPool().query('select 1');
      db = { ok: true, ms: Date.now() - t0, note: 'ulanish ishlayapti' };
    } catch {
      db = { ok: false, ms: Date.now() - t0, note: 'ulanib bo‘lmadi' };
    }
  }

  let telegram: { ok: boolean; note: string; pending?: number } = { ok: false, note: 'TELEGRAM_BOT_TOKEN yo‘q' };
  const token = (process.env.TELEGRAM_BOT_TOKEN || '').trim();
  if (token) {
    try {
      const r = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`, { signal: AbortSignal.timeout(8000) });
      const j = (await r.json()) as { ok?: boolean; result?: { url?: string; pending_update_count?: number; last_error_message?: string } };
      if (!j.ok) telegram = { ok: false, note: 'Telegram tokenni qabul qilmadi' };
      else {
        const url = j.result?.url || '';
        const host = url ? new URL(url).host : '';
        const expected = new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://edulevel.uz').host;
        const err = j.result?.last_error_message ? `; oxirgi xato: ${j.result.last_error_message.slice(0, 80)}` : '';
        telegram = {
          ok: Boolean(url) && !err,
          pending: j.result?.pending_update_count,
          note: !url ? 'webhook o‘rnatilmagan' : `webhook ${host === expected || host === 'edulevel.uz' ? 'to‘g‘ri domen' : 'boshqa domen: ' + host}${err}`
        };
      }
    } catch {
      telegram = { ok: false, note: 'Telegram API javob bermadi' };
    }
  }

  const groups = [
    { id: 'ai', title: 'AI provayderlar', items: ['GEMINI_API_KEY', 'GROQ_API_KEY', 'DEEPSEEK_API_KEY', 'MISTRAL_API_KEY', 'OPENROUTER_API_KEY', 'CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_API_TOKEN', 'SAMBANOVA_API_KEY', 'SILICONFLOW_API_KEY', 'AI_CONFIRMED_FREE', 'GEMINI_FREE_TIER_CONFIRMED', 'ALLOW_GEMINI_TTS'].map((n) => item(n)) },
    {
      id: 'bunny',
      title: 'Bunny Stream',
      items: [
        item('BUNNY_STREAM_ENABLED', bunnyEnabled === '1', bunnyEnabled === '1' ? 'yoqilgan' : 'faqat 1 qiymati yoqadi (hozir boshqa qiymat)'),
        item('BUNNY_LIBRARY_ID', /^\d+$/.test(libId), 'raqamli ID'),
        item('BUNNY_TOKEN_KEY', true, 'token authentication kaliti (imzolangan havola uchun)'),
        { ...item('BUNNY_API_KEY'), note: has('BUNNY_API_KEY') ? 'Stream API kaliti (video yuklash/boshqarish uchun)' : 'ixtiyoriy: video yuklash va boshqarish uchun kerak; token kaliti bilan adashtirmang' }
      ]
    },
    {
      id: 'supabase',
      title: 'Supabase',
      items: [
        item('SUPABASE_URL', /^https:\/\/[a-z0-9]+\.supabase\.co$/.test(supaUrl.replace(/\/$/, '')), 'https://<loyiha>.supabase.co'),
        item('SUPABASE_SERVICE_ROLE_KEY', keyKind !== 'noma’lum format', `kalit turi: ${keyKind}`)
      ]
    },
    { id: 'database', title: 'Ma’lumotlar bazasi', items: [{ name: 'DATABASE_URL', set: has('DATABASE_URL'), ok: db.ok, note: db.ms !== null ? `${db.note} (${db.ms} ms)` : db.note }] },
    {
      id: 'firebase',
      title: 'Firebase (Google kirish)',
      items: ['NEXT_PUBLIC_FIREBASE_API_KEY', 'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN', 'NEXT_PUBLIC_FIREBASE_PROJECT_ID', 'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET', 'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID', 'NEXT_PUBLIC_FIREBASE_APP_ID'].map((n) => item(n))
    },
    {
      id: 'telegram',
      title: 'Telegram bot',
      items: [
        { name: 'TELEGRAM_BOT_TOKEN', set: has('TELEGRAM_BOT_TOKEN'), ok: telegram.ok, note: telegram.pending !== undefined ? `${telegram.note}; kutayotgan yangilanishlar: ${telegram.pending}` : telegram.note },
        item('TELEGRAM_WEBHOOK_SECRET', true, 'webhook so‘rovida x-telegram-bot-api-secret-token sarlavhasi bilan tekshiriladi'),
        item('TELEGRAM_CRON_SECRET', true, 'cron so‘rovi x-cron-secret HTTP sarlavhasida yuboriladi')
      ]
    },
    { id: 'site', title: 'Sayt', items: [item('NEXT_PUBLIC_SITE_URL'), item('OWNER_PASSWORD'), item('OWNER_USERNAME')] }
  ];
  return NextResponse.json({ success: true, groups });
}

export const GET = withDatabase(handleGet);
