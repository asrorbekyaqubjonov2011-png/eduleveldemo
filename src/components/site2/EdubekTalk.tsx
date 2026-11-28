'use client';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Mic, MicOff, Settings2, X } from 'lucide-react';
import { EdubekVoicePanel } from './EdubekVoicePanel';
import { EdubekAvatar, type EdubekMood } from './EdubekAvatar';
import { speakSentence, stopSpeech, prefetchSentence } from '../../lib/edubekSpeech';
import { takeSentences, createSpeechQueue, type SpeechQueue } from '../../lib/edubekVoiceQueue';
import { markVoice } from '../../lib/edubekVoiceTiming';

/** Barge-in: the student's voice must be this loud (RMS of the mic signal) for this long to interrupt Edubek. */
const BARGE_RMS = 0.06;
const BARGE_MS = 250;

export type TalkResult = { ok: true; text: string } | { ok: false; message: string };
interface Props {
  /** Sends what the student said and streams the reply; the conversation is saved by the caller. */
  turn: (text: string, onPiece: (soFar: string) => void, signal: AbortSignal) => Promise<TalkResult>;
  onClose: () => void;
  /** For role-plays and the IELTS examiner: Edubek speaks first, answering this opening line. */
  opening?: string;
  /** Name of the practice mode, shown under the face. */
  modeTitle?: string;
  /** Edubek's lasting mood (angry, sad, happy or calm) and its tone for the voice. */
  baseMood?: EdubekMood;
  tone?: 'angry' | 'sad' | 'happy';
}

type Phase = 'idle' | 'listening' | 'thinking' | 'speaking';
const SPEECH_LANGS: Array<{ code: string; label: string }> = [{ code: 'en-US', label: 'English' }, { code: 'uz-UZ', label: 'O‘zbekcha' }];

export { takeSentences };

/**
 * Face-to-face practice: Edubek's face fills the screen, the student talks, Edubek answers aloud and
 * the microphone opens again by itself. Every turn is written into the saved conversation.
 */
