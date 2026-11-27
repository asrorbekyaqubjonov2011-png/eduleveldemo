/**
 * Telegram deposit bot helpers.
 * Needs two server settings on Render: TELEGRAM_BOT_TOKEN (from @BotFather) and
 * TELEGRAM_WEBHOOK_SECRET (any random string; Telegram sends it back on every update).
 * The owner connects the webhook from the Depozitlar panel.
 */

/** Telegram's API. TELEGRAM_API_BASE is only for local tests (a fake Telegram server). */
const API = (process.env.TELEGRAM_API_BASE || 'https://api.telegram.org').replace(/\/$/, '');

/** The site's public address: Render sets RENDER_EXTERNAL_URL; NEXT_PUBLIC_SITE_URL can override it. */
export function publicBaseUrl(fallbackOrigin: string): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || process.env.RENDER_EXTERNAL_URL || fallbackOrigin).trim().replace(/\/$/, '');
}

/** Which bot settings are missing, for the owner's checklist (values are never returned). */
export function botSetupStatus() {
  return { tokenSet: botToken().length > 0, secretSet: webhookSecret().length >= 16 };
}

export function botToken(): string {
  return (process.env.TELEGRAM_BOT_TOKEN || '').trim();
}

export function webhookSecret(): string {
  return (process.env.TELEGRAM_WEBHOOK_SECRET || '').trim();
}

const CALL_TIMEOUT_MS = 8000;
const MAX_TELEGRAM_RETRY_MS = 2500;
const TOTAL_TELEGRAM_TIMEOUT_MS = 12_000;

/** Button colours (`style`) are removed for a retry, in case Telegram refuses them. */
function withoutStyle(value: any): any {
  if (Array.isArray(value)) return value.map(withoutStyle);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) if (k !== 'style') out[k] = withoutStyle(v);
    return out;
  }
  return value;
}

