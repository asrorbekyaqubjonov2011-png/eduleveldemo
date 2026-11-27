import React, { useMemo, useState } from 'react';
import { Copy, Loader2, Plus, Sparkles, Trash2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import type { Exercise, ExerciseLevel, ExerciseQuestion, ExerciseQuestionType, ExerciseSkill } from '../../types';

const SKILLS: ExerciseSkill[] = ['reading', 'listening', 'speaking', 'writing'];
const LEVELS: ExerciseLevel[] = ['A2', 'B1', 'B2', 'C1'];
const SKILL_LABEL: Record<ExerciseSkill, string> = { reading: 'Reading', listening: 'Listening', speaking: 'Speaking', writing: 'Writing' };

type Draft = Omit<Exercise, 'id' | 'createdAt' | 'updatedAt'> & { id?: string };

const emptyDraft = (): Draft => ({
  skill: 'reading',
  level: 'B1',
  title: '',
  instructions: '',
  passage: '',
  audioUrl: '',
  questions: [],
  status: 'draft',
  source: 'manual'
});

const newQuestion = (type: ExerciseQuestionType, index: number): ExerciseQuestion =>
  type === 'mcq'
    ? { id: `q${index + 1}`, type, prompt: '', options: ['', '', '', ''], correct: 0, explanation: '' }
    : { id: `q${index + 1}`, type, prompt: type === 'gap' ? '___' : '', correct: '', explanation: '' };

const field = 'w-full rounded-xl border border-line/80 bg-white/80 px-3 py-2 text-[13.5px] text-ink outline-none focus:border-ember-500/60 dark:border-white/10 dark:bg-white/5 dark:text-white';

/**
 * Owner: write exercises by hand or draft them from the owner's own text with AI.
 * Nothing reaches students until it is published, and the server validates every save.
 */
export const ExercisesManager: React.FC = () => {
  const { db, refreshDb } = useApp();
  const [filter, setFilter] = useState<ExerciseSkill | 'all'>('all');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [aiText, setAiText] = useState('');
  const [aiSkill, setAiSkill] = useState<ExerciseSkill>('reading');
  const [aiLevel, setAiLevel] = useState<ExerciseLevel>('B1');
  const [aiCount, setAiCount] = useState(6);

  const list = useMemo(
    () => (db.exercises || []).filter((e) => filter === 'all' || e.skill === filter),
    [db.exercises, filter]
  );

  const openNew = () => {
    setDraft(emptyDraft());
    setMessage(null);
  };

  const openExisting = (e: Exercise) => {
    setDraft({ ...e });
    setMessage(null);
  };

  const update = (patch: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...patch } : d));

  const updateQuestion = (index: number, patch: Partial<ExerciseQuestion>) =>
    setDraft((d) => {
      if (!d) return d;
      const questions = d.questions.map((q, i) => (i === index ? { ...q, ...patch } : q));
      return { ...d, questions };
    });

  const removeQuestion = (index: number) =>
    setDraft((d) => (d ? { ...d, questions: d.questions.filter((_, i) => i !== index).map((q, i) => ({ ...q, id: `q${i + 1}` })) } : d));

  const addQuestion = (type: ExerciseQuestionType) =>
    setDraft((d) => (d ? { ...d, questions: [...d.questions, newQuestion(type, d.questions.length)] } : d));

  const save = async (status: 'draft' | 'published') => {
    if (!draft) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await api.saveExercise({ ...draft, status });
      if (!res.success) {
        setMessage({ tone: 'error', text: res.message || 'Saqlab bo‘lmadi.' });
        return;
      }
      setDraft({ ...res.exercise });
      setMessage({ tone: 'ok', text: status === 'published' ? 'Mashq nashr qilindi. O‘quvchilarga ko‘rinadi.' : 'Qoralama saqlandi.' });
      await refreshDb();
    } catch {
      setMessage({ tone: 'error', text: 'Server bilan bog‘lanib bo‘lmadi.' });
    } finally {
      setBusy(false);
    }
  };

  const remove = async (e: Exercise) => {
    if (!window.confirm(`“${e.title}” mashqini o‘chirasizmi? Bu amalni qaytarib bo‘lmaydi.`)) return;
    const res = await api.deleteExercise(e.id);
    if (!res.success) {
      setMessage({ tone: 'error', text: res.message || 'O‘chirib bo‘lmadi.' });
      return;
    }
    if (draft?.id === e.id) setDraft(null);
    await refreshDb();
  };

  const generate = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const res = await api.generateExerciseDraft({ sourceText: aiText, skill: aiSkill, level: aiLevel, count: aiCount });
      if (!res.success) {
        setMessage({ tone: 'error', text: res.message || 'AI mashq yarata olmadi.' });
        return;
      }
      setDraft({
        ...emptyDraft(),
        skill: aiSkill,
        level: aiLevel,
        title: res.title || 'Mashq',
        instructions: res.instructions || '',
        passage: aiSkill === 'reading' || aiSkill === 'listening' ? aiText.slice(0, 20000) : '',
        questions: res.questions,
        source: 'owner_ai'
      });
      setMessage({ tone: 'ok', text: `${res.questions.length} ta savol yaratildi. Tekshirib, so‘ng saqlang yoki nashr qiling. ${res.disclaimer || ''}` });
    } catch {
      setMessage({ tone: 'error', text: 'Server bilan bog‘lanib bo‘lmadi.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-ink dark:text-white">Mashqlar</h2>
          <p className="text-[13px] text-ink-muted dark:text-stone-400">Reading, Listening, Speaking va Writing mashqlari. Nashr qilingan mashqlar o‘quvchilar kabinetida chiqadi.</p>
        </div>
        <button onClick={openNew} className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-[13px] font-semibold text-white dark:bg-white dark:text-ink">
          <Plus className="h-4 w-4" /> Yangi mashq
        </button>
      </header>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Ko‘nikma bo‘yicha filtr">
        {(['all', ...SKILLS] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            aria-pressed={filter === s}
            className={`rounded-full border px-3 py-1.5 text-[12.5px] font-semibold ${filter === s ? 'border-ink bg-ink text-white dark:border-white dark:bg-white dark:text-ink' : 'border-line/80 text-ink-muted dark:border-white/10 dark:text-stone-300'}`}
          >
            {s === 'all' ? 'Barchasi' : SKILL_LABEL[s]}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line/80 p-6 text-center text-[13px] text-ink-muted dark:border-white/10 dark:text-stone-400">
          Hali mashq yo‘q. “Yangi mashq” orqali qo‘lda yarating yoki matningizdan AI bilan savollar oling.
        </p>
      ) : (
        <ul className="divide-y divide-line/70 rounded-2xl border border-line/80 bg-white/70 dark:divide-white/10 dark:border-white/10 dark:bg-white/[0.03]">
          {list.map((e) => (
            <li key={e.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <button onClick={() => openExisting(e)} className="min-w-0 text-left">
                <div className="truncate text-[14px] font-semibold text-ink dark:text-white">{e.title}</div>
                <div className="text-[12px] text-ink-muted dark:text-stone-400">
                  {SKILL_LABEL[e.skill]} · {e.level} · {e.questions.length} ta savol · {e.source === 'owner_ai' ? 'AI' : 'qo‘lda'}
                </div>
              </button>
              <div className="flex items-center gap-2">
                <button onClick={() => setDraft({ ...e, id: undefined, title: `${e.title} (nusxa)`, status: 'draft' })} aria-label={`${e.title} mashqini nusxalash`} title="Nusxalash (qoralama)" className="rounded-full p-2 text-ink-muted hover:bg-ink/5 dark:text-stone-400">
                  <Copy className="h-4 w-4" />
                </button>
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${e.status === 'published' ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' : 'bg-ink/[0.06] text-ink-muted dark:bg-white/10 dark:text-stone-300'}`}>
                  {e.status === 'published' ? 'Nashr' : 'Qoralama'}
                </span>
                <button onClick={() => remove(e)} aria-label={`${e.title} mashqini o‘chirish`} className="rounded-full p-2 text-ink-muted hover:bg-rose-500/10 hover:text-rose-700 dark:text-stone-400">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <aside className="space-y-3 rounded-2xl border border-line/80 bg-white/70 p-5 dark:border-white/10 dark:bg-white/[0.03]">
          <h3 className="flex items-center gap-2 text-[14px] font-bold text-ink dark:text-white">
            <Sparkles className="h-4 w-4 text-ember-600" /> AI bilan savol yaratish
          </h3>
          <p className="text-[12.5px] text-ink-muted dark:text-stone-400">Matnni yozing yoki joylang (matn, dars transkripti yoki mavzu). AI faqat shu matndan savol tuzadi. Natijani tekshirib, so‘ng saqlang.</p>
          <textarea value={aiText} onChange={(e) => setAiText(e.target.value)} rows={8} maxLength={12000} placeholder="Matn..." aria-label="Manba matn" className={field} />
          <div className="grid grid-cols-3 gap-2">
            <select value={aiSkill} onChange={(e) => setAiSkill(e.target.value as ExerciseSkill)} aria-label="Ko‘nikma" className={field}>
              {SKILLS.map((s) => <option key={s} value={s}>{SKILL_LABEL[s]}</option>)}
            </select>
            <select value={aiLevel} onChange={(e) => setAiLevel(e.target.value as ExerciseLevel)} aria-label="Daraja" className={field}>
              {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
            <input type="number" min={3} max={12} value={aiCount} onChange={(e) => setAiCount(Number(e.target.value) || 6)} aria-label="Savollar soni" className={field} />
          </div>
          <button onClick={generate} disabled={busy || aiText.trim().length < 40} className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-b from-[#ffa149] to-[#f2650f] px-4 py-2.5 text-[13px] font-semibold text-white disabled:opacity-50">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Savollarni yaratish
          </button>
        </aside>

        <div className="space-y-4 rounded-2xl border border-line/80 bg-white/70 p-5 dark:border-white/10 dark:bg-white/[0.03]">
          {!draft ? (
            <p className="text-[13px] text-ink-muted dark:text-stone-400">Ro‘yxatdan mashq tanlang yoki “Yangi mashq” bosing.</p>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="space-y-1 text-[12px] font-semibold text-ink-muted dark:text-stone-400">Ko‘nikma
                  <select value={draft.skill} onChange={(e) => update({ skill: e.target.value as ExerciseSkill })} className={field}>
                    {SKILLS.map((s) => <option key={s} value={s}>{SKILL_LABEL[s]}</option>)}
                  </select>
                </label>
                <label className="space-y-1 text-[12px] font-semibold text-ink-muted dark:text-stone-400">Daraja
                  <select value={draft.level} onChange={(e) => update({ level: e.target.value as ExerciseLevel })} className={field}>
                    {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                </label>
                <label className="space-y-1 text-[12px] font-semibold text-ink-muted dark:text-stone-400">Sarlavha
                  <input value={draft.title} onChange={(e) => update({ title: e.target.value })} maxLength={160} className={field} />
                </label>
              </div>
              <label className="block space-y-1 text-[12px] font-semibold text-ink-muted dark:text-stone-400">Ko‘rsatma (o‘quvchiga)
                <input value={draft.instructions} onChange={(e) => update({ instructions: e.target.value })} maxLength={300} className={field} />
              </label>
              {draft.skill === 'listening' ? (
                <label className="block space-y-1 text-[12px] font-semibold text-ink-muted dark:text-stone-400">Audio havolasi (https://...)
                  <input value={draft.audioUrl} onChange={(e) => update({ audioUrl: e.target.value })} placeholder="https://..." className={field} />
                </label>
              ) : null}
              {draft.skill === 'reading' || draft.skill === 'listening' ? (
                <label className="block space-y-1 text-[12px] font-semibold text-ink-muted dark:text-stone-400">
                  {draft.skill === 'listening' ? 'Transkript (natijadan keyin ko‘rsatiladi)' : 'Matn'}
                  <textarea value={draft.passage} onChange={(e) => update({ passage: e.target.value })} rows={6} maxLength={20000} className={field} />
                </label>
              ) : null}

              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-[13px] font-bold text-ink dark:text-white">Savollar ({draft.questions.length})</h4>
                  <div className="flex gap-2">
                    <button onClick={() => addQuestion('mcq')} className="rounded-full border border-line/80 px-3 py-1 text-[12px] font-semibold text-ink dark:border-white/10 dark:text-white">+ Tanlov</button>
                    <button onClick={() => addQuestion('gap')} className="rounded-full border border-line/80 px-3 py-1 text-[12px] font-semibold text-ink dark:border-white/10 dark:text-white">+ Bo‘shliq</button>
                    <button onClick={() => addQuestion('short')} className="rounded-full border border-line/80 px-3 py-1 text-[12px] font-semibold text-ink dark:border-white/10 dark:text-white">+ Yozma</button>
                  </div>
                </div>
                {draft.questions.map((q, i) => (
                  <div key={q.id} className="space-y-2 rounded-xl border border-line/70 p-3 dark:border-white/10">
                    <div className="flex items-center justify-between gap-2 text-[12px] font-bold text-ink-muted dark:text-stone-400">
                      <span>{i + 1}. {q.type === 'mcq' ? 'Tanlov' : q.type === 'gap' ? 'Bo‘shliq' : 'Yozma'}</span>
                      <button onClick={() => removeQuestion(i)} aria-label={`${i + 1}-savolni o‘chirish`} className="text-rose-700 dark:text-rose-300">O‘chirish</button>
                    </div>
                    <textarea value={q.prompt} onChange={(e) => updateQuestion(i, { prompt: e.target.value })} rows={2} placeholder={q.type === 'gap' ? 'Gap matni, bo‘shliq uchun ___ yozing' : 'Savol matni'} className={field} />
                    {q.type === 'mcq' ? (
                      <div className="grid gap-2">
                        {(q.options || []).map((opt, oi) => (
                          <label key={oi} className="flex items-center gap-2 text-[13px]">
                            <input type="radio" name={`correct-${q.id}`} checked={q.correct === oi} onChange={() => updateQuestion(i, { correct: oi })} aria-label={`${oi + 1}-variant to‘g‘ri`} />
                            <input value={opt} onChange={(e) => updateQuestion(i, { options: (q.options || []).map((o, k) => (k === oi ? e.target.value : o)) })} placeholder={`${String.fromCharCode(65 + oi)} variant`} className={field} />
                          </label>
                        ))}
                        <span className="text-[11.5px] text-ink-muted dark:text-stone-400">To‘g‘ri variant yonidagi tugmani belgilang.</span>
                      </div>
                    ) : null}
                    {q.type === 'gap' ? (
                      <input value={String(q.correct ?? '')} onChange={(e) => updateQuestion(i, { correct: e.target.value })} placeholder="To‘g‘ri so‘z" className={field} />
                    ) : null}
                    {q.type === 'short' ? (
                      <textarea value={String(q.correct ?? '')} onChange={(e) => updateQuestion(i, { correct: e.target.value })} rows={2} placeholder="Namunaviy javob (ixtiyoriy)" className={field} />
                    ) : null}
                    <input value={q.explanation || ''} onChange={(e) => updateQuestion(i, { explanation: e.target.value })} placeholder="Izoh (o‘quvchi natijadan keyin ko‘radi)" className={field} />
                  </div>
                ))}
              </div>

              {message ? (
                <p role="status" className={`text-[13px] ${message.tone === 'ok' ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}`}>{message.text}</p>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <button onClick={() => save('draft')} disabled={busy} className="rounded-full border border-line/80 px-5 py-2.5 text-[13px] font-semibold text-ink disabled:opacity-50 dark:border-white/10 dark:text-white">Qoralama sifatida saqlash</button>
                <button onClick={() => save('published')} disabled={busy} className="rounded-full bg-ink px-5 py-2.5 text-[13px] font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-ink">Nashr qilish</button>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
};
