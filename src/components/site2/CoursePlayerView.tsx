import React, { useMemo, useState } from 'react';
import { lessonBotCode } from '../../lib/telegramLessons';
import { CheckCircle2, ChevronLeft, FileText, Lock, PlayCircle, Target } from 'lucide-react';
import { LessonVideo } from '../common/LessonVideo';
import { useApp } from '../../context/AppContext';
import { MathRenderer } from '../common/MathRenderer';
import { api } from '../../services/api';
import type { Course, Lesson, Question } from '../../types';

interface CoursePlayerViewProps {
  courseId: string;
  onBack: () => void;
  /** Kept for compatibility with the LMS shell; lesson tests now open inside the lesson. */
  onOpenTest?: (testId: string) => void;
}

type Tab = 'konspekt' | 'materiallar' | 'vazifa' | 'test';

/** Set by the site when a Telegram-bot link (?lesson=ID) is opened; the player picks it up once. */
export const PENDING_LESSON_KEY = 'edulevel_pending_lesson';
function takePendingLesson(lessons: Array<{ id: string }>): string | null {
  try {
    const id = sessionStorage.getItem(PENDING_LESSON_KEY);
    if (!id || !lessons.some((l) => l.id === id)) return null;
    sessionStorage.removeItem(PENDING_LESSON_KEY);
    return id;
  } catch {
    return null;
  }
}

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'konspekt', label: 'Konspekt' },
  { id: 'materiallar', label: 'Materiallar' },
  { id: 'vazifa', label: 'Vazifa' },
  { id: 'test', label: 'Test' }
];

/**
 * Students only see courses of their own learning track. A request for another
 * track's course falls back to their first course.
 */
export const CoursePlayerView: React.FC<CoursePlayerViewProps> = (props) => {
  const { db, currentUser } = useApp();
  const userTrack = currentUser?.track || 'ielts';
  const allowed = db.courses.filter((c) => c.published !== false && (!currentUser || (c.track || 'ielts') === userTrack));
  const course = allowed.find((c) => c.id === props.courseId) || allowed[0];
  if (!course) {
    return (
      <div className="glass-premium mx-auto max-w-xl rounded-[28px] p-8 text-center">
        <div className="font-display text-[20px] font-extrabold text-ink dark:text-white">Bu yo‘nalishda hali kurs yo‘q</div>
        <p className="mt-2 text-[14px] text-ink-muted dark:text-stone-400">Ustoz yangi darslarni joylagach, ular shu yerda paydo bo‘ladi.</p>
        <button onClick={props.onBack} className="mt-6 inline-flex h-11 items-center rounded-full bg-gradient-to-b from-[#ffa149] to-[#f2650f] px-6 text-[14px] font-semibold text-white">
          Orqaga
        </button>
      </div>
    );
  }
  return <LessonPlayer course={course} onBack={props.onBack} />;
};

