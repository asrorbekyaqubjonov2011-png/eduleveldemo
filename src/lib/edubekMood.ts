import { useCallback, useEffect, useRef, useState } from 'react';
import type { EdubekMood } from '../components/site2/EdubekAvatar';

/**
 * Edubek's long-lived feeling toward the student. It remembers between visits (in this browser):
 * it misses a student who stays away, warms up when they practise and are polite, and gets cross when
 * insulted until they apologise. The page shows it on Edubek's face and the server colours the answer with it.
 */
const KEY = 'edubek_mood_v1';
interface Saved {
  score: number; // 0 (low) .. 100 (delighted)
  lastVisit: string; // ISO
  angryUntil: number; // epoch ms
  misses: boolean; // came back after days away: still a little sad until the first message
}

const INSULTS = new Set([
  'ahmoq', 'tentak', 'jinni', 'kallavar', 'eshak', 'yaramas', 'tupoy', 'chirkin', 'axmoq', 'bevosh', 'sasigan', 'iflos',
  'stupid', 'idiot', 'dumb', 'moron', 'shut', 'hate', 'fuck', 'bitch', 'shit', 'asshole', 'useless', 'trash',
  'дурак', 'тупой', 'идиот', 'заткнись', 'тупица', 'ненавижу'
]);
const APOLOGY = ['kechir', 'uzr', 'afv', 'sorry', 'prosti', 'извин', 'прости', 'pardon', 'xato qildim'];
const KIND = ['rahmat', 'thank', 'raxmat', 'barakalla', 'yaxshi', 'zo‘r', 'zo\'r', 'ajoyib', 'spasibo', 'спасибо', 'great', 'awesome', 'love you', 'yaxshi ko'];

const words = (t: string) => t.toLowerCase().split(/[^\p{L}\p{N}'’‘]+/u).filter(Boolean);
const clamp = (n: number) => Math.max(0, Math.min(100, n));

function load(): Saved {
  const fresh: Saved = { score: 62, lastVisit: new Date().toISOString(), angryUntil: 0, misses: false };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return fresh;
    const s = JSON.parse(raw) as Saved;
    const days = Math.floor((Date.now() - Date.parse(s.lastVisit)) / 86_400_000);
    // Each day away costs a little warmth; three days or more and Edubek has missed the student.
    return { ...s, score: clamp(s.score - Math.max(0, days) * 7), misses: days >= 3 || s.misses, lastVisit: new Date().toISOString() };
  } catch {
    return fresh;
  }
}
function save(s: Saved) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* storage blocked: the mood simply does not survive a reload */
  }
}

export interface MoodState {
  /** The face to show when nothing else (listening, speaking...) takes over. */
  base: EdubekMood;
  /** What to tell the server: 'angry' | 'sad' | 'happy' or undefined for calm. */
  tone?: 'angry' | 'sad' | 'happy';
  /** A short line explaining the feeling, in Uzbek. */
  note: string;
  /** Call with every message the student writes. Returns true when Edubek has just got angry. */
  hear: (text: string) => { angry: boolean; calmed: boolean };
  /** Call when the student did something good (finished a voice turn, a correct answer). */
  praise: () => void;
}

export function useEdubekMood(): MoodState {
  const [snap, setSnap] = useState<Saved>(() => (typeof window === 'undefined' ? { score: 62, lastVisit: new Date().toISOString(), angryUntil: 0, misses: false } : load()));
  const ref = useRef<Saved>(snap);
  // The clock is state too, so anger can wear off while the page stays open.
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    save(ref.current);
    const tick = window.setInterval(() => setNowMs(Date.now()), 15_000);
    return () => window.clearInterval(tick);
  }, []);

  const commit = () => {
    save(ref.current);
    setSnap({ ...ref.current });
    setNowMs(Date.now());
  };

  const hear = useCallback((text: string) => {
    const s = ref.current;
    const w = words(text);
    const lower = text.toLowerCase();
    const wasAngry = Date.now() < s.angryUntil;
    let angry = false;
    let calmed = false;
    if (w.some((x) => INSULTS.has(x))) {
      s.score = clamp(s.score - 25);
      s.angryUntil = Date.now() + 5 * 60_000;
      angry = true;
    } else if (wasAngry && APOLOGY.some((a) => lower.includes(a))) {
      s.angryUntil = 0;
      s.score = clamp(s.score + 8);
      calmed = true;
    } else if (KIND.some((k) => lower.includes(k))) {
      s.score = clamp(s.score + 4);
    } else {
      s.score = clamp(s.score + 1); // every honest question warms Edubek a little
    }
    if (!angry) s.misses = false;
    commit();
    return { angry, calmed };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const praise = useCallback(() => {
    ref.current.score = clamp(ref.current.score + 3);
    ref.current.misses = false;
    commit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const angry = nowMs < snap.angryUntil;
  const base: EdubekMood = angry ? 'angry' : snap.misses || snap.score < 30 ? 'sad' : snap.score >= 78 ? 'happy' : 'idle';
  const note = angry
    ? 'Edubek jahli chiqqan. Kechirim so‘rasangiz, yumshaydi.'
    : snap.misses
      ? 'Edubek sizni sog‘ingan edi. Salom bering!'
      : snap.score < 30
        ? 'Edubek xafa: u bilan ko‘proq gaplashing.'
        : snap.score >= 78
          ? 'Edubek juda hursand!'
          : '';
  return { base, tone: angry ? 'angry' : base === 'sad' ? 'sad' : base === 'happy' ? 'happy' : undefined, note, hear, praise };
}
