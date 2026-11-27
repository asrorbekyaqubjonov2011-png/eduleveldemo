'use client';
import React, { useMemo, useState } from 'react';
import { X, RotateCcw, Volume2 } from 'lucide-react';
import { WORDS, PHRASES } from '../../lib/wordOfDay';
import { speakSentence } from '../../lib/edubekSpeech';

/**
 * Three practice games inside Edubek. They run on the device with the word and phrase lists, so they
 * answer at once and cost no AI time: dictation (write what you hear), word guess (hangman), and a
 * quick meaning quiz.
 */
export type GameKind = 'dictation' | 'hangman' | 'quiz';

const pick = <T,>(list: T[], n: number): T[] => [...list].sort(() => Math.random() - 0.5).slice(0, n);

/** Letters only, lower case, so “Hello!” and “hello” are the same answer. */
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]+/g, '').replace(/\s+/g, ' ').trim();

/** Similarity 0–1 from Levenshtein distance, used to score dictation. */
export function similarity(a: string, b: string): number {
  const x = norm(a);
  const y = norm(b);
  if (!x && !y) return 1;
  const dp = Array.from({ length: x.length + 1 }, (_, i) => [i, ...Array(y.length).fill(0)]);
  for (let j = 0; j <= y.length; j++) dp[0][j] = j;
  for (let i = 1; i <= x.length; i++)
    for (let j = 1; j <= y.length; j++)
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (x[i - 1] === y[j - 1] ? 0 : 1));
  return 1 - dp[x.length][y.length] / Math.max(x.length, y.length, 1);
}

const TITLE: Record<GameKind, string> = { dictation: 'Diktant', hangman: 'So‘z topish', quiz: 'Tez test' };