const LessonPlayer: React.FC<{ course: Course; onBack: () => void }> = ({ course, onBack }) => {
  const { db, currentUser, refreshDb } = useApp();
  const lessons = useMemo(
    () => db.lessons.filter((l) => l.courseId === course.id && l.isPublished !== false).sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0)),
    [db.lessons, course.id]
  );
  const completed = useMemo(() => new Set(currentUser?.completedLessons || []), [currentUser?.completedLessons]);

  // A lesson opens after the previous one is completed (its test passed).
  const isUnlocked = (index: number) => index === 0 || completed.has(lessons[index - 1]?.id);
  const firstOpen = lessons.findIndex((_, i) => isUnlocked(i) && !completed.has(lessons[i].id));
  const [chosenId, setChosenId] = useState<string | null>(() => takePendingLesson(lessons));
  const botUsername = (db.telegramBotSettings?.botUsername || '').replace(/^@/, '');
  const [tab, setTab] = useState<Tab>('konspekt');
  const activeIndex = Math.max(0, lessons.findIndex((l) => l.id === chosenId));
  const active: Lesson | undefined = lessons[chosenId ? activeIndex : firstOpen >= 0 ? firstOpen : 0];

  if (lessons.length === 0) {
    return (
      <div className="space-y-4">
        <button onClick={onBack} className="inline-flex items-center gap-1 text-[13px] font-semibold text-ink-muted hover:text-ink dark:text-stone-300">
          <ChevronLeft className="h-4 w-4" /> Kurslar
        </button>
        <div className="rounded-3xl border border-dashed border-line/80 p-10 text-center text-[14px] text-ink-muted dark:border-white/10 dark:text-stone-400">
          “{course.title}” kursida hozircha dars yo‘q. Ustoz darslarni qo‘shgach, shu yerda chiqadi.
        </div>
      </div>
    );
  }
  if (!active) return null;

  const index = lessons.findIndex((l) => l.id === active.id);
  const unlocked = isUnlocked(index);
  const progress = db.lessonProgress.find((p) => p.lessonId === active.id && p.userId === currentUser?.id);
  const watched = !!progress?.watched;
  const done = completed.has(active.id);
  const nextLesson = lessons[index + 1];
  const doneCount = lessons.filter((l) => completed.has(l.id)).length;

  const selectLesson = (l: Lesson, i: number) => {
    if (!isUnlocked(i)) return;
    setChosenId(l.id);
    setTab('konspekt');
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <button onClick={onBack} className="mb-2 inline-flex items-center gap-1 text-[13px] font-semibold text-ink-muted hover:text-ink dark:text-stone-300">
            <ChevronLeft className="h-4 w-4" /> Kurslar
          </button>
          <h1 className="truncate text-2xl font-extrabold text-ink dark:text-white">{course.title}</h1>
          <p className="text-[13px] text-ink-muted dark:text-stone-400">
            {doneCount} / {lessons.length} dars tugatildi
          </p>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-ink/[0.08] sm:w-56 dark:bg-white/10" aria-hidden="true">
          <div className="h-full rounded-full bg-gradient-to-r from-[#ffa149] to-[#f2650f] transition-[width] duration-500" style={{ width: `${lessons.length ? (doneCount / lessons.length) * 100 : 0}%` }} />
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <main className="min-w-0 space-y-5">
          {!unlocked ? (
            <div className="rounded-3xl border border-line/80 bg-white/80 p-8 text-center dark:border-white/10 dark:bg-white/[0.03]">
              <Lock className="mx-auto h-8 w-8 text-ink-muted" />
              <h2 className="mt-3 text-lg font-bold text-ink dark:text-white">Bu dars hali ochilmagan</h2>
              <p className="mt-1 text-[14px] text-ink-muted dark:text-stone-400">Avval oldingi darsni ko‘rib, testidan kamida {lessons[index - 1]?.requiredPassingPercent || 70}% to‘plang.</p>
            </div>
          ) : (
            <>
              <div className="aspect-video overflow-hidden rounded-3xl bg-black shadow-lg">
                <LessonVideo
                  key={active.id}
                  url={active.videoUrl}
                  title={active.title}
                  lessonId={currentUser ? active.id : undefined}
                  bunnyVideoId={currentUser ? active.bunnyVideoId : undefined}
                  resumeFrom={progress?.position || 0}
                  subtitleUrl={active.subtitleUrl}
                />
              </div>

              <div className="flex flex-col gap-4 rounded-3xl border border-line/80 bg-white/80 p-5 sm:flex-row sm:items-start sm:justify-between dark:border-white/10 dark:bg-white/[0.03]">
                <div className="min-w-0">
                  <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-ember-700 dark:text-ember-300">
                    {index + 1}-dars · {lessonBotCode(active)}
                  </div>
                  <h2 className="mt-1 text-xl font-extrabold text-ink dark:text-white">{active.title}</h2>
                  {active.description ? <p className="mt-2 text-[14px] leading-relaxed text-ink-muted dark:text-stone-400">{active.description}</p> : null}
                  {botUsername ? (
                    <p className="mt-3 text-[12.5px] leading-relaxed text-ink-muted dark:text-stone-400">
                      Telegram botga <b className="font-mono text-ink dark:text-white">{lessonBotCode(active)}</b> kodini yuboring (<b>@{botUsername}</b>).{' '}
                      <a href={`https://t.me/${botUsername}?start=lesson_${encodeURIComponent(lessonBotCode(active))}`} target="_blank" rel="noopener noreferrer" className="font-semibold text-ember-700 underline dark:text-ember-300">Botda ochish</a>
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
                  {done ? (
                    <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 px-4 py-2 text-[13px] font-semibold text-emerald-700 dark:text-emerald-300">
                      <CheckCircle2 className="h-4 w-4" /> Dars tugatildi
                    </span>
                  ) : watched ? (
                    <span className="inline-flex items-center gap-2 rounded-full bg-ink/[0.06] px-4 py-2 text-[13px] font-semibold text-ink dark:bg-white/10 dark:text-white">
                      <PlayCircle className="h-4 w-4" /> Video ko‘rildi
                    </span>
                  ) : (
                    <button
                      onClick={async () => {
                        await api.markLessonWatched(active.id, progress?.position || 0);
                        await refreshDb();
                        setTab('test');
                      }}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-gradient-to-b from-[#ffa149] to-[#f2650f] px-5 text-[14px] font-semibold text-white shadow-[0_14px_30px_-14px_rgba(242,101,15,0.8)]"
                    >
                      <CheckCircle2 className="h-4 w-4" /> Darsni ko‘rib bo‘ldim
                    </button>
                  )}
                  <span className="text-[12px] text-ink-muted dark:text-stone-400">
                    Testdan kamida {active.requiredPassingPercent || 70}% to‘plang
                  </span>
                </div>
              </div>

              <nav className="flex gap-1.5 overflow-x-auto rounded-2xl border border-line/80 bg-white/70 p-1.5 dark:border-white/10 dark:bg-white/[0.03]" aria-label="Dars bo‘limlari">
                {TABS.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    aria-pressed={tab === t.id}
                    className={`shrink-0 rounded-xl px-4 py-2 text-[13px] font-semibold transition-colors ${
                      tab === t.id ? 'bg-ink text-white dark:bg-white dark:text-ink' : 'text-ink-muted hover:bg-ink/[0.05] hover:text-ink dark:text-stone-300 dark:hover:bg-white/10'
                    }`}
                  >
                    {t.label}
                    {t.id === 'test' && !watched && !done ? <Lock className="ml-1.5 inline h-3 w-3" /> : null}
                  </button>
                ))}
              </nav>

              <section className="rounded-3xl border border-line/80 bg-white/80 p-6 dark:border-white/10 dark:bg-white/[0.03]">
                {tab === 'konspekt' ? <KonspektPanel lesson={active} /> : null}
                {tab === 'materiallar' ? <MaterialsPanel lesson={active} /> : null}
                {tab === 'vazifa' ? <HomeworkPanel lesson={active} /> : null}
                {tab === 'test' ? (
                  <LessonTestPanel
                    key={active.id}
                    lesson={active}
                    watched={watched}
                    done={done}
                    nextLesson={nextLesson}
                    onNext={() => {
                      if (nextLesson) {
                        setChosenId(nextLesson.id);
                        setTab('konspekt');
                      }
                    }}
                    onPassed={refreshDb}
                  />
                ) : null}
              </section>
            </>
          )}
        </main>

        <aside className="space-y-2" aria-label="Darslar ro‘yxati">
          {lessons.map((l, i) => {
            const isDone = completed.has(l.id);
            const open = isUnlocked(i);
            const current = l.id === active.id;
            return (
              <button
                key={l.id}
                onClick={() => selectLesson(l, i)}
                disabled={!open}
                aria-current={current ? 'step' : undefined}
                className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                  current ? 'border-ember-500/50 bg-ember-500/10' : 'border-line/80 bg-white/70 hover:border-ink/25 dark:border-white/10 dark:bg-white/[0.03]'
                }`}
              >
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12px] font-bold ${isDone ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300' : 'bg-ink/[0.07] text-ink dark:bg-white/10 dark:text-white'}`}>
                  {isDone ? <CheckCircle2 className="h-4 w-4" /> : !open ? <Lock className="h-3.5 w-3.5" /> : i + 1}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[13.5px] font-semibold text-ink dark:text-white">{l.title}</span>
                  <span className="block text-[11.5px] text-ink-muted dark:text-stone-400">
                    {l.durationMinutes ? `${l.durationMinutes} daq` : ''}
                    {!open ? ' · qulflangan' : isDone ? ' · tugatildi' : ''}
                  </span>
                </span>
              </button>
            );
          })}
        </aside>
      </div>
    </div>
  );
};

