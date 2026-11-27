'use client';
import React, { useState } from 'react';
import { CheckCircle2, Sparkles } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import { field, label } from '../ui/styles';

type Track = 'cefr' | 'general' | 'ielts';
type Q = { prompt: string; options: string[]; correctIndex: number; explanation?: string };
const readAsBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).replace(/^data:[^;]+;base64,/, ''));
    r.onerror = () => reject(new Error('Faylni o‘qib bo‘lmadi'));
    r.readAsDataURL(file);
  });
// Text longer than this is treated as a document (the AI reads it whole and writes questions from it).
const DOCUMENT_TEXT_MIN = 300;
const COUNTS = [5, 10, 15, 20, 30];
const LEVELS = ['A2', 'B1', 'B2', 'C1'];

interface Props {
  track: Track;
  onCreated: (testId: string) => void;
}

/**
 * The teacher's fast path: type a topic (or paste a lesson text), pick level and size, press one
 * button. The AI writes the questions, the test is saved as a draft, and the teacher only has to
 * read it and press "Nashr qilish".
 */
export const AiQuickMock: React.FC<Props> = ({ track, onCreated }) => {
  const { refreshDb } = useApp();
  const [topic, setTopic] = useState('');
  const [level, setLevel] = useState('B2');
  const [count, setCount] = useState(10);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [made, setMade] = useState<{ id: string; title: string; n: number; published: boolean } | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [kind, setKind] = useState<'quiz' | 'mock'>('quiz');

  const make = async (e: React.FormEvent) => {
    e.preventDefault();
    const source = topic.trim();
    if (source.length < 3) {
      setError('Mavzu yoki matnni yozing (kamida 3 belgi).');
      return;
    }
    setError('');
    setMade(null);
    try {
      let questions: Q[] = [];
      let title = source.slice(0, 60);
      if (file || source.length > DOCUMENT_TEXT_MIN) {
        // A document or a long text: the AI reads all of it and writes the questions from it.
        setBusy('AI hujjatni o‘qib savol yozmoqda…');
        const payload: { text?: string; fileBase64?: string; fileName?: string; count: number; title?: string } = { count, title: file ? file.name.replace(/\.[^.]+$/, '') : source.slice(0, 60) };
        if (file) {
          if (file.size > 8 * 1024 * 1024) {
            setError('Fayl hajmi 8 MB dan oshmasligi kerak.');
            return;
          }
          payload.fileBase64 = await readAsBase64(file);
          payload.fileName = file.name;
        } else {
          payload.text = source;
        }
        const r = await api.quizFromDocument(payload);
        if (!r?.success) {
          setError(r?.message || 'AI savol yoza olmadi. Qayta urinib ko‘ring.');
          return;
        }
        questions = (r.questions || []).map((q: { prompt: string; options: string[]; correctAnswerIndex: number; explanation?: string }) => ({ prompt: q.prompt, options: q.options, correctIndex: q.correctAnswerIndex, explanation: q.explanation }));
        title = r.title || payload.title || title;
      } else {
        // The AI writes up to 10 questions at a time; bigger tests are written in parallel parts, which is also faster.
        const parts = Math.ceil(count / 10);
        const per = Math.ceil(count / parts);
        setBusy(`AI ${count} ta savol yozmoqda…`);
        const results = await Promise.all(
          Array.from({ length: parts }, (_, k) =>
            api.generateStudentTest(parts > 1 ? `${source}\n\n(Part ${k + 1} of ${parts}: cover different aspects than the other parts, no repeated questions.)` : source, per, level)
          )
        );
        const bad = results.find((r) => !r?.success || !r.test?.questions?.length);
        if (bad && results.every((r) => !r?.success || !r.test?.questions?.length)) {
          setError(bad?.message || 'AI savol yoza olmadi. Qayta urinib ko‘ring.');
          return;
        }
        const seen = new Set<string>();
        questions = results
          .flatMap((r) => (r?.test?.questions || []) as Q[])
          .filter((q) => {
            const k = q.prompt.trim().toLowerCase();
            if (seen.has(k)) return false;
            seen.add(k);
            return true;
          })
          .slice(0, count);
        title = (results.find((r) => r?.test?.title)?.test?.title as string) || source.slice(0, 60);
      }
      questions = questions.slice(0, count);
      if (questions.length === 0) {
        setError('AI savol yoza olmadi. Mavzuni aniqroq yozing yoki boshqa matn yuklang.');
        return;
      }
      setBusy('Test saqlanmoqda…');
      const t = await api.createTest({
        title: `${title} (${level})`,
        description: `AI yordamida tuzilgan ${questions.length} savollik test. Nashrdan oldin savollarni tekshiring.`,
        type: kind,
        durationMinutes: Math.max(5, Math.ceil(questions.length * 1.2)),
        maxScore: questions.length,
        requiredVIP: 'none',
        published: false,
        track
      });
      const testId = t?.test?.id || t?.id;
      if (!testId) {
        setError(t?.message || 'Testni saqlab bo‘lmadi.');
        return;
      }
      for (let i = 0; i < questions.length; i += 5) {
        await Promise.all(
          questions.slice(i, i + 5).map((q) =>
            api.createQuestion({ testId, prompt: q.prompt, options: q.options, correctAnswerIndex: q.correctIndex, explanation: q.explanation || '', difficulty: 'medium' })
          )
        );
      }
      await refreshDb();
      setMade({ id: testId, title: `${title} (${level})`, n: questions.length, published: false });
      onCreated(testId);
    } catch {
      setError('Server bilan bog‘lanib bo‘lmadi. Qayta urinib ko‘ring.');
    } finally {
      setBusy(null);
    }
  };

  const publish = async () => {
    if (!made) return;
    setBusy('Nashr qilinmoqda…');
    try {
      const r = await api.updateTest(made.id, { published: true });
      if (r?.success === false) setError(r.message || 'Nashr qilib bo‘lmadi.');
      else {
        await refreshDb();
        setMade({ ...made, published: true });
      }
    } finally {
      setBusy(null);
    }
  };

  return (
    <form onSubmit={make} className="liquid-glass rounded-[26px] p-5 sm:p-6">
      <div className="flex items-center gap-2 text-[15px] font-extrabold text-ink dark:text-white">
        <Sparkles className="h-4 w-4 text-[#f2650f]" /> AI bilan tez test
      </div>
      <p className="mt-1 text-[12.5px] text-ink-muted dark:text-stone-400">Mavzu yoki dars matnini yozing: AI savollarni yozadi, test qoralama sifatida saqlanadi. Yo‘nalish: {track.toUpperCase()}.</p>
      <div className="mt-4 grid gap-4 md:grid-cols-[1fr_auto_auto_auto]">
        <div>
          <label className={label} htmlFor="aqm-topic">Mavzu yoki matn</label>
          <textarea id="aqm-topic" rows={2} maxLength={8000} className={field} placeholder="Masalan: Present Perfect vs Past Simple, yoki dars konspektini shu yerga qo‘ying" value={topic} onChange={(e) => setTopic(e.target.value)} />
          <label className="mt-2 flex cursor-pointer items-center gap-2 text-[12.5px] font-semibold text-ink-muted hover:text-ink dark:text-stone-400">
            <input type="file" accept=".docx,.txt,.md" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] || null)} aria-label="Hujjat yuklash (.docx, .txt, .md)" />
            <span className="rounded-full border border-line px-3 py-1 dark:border-white/10">{file ? file.name : 'Yoki Word (.docx) / .txt fayl yuklang'}</span>
            {file ? <button type="button" onClick={() => setFile(null)} className="text-rose-600">Olib tashlash</button> : null}
          </label>
        </div>
        <div>
          <label className={label} htmlFor="aqm-level">Daraja</label>
          <select id="aqm-level" className={field} value={level} onChange={(e) => setLevel(e.target.value)}>{LEVELS.map((l) => <option key={l}>{l}</option>)}</select>
        </div>
        <div>
          <label className={label} htmlFor="aqm-kind">Turi</label>
          <select id="aqm-kind" className={field} value={kind} onChange={(e) => setKind(e.target.value as 'quiz' | 'mock')}>
            <option value="quiz">Viktorina</option>
            <option value="mock">Mock imtihon</option>
          </select>
        </div>
        <div>
          <label className={label} htmlFor="aqm-count">Savollar</label>
          <select id="aqm-count" className={field} value={count} onChange={(e) => setCount(Number(e.target.value))}>{COUNTS.map((c) => <option key={c} value={c}>{c} ta</option>)}</select>
        </div>
      </div>
      {error ? <div role="alert" className="mt-3 rounded-xl bg-rose-500/10 px-4 py-2.5 text-[13px] font-semibold text-rose-700 dark:text-rose-300">{error}</div> : null}
      {made ? (
        <div role="status" className="mt-3 flex flex-wrap items-center gap-3 rounded-xl bg-emerald-500/10 px-4 py-3 text-[13px] text-emerald-800 dark:text-emerald-200">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span className="min-w-0 flex-1"><b>{made.title}</b>: {made.n} ta savol {made.published ? 'nashr qilindi.' : 'qoralama sifatida saqlandi. Pastda ko‘rib chiqing.'}</span>
          {!made.published ? <button type="button" onClick={publish} disabled={!!busy} className="rounded-full bg-emerald-600 px-4 py-1.5 text-[12.5px] font-bold text-white disabled:opacity-60">Nashr qilish</button> : null}
        </div>
      ) : null}
      <button type="submit" disabled={!!busy} className="mt-4 inline-flex h-11 items-center gap-2 rounded-full bg-gradient-to-b from-[#ffb45c] to-[#ef6c12] px-6 text-[13.5px] font-bold text-white shadow-[0_10px_24px_-10px_rgba(239,108,18,0.9)] disabled:opacity-70">
        <Sparkles className="h-4 w-4" /> {busy || 'AI bilan test yaratish'}
      </button>
    </form>
  );
};
