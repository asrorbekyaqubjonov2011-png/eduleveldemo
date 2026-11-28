import { makeUtterance, canSpeak } from './edubekVoice';
import { getEdubekSettings } from './edubekSettings';
import { markVoice } from './edubekVoiceTiming';

let generation = 0;
let disabledUntil = 0;
const inflight = new Set<AbortController>();
const stops = new Set<() => void>();

// Browser voice is the zero-cost, low-latency default. No speculative server requests.
export function prefetchSentence(_text: string, _mood?: string): void {
  // Intentionally no-op: do not spend quota on a sentence that may be cancelled.
  void _text; void _mood;
}

async function requestGemini(text: string, mood?: string): Promise<Blob | null> {
  if (Date.now() < disabledUntil) return null;
  const ctrl = new AbortController();
  inflight.add(ctrl);
  const timer = setTimeout(() => ctrl.abort(), 1200);
  try {
    markVoice('tts_request', 'server');
    const res = await fetch('/api/ai-tts', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, mood }), signal: ctrl.signal
    });
    if (res.status === 503) disabledUntil = Date.now() + 30 * 60_000;
    if (!res.ok || !(res.headers.get('content-type') || '').includes('audio')) return null;
    const blob = await res.blob();
    markVoice('tts_ready', String(blob.size));
    return blob.size ? blob : null;
  } catch { return null; }
  finally { clearTimeout(timer); inflight.delete(ctrl); }
}

function playAudio(blob: Blob, text: string, onPlayback?: (playing: boolean) => void): Promise<boolean> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    let settled = false;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      stops.delete(stop);
      audio.onended = null; audio.onerror = null; audio.onplaying = null;
      onPlayback?.(false);
      audio.pause();
      audio.removeAttribute('src');
      URL.revokeObjectURL(url);
      resolve(ok);
    };
    const stop = () => finish(false);
    const timer = setTimeout(stop, Math.max(8000, Math.min(90000, text.length * 130 + 4000)));
    stops.add(stop);
    audio.onplaying = () => {
      markVoice('audio_play', 'server');
      onPlayback?.(true);
    };
    audio.onended = () => finish(true);
    audio.onerror = stop;
    void audio.play().catch(stop);
  });
}

export async function speakSentence(text: string, mood?: string, onPlayback?: (playing: boolean) => void): Promise<void> {
  const clean = text.trim();
  if (!clean) return;
  const epoch = generation;
  // Explicit server voice still requires the server's own opt-in; auto never requests it.
  if (getEdubekSettings().voice === 'gemini') {
    const blob = await requestGemini(clean, mood);
    if (epoch !== generation) return;
    if (blob && await playAudio(blob, clean, onPlayback)) return;
  }
  if (epoch !== generation || !canSpeak()) return;
  const u = await makeUtterance(clean, mood);
  if (epoch !== generation) return;
  await new Promise<void>((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      stops.delete(stop);
      u.onend = null; u.onerror = null; u.onstart = null;
      onPlayback?.(false);
      resolve();
    };
    const stop = () => { finish(); window.speechSynthesis.cancel(); };
    const timer = setTimeout(stop, Math.max(8000, Math.min(90000, clean.length * 130 + 4000)));
    stops.add(stop);
    u.onstart = () => {
      markVoice('audio_play', 'browser');
      onPlayback?.(true);
    };
    u.onend = finish;
    u.onerror = finish;
    try { window.speechSynthesis.speak(u); } catch { finish(); }
  });
}

export function stopSpeech(): void {
  generation++;
  for (const ctrl of inflight) ctrl.abort();
  inflight.clear();
  for (const stop of [...stops]) stop();
  if (canSpeak()) window.speechSynthesis.cancel();
}