const EmptyNote: React.FC<{ text: string }> = ({ text }) => (
  <p className="text-[14px] text-ink-muted dark:text-stone-400">{text}</p>
);

const KonspektPanel: React.FC<{ lesson: Lesson }> = ({ lesson }) => {
  const hasFormula = !!lesson.mathFormula;
  const hasNotes = !!lesson.notesMarkdown?.trim();
  if (!hasFormula && !hasNotes) return <EmptyNote text="Bu dars uchun konspekt hali joylanmagan." />;
  return (
    <div className="space-y-5">
      {hasFormula ? (
        <div>
          <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-ink-muted dark:text-stone-400">Grammatika va lug‘at</div>
          <MathRenderer content={lesson.mathFormula || ''} block />
        </div>
      ) : null}
      {hasNotes ? (
        <div className="text-[14.5px] leading-relaxed text-ink dark:text-stone-200">
          <MathRenderer content={lesson.notesMarkdown || ''} />
        </div>
      ) : null}
    </div>
  );
};

const MaterialsPanel: React.FC<{ lesson: Lesson }> = ({ lesson }) => {
  const links = [
    ...(lesson.pdfUrl ? [{ title: 'PDF konspekt', url: lesson.pdfUrl }] : []),
    ...(lesson.resources || []).filter((r) => r.url)
  ];
  if (links.length === 0) return <EmptyNote text="Bu darsda foydalanilgan materiallar hali qo‘shilmagan." />;
  return (
    <ul className="space-y-2">
      {links.map((l) => (
        <li key={l.url}>
          <a href={l.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between gap-3 rounded-2xl border border-line/80 bg-white/70 px-4 py-3 text-[14px] font-semibold text-ink hover:border-ink/25 dark:border-white/10 dark:bg-white/[0.03] dark:text-white">
            <span className="flex min-w-0 items-center gap-2">
              <FileText className="h-4 w-4 shrink-0 text-ember-600" />
              <span className="truncate">{l.title}</span>
            </span>
            <span className="text-[12px] text-ink-muted">Ochish ↗</span>
          </a>
        </li>
      ))}
    </ul>
  );
};

const HomeworkPanel: React.FC<{ lesson: Lesson }> = ({ lesson }) => {
  if (!lesson.homework?.trim()) return <EmptyNote text="Bu dars uchun vazifa qo‘shilmagan." />;
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-[13px] font-semibold text-ink-muted dark:text-stone-400">
        <Target className="h-4 w-4 text-ember-600" /> Uyga vazifa
      </div>
      <p className="whitespace-pre-line text-[14.5px] leading-relaxed text-ink dark:text-stone-200">{lesson.homework}</p>
    </div>
  );
};

