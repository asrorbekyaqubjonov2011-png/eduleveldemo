import { makeUtterance, canSpeak } from './edubekVoice';
import { getEdubekSettings } from './edubekSettings';
import { markVoice } from './edubekVoiceTiming';

let current: HTMLAudioElement | null = null;
let disabledUntil = 0;
// Server voice requests still on their way; stopSpeech() aborts them so a cancelled reply costs nothing more.
const inflight = new Set<AbortController>();

/**
 * Speaks one sentence in Edubek's voice: Gemini TTS (Uzbek and English) through the server, and the
 * browser's own voice when that is unavailable. Resolves when the sentence has finished.
 */
// Audio requests started ahead of time (see prefetchSentence), keyed by mood and text.
const prefetched = new Map<string, Promise<Blob | null>>();

function requestAudio(clean: string, mood?: string): Promise<Blob | null> {
  if (getEdubekSettings().voice === 'browser') return Promise.resolve(null);
  return requestGemini(clean, mood);
}

function requestGemini(clean: string, mood?: string): Promise<Blob | null> {
  const controller = new AbortController();
  inflight.add(controller);
  markVoice('tts_request', clean.slice(0, 40));
  return fetch('/api/ai-tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: clean, mood }),
    signal: controller.signal
  })
    .then(async (res) => {
      // 503 means the server voice is off or unavailable (zero-cost default): stop asking for a while; the device voice speaks.
      if (res.status === 503) {
        disabledUntil = Date.now() + 30 * 60_000;
        return null;
      }
      if (!res.ok || !(res.headers.get('content-type') || '').includes('audio')) return null;
      const blob = await res.blob();
      markVoice('tts_ready', String(blob.size));
      return blob;
    })
    .catch(() => null)
    .finally(() => inflight.delete(controller));
}

/**
 * Starts the voice request for a sentence that will be spoken soon, so it is ready when its turn comes.
 * The next sentence is requested while the current one plays.
 */
export function prefetchSentence(text: string, mood?: string): void {
  const clean = text.trim();
  if (!clean || Date.now() < disabledUntil || getEdubekSettings().voice === 'browser') return;
  const key = `${mood || ''}|${clean}`;
  if (prefetched.has(key)) return;
  prefetched.set(key, requestAudio(clean, mood));
  if (prefetched.size > 40) prefetched.delete(prefetched.keys().next().value as string);
}

/** With the automatic voice, a sentence that is not ready after this time is spoken with the browser voice. */
const FAST_VOICE_MS = 1200;
const LATE = Symbol('late');

export async function speakSentence(text: string, mood?: string): Promise<void> {
  const clean = text.trim();
  if (!clean) return;
  const settings = getEdubekSettings();
  if (Date.now() >= disabledUntil && settings.voice !== 'browser') {
    try {
      const key = `${mood || ''}|${clean}`;
      const pending = prefetched.get(key) ?? requestAudio(clean, mood);
      prefetched.delete(key);
      // The automatic voice must not keep the student waiting: a late sentence is spoken by the browser voice,
      // and the server voice for it is dropped. The explicit Gemini choice always waits for its own voice.
      const got: Blob | null | typeof LATE =
        settings.voice === 'auto'
          ? await Promise.race([pending, new Promise<typeof LATE>((resolve) => setTimeout(() => resolve(LATE), FAST_VOICE_MS))])
          : await pending;
      if (got instanceof Blob) {
        const url = URL.createObjectURL(got);
        await new Promise<void>((resolve) => {
          const a = new Audio(url);
          current = a;
          a.addEventListener('playing', () => markVoice('audio_play', 'server'), { once: true });
          a.onended = () => resolve();
          a.onerror = () => resolve();
          void a.play().catch(() => resolve());
        });
        URL.revokeObjectURL(url);
        return;
      }
      if (got === null) {
        // Not configured or refused: stop asking for a while, and use the browser voice meanwhile.
        disabledUntil = Date.now() + 60_000;
      }
    } catch {
      disabledUntil = Date.now() + 60_000;
    }
  }
  if (!canSpeak()) return;
  const u = await makeUtterance(clean, mood);
  await new Promise<void>((resolve) => {
    u.onstart = () => markVoice('audio_play', 'browser');
    u.onend = () => resolve();
    u.onerror = () => resolve();
    window.speechSynthesis.speak(u);
  });
}

/** Stops whatever Edubek is saying. */
export function stopSpeech(): void {
  for (const c of inflight) c.abort();
  inflight.clear();
  prefetched.clear();
  if (current) {
    current.pause();
    current = null;
  }
  if (canSpeak()) window.speechSynthesis.cancel();
}

