'use client';
import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Mic, Volume2, X, ChevronRight } from 'lucide-react';
import { EdubekAvatar, type EdubekMood } from './EdubekAvatar';
import { PHRASES } from '../../lib/wordOfDay';
import { canSpeak, makeUtterance } from '../../lib/edubekVoice';

const norm = (t: string) => t.toLowerCase().replace(/[^a-z0-9'\s]/g, ' ').split(/\s+/).filter(Boolean);

/** Which words of the target were heard, by an in-order match (so a repeated or reordered word is not counted twice). */
function match(target: string[], heard: string[]): boolean[] {
  const ok = target.map(() => false);
  let pos = 0;
  target.forEach((w, i) => {
    const at = heard.indexOf(w, pos);
    if (at >= 0) {
      ok[i] = true;
      pos = at + 1;
    }
  });
  return ok;
}

/**
 * Pronunciation coach: Edubek says a sentence, the student repeats it, and the words the speech
 * recogniser did not hear are marked. It is an honest guide (a recogniser, not an examiner), and
 * Edubek's face shows how it went.
 */
export const PronunciationCoach: React.FC<{ onClose: () => void; onDone?: (percent: number) => void }> = ({ onClose, onDone }) => {
  const [level, setLevel] = useState<'A2' | 'B1' | 'B2' | 'C1'>('B1');
  const [idx, setIdx] = useState(0);
  const [heard, setHeard] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const [note, setNote] = useState('');
  const recRef = useRef<any>(null);
  const SR = typeof window !== 'undefined' ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition : null;

  const list = PHRASES.filter((p) => p.level === level);
  const phrase = list[idx % Math.max(1, list.length)];
  const target = norm(phrase?.text || '');
  const ok = heard !== null ? match(target, norm(heard)) : [];
  const percent = heard !== null && target.length ? Math.round((ok.filter(Boolean).length / target.length) * 100) : null;
  const mood: EdubekMood = listening ? 'listening' : percent === null ? 'idle' : percent >= 85 ? 'happy' : percent >= 50 ? 'surprised' : 'sad';

  const hear = async (slow: boolean) => {
    if (!canSpeak() || !phrase) return;
    window.speechSynthesis.cancel();
    const u = await makeUtterance(phrase.text, 'calm');
    if (slow) u.rate = Math.max(0.6, u.rate * 0.75);
    window.speechSynthesis.speak(u);
  };

  const speak = () => {
    if (!SR) {
      setNote('Bu brauzerda ovoz tanish yo‘q. Chrome yoki Edge’da oching.');
      return;
    }
    if (listening) {
      recRef.current?.stop?.();
      return;
    }
    setNote('');
    setHeard(null);
    const rec = new SR();
    rec.lang = 'en-US';
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (e: any) => {
      const said = e.results?.[0]?.[0]?.transcript || '';
      setHeard(said);
      const p = target.length ? Math.round((match(target, norm(said)).filter(Boolean).length / target.length) * 100) : 0;
      onDone?.(p);
    };
    rec.onerror = (e: any) => {
      setListening(false);
      setNote(e?.error === 'not-allowed' ? 'Mikrofonga ruxsat bering.' : 'Eshitolmadim, yana urinib ko‘ring.');
    };
    rec.onend = () => setListening(false);
    recRef.current = rec;
    setListening(true);
    try {
      rec.start();
    } catch {
      setListening(false);
    }
  };

  const next = () => {
    setIdx((i) => i + 1);
    setHeard(null);
    setNote('');
  };

  if (typeof document === 'undefined') return null;
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="Talaffuz mashqi" className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 p-4">
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-[28px] bg-paper-raised p-6 text-center shadow-2xl dark:bg-[#1c1815]">
        <div className="flex items-center justify-between">
          <div className="text-[15px] font-extrabold text-ink dark:text-white">Talaffuz mashqi</div>
          <button type="button" onClick={onClose} aria-label="Yopish" className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-ink/5"><X className="h-4 w-4" /></button>
        </div>
        <div className="mt-3 inline-flex rounded-full border border-line/80 bg-white/70 p-1 dark:border-white/10 dark:bg-white/[0.05]" role="group" aria-label="Daraja">
          {(['A2', 'B1', 'B2', 'C1'] as const).map((l) => (
            <button key={l} type="button" aria-pressed={level === l} onClick={() => { setLevel(l); setIdx(0); setHeard(null); }} className={`rounded-full px-3.5 py-1 text-[12.5px] font-semibold ${level === l ? 'bg-ink text-white dark:bg-white dark:text-ink' : 'text-ink-muted dark:text-stone-300'}`}>{l}</button>
          ))}
        </div>
        <div className="mt-4 flex justify-center"><EdubekAvatar mood={mood} size={110} /></div>
        <p className="mt-4 font-display text-[clamp(1.2rem,3.4vw,1.6rem)] font-extrabold leading-snug text-ink dark:text-white">
          {phrase ? phrase.text.split(/\s+/).map((w, i) => {
            const k = norm(w);
            const good = heard !== null && k.length ? ok[target.indexOf(k[0])] ?? false : null;
            return <span key={i} className={heard === null ? '' : good ? 'text-emerald-600' : 'text-rose-600 underline decoration-wavy'}>{w} </span>;
          }) : null}
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <button type="button" onClick={() => hear(false)} className="inline-flex h-10 items-center gap-2 rounded-full border border-line bg-white/70 px-4 text-[13px] font-semibold text-ink dark:border-white/15 dark:bg-white/[0.06] dark:text-white"><Volume2 className="h-4 w-4" /> Tinglash</button>
          <button type="button" onClick={() => hear(true)} className="inline-flex h-10 items-center rounded-full border border-line bg-white/70 px-4 text-[13px] font-semibold text-ink dark:border-white/15 dark:bg-white/[0.06] dark:text-white">Sekinroq</button>
          <button type="button" onClick={speak} aria-pressed={listening} className={`inline-flex h-10 items-center gap-2 rounded-full px-5 text-[13px] font-bold text-white ${listening ? 'bg-rose-500' : 'bg-gradient-to-b from-[#ffb45c] to-[#ef6c12]'}`}><Mic className="h-4 w-4" /> {listening ? 'Tinglayapman…' : 'Gapirish'}</button>
        </div>
        {heard !== null ? (
          <div role="status" className="mt-4 space-y-1 text-[13.5px]">
            <p className="text-ink-muted dark:text-stone-400">Eshitdim: “{heard || '…'}”</p>
            <p className="text-[16px] font-extrabold text-ink dark:text-white">{percent}% {percent !== null && percent >= 85 ? '— juda yaxshi!' : percent !== null && percent >= 50 ? '— yomon emas, qizil so‘zlarni takrorlang' : '— yana bir bor urinib ko‘ring'}</p>
          </div>
        ) : null}
        {note ? <p role="alert" className="mt-3 text-[13px] font-semibold text-rose-700 dark:text-rose-300">{note}</p> : null}
        <button type="button" onClick={next} className="mt-5 inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-[13px] font-semibold text-ink-muted hover:text-ink dark:text-stone-300">Keyingi gap <ChevronRight className="h-4 w-4" /></button>
        <p className="mt-2 text-[11.5px] text-ink-muted dark:text-stone-500">Bu ovoz tanish dasturi: rasmiy talaffuz baholovchisi emas.</p>
      </div>
    </div>,
    document.body
  );
};
