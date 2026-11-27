'use client';
import React, { useState } from 'react';
import { Download, FileUp, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import { CSV_SAMPLE, questionsFromCsv } from '../../lib/csvQuestions';
import { field, label } from '../ui/styles';

/** Adds many questions to a test at once from a CSV file or pasted text (for example from Excel). */
export const QuestionImport: React.FC<{ testId: string; testTitle: string; onClose: () => void }> = ({ testId, testTitle, onClose }) => {
  const { refreshDb } = useApp();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const parsed = text.trim() ? questionsFromCsv(text) : null;

  const onFile = async (f?: File) => {
    if (!f) return;
    setText(await f.text());
    setResult(null);
  };
  const sample = () => {
    const url = URL.createObjectURL(new Blob([CSV_SAMPLE], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'savollar-namuna.csv';
    a.click();
    URL.revokeObjectURL(url);
  };
  const run = async () => {
    if (!parsed?.questions.length) return;
    setBusy(true);
    setResult(null);
    try {
      let done = 0;
      for (let i = 0; i < parsed.questions.length; i += 5) {
        const res = await Promise.all(parsed.questions.slice(i, i + 5).map((q) => api.createQuestion({ testId, prompt: q.prompt, options: q.options, correctAnswerIndex: q.correctAnswerIndex, explanation: q.explanation, difficulty: 'medium' })));
        done += res.filter((r) => r?.success !== false).length;
      }
      await refreshDb();
      setResult({ ok: done === parsed.questions.length, text: `${done} ta savol qo‘shildi${done < parsed.questions.length ? `, ${parsed.questions.length - done} tasi qo‘shilmadi` : ''}.` });
      if (done) setText('');
    } catch {
      setResult({ ok: false, text: 'Server bilan bog‘lanib bo‘lmadi.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="Savollarni yuklash" className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[26px] bg-paper-raised p-6 shadow-2xl dark:bg-[#1c1815]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-lg font-extrabold text-ink dark:text-white">Savollarni CSV dan yuklash</h3>
            <p className="mt-1 text-[12.5px] text-ink-muted dark:text-stone-400">Test: <b>{testTitle}</b>. Ustunlar: savol, A, B, C, D, to‘g‘ri javob (A–D), izoh.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Yopish" className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-ink/5"><X className="h-4 w-4" /></button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-full border border-line bg-white/70 px-4 text-[13px] font-semibold text-ink dark:border-white/10 dark:bg-white/5 dark:text-white">
            <FileUp className="h-4 w-4" /> Fayl tanlash
            <input type="file" accept=".csv,.txt,text/csv" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
          </label>
          <button type="button" onClick={sample} className="inline-flex h-10 items-center gap-2 rounded-full border border-line bg-white/70 px-4 text-[13px] font-semibold text-ink dark:border-white/10 dark:bg-white/5 dark:text-white"><Download className="h-4 w-4" /> Namuna fayl</button>
        </div>
        <label className={`${label} mt-4`} htmlFor="csv-text">Yoki shu yerga qo‘ying (Excel dan nusxa ko‘chirsangiz ham bo‘ladi)</label>
        <textarea id="csv-text" rows={7} className={`${field} font-mono text-[12.5px]`} value={text} onChange={(e) => { setText(e.target.value); setResult(null); }} />
        {parsed ? (
          <div className="mt-3 space-y-1 text-[13px]">
            <div className="font-semibold text-emerald-700 dark:text-emerald-300">{parsed.questions.length} ta savol tayyor</div>
            {parsed.errors.map((e) => <div key={e} className="text-rose-700 dark:text-rose-300">{e}</div>)}
          </div>
        ) : null}
        {result ? <p role="status" className={`mt-3 text-[13px] font-semibold ${result.ok ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}`}>{result.text}</p> : null}
        <button type="button" disabled={busy || !parsed?.questions.length} onClick={run} className="mt-5 inline-flex h-11 items-center rounded-full bg-gradient-to-b from-[#ffb45c] to-[#ef6c12] px-6 text-[13.5px] font-bold text-white disabled:opacity-50">{busy ? 'Yuklanmoqda…' : `${parsed?.questions.length || 0} ta savolni qo‘shish`}</button>
      </div>
    </div>
  );
};