const LessonTestPanel: React.FC<{
  lesson: Lesson;
  watched: boolean;
  done: boolean;
  nextLesson?: Lesson;
  onNext: () => void;
  onPassed: () => Promise<void> | void;
}> = ({ lesson, watched, done, nextLesson, onNext, onPassed }) => {
  const { db } = useApp();
  const questions: Question[] = useMemo(
    () => (lesson.testId ? db.questions.filter((q) => q.testId === lesson.testId) : []),
    [db.questions, lesson.testId]
  );
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<null | {
    percent: number;
    passed: boolean;
    requiredPercent: number;
    correct: number;
    total: number;
    results: Array<{ questionId: string; correct: boolean; given: number | null; expected: number | null; explanation: string }>;
  }>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (!watched && !done) {
    return <EmptyNote text="Avval videoni ko‘ring, so‘ng “Darsni ko‘rib bo‘ldim” tugmasini bosing. Shundan keyin test ochiladi." />;
  }
  if (questions.length === 0) {
    return <EmptyNote text="Bu dars uchun test hali tayyorlanmagan. Ustoz test tuzgach, shu yerda chiqadi." />;
  }

  const unanswered = questions.filter((q) => answers[q.id] === undefined).length;

  const submit = async () => {
    if (unanswered > 0) {
      setError(`Hali javob berilmagan savollar bor: ${unanswered} ta.`);
      return;
    }
    setBusy(true);
    setError('');
    try {
      const res = await api.submitLessonQuiz(lesson.id, answers);
      if (!res.success) {
        setError(res.message || 'Testni topshirib bo‘lmadi.');
        return;
      }
      setResult(res);
      await onPassed();
    } catch {
      setError('Server bilan bog‘lanib bo‘lmadi.');
    } finally {
      setBusy(false);
    }
  };

  const retry = () => {
    setAnswers({});
    setResult(null);
    setError('');
  };

  if (result) {
    return (
      <div className="space-y-6">
        <div className={`rounded-2xl p-5 ${result.passed ? 'bg-emerald-500/10' : 'bg-rose-500/10'}`}>
          <div className="text-[13px] font-semibold text-ink-muted dark:text-stone-400">Natija</div>
          <div className="mt-1 text-3xl font-extrabold text-ink dark:text-white">
            {result.percent}% <span className="text-[15px] font-semibold text-ink-muted">({result.correct} / {result.total})</span>
          </div>
          <p className={`mt-2 text-[14px] font-semibold ${result.passed ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}`}>
            {result.passed ? 'Tabriklaymiz! Dars tugatildi.' : `O‘tish uchun kamida ${result.requiredPercent}% kerak. Qayta urinib ko‘ring.`}
          </p>
        </div>
        <ol className="space-y-3">
          {questions.map((q, i) => {
            const r = result.results.find((x) => x.questionId === q.id);
            return (
              <li key={q.id} className="rounded-2xl border border-line/70 p-4 dark:border-white/10">
                <div className="text-[14px] font-semibold text-ink dark:text-white">
                  {i + 1}. {q.prompt}
                </div>
                <div className={`mt-1 text-[13px] font-semibold ${r?.correct ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}`}>
                  {r?.correct ? 'To‘g‘ri' : 'Noto‘g‘ri'}
                  {!r?.correct && r?.expected !== null && r?.expected !== undefined ? ` · to‘g‘ri javob: ${q.options[r.expected]}` : ''}
                </div>
                {r?.explanation ? <div className="mt-1 text-[13px] text-ink-muted dark:text-stone-400">{r.explanation}</div> : null}
              </li>
            );
          })}
        </ol>
        <div className="flex flex-wrap gap-2">
          {!result.passed ? (
            <button onClick={retry} className="rounded-full border border-line/80 px-5 py-2.5 text-[13px] font-semibold text-ink dark:border-white/10 dark:text-white">
              Qayta topshirish
            </button>
          ) : nextLesson ? (
            <button onClick={onNext} className="rounded-full bg-ink px-5 py-2.5 text-[13px] font-semibold text-white dark:bg-white dark:text-ink">
              Keyingi darsga o‘tish
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {questions.map((q, i) => (
        <fieldset key={q.id} className="space-y-2">
          <legend className="text-[14.5px] font-semibold text-ink dark:text-white">
            {i + 1}. {q.prompt}
          </legend>
          <div className="grid gap-2">
            {q.options.map((opt, oi) => (
              <label key={oi} className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-2.5 text-[14px] transition-colors ${answers[q.id] === oi ? 'border-ember-500/60 bg-ember-500/10' : 'border-line/80 hover:border-ink/25 dark:border-white/10'}`}>
                <input type="radio" name={q.id} checked={answers[q.id] === oi} onChange={() => setAnswers((a) => ({ ...a, [q.id]: oi }))} className="sr-only" />
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-line text-[11px] font-bold">{String.fromCharCode(65 + oi)}</span>
                <span className="text-ink dark:text-stone-200">{opt}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ))}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-[13px] text-ink-muted dark:text-stone-400">{unanswered > 0 ? `${unanswered} ta savolga hali javob berilmagan` : 'Hammasiga javob berildi'}</span>
        <button onClick={submit} disabled={busy} className="inline-flex h-12 items-center justify-center rounded-full bg-gradient-to-b from-[#ffa149] to-[#f2650f] px-7 text-[14px] font-semibold text-white disabled:opacity-60">
          Testni topshirish
        </button>
      </div>
      {error ? <p role="alert" className="text-[13px] text-rose-700 dark:text-rose-300">{error}</p> : null}
    </div>
  );
};
