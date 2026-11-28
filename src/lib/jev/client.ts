import { isVerifiedFreeModel } from '../aiFreeOnly';

/**
 * TypeSafe Jev 1.14 through OpenRouter's decisions endpoint. Jev does not write text: it answers typed
 * questions about a state and returns probabilities (noul = yes/no, choice, score). It is used here to
 * check a student's answer quickly. The key is read from OPENROUTER_API_KEY on the server only.
 */
export const JEV_MODEL = 'typesafe/jev-1.14';
const ENDPOINT = 'https://openrouter.ai/api/alpha/decisions';

export interface NoulResult {
  ok: true;
  probability: number;
  ms: number;
}
export interface JevFailure {
  ok: false;
  reason: 'no_key' | 'free_unverified' | 'timeout' | 'http' | 'shape';
  status?: number;
  message: string;
  ms: number;
}

/** Asks one yes/no question about a state. Never throws: the caller decides what to do when Jev is unavailable. */
export async function askNoul(args: {
  state: string;
  instructions: string;
  yes: string;
  no: string;
  timeoutMs?: number;
}): Promise<NoulResult | JevFailure> {
  const t0 = Date.now();
  const key = (process.env.OPENROUTER_API_KEY || '').trim();
  if (!key) return { ok: false, reason: 'no_key', message: 'OPENROUTER_API_KEY sozlanmagan.', ms: 0 };
  // The decisions endpoint has no verified zero-price variant for this model.
  if (!isVerifiedFreeModel('openrouter', JEV_MODEL)) {
    return { ok: false, reason: 'free_unverified', message: 'Jev modeli bepul foydalanish uchun tasdiqlanmagan.', ms: 0 };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), args.timeoutMs ?? 6000);
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        'X-Title': 'Edu Level'
      },
      body: JSON.stringify({
        model: JEV_MODEL,
        state: args.state,
        questions: {
          answer: { type: 'noul', instructions: args.instructions, criteria: { true: args.yes, false: args.no } }
        }
      })
    });
    if (!res.ok) return { ok: false, reason: 'http', status: res.status, message: `Jev ${res.status}`, ms: Date.now() - t0 };
    const j: any = await res.json().catch(() => null);
    const a = j?.answers?.answer ?? j?.decision?.answers?.answer;
    const p = Number(a?.noul ?? a?.probability);
    if (!Number.isFinite(p)) return { ok: false, reason: 'shape', message: 'Jev javobi kutilgan shaklda emas', ms: Date.now() - t0 };
    return { ok: true, probability: Math.max(0, Math.min(1, p)), ms: Date.now() - t0 };
  } catch (e: any) {
    const timeout = e?.name === 'AbortError';
    return { ok: false, reason: timeout ? 'timeout' : 'http', message: timeout ? 'Jev javob bermadi (vaqt tugadi)' : String(e?.message || e).slice(0, 120), ms: Date.now() - t0 };
  } finally {
    clearTimeout(timer);
  }
}