export const EdubekTalk: React.FC<Props> = ({ turn, onClose, opening, modeTitle, baseMood = 'happy', tone }) => {
  const toneRef = useRef(tone);
  useEffect(() => {
    toneRef.current = tone;
  }, [tone]);
  const openedRef = useRef(false);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [active, setActive] = useState(false);
  const [lang, setLang] = useState('en-US');
  const [heard, setHeard] = useState('');
  const [reply, setReply] = useState('');
  const [note, setNote] = useState('');
  const [showVoice, setShowVoice] = useState(false);
  const recRef = useRef<any>(null);
  const activeRef = useRef(false);
  const langRef = useRef('en-US');
  const phaseRef = useRef<Phase>('idle');
  const silences = useRef(0);
  const SR = typeof window !== 'undefined' ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition : null;
  const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window;

  const go = (p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  };
  useEffect(() => {
    langRef.current = lang;
  }, [lang]);

  const stopListening = useCallback(() => {
    const recognition = recRef.current;
    if (!recognition) return;
    recRef.current = null;
    recognition.onend = null;
    recognition.onerror = null;
    recognition.onresult = null;
    recognition.onspeechend = null;
    try {
      recognition.abort();
    } catch {
      /* already stopped */
    }
  }, []);


  // Latest props and queue, read through refs so a turn that started earlier still uses the current ones.
  const turnPropRef = useRef(turn);
  useEffect(() => {
    turnPropRef.current = turn;
  }, [turn]);
  const queueRef = useRef<SpeechQueue | null>(null);
  const turnIdRef = useRef(0);
  const requestRef = useRef<AbortController | null>(null);
  const converseRef = useRef<(said: string) => Promise<void>>(async () => {});
  const bargeStopRef = useRef<(() => void) | null>(null);

  const stopBargeWatch = useCallback(() => {
    bargeStopRef.current?.();
    bargeStopRef.current = null;
  }, []);

  const listen = useCallback(function startListening() {
    if (!SR || !activeRef.current) return;
    stopBargeWatch();
    stopListening();
    const rec = new SR();
    rec.lang = langRef.current;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    let finalText = '';
    let handled = false;
    let speechEnded = false;
    // Handles what was said once. Called as soon as the final words and the end of speech are known, so the
    // reply does not wait for the browser to close the recogniser.
    const finalize = async () => {
      if (handled || !activeRef.current || phaseRef.current !== 'listening') return;
      const said = finalText.trim();
      if (!said) {
        // Nothing heard: open again a few times, then wait for the student.
        silences.current += 1;
        if (silences.current >= 4) {
          setNote('Sizni eshitmadim. Gapirish uchun mikrofon tugmasini bosing.');
          activeRef.current = false;
          setActive(false);
          go('idle');
        } else startListening();
        return;
      }
      handled = true;
      markVoice('stt_final', String(said.length));
      await converseRef.current(said);
    };
    rec.onspeechend = () => {
      speechEnded = true;
      markVoice('speech_end');
    };
    rec.onresult = (e: any) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else interim += r[0].transcript;
      }
      setHeard((finalText + ' ' + interim).trim());
      silences.current = 0;
      if (speechEnded && e.results[e.results.length - 1]?.isFinal && !handled) {
        try {
          rec.stop();
        } catch {
          /* already stopping */
        }
        void finalize();
      }
    };
    rec.onerror = (e: any) => {
      if (e?.error === 'not-allowed' || e?.error === 'service-not-allowed') {
        setNote('Mikrofonga ruxsat berilmadi. Brauzer sozlamalarida ruxsat bering.');
        activeRef.current = false;
        setActive(false);
        go('idle');
      } else if (e?.error === 'audio-capture') {
        setNote('Mikrofon topilmadi. Mikrofonni ulab, qayta urinib ko‘ring.');
        activeRef.current = false;
        setActive(false);
        go('idle');
      }
      // Other errors (network, no-speech) end in onend, which opens the microphone again.
    };
    rec.onend = () => {
      void finalize();
    };
    recRef.current = rec;
    go('listening');
    try {
      rec.start();
    } catch {
      /* already started */
    }
  }, [SR, stopListening, stopBargeWatch]);

  /**
   * Barge-in: while Edubek speaks, the microphone level is watched. A clear voice for BARGE_MS stops the
   * speech, drops the rest of the reply and opens the microphone for the student.
   */
  const startBargeWatch = () => {
    if (bargeStopRef.current || typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) return;
    let stopped = false;
    let stream: MediaStream | null = null;
    let ctx: AudioContext | null = null;
    let timer: number | undefined;
    const cleanup = () => {
      stopped = true;
      if (timer !== undefined) window.clearInterval(timer);
      stream?.getTracks().forEach((t) => t.stop());
      void ctx?.close().catch(() => undefined);
      if (bargeStopRef.current === cleanup) bargeStopRef.current = null;
    };
    bargeStopRef.current = cleanup;
    navigator.mediaDevices
      .getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
      .then((s) => {
        if (stopped) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        stream = s;
        const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (!AC) return cleanup();
        ctx = new AC() as AudioContext;
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 1024;
        ctx.createMediaStreamSource(s).connect(analyser);
        const buf = new Float32Array(analyser.fftSize);
        let loudMs = 0;
        timer = window.setInterval(() => {
          analyser.getFloatTimeDomainData(buf);
          let sum = 0;
          for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
          const rms = Math.sqrt(sum / buf.length);
          loudMs = rms > BARGE_RMS ? loudMs + 50 : 0;
          if (loudMs >= BARGE_MS) {
            cleanup();
            bargeIn();
          }
        }, 50);
      })
      .catch(() => cleanup());
  };

  /** Stops Edubek mid-reply: the queued sentences are dropped, the late server answer is ignored, the mic opens. */
  const bargeIn = () => {
    if (phaseRef.current !== 'speaking') return;
    markVoice('barge_in');
    turnIdRef.current += 1;
    requestRef.current?.abort();
    setAudioPlaying(false);
    queueRef.current?.cancel();
    stopSpeech();
    listen();
  };

  const converse = async (said: string) => {
    const id = ++turnIdRef.current;
    requestRef.current?.abort();
    const request = new AbortController();
    requestRef.current = request;
    stopBargeWatch();
    markVoice('turn_start', String(said.length));
    setHeard(said);
    setReply('');
    setNote('');
    go('thinking');
    // Sentences are spoken while the rest of the answer is still being written.
    let spokenTo = 0;
    let pushed = 0;
    let firstPiece = true;
    const queue = createSpeechQueue(
      (s, m) => {
        return speakSentence(s, m, (playing) => {
          if (turnIdRef.current !== id) return;
          setAudioPlaying(playing);
          if (playing) {
            go('speaking');
            startBargeWatch();
          }
        });
      },
      () => {
        if (turnIdRef.current !== id || !activeRef.current) return;
        stopBargeWatch();
        silences.current = 0;
        // No sentence at all (no voice): the reply stays on screen and the microphone opens after a short read.
        if (pushed === 0) setTimeout(() => activeRef.current && turnIdRef.current === id && listen(), 1800);
        else listen();
      }
    );
    queueRef.current = queue;
    const push = (s: string) => {
      if (!s) return;
      pushed += 1;
      // Its voice is requested now, so it is ready when the sentences before it have been spoken.
      prefetchSentence(s, toneRef.current);
      queue.push(s, toneRef.current);
    };
    stopSpeech();
    const res = await turnPropRef.current(said, (soFar) => {
      if (turnIdRef.current !== id) return;
      if (firstPiece && soFar) {
        firstPiece = false;
        markVoice('llm_first_text');
      }
      setReply(soFar);
      const { sentences, next } = takeSentences(soFar, spokenTo);
      spokenTo = next;
      sentences.forEach(push);
    }, request.signal).finally(() => {
      if (requestRef.current === request) requestRef.current = null;
    });
    if (turnIdRef.current !== id) return;
    if (!res.ok) {
      queue.cancel();
      stopSpeech();
      stopBargeWatch();
      setNote(res.message);
      activeRef.current = false;
      setActive(false);
      go('idle');
      return;
    }
    markVoice('llm_done');
    setReply(res.text);
    const rest = res.text.slice(spokenTo).trim();
    if (rest) push(rest);
    queue.end();
  };

  useEffect(() => { converseRef.current = converse; });

  const start = () => {
    if (!SR) {
      setNote('Bu brauzerda ovozli suhbat yo‘q. Chrome yoki Edge’da oching.');
      return;
    }
    setNote('');
    activeRef.current = true;
    setActive(true);
    silences.current = 0;
    if (canSpeak) window.speechSynthesis.cancel();
    if (opening && !openedRef.current) {
      openedRef.current = true;
      void converse(opening);
    } else listen();
  };
  const stop = () => {
    activeRef.current = false;
    setActive(false);
    turnIdRef.current += 1;
    requestRef.current?.abort();
    setAudioPlaying(false);
    queueRef.current?.cancel();
    stopBargeWatch();
    stopListening();
    stopSpeech();
    go('idle');
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        stop();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      activeRef.current = false;
      turnIdRef.current += 1;
      requestRef.current?.abort();
      queueRef.current?.cancel();
      stopBargeWatch();
      stopListening();
      stopSpeech();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const mood: EdubekMood = phase === 'listening' ? 'listening' : phase === 'thinking' ? (tone === 'angry' ? 'angry' : 'thinking') : phase === 'speaking' ? (tone === 'angry' || tone === 'sad' ? tone : 'speaking') : baseMood;
  const STATUS: Record<Phase, string> = { idle: 'Boshlash uchun mikrofonni bosing', listening: 'Tinglayapman…', thinking: 'O‘ylayapman…', speaking: 'Gapiryapman…' };

  // Drawn on the page itself: an animated parent would otherwise confine a full-screen layer to its own box.
  if (typeof document === 'undefined') return null;
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="Edubek bilan suhbat" className="edubek-voice-room fixed inset-0 z-[70] flex flex-col items-center justify-between overflow-y-auto px-5 py-6">
      <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-[34%] h-[28rem] w-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,154,60,0.45),transparent_68%)]" />
      <div className="relative flex w-full max-w-xl items-center justify-between">
        <div className="flex items-center gap-1 rounded-full border border-white/60 bg-white/60 p-1 backdrop-blur dark:border-white/10 dark:bg-white/10" role="group" aria-label="Tinglash tili">
          {SPEECH_LANGS.map((l) => (
            <button key={l.code} type="button" aria-pressed={lang === l.code} onClick={() => setLang(l.code)} className={`rounded-full px-3 py-1.5 text-[12.5px] font-semibold ${lang === l.code ? 'bg-ink text-white dark:bg-white dark:text-ink' : 'text-ink-muted dark:text-stone-300'}`}>{l.label}</button>
          ))}
        </div>
        <div className="relative ml-auto mr-2">
          <button type="button" onClick={() => setShowVoice((v) => !v)} aria-label="Edubek ovozi" className="flex h-11 w-11 items-center justify-center rounded-full border border-white/60 bg-white/60 text-ink backdrop-blur dark:border-white/10 dark:bg-white/10 dark:text-white"><Settings2 className="h-5 w-5" /></button>
          {showVoice ? <div className="absolute right-0 top-14 z-10"><EdubekVoicePanel onClose={() => setShowVoice(false)} mood={tone} /></div> : null}
        </div>
        <button type="button" onClick={() => { stop(); onClose(); }} aria-label="Suhbatni yopish" className="flex h-11 w-11 items-center justify-center rounded-full border border-white/60 bg-white/60 text-ink backdrop-blur dark:border-white/10 dark:bg-white/10 dark:text-white"><X className="h-5 w-5" /></button>
      </div>

      <div className="relative flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-5">
        <button type="button" onClick={() => (phase === 'speaking' ? bargeIn() : undefined)} aria-label="EduBek ovozini to‘xtatish" disabled={phase !== 'speaking'} className="rounded-[3rem]">
          <EdubekAvatar mood={mood} size={240} audioPlaying={audioPlaying} />
        </button>
        {modeTitle ? <span className="rounded-full bg-[#e8457a]/10 px-3 py-1 text-[12px] font-bold text-[#b82a5c]">{modeTitle}</span> : null}
        <p aria-live="polite" className="font-display text-[15px] font-bold text-ink dark:text-white">{STATUS[phase]}</p>
        <div className="min-h-[7.5rem] w-full space-y-2 text-center">
          {heard ? <p className="text-[14px] text-ink-muted dark:text-stone-300"><span className="font-semibold text-ink dark:text-white">Siz:</span> {heard}</p> : null}
          {reply ? <p className="mx-auto max-w-md rounded-2xl bg-white/70 px-4 py-3 text-[15px] leading-relaxed text-ink backdrop-blur dark:bg-white/10 dark:text-white"><span className="font-bold text-[#c4520a] dark:text-[#ffc982]">Edubek:</span> {reply}</p> : null}
          {note ? <p role="alert" className="text-[13px] font-semibold text-rose-700 dark:text-rose-300">{note}</p> : null}
        </div>
      </div>

      <div className="relative flex flex-col items-center gap-2 pb-2">
        <button
          type="button"
          onClick={active ? stop : start}
          aria-pressed={active}
          aria-label={active ? 'Suhbatni to‘xtatish' : 'Suhbatni boshlash'}
          className={`flex h-20 w-20 items-center justify-center rounded-full text-white shadow-[0_18px_40px_-14px_rgba(239,108,18,0.9)] transition-transform active:scale-95 ${active ? 'bg-rose-500' : 'bg-gradient-to-b from-[#ffb45c] to-[#ef6c12]'}`}
        >
          {active ? <MicOff className="h-8 w-8" /> : <Mic className="h-8 w-8" />}
        </button>
        <p className="text-[12px] text-ink-muted dark:text-stone-400">{active ? 'Gapiring, men tinglayman. Yana bosing: to‘xtatish' : 'Suhbat avtomatik davom etadi, yozuvlar saqlanadi'}</p>
      </div>
    </div>,
    document.body
  );
};
