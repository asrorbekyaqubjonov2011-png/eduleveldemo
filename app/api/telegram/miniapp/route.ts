import { verifyInitData } from '@/src/lib/telegramInitData';

export const runtime = 'nodejs';

export function POST(request: Request) {
  const headers = { 'Cache-Control': 'no-store' };
  const result = verifyInitData(
    request.headers.get('x-telegram-init-data') ?? '',
    process.env.TELEGRAM_BOT_TOKEN ?? '',
  );
  if (!result.ok) {
    return new Response(null, { status: result.reason === 'no-bot-token' ? 503 : 401, headers });
  }
  // Verification is informational. No account lookup or authentication cookie is issued.
  return new Response(null, { status: 204, headers });
}
