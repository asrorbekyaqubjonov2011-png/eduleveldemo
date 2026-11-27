import React, { useMemo, useState } from 'react';
import { ArrowLeft, BookOpen, CheckCircle2, Headphones, Loader2, Mic, PenTool, XCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import type { Exercise, ExerciseAttempt, ExerciseLevel, ExerciseQuestion, ExerciseSkill } from '../../types';

const SKILLS: Array<{ id: ExerciseSkill; label: string; hint: string; icon: React.ElementType }> = [
  { id: 'reading', label: 'Reading', hint: 'Matnni o‘qing va savollarga javob bering', icon: BookOpen },
  { id: 'listening', label: 'Listening', hint: 'Audioni tinglang va javob bering', icon: Headphones },
  { id: 'speaking', label: 'Speaking', hint: 'Savollarga javob bering, AI nutqingizni baholaydi', icon: Mic },
  { id: 'writing', label: 'Writing', hint: 'Topshiriqni bajaring, AI taxminiy baho beradi', icon: PenTool }
];

const LEVELS: Array<'all' | ExerciseLevel> = ['all', 'A2', 'B1', 'B2', 'C1'];

/**
 * Mashqlar: published exercises by skill. Auto-graded answers are scored on the server;
 * writing and speaking answers can be checked by AI as a practice estimate.
 */
export const ExercisesView: React.FC<{ initialSkill?: ExerciseSkill }> = ({ initialSkill }) => {
  const { db, refreshDb } = useApp();
  const [skill, setSkill] = useState<ExerciseSkill>(initialSkill ?? 'reading');
  const [level, setLevel] = useState<'all' | ExerciseLevel>('all');
  const [openId, setOpenId] = useState<string | null>(null);

  const exercises = useMemo(
    () => (db.exercises || []).filter((e) => e.status === 'published' && e.skill === skill && (level === 'all' || e.level === level)),
    [db.exercises, skill, level]
  );
  const open = openId ? (db.exercises || []).find((e) => e.id === openId && e.status === 'published') : undefined;

  if (open) {
    return (
      <ExercisePlayer
        exercise={open}
        attempts={(db.exerciseAttempts || []).filter((a) => a.exerciseId === open.id)}
        onBack={() => setOpenId(null)}
        onSubmitted={refreshDb}
      />
    );
  }

  const active = SKILLS.find((s) => s.id === skill)!;

  return (
    <section className="mx-auto max-w-5xl space-y-6 px-4 py-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-extrabold text-ink dark:text-white">Mashqlar</h1>
        <p className="text-[13.5px] text-ink-muted dark:text-stone-400">{active.hint}.</p>
      </header>

      <div role="tablist" aria-label="Ko‘nikmalar" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {SKILLS.map((s) => {
          const Icon = s.icon;
          const selected = s.id === skill;
          return (
            <button
              key={s.id}
              role="tab"
              aria-selected={selected}
              onClick={() => setSkill(s.id)}
              className={`flex items-center gap-2 rounded-2xl border px-4 py-3 text-left text-[14px] font-semibold transition-colors ${
                selected
                  ? 'border-ember-500/60 bg-ember-500/10 text-ink dark:text-white'
                  : 'border-line/80 bg-white/70 text-ink-muted hover:border-ink/30 dark:border-white/10 dark:bg-white/[0.03] dark:text-stone-300'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {s.label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Daraja">
        {LEVELS.map((l) => (
          <button
            key={l}
            onClick={() => setLevel(l)}
            aria-pressed={level === l}
            className={`rounded-full border px-3.5 py-1.5 text-[12.5px] font-semibold ${
              level === l ? 'border-ink bg-ink text-white dark:border-white dark:bg-white dark:text-ink' : 'border-line/80 text-ink-muted dark:border-white/10 dark:text-stone-300'
            }`}
          >
            {l === 'all' ? 'Barchasi' : l}
          </button>
        ))}
      </div>

      {exercises.length > 1 ? (
        <button
          type="button"
          onClick={() => {
            const undone = exercises.filter((e) => !(db.exerciseAttempts || []).some((a) => a.exerciseId === e.id));
            const pool = undone.length ? undone : exercises;
            setOpenId(pool[Math.floor(Math.random() * pool.length)].id);
          }}
          className="inline-flex h-10 items-center gap-2 rounded-full border border-[#f2650f]/40 bg-white/60 px-4 text-[13px] font-semibold text-[#c4520a] hover:bg-[#f2650f]/10 dark:bg-white/5 dark:text-[#ffc982]"
        >
          🎲 Tasodifiy mashq {exercises.some((e) => !(db.exerciseAttempts || []).some((a) => a.exerciseId === e.id)) ? '(hali ishlanmagan)' : ''}
        </button>
      ) : null}

      {exercises.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-line/80 p-10 text-center text-[14px] text-ink-muted dark:border-white/10 dark:text-stone-400">
          Bu bo‘limda hozircha mashq yo‘q. Ustoz mashqlarni nashr qilgach, shu yerda chiqadi.
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {exercises.map((e) => {
            const mine = (db.exerciseAttempts || []).filter((a) => a.exerciseId === e.id);
            const best = mine.reduce<ExerciseAttempt | null>((top, a) => (!top || (a.maxScore ? a.score / a.maxScore : 0) > (top.maxScore ? top.score / top.maxScore : 0) ? a : top), null);
            return (
              <li key={e.id}>
                <button
                  onClick={() => setOpenId(e.id)}
                  className="flex w-full flex-col gap-2 rounded-3xl border border-line/80 bg-white/80 p-5 text-left transition-transform hover:-translate-y-0.5 dark:border-white/10 dark:bg-white/[0.03]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="rounded-full bg-ink/[0.06] px-2.5 py-0.5 text-[11px] font-bold text-ink-muted dark:bg-white/10 dark:text-stone-300">{e.level}</span>
                    <span className="text-[12px] text-ink-muted dark:text-stone-400">{e.questions.length} ta savol</span>
                  </div>
                  <span className="text-[16px] font-bold text-ink dark:text-white">{e.title}</span>
                  {e.instructions ? <span className="text-[13px] text-ink-muted dark:text-stone-400">{e.instructions}</span> : null}
                  <span className="mt-1 text-[12px] font-semibold text-ember-700 dark:text-ember-300">
                    {best ? `Eng yaxshi natija: ${best.score}/${best.maxScore || '—'} · ${mine.length} marta` : 'Hali topshirilmagan'}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};

const ExercisePlayer: React.FC<{
  exercise: Exercise;
  attempts: ExerciseAttempt[];
  onBack: () => void;
  onSubmitted: () => Promise<void> | void;
}> = ({ exercise, attempts, onBack, onSubmitted }) => {
  const [answers, setAnswers] = useState<Record<string, string | number>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ attempt: ExerciseAttempt; results: any[] } | null>(null);
  const [aiState, setAiState] = useState<Record<string, { busy: boolean; text?: string; error?: string }>>({});

  const unanswered = exercise.questions.filter((q) => answers[q.id] === undefined || answers[q.id] === '').length;

  const submit = async () => {
    if (unanswered > 0) {
      setError(`Hali javob berilmagan savollar bor: ${unanswered} ta.`);
      return;
    }
    setBusy(true);
    setError('');
    try {
      const res = await api.submitExercise(exercise.id, answers);
      if (!res.success) {
        setError(res.message || 'Javoblarni yuborib bo‘lmadi. Qayta urinib ko‘ring.');
        return;
      }
      setResult({ attempt: res.attempt, results: res.results });
      await onSubmitted();
    } catch {
      setError('Server bilan bog‘lanib bo‘lmadi.');
    } finally {
      setBusy(false);
    }
  };

  /** Asks Edubek to explain a wrong answer in plain words. */
  const explainWithAi = async (q: ExerciseQuestion, given: unknown, expected: unknown) => {
    setAiState((s) => ({ ...s, [q.id]: { busy: true } }));
    try {
      const shown = (v: unknown) => (q.type === 'mcq' && v !== undefined && v !== null && v !== '' ? (q.options || [])[Number(v)] ?? String(v) : String(v ?? ''));
      const prompt = `Savol: ${q.prompt}\nMening javobim: ${shown(given) || '(javob berilmagan)'}\nTo‘g‘ri javob: ${shown(expected)}\nNega mening javobim noto‘g‘ri? Qisqa va sodda tushuntiring.`;
      const res = await api.explainLessonWithAi(prompt);
      setAiState((s) => ({ ...s, [q.id]: res?.success && res.reply ? { busy: false, text: res.reply } : { busy: false, error: res?.message || 'AI tushuntira olmadi.' } }));
    } catch {
      setAiState((s) => ({ ...s, [q.id]: { busy: false, error: 'Server bilan bog‘lanib bo‘lmadi.' } }));
    }
  };

  const checkWithAi = async (q: ExerciseQuestion) => {
    const text = String(answers[q.id] || '').trim();
    if (text.split(/\s+/).filter(Boolean).length < 10) {
      setAiState((s) => ({ ...s, [q.id]: { busy: false, error: 'AI tekshiruvi uchun kamida 10 so‘z yozing.' } }));
      return;
    }
    setAiState((s) => ({ ...s, [q.id]: { busy: true } }));
    try {
      const res =
        exercise.skill === 'writing'
          ? await api.gradeWritingWithAI(text, `${exercise.instructions}\n${q.prompt}`, 'task2')
          : await api.evaluateSpeakingWithAI(text, q.prompt, 2, 60);
      if (!res.success) {
        setAiState((s) => ({ ...s, [q.id]: { busy: false, error: res.message || 'AI baholay olmadi.' } }));
        return;
      }
      const ev = res.evaluation || {};
      const summary = [ev.overallBand ? `Taxminiy baho: ${ev.overallBand}` : '', typeof ev.feedback === 'string' ? ev.feedback : '']
        .filter(Boolean)
        .join('\n');
      setAiState((s) => ({ ...s, [q.id]: { busy: false, text: summary || 'Izoh olinmadi.' } }));
    } catch {
      setAiState((s) => ({ ...s, [q.id]: { busy: false, error: 'Server bilan bog‘lanib bo‘lmadi.' } }));
    }
  };

  const resultFor = (id: string) => result?.results.find((r) => r.questionId === id);

  return (
    <section className="mx-auto max-w-3xl space-y-6 px-4 py-6">
      <button onClick={onBack} className="inline-flex items-center gap-2 text-[13px] font-semibold text-ink-muted hover:text-ink dark:text-stone-300">
        <ArrowLeft className="h-4 w-4" /> Mashqlar ro‘yxati
      </button>

      <header className="space-y-1">
        <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-ember-700 dark:text-ember-300">
          {exercise.skill} · {exercise.level}
        </span>
        <h1 className="text-2xl font-extrabold text-ink dark:text-white">{exercise.title}</h1>
        {exercise.instructions ? <p className="text-[14px] text-ink-muted dark:text-stone-400">{exercise.instructions}</p> : null}
      </header>

      {exercise.audioUrl ? (
        <audio controls preload="none" src={exercise.audioUrl} className="w-full" aria-label="Audio">
          Brauzeringiz audioni qo‘llamaydi.
        </audio>
      ) : null}

      {exercise.passage && exercise.skill === 'reading' ? (
        <article className="whitespace-pre-line rounded-3xl border border-line/80 bg-white/80 p-6 text-[15px] leading-relaxed text-ink dark:border-white/10 dark:bg-white/[0.03] dark:text-stone-200">
          {exercise.passage}
        </article>
      ) : null}

      <ol className="space-y-5">
        {exercise.questions.map((q, index) => {
          const r = resultFor(q.id);
          return (
            <li key={q.id} className="space-y-3 rounded-3xl border border-line/80 bg-white/80 p-5 dark:border-white/10 dark:bg-white/[0.03]">
              <p className="text-[15px] font-semibold text-ink dark:text-white">
                <span className="mr-2 text-ink-muted">{index + 1}.</span>
                {q.prompt}
              </p>

              {q.type === 'mcq' ? (
                <div role="radiogroup" aria-label={`${index + 1}-savol variantlari`} className="grid gap-2">
                  {(q.options || []).map((opt, i) => {
                    const selected = answers[q.id] === i;
                    const showState = !!r;
                    const isRight = showState && r.expected === i;
                    return (
                      <button
                        key={i}
                        role="radio"
                        aria-checked={selected}
                        disabled={!!result}
                        onClick={() => setAnswers((a) => ({ ...a, [q.id]: i }))}
                        className={`flex items-center gap-3 rounded-2xl border px-4 py-2.5 text-left text-[14px] transition-colors ${
                          isRight
                            ? 'border-emerald-500/60 bg-emerald-500/10'
                            : selected
                              ? 'border-ember-500/60 bg-ember-500/10'
                              : 'border-line/80 hover:border-ink/30 dark:border-white/10'
                        }`}
                      >
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-line text-[11px] font-bold">
                          {String.fromCharCode(65 + i)}
                        </span>
                        {opt}
                      </button>
                    );
                  })}
                </div>
              ) : null}

              {q.type === 'gap' ? (
                <input
                  value={String(answers[q.id] ?? '')}
                  disabled={!!result}
                  onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                  aria-label={`${index + 1}-savol javobi`}
                  placeholder="Javobni yozing"
                  className="h-11 w-full rounded-full border border-line/80 bg-white px-4 text-[14px] text-ink outline-none focus:border-ember-500/60 dark:border-white/10 dark:bg-white/5 dark:text-white"
                />
              ) : null}

              {q.type === 'short' ? (
                <div className="space-y-2">
                  <textarea
                    value={String(answers[q.id] ?? '')}
                    disabled={!!result}
                    onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                    aria-label={`${index + 1}-savol javobi`}
                    rows={exercise.skill === 'writing' ? 8 : 4}
                    maxLength={3000}
                    placeholder={exercise.skill === 'speaking' ? 'Javobingizni yozing (nutqingizni matnga o‘giring)' : 'Javobingizni yozing'}
                    className="w-full rounded-2xl border border-line/80 bg-white px-4 py-3 text-[14px] leading-relaxed text-ink outline-none focus:border-ember-500/60 dark:border-white/10 dark:bg-white/5 dark:text-white"
                  />
                  {(exercise.skill === 'writing' || exercise.skill === 'speaking') && !result ? (
                    <button
                      onClick={() => checkWithAi(q)}
                      disabled={aiState[q.id]?.busy}
                      className="inline-flex items-center gap-2 rounded-full border border-ink/20 px-4 py-2 text-[13px] font-semibold text-ink hover:bg-ink/[0.04] disabled:opacity-60 dark:border-white/20 dark:text-white"
                    >
                      {aiState[q.id]?.busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      AI bilan tekshirish
                    </button>
                  ) : null}
                  {aiState[q.id]?.text ? (
                    <p className="whitespace-pre-line rounded-2xl bg-ink/[0.04] p-3 text-[13px] leading-relaxed text-ink dark:bg-white/[0.06] dark:text-stone-200">{aiState[q.id].text}</p>
                  ) : null}
                  {aiState[q.id]?.error ? <p className="text-[13px] text-rose-700 dark:text-rose-300">{aiState[q.id].error}</p> : null}
                </div>
              ) : null}

              {r ? (
                <div className="space-y-1 rounded-2xl bg-ink/[0.03] p-3 text-[13px] dark:bg-white/[0.04]">
                  <div className={`flex items-center gap-2 font-semibold ${r.graded ? (r.correct ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300') : 'text-ink-muted'}`}>
                    {r.graded ? (r.correct ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />) : null}
                    {r.graded ? (r.correct ? 'To‘g‘ri' : 'Noto‘g‘ri') : 'Baholanmagan (AI tekshiruvi uchun)'}
                  </div>
                  {r.graded && !r.correct && r.expected !== undefined && r.expected !== null ? (
                    <div className="text-ink-muted dark:text-stone-400">
                      To‘g‘ri javob: <span className="font-semibold text-ink dark:text-white">{q.type === 'mcq' ? (q.options || [])[Number(r.expected)] : String(r.expected)}</span>
                    </div>
                  ) : null}
                  {r.explanation ? <div className="text-ink-muted dark:text-stone-400">{r.explanation}</div> : null}
                  {r.graded && !r.correct ? (
                    <div className="pt-1">
                      <button type="button" onClick={() => explainWithAi(q, answers[q.id], r.expected)} disabled={aiState[q.id]?.busy} className="inline-flex h-9 items-center gap-2 rounded-full border border-[#f2650f]/40 px-4 text-[12.5px] font-semibold text-[#c4520a] hover:bg-[#f2650f]/10 disabled:opacity-60 dark:text-[#ffc982]">
                        {aiState[q.id]?.busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null} AI tushuntirsin
                      </button>
                      {aiState[q.id]?.text ? <p className="mt-2 whitespace-pre-line rounded-2xl bg-ink/[0.04] p-3 text-[13px] leading-relaxed text-ink dark:bg-white/[0.06] dark:text-stone-200">{aiState[q.id].text}</p> : null}
                      {aiState[q.id]?.error ? <p className="mt-2 text-[13px] text-rose-700 dark:text-rose-300">{aiState[q.id].error}</p> : null}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>

      {exercise.skill === 'listening' && result && exercise.passage ? (
        <article className="whitespace-pre-line rounded-3xl border border-line/80 bg-white/80 p-6 text-[14px] leading-relaxed text-ink-muted dark:border-white/10 dark:bg-white/[0.03] dark:text-stone-400">
          <div className="mb-2 text-[12px] font-bold uppercase tracking-[0.12em]">Matn (transkript)</div>
          {exercise.passage}
        </article>
      ) : null}

      {result ? (
        <div className="rounded-3xl border border-ember-500/30 bg-ember-500/10 p-5 text-[15px] font-semibold text-ink dark:text-white">
          Natija: {result.attempt.score} / {result.attempt.maxScore || 0} (avtomatik baholangan savollar)
          {result.results.some((r) => !r.graded) ? (
            <span className="mt-1 block text-[13px] font-normal text-ink-muted dark:text-stone-400">Yozma javoblar ustoz tomonidan ko‘rib chiqiladi yoki AI bilan tekshirilishi mumkin.</span>
          ) : null}
        </div>
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-[13px] text-ink-muted dark:text-stone-400">
            {unanswered > 0 ? `${unanswered} ta savolga hali javob berilmagan` : 'Hammasi to‘ldirildi'}
          </span>
          <button
            onClick={submit}
            disabled={busy}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-gradient-to-b from-[#ffa149] to-[#f2650f] px-7 text-[14px] font-semibold text-white shadow-[0_18px_40px_-14px_rgba(242,101,15,0.8)] disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Javoblarni yuborish
          </button>
        </div>
      )}
      {error ? <p role="alert" className="text-[13px] text-rose-700 dark:text-rose-300">{error}</p> : null}

      {attempts.length > 0 ? (
        <div className="space-y-2">
          <h2 className="text-[13px] font-bold uppercase tracking-[0.12em] text-ink-muted dark:text-stone-400">Mening urinishlarim</h2>
          <ul className="space-y-1 text-[13px] text-ink-muted dark:text-stone-400">
            {attempts.slice(0, 10).map((a) => (
              <li key={a.id}>
                {new Date(a.createdAt).toLocaleString('uz-UZ')} — {a.score}/{a.maxScore || 0}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
};
