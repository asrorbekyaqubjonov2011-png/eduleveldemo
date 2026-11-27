import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Server-side check of Telegram Mini App `initData` (the signed string the Mini App receives from Telegram).
 * Algorithm (Telegram docs): secret = HMAC_SHA256("WebAppData", botToken); the data-check-string is every field except
 * `hash`, sorted by name, joined with "\n" as "key=value"; the expected hash is HMAC_SHA256(secret, dataCheckString) in hex.
 * Only a valid, fresh string identifies the user. Client-side values are never trusted on their own.
 */
export const INIT_DATA_MAX_AGE_SEC = 24 * 3600;

export interface VerifiedInitData {
  userId: string;
  username: string | null;
  firstName: string | null;
  authDate: number;
}

export type InitDataResult =
  | { ok: true; data: VerifiedInitData }
  | { ok: false; reason: 'missing' | 'malformed' | 'bad-signature' | 'expired' | 'no-bot-token' | 'no-user' };

export function dataCheckString(params: URLSearchParams): string {
  const pairs: string[] = [];
  params.forEach((value, key) => {
    if (key !== 'hash') pairs.push(`${key}=${value}`);
  });
  return pairs.sort().join('\n');
}

export function signInitData(params: URLSearchParams, botToken: string): string {
  const secret = createHmac('sha256', 'WebAppData').update(botToken).digest();
  return createHmac('sha256', secret).update(dataCheckString(params)).digest('hex');
}

export function verifyInitData(raw: string, botToken: string, nowSec = Math.floor(Date.now() / 1000)): InitDataResult {
  if (!raw || typeof raw !== 'string' || raw.length > 4096) return { ok: false, reason: 'missing' };
  if (!botToken) return { ok: false, reason: 'no-bot-token' };
  const params = new URLSearchParams(raw);
  const hash = params.get('hash') || '';
  if (!/^[0-9a-f]{64}$/.test(hash)) return { ok: false, reason: 'malformed' };
  const expected = signInitData(params, botToken);
  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(hash, 'hex');
  if (a.length !== b.length || !timingSafeEqual(a, b)) return { ok: false, reason: 'bad-signature' };
  const authDate = Number(params.get('auth_date'));
  if (!Number.isFinite(authDate) || authDate <= 0) return { ok: false, reason: 'malformed' };
  if (nowSec - authDate > INIT_DATA_MAX_AGE_SEC || authDate - nowSec > 300) return { ok: false, reason: 'expired' };
  let user: { id?: number | string; username?: string; first_name?: string } | null = null;
  try {
    user = JSON.parse(params.get('user') || 'null');
  } catch {
    return { ok: false, reason: 'malformed' };
  }
  if (!user || user.id === undefined || user.id === null) return { ok: false, reason: 'no-user' };
  return {
    ok: true,
    data: {
      userId: String(user.id),
      username: user.username ? String(user.username) : null,
      firstName: user.first_name ? String(user.first_name) : null,
      authDate
    }
  };
}
