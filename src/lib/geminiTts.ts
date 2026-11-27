/**
 * Edubek's voice from Google's Gemini TTS (gemini-3.8-flash-tts). It speaks Uzbek and English: the
 * language is detected from the text. Each answer is cached in memory, so a repeated sentence costs
 * nothing. Uses the Interactions endpoint (v1beta); the key is read on the server only.
 */
/** Base URL is read at call time so a local fake Gemini can stand in for Google (GOOGLE_GEMINI_BASE_URL). */
function endpoint(): string {
  const base = (process.env.GOOGLE_GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com').replace(/\/+$/, '');
  return `${base}/v1beta/interactions`;
}
const MODEL = 'gemini-3.8-flash-tts';
const VOICE = 'Kore';

const STYLE: Record<string, string> = {
  happy: 'warm, cheerful and friendly, smiling in the voice',
  sad: 'gentle, soft and a little sad',
  angry: 'firm and stern, irritated but controlled',
  surprised: 'surprised and lively',
  calm: 'calm, clear and friendly'
};

const cache = new Map<string, Buffer>();
const CACHE_MAX = 300;

export interface SpeechResult {
  ok: true;
  wav: Buffer;
  cached: boolean;
}
export interface SpeechFailure {
  ok: false;
  message: string;
}

export async function speakGemini(text: string, mood = 'calm'): Promise<SpeechResult | SpeechFailure> {
  const key = (process.env.GEMINI_API_KEY || '').trim();
  if (!key) return { ok: false, message: 'GEMINI_API_KEY sozlanmagan.' };
  if ((process.env.GEMINI_FREE_TIER_CONFIRMED || '').trim() !== '1') return { ok: false, message: 'Gemini bepul tarifi tasdiqlanmagan; server ovozi o‘chiq.' };
  const clean = text.replace(/\s+/g, ' ').trim().slice(0, 1200);
  if (!clean) return { ok: false, message: 'Matn bo‘sh.' };
  const style = STYLE[mood] || STYLE.calm;
  const cacheKey = `${mood}|${clean}`;
  const hit = cache.get(cacheKey);
  if (hit) return { ok: true, wav: hit, cached: true };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(endpoint(), {
      method: 'POST',
      signal: controller.signal,
      headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        input: [
          {
            type: 'user_input',
            content: [{ type: 'text', text: clean, annotations: [{ type: 'speech_metadata', style }] }]
          }
        ],
        response_format: { type: 'audio' },
        generation_config: { speech_config: [{ voice: VOICE }] }
      })
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      return { ok: false, message: `Gemini TTS ${res.status}: ${body.slice(0, 160)}` };
    }
    const j: any = await res.json();
    const steps: any[] = Array.isArray(j?.steps) ? j.steps : [];
    const out = steps.filter((s) => s?.type === 'model_output').flatMap((s) => s.content || []).find((c: any) => c?.type === 'audio');
    const b64: string | undefined = out?.data;
    if (!b64) return { ok: false, message: 'Gemini ovoz qaytarmadi.' };
    const wav = Buffer.from(b64, 'base64');
    if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value as string);
    cache.set(cacheKey, wav);
    return { ok: true, wav, cached: false };
  } catch (e: any) {
    return { ok: false, message: e?.name === 'AbortError' ? 'Ovoz javob bermadi (vaqt tugadi).' : String(e?.message || e).slice(0, 160) };
  } finally {
    clearTimeout(timer);
  }
}