async function callTelegram(method: string, payload: Record<string, unknown>, deadline: AbortSignal): Promise<any> {
  deadline.throwIfAborted();
  const token = botToken();
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN sozlanmagan');
  const res = await fetch(`${API}/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.any([deadline, AbortSignal.timeout(CALL_TIMEOUT_MS)])
  });
  const result = await res.json().catch(() => null);
  if (!result || typeof result.ok !== 'boolean') throw new Error('Telegram serveridan noto‘g‘ri javob');
  return result;
}

/** When Telegram refuses button colours, they are left out for 30 minutes (one failed call, not two per message). */
let coloursRefusedAt = 0;

/** Methods whose text is sent in Telegram's HTML mode (bold titles, tap-to-copy codes). */
const HTML_METHODS = new Set(['sendMessage', 'editMessageText']);

async function sendOnce(method: string, payload: Record<string, unknown>, deadline: AbortSignal): Promise<any> {
  const coloursOff = coloursRefusedAt > 0 && Date.now() - coloursRefusedAt < 30 * 60 * 1000;
  const sentPayload = coloursOff ? withoutStyle(payload) : payload;
  let json = await callTelegram(method, sentPayload, deadline);
  // A 429 explicitly rejects the send, so a bounded retry cannot duplicate a successful message.
  const retryMs = Number(json.parameters?.retry_after) * 1000;
  if (!json.ok && json.error_code === 429 && retryMs > 0 && retryMs <= MAX_TELEGRAM_RETRY_MS) {
    await new Promise<void>((resolve, reject) => {
      const cancel = () => { clearTimeout(timer); deadline.removeEventListener('abort', cancel); reject(deadline.reason); };
      const timer = setTimeout(() => { deadline.removeEventListener('abort', cancel); resolve(); }, retryMs + 100);
      deadline.addEventListener('abort', cancel, { once: true });
      if (deadline.aborted) cancel();
    });
    json = await callTelegram(method, sentPayload, deadline);
  }
  if (!json.ok && json.error_code === 400 && !coloursOff && JSON.stringify(payload).includes('"style"') && /button|style|markup|keyboard|reply/i.test(String(json.description || ''))) {
    coloursRefusedAt = Date.now();
    json = await callTelegram(method, withoutStyle(payload), deadline);
  }
  return json;
}

/** Removes the HTML tags and entities, for a plain-text resend when Telegram rejects the markup. */
export function stripHtml(text: string): string {
  return text.replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}

export async function telegramApi(method: string, payload: Record<string, unknown> = {}): Promise<any> {
  const deadline = AbortSignal.timeout(TOTAL_TELEGRAM_TIMEOUT_MS);
  const html = HTML_METHODS.has(method) && typeof payload.text === 'string' && payload.parse_mode === undefined;
  let json = await sendOnce(method, html ? { ...payload, parse_mode: 'HTML' } : payload, deadline);
  // A stray "<" or "&" in a message makes Telegram refuse the markup: send the same text as plain text instead.
  if (!json.ok && json.error_code === 400 && html && /parse entities|can't parse|unsupported start tag/i.test(String(json.description || ''))) {
    json = await sendOnce(method, { ...payload, text: stripHtml(String(payload.text)) }, deadline);
  }
  if (!json.ok) throw new Error(String(json.description || `Telegram ${method} xatosi`).replace(/\b\d{6,}:[A-Za-z0-9_-]{15,}/g, '[token]').slice(0, 240));
  return json.result;
}

/** Downloads a file sent to the bot (at most maxBytes). The bot token stays on the server. */
export async function downloadTelegramFile(fileId: string, maxBytes = 8 * 1024 * 1024): Promise<Buffer> {
  const info = await telegramApi('getFile', { file_id: fileId });
  if (!info?.file_path) throw new Error('Fayl topilmadi');
  if (typeof info.file_size === 'number' && info.file_size > maxBytes) throw new Error('Fayl hajmi juda katta');
  // A network hiccup is retried; the real cause is logged, the student sees a plain sentence.
  let lastErr: unknown = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(`${API}/file/bot${botToken()}/${info.file_path}`, { signal: AbortSignal.timeout(20_000) });
      if (!res.ok) throw new Error('Faylni yuklab bo‘lmadi');
      const length = Number(res.headers.get('content-length'));
      if (length > maxBytes || !res.body) throw new Error('Fayl hajmi juda katta');
      const reader = res.body.getReader();
      const chunks: Uint8Array[] = [];
      let received = 0;
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          received += value.length;
          if (received > maxBytes) throw new Error('Fayl hajmi juda katta');
          chunks.push(value);
        }
        return Buffer.concat(chunks, received);
      } finally {
        void reader.cancel().catch(() => {});
        reader.releaseLock();
      }
    } catch (err) {
      lastErr = err;
      const message = err instanceof Error ? err.message : '';
      // Only network-level failures are retried; a too-large file or a refused download is final.
      if (/hajmi|yuklab bo‘lmadi/.test(message) || attempt === 3) break;
      await new Promise((r) => setTimeout(r, 800 * attempt));
    }
  }
  const cause = (lastErr as { cause?: { message?: string } })?.cause?.message || (lastErr instanceof Error ? lastErr.message : '');
  console.error('[telegram] file download failed:', String(cause).replace(/\b\d{6,}:[A-Za-z0-9_-]{15,}/g, '[token]').slice(0, 200));
  throw new Error(lastErr instanceof Error && /hajmi|yuklab bo‘lmadi/.test(lastErr.message) ? lastErr.message : 'Telegram serveri bilan aloqa uzildi');
}

/** The amount typed in a message or caption, e.g. "100000" or "100 000 so‘m". */
export function parseAmount(text: string): number | null {
  // Never merge unrelated numbers, decimals, negative amounts or receipt references into a deposit.
  const amount = text.trim().replace(/\s*(?:so[‘’ʻʼ'`]?m|uzs)\s*$/i, '').trim();
  if (!/^(?:\d+|\d{1,3}(?:[ \u00a0\u202f]\d{3})+)$/.test(amount)) return null;
  const digits = amount.replace(/\s/g, '');
  if (!digits || digits.length > 9) return null;
  const n = Number(digits);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Whether a user is a member of the channel. The bot must be an administrator of the channel for this to work.
 * 'unknown' means the check itself failed (the bot is not in the channel, the name is wrong, or Telegram is down).
 */
export async function channelMembership(channel: string, userId: number): Promise<'member' | 'none' | 'unknown'> {
  const name = channel.replace(/^@/, '').trim();
  if (!name || !userId) return 'unknown';
  try {
    const member = await telegramApi('getChatMember', { chat_id: `@${name}`, user_id: userId });
    if (member?.status === 'restricted') return member.is_member === true ? 'member' : 'none';
    if (['member', 'administrator', 'creator'].includes(member?.status)) return 'member';
    if (['left', 'kicked'].includes(member?.status)) return 'none';
    return 'unknown';
  } catch {
    return 'unknown';
  }
}
