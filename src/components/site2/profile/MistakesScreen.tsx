'use client';
import React, { useEffect, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { api } from '../../../services/api';

interface Mistake {
  id: string;
  exerciseId: string;
  exerciseTitle: string;
  skill: string;
  prompt: string;
  given: string;
  correct: string;
  explanation: string;
  createdAt: string;
}

/** Wrong answers from the student's own exercises, with the right answer and the reason. */
export const MistakesScreen: React.FC<{ onPractice: (exerciseId: string) => void }> = ({ onPractice }) => {
  const [items, setItems] = useState<Mistake[] | null>(null);
  const [err, setErr] = useState('');
  const [skill, setSkill] = useState<string>('all');

  useEffect(() => {
    let alive = true;
    api.getMistakes()
      .then((r) => { if (alive) setItems(r.success ? (r.mistakes ?? []) : []); if (alive && !r.success) setErr(r.message || 'Yuklab bo‘lmadi.'); })
      .catch(() => alive && setErr('Server bilan bog‘lanib bo‘lmadi.'));
    return () => { alive = false; };
  }, []);

  if (err) return <p role="alert" className="text-[13px] font-semibold text-rose-700 dark:text-rose-300">{err}</p>;
  if (!items) return <p className="text-[13px] text-ink-muted dark:text-stone-400">Yuklanmoqda…</p>;
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-line/80 bg-white/60 p-8 text-center dark:border-white/10 dark:bg-white/[0.03]">
        <p className="text-[14px] text-ink-muted dark:text-stone-400">Xatolar yo‘q yoki hali mashq topshirilmagan. Mashq qiling, xatolaringiz shu yerda chiqadi.</p>
      </div>
    );
  }
  const skills = Array.from(new Set(items.map((i) => i.skill)));
  const shown = skill === 'all' ? items : items.filter((i) => i.skill === skill);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Ko‘nikma">
        {['all', ...skills].map((s) => (
          <button key={s} type="button" aria-pressed={skill === s} onClick={() => setSkill(s)} className={`rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold ${skill === s ? 'bg-ink text-white dark:bg-white dark:text-ink' : 'border border-line/80 text-ink-muted dark:border-white/10 dark:text-stone-300'}`}>
            {s === 'all' ? `Hammasi (${items.length})` : s}
          </button>
        ))}
      </div>
      <ul className="space-y-3">
        {shown.map((m) => (
          <li key={m.id} className="rounded-2xl border border-line/80 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.04]">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[11px] font-bold uppercase tracking-wider text-ink-muted dark:text-stone-500">{m.exerciseTitle} · {new Date(m.createdAt).toLocaleDateString('uz-UZ')}</div>
                <p className="mt-1 text-[14px] font-semibold text-ink dark:text-white">{m.prompt}</p>
                <p className="mt-1 text-[13px] text-rose-700 dark:text-rose-300">Siz: {m.given || '—'}</p>
                <p className="text-[13px] text-emerald-700 dark:text-emerald-300">To‘g‘risi: {m.correct}</p>
                {m.explanation ? <p className="mt-1.5 text-[12.5px] text-ink-muted dark:text-stone-400">{m.explanation}</p> : null}
              </div>
              <button type="button" onClick={() => onPractice(m.exerciseId)} aria-label={`${m.exerciseTitle} mashqini qayta ishlash`} className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-line px-3 text-[12px] font-semibold text-ink dark:border-white/15 dark:text-white">
                <RotateCcw className="h-3.5 w-3.5" /> Qayta
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};
