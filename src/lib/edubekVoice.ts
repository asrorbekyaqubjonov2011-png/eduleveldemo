/**
 * Edubek's voice. The browser's own speech engine is used (nothing is sent anywhere), but the voice is
 * chosen with care: natural-sounding ones first (Edge's "Natural", Google's, Apple's Samantha...), the
 * student can pick another one, and speed and pitch follow Edubek's mood so it sounds alive rather than flat.
 */
const KEY = 'edubek_voice_v1';
export interface VoicePrefs {
  voiceURI?: string;
  rate: number; // 0.7 .. 1.3
}
const DEFAULTS: VoicePrefs = { rate: 1 };

export const canSpeak = () => typeof window !== 'undefined' && 'speechSynthesis' in window;

export function loadVoicePrefs(): VoicePrefs {
  try {
    return { ...DEFAULTS, ...(JSON.parse(window.localStorage.getItem(KEY) || '{}') as Partial<VoicePrefs>) };
  } catch {
    return DEFAULTS;
  }
}
export function saveVoicePrefs(p: VoicePrefs) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* storage blocked */
  }
}

/** The voices the browser has, waiting briefly for the list on first use (Chrome loads it late). */
export function listVoices(): Promise<SpeechSynthesisVoice[]> {
  if (!canSpeak()) return Promise.resolve([]);
  const now = window.speechSynthesis.getVoices();
  if (now.length) return Promise.resolve(now);
  return new Promise((resolve) => {
    const done = () => resolve(window.speechSynthesis.getVoices());
    window.speechSynthesis.addEventListener('voiceschanged', done, { once: true });
    window.setTimeout(done, 1200);
  });
}

/** Higher is better sounding. */
function score(v: SpeechSynthesisVoice): number {
  const n = `${v.name} ${v.voiceURI}`.toLowerCase();
  let s = 0;
  if (/natural|neural/.test(n)) s += 60;
  if (/online/.test(n)) s += 15;
  if (/google/.test(n)) s += 30;
  if (/samantha|aria|jenny|ava|allison|karen|daniel|guy|tessa|moira|serena|zoe|nova/.test(n)) s += 18;
  if (v.lang.toLowerCase() === 'en-us') s += 8;
  else if (v.lang.toLowerCase().startsWith('en-')) s += 4;
  if (!v.localService) s += 5;
  if (/espeak|compact|festival|pico/.test(n)) s -= 40;
  return s;
}

export async function englishVoices(): Promise<SpeechSynthesisVoice[]> {
  const all = await listVoices();
  return all.filter((v) => v.lang.toLowerCase().startsWith('en')).sort((a, b) => score(b) - score(a));
}

export async function chosenVoice(prefs = loadVoicePrefs()): Promise<SpeechSynthesisVoice | undefined> {
  const voices = await englishVoices();
  return voices.find((v) => v.voiceURI === prefs.voiceURI) || voices[0];
}

/** Speed, pitch and volume that match the mood. */
export function prosody(mood?: string): { rate: number; pitch: number; volume: number } {
  switch (mood) {
    case 'angry':
      return { rate: 1.12, pitch: 0.82, volume: 1 };
    case 'sad':
      return { rate: 0.86, pitch: 0.9, volume: 0.85 };
    case 'happy':
      return { rate: 1.05, pitch: 1.14, volume: 1 };
    case 'surprised':
      return { rate: 1.08, pitch: 1.25, volume: 1 };
    default:
      return { rate: 1, pitch: 1.02, volume: 1 };
  }
}

/** Makes one utterance in Edubek's voice. The caller queues it with speechSynthesis.speak. */
export async function makeUtterance(text: string, mood?: string): Promise<SpeechSynthesisUtterance> {
  const prefs = loadVoicePrefs();
  const v = await chosenVoice(prefs);
  const u = new SpeechSynthesisUtterance(text.replace(/[*#`_~|>]+/g, ' ').replace(/\s+/g, ' ').trim());
  if (v) {
    u.voice = v;
    u.lang = v.lang;
  } else u.lang = 'en-US';
  const p = prosody(mood);
  u.rate = Math.max(0.6, Math.min(1.5, p.rate * prefs.rate));
  u.pitch = p.pitch;
  u.volume = p.volume;
  return u;
}