export const EdubekGames: React.FC<{ kind: GameKind; onClose: () => void }> = ({ kind, onClose }) => {
  return (
    <div role="dialog" aria-modal="true" aria-label={TITLE[kind]} className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 p-4">
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-[28px] bg-paper-raised p-6 shadow-2xl dark:bg-[#1c1815]">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-[17px] font-extrabold text-ink dark:text-white">{TITLE[kind]}</h3>
          <button type="button" onClick={onClose} aria-label="Yopish" className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-ink/5"><X className="h-4 w-4" /></button>
        </div>
        {kind === 'dictation' ? <Dictation /> : kind === 'hangman' ? <Hangman /> : <Quiz />}
      </div>
    </div>
  );
};

const Dictation: React.FC = () => {
  const items = useMemo(() => pick(PHRASES, 5), []);
  const [i, setI] = useState(0);
  const [typed, setTyped] = useState('');
  const [score, setScore] = useState(0);
  const [shown, setShown] = useState<number | null>(null);
  const done = i >= items.length;
  const speak = () => speakSentence(items[i]?.text || '', 'happy').catch(() => undefined);
  const check = () => {
    const sc = similarity(typed, items[i].text);
    setShown(Math.round(sc * 100));
    setScore((s) => s + (sc >= 0.85 ? 1 : 0));
  };
  const next = () => {
    setI((v) => v + 1);
    setTyped('');
    setShown(null);
  };
  if (done) return <Result score={score} total={items.length} onAgain={() => { setI(0); setScore(0); setTyped(''); setShown(null); }} />;
  return (
    <div className="space-y-4">
      <p className="text-[12.5px] text-ink-muted dark:text-stone-400">{i + 1} / {items.length} · Edubek gapni o‘qiydi, siz eshitganingizni yozing.</p>
      <button type="button" onClick={speak} className="inline-flex h-11 items-center gap-2 rounded-full bg-ink px-5 text-[13px] font-semibold text-white dark:bg-white dark:text-ink"><Volume2 className="h-4 w-4" /> Tinglash</button>
      <textarea value={typed} onChange={(e) => setTyped(e.target.value)} rows={3} aria-label="Eshitgan gap" className="w-full rounded-xl border border-line bg-white/70 p-3 text-[14px] text-ink outline-none focus:border-[#f2650f] dark:border-white/10 dark:bg-white/[0.05] dark:text-white" />
      {shown === null ? (
        <button type="button" onClick={check} disabled={!typed.trim()} className="h-10 rounded-full bg-gradient-to-b from-[#ffb45c] to-[#ef6c12] px-5 text-[13px] font-bold text-white disabled:opacity-50">Tekshirish</button>
      ) : (
        <div className="space-y-2 rounded-2xl bg-ink/[0.04] p-4 dark:bg-white/[0.05]">
          <p className="text-[14px] font-bold text-ink dark:text-white">Aniqlik: {shown}% {shown >= 85 ? '✓' : ''}</p>
          <p className="text-[13px] text-ink-muted dark:text-stone-300">To‘g‘ri gap: <b>{items[i].text}</b></p>
          <button type="button" onClick={next} className="h-9 rounded-full border border-line px-4 text-[12.5px] font-semibold text-ink dark:border-white/10 dark:text-white">Keyingi gap</button>
        </div>
      )}
    </div>
  );
};

const Hangman: React.FC = () => {
  const [word, setWord] = useState(() => pick(WORDS, 1)[0]);
  const [guessed, setGuessed] = useState<string[]>([]);
  const misses = guessed.filter((l) => !word.en.includes(l)).length;
  const won = word.en.split('').every((c) => c === ' ' || guessed.includes(c));
  const lost = misses >= 6;
  const letters = 'abcdefghijklmnopqrstuvwxyz'.split('');
  const reset = () => {
    setWord(pick(WORDS, 1)[0]);
    setGuessed([]);
  };
  return (
    <div className="space-y-4">
      <p className="text-[13px] text-ink-muted dark:text-stone-400">Ma’nosi: <b className="text-ink dark:text-white">{word.uz}</b> · daraja {word.level}</p>
      <p className="font-mono text-[22px] font-bold tracking-[0.3em] text-ink dark:text-white" aria-label="So‘z">
        {word.en.split('').map((c, i) => (c === ' ' ? <span key={i}>&nbsp;&nbsp;</span> : <span key={i}>{guessed.includes(c) || lost ? c : '_'}</span>))}
      </p>
      <p className="text-[12.5px] text-ink-muted dark:text-stone-400">Xato: {misses} / 6</p>
      {won || lost ? (
        <div className="space-y-3">
          <p className="text-[14px] font-bold text-ink dark:text-white">{won ? 'Ajoyib, topdingiz!' : `Afsus. To‘g‘ri so‘z: ${word.en}`}</p>
          <button type="button" onClick={reset} className="inline-flex h-10 items-center gap-2 rounded-full bg-ink px-4 text-[13px] font-semibold text-white dark:bg-white dark:text-ink"><RotateCcw className="h-4 w-4" /> Yangi so‘z</button>
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-1.5 sm:grid-cols-9">
          {letters.map((l) => (
            <button key={l} type="button" disabled={guessed.includes(l)} onClick={() => setGuessed((g) => [...g, l])} className="h-9 rounded-lg border border-line text-[13px] font-semibold text-ink hover:border-[#f2650f] disabled:opacity-30 dark:border-white/10 dark:text-white">{l}</button>
          ))}
        </div>
      )}
    </div>
  );
};

const Quiz: React.FC = () => {
  const questions = useMemo(() => {
    const pool = pick(WORDS, 5);
    return pool.map((w) => {
      const wrong = pick(WORDS.filter((x) => x.en !== w.en), 3).map((x) => x.en);
      const options = [...wrong, w.en].sort(() => Math.random() - 0.5);
      return { uz: w.uz, options, correct: options.indexOf(w.en) };
    });
  }, []);
  const [i, setI] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  if (i >= questions.length) return <Result score={score} total={questions.length} onAgain={() => { setI(0); setScore(0); setPicked(null); }} />;
  const q = questions[i];
  return (
    <div className="space-y-4">
      <p className="text-[12.5px] text-ink-muted dark:text-stone-400">{i + 1} / {questions.length}</p>
      <p className="text-[16px] font-bold text-ink dark:text-white">“{q.uz}” ning inglizcha so‘zi qaysi?</p>
      <div className="grid gap-2">
        {q.options.map((o, k) => {
          const isRight = k === q.correct;
          const cls = picked === null ? 'border-line hover:border-[#f2650f]' : isRight ? 'border-emerald-500 bg-emerald-500/10' : picked === k ? 'border-rose-400 bg-rose-500/10' : 'border-line opacity-60';
          return (
            <button key={o} type="button" disabled={picked !== null} onClick={() => { setPicked(k); if (isRight) setScore((s) => s + 1); }} className={`rounded-xl border px-4 py-2.5 text-left text-[14px] font-semibold text-ink transition-colors dark:text-white ${cls}`}>{o}</button>
          );
        })}
      </div>
      {picked !== null ? (
        <button type="button" onClick={() => { setI((v) => v + 1); setPicked(null); }} className="h-10 rounded-full bg-ink px-5 text-[13px] font-semibold text-white dark:bg-white dark:text-ink">{i + 1 < questions.length ? 'Keyingisi' : 'Natija'}</button>
      ) : null}
    </div>
  );
};

const Result: React.FC<{ score: number; total: number; onAgain: () => void }> = ({ score, total, onAgain }) => (
  <div className="space-y-4 text-center">
    <p className="text-[18px] font-extrabold text-ink dark:text-white">Natija: {score} / {total}</p>
    <button type="button" onClick={onAgain} className="inline-flex h-10 items-center gap-2 rounded-full bg-ink px-5 text-[13px] font-semibold text-white dark:bg-white dark:text-ink"><RotateCcw className="h-4 w-4" /> Qayta o‘ynash</button>
  </div>
);
