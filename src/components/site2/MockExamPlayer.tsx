import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { MathRenderer } from '../common/MathRenderer';
import { Flag, CheckCircle2, ArrowRight, ArrowLeft, ListChecks, Check, X } from 'lucide-react';
import { ExamShell, formatClock } from './ExamShell';
import { cn } from '../ui/styles';
import confetti from 'canvas-confetti';
import { useExamSession, reviewMap, ExamReviewItem, ExamResultSummary } from '../../lib/exam/useExamSession';

interface MockExamPlayerProps {
  testId: string;
  onClose: () => void;
}

/** Guards access: a student can only take tests of their own learning track. */
export const MockExamPlayer: React.FC<MockExamPlayerProps> = ({ testId, onClose }) => {
  const { db, currentUser } = useApp();
  const test = db.tests.find((t) => t.id === testId);
  const foreign = !!(test && currentUser && test.track && test.track !== (currentUser.track || 'ielts'));
  if (!test || foreign) {
    return (
      <div className="glass-premium mx-auto mt-6 max-w-xl rounded-[28px] p-8 text-center">
        <div className="font-display text-[20px] font-extrabold text-ink dark:text-white">
          {test ? 'Bu test boshqa yo‘nalish uchun' : 'Test topilmadi'}
        </div>
        <p className="mt-2 text-[14px] text-ink-muted dark:text-stone-400">
          {test ? 'Kabinetingizda faqat o‘z yo‘nalishingiz testlari ochiladi.' : 'Test o‘chirilgan yoki hali joylanmagan.'}
        </p>
        <button
          onClick={onClose}
          className="mt-6 inline-flex h-11 items-center rounded-full bg-gradient-to-b from-[#ffa149] to-[#f2650f] px-6 text-[14px] font-semibold text-white"
        >
          Orqaga
        </button>
      </div>
    );
  }
  return <MockExamInner testId={test.id} onClose={onClose} />;
};

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

const MockExamInner: React.FC<MockExamPlayerProps> = ({ testId, onClose }) => {
  const { db, currentUser, refreshDb } = useApp();
  const test = db.tests.find((t) => t.id === testId)!;
  const questions = useMemo(() => db.questions.filter((q) => q.testId === test.id), [db.questions, test.id]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [flagged, setFlagged] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [agree, setAgree] = useState(false);
  const [textScale, setTextScale] = useState(1);
  const [resultAttempt, setResultAttempt] = useState<any>(null);
  const [review, setReview] = useState<Record<string, ExamReviewItem>>({});
  const [summary, setSummary] = useState<ExamResultSummary | null>(null);
  const [onlyWrong, setOnlyWrong] = useState(false);
  const submittingRef = React.useRef(false);

  const exam = useExamSession(test.id, { onExpire: () => handleSubmitTest() });
  const answers = exam.answers as Record<string, number>;
  const started = exam.status === 'active' || exam.status === 'submitting';
  const answeredCount = questions.filter((q) => answers[q.id] !== undefined).length;
  const flaggedCount = questions.filter((q) => flagged[q.id]).length;
  const currentQ = questions[currentIndex];

  // Flags survive reloads for the same session
  useEffect(() => {
    if (!exam.sessionId) return;
    try {
      const raw = localStorage.getItem(`examflags:${exam.sessionId}`);
      if (raw) setFlagged(JSON.parse(raw));
    } catch {}
  }, [exam.sessionId]);
  useEffect(() => {
    if (!exam.sessionId) return;
    try {
      localStorage.setItem(`examflags:${exam.sessionId}`, JSON.stringify(flagged));
    } catch {}
  }, [flagged, exam.sessionId]);

  const select = (optIdx: number) => {
    if (resultAttempt || !started || !currentQ) return;
    exam.setAnswer(currentQ.id, optIdx);
  };
  const toggleFlag = (qId: string) => setFlagged((prev) => ({ ...prev, [qId]: !prev[qId] }));
  const go = (i: number) => {
    setShowReview(false);
    setCurrentIndex(Math.max(0, Math.min(questions.length - 1, i)));
  };

  // Keyboard: A–D / 1–4 choose, ← → move, F flag
  useEffect(() => {
    if (!started || showReview) return;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el && /input|textarea|select/i.test(el.tagName)) return;
      const k = e.key.toLowerCase();
      const idx = 'abcdef'.indexOf(k) >= 0 ? 'abcdef'.indexOf(k) : '123456'.indexOf(k);
      if (idx >= 0 && currentQ && idx < currentQ.options.length) select(idx);
      else if (e.key === 'ArrowRight') go(currentIndex + 1);
      else if (e.key === 'ArrowLeft') go(currentIndex - 1);
      else if (k === 'f' && currentQ) toggleFlag(currentQ.id);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, showReview, currentIndex, currentQ?.id]);

  async function handleSubmitTest() {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      const res = await exam.submit();
      if (res?.attempt) {
        setResultAttempt(res.attempt);
        setReview(reviewMap(res.review));
        setSummary(res.result);
        setShowReview(false);
        refreshDb();
        try {
          if ((res.attempt.score / Math.max(1, res.attempt.maxScore)) >= 0.7) confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
        } catch {}
      } else {
        submittingRef.current = false;
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!test || questions.length === 0) {
    return (
      <div className="mx-auto max-w-xl rounded-[28px] border border-line bg-white p-8 text-center dark:border-white/10 dark:bg-white/[0.03]">
        <p className="mb-4 text-[14px] text-ink-muted dark:text-stone-400">Ushbu test uchun hozircha savollar joylanmagan.</p>
        <button onClick={onClose} className="inline-flex h-10 items-center rounded-full bg-ink px-5 text-[13px] font-semibold text-white dark:bg-white dark:text-ink">
          Orqaga
        </button>
      </div>
    );
  }

  /* ----------------------------- Results ----------------------------- */
  if (resultAttempt) {
    const pct = Math.round((resultAttempt.score / Math.max(1, resultAttempt.maxScore)) * 100);
    const list = questions.map((q, idx) => ({ q, idx, r: review[q.id] })).filter((x) => !onlyWrong || !x.r?.isCorrect);
    const R = 52;
    const C = 2 * Math.PI * R;
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <section className="rounded-[28px] border border-line/80 bg-white p-6 sm:p-9 dark:border-white/[0.08] dark:bg-white/[0.03]">
          <div className="flex flex-col items-center gap-7 sm:flex-row sm:items-center">
            <div className="relative h-[132px] w-[132px] shrink-0">
              <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
                <circle cx="60" cy="60" r={R} fill="none" strokeWidth="9" className="stroke-ink/[0.07] dark:stroke-white/10" />
                <circle cx="60" cy="60" r={R} fill="none" strokeWidth="9" strokeLinecap="round" stroke="url(#mx-g)" strokeDasharray={C} strokeDashoffset={C - (C * pct) / 100} style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(.22,1,.36,1)' }} />
                <defs>
                  <linearGradient id="mx-g" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#ffb45c" />
                    <stop offset="100%" stopColor="#ef6c12" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-display text-[30px] font-extrabold tabular-nums tracking-[-0.03em] text-ink dark:text-white">{pct}%</span>
                <span className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink-muted dark:text-stone-500">natija</span>
              </div>
            </div>
            <div className="min-w-0 flex-1 text-center sm:text-left">
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted dark:text-stone-500">Imtihon yakunlandi</span>
              <h2 className="mt-1 font-display text-[clamp(1.4rem,2.6vw,1.9rem)] font-extrabold tracking-[-0.03em] text-ink dark:text-white">{test.title}</h2>
              <p className="mt-1 text-[12.5px] text-ink-muted dark:text-stone-400">
                {currentUser ? 'Natija kabinetingizga saqlandi.' : 'Natijani saqlash uchun ro‘yxatdan o‘ting.'} {summary?.scaleNote || ''}
              </p>
              <div className="mt-5 grid grid-cols-3 gap-2">
                {[
                  { v: `${resultAttempt.score}${summary?.maxScore ? ' / ' + summary.maxScore : ''}`, l: summary?.band ? `Band ${summary.band}` : summary?.cefrLevel ? `CEFR ${summary.cefrLevel}` : 'Ball' },
                  { v: `${resultAttempt.correctCount} / ${resultAttempt.totalQuestions}`, l: 'To‘g‘ri' },
                  { v: formatClock(resultAttempt.timeSpentSeconds || 0), l: 'Vaqt' }
                ].map((x) => (
                  <div key={x.l} className="rounded-2xl bg-[#f6f4f0] px-3 py-3 dark:bg-white/[0.05]">
                    <div className="font-display text-[17px] font-extrabold tabular-nums text-ink sm:text-[19px] dark:text-white">{x.v}</div>
                    <div className="text-[11px] text-ink-muted dark:text-stone-400">{x.l}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-display text-[17px] font-bold text-ink dark:text-white">Savollar tahlili</h3>
          <div className="inline-flex rounded-full border border-line bg-white p-1 dark:border-white/10 dark:bg-white/[0.04]">
            {[
              { v: false, l: `Hammasi (${questions.length})` },
              { v: true, l: `Xatolar (${questions.length - resultAttempt.correctCount})` }
            ].map((o) => (
              <button
                key={o.l}
                onClick={() => setOnlyWrong(o.v)}
                className={cn('h-8 rounded-full px-3.5 text-[12px] font-semibold', onlyWrong === o.v ? 'bg-ink text-white dark:bg-white dark:text-ink' : 'text-ink-muted dark:text-stone-400')}
              >
                {o.l}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {list.map(({ q, idx, r }) => {
            const userAnswer = answers[q.id];
            const ok = !!r?.isCorrect;
            return (
              <article key={q.id} className="rounded-[22px] border border-line/80 bg-white p-5 dark:border-white/[0.08] dark:bg-white/[0.03]">
                <div className="mb-2 flex items-center gap-2 text-[12px]">
                  <span className={cn('flex h-6 w-6 items-center justify-center rounded-full text-white', ok ? 'bg-emerald-600' : 'bg-rose-600')}>
                    {ok ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                  </span>
                  <span className="font-semibold text-ink dark:text-white">{idx + 1}-savol</span>
                  {userAnswer === undefined ? <span className="text-ink-muted dark:text-stone-500">· javob berilmagan</span> : null}
                </div>
                <div className="text-[14px] font-medium leading-relaxed text-ink dark:text-white">
                  <MathRenderer content={q.prompt} />
                </div>
                {q.mathFormula ? (
                  <div className="my-2 rounded-xl bg-[#f6f4f0] p-2.5 text-center dark:bg-white/[0.05]">
                    <MathRenderer content={q.mathFormula} block />
                  </div>
                ) : null}
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {q.options.map((opt, oIdx) => {
                    const right = r?.correctAnswerIndex === oIdx;
                    const mine = userAnswer === oIdx;
                    return (
                      <div
                        key={oIdx}
                        className={cn(
                          'flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-[12.5px]',
                          right
                            ? 'border-emerald-500/50 bg-emerald-500/[0.08] font-semibold text-emerald-900 dark:text-emerald-200'
                            : mine
                              ? 'border-rose-500/50 bg-rose-500/[0.07] text-rose-900 dark:text-rose-200'
                              : 'border-line/70 text-ink-muted dark:border-white/[0.07] dark:text-stone-400'
                        )}
                      >
                        <span className="font-bold">{LETTERS[oIdx]}</span>
                        <MathRenderer content={opt} />
                        {mine ? <span className="ml-auto text-[10.5px] font-semibold opacity-70">sizning javob</span> : null}
                      </div>
                    );
                  })}
                </div>
                {r?.explanation ? (
                  <p className="mt-3 rounded-xl bg-[#f6f4f0] px-3.5 py-2.5 text-[12.5px] leading-relaxed text-ink-soft dark:bg-white/[0.04] dark:text-stone-300">
                    <span className="font-semibold text-ember-700 dark:text-ember-400">Izoh: </span>
                    <MathRenderer content={r.explanation} />
                  </p>
                ) : null}
              </article>
            );
          })}
        </div>

        <div className="flex justify-center pb-4">
          <button onClick={onClose} className="inline-flex h-12 items-center gap-2 rounded-full bg-ink px-7 text-[14px] font-semibold text-white dark:bg-white dark:text-ink">
            Kabinetga qaytish <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  /* --------------------------- Instructions --------------------------- */
  if (!started) {
    return (
      <div className="mx-auto max-w-3xl overflow-hidden rounded-[28px] border border-line/80 bg-white dark:border-white/[0.08] dark:bg-white/[0.03]">
        <div className="border-b border-line/80 px-6 py-5 sm:px-9 dark:border-white/[0.08]">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ember-700 dark:text-ember-400">{(test.track || 'mock').toUpperCase()} · Imtihon ko‘rsatmalari</span>
          <h2 className="mt-2 font-display text-[clamp(1.5rem,3vw,2rem)] font-extrabold leading-tight tracking-[-0.03em] text-ink dark:text-white">{test.title}</h2>
          {test.description ? <p className="mt-2 text-[14px] leading-relaxed text-ink-muted dark:text-stone-400">{test.description}</p> : null}
        </div>
        <div className="grid gap-px bg-line/80 sm:grid-cols-3 dark:bg-white/[0.08]">
          {[
            { l: 'Nomzod', v: currentUser ? `${currentUser.name} ${currentUser.surname || ''}`.trim() : 'Mehmon' },
            { l: 'Savollar', v: `${questions.length} ta` },
            { l: 'Vaqt', v: `${test.durationMinutes || 45} daqiqa` }
          ].map((x) => (
            <div key={x.l} className="bg-white px-6 py-4 sm:px-9 dark:bg-[#121110]">
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-muted dark:text-stone-500">{x.l}</div>
              <div className="mt-1 truncate text-[15px] font-semibold text-ink dark:text-white">{x.v}</div>
            </div>
          ))}
        </div>
        <div className="px-6 py-6 sm:px-9">
          <ol className="space-y-2.5 text-[13.5px] leading-relaxed text-ink-soft dark:text-stone-300">
            {[
              'Imtihon to‘liq ekranda ochiladi. Vaqt serverda hisoblanadi: sahifa yangilansa ham to‘xtamaydi.',
              'Har bir savolga bitta javob tanlang. Javoblar avtomatik saqlanadi.',
              'Ishonchingiz komil bo‘lmagan savolni bayroqcha bilan belgilang va keyin qayting.',
              'Vaqt tugaganda imtihon avtomatik topshiriladi. 10, 5 va 1 daqiqa qolganda ogohlantiriladi.',
              'Klaviatura: A–D javob, ← → savollar, F belgilash.'
            ].map((t, i) => (
              <li key={i} className="flex gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ink/[0.06] text-[11px] font-bold text-ink-muted dark:bg-white/10 dark:text-stone-300">{i + 1}</span>
                {t}
              </li>
            ))}
          </ol>
          <label className="mt-6 flex cursor-pointer items-center gap-3 rounded-2xl border border-line px-4 py-3 text-[13.5px] font-medium text-ink dark:border-white/10 dark:text-white">
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="h-4 w-4 accent-[#ef6c12]" />
            Ko‘rsatmalarni o‘qidim va imtihonga tayyorman
          </label>
          {exam.error ? <p className="mt-4 rounded-2xl bg-rose-500/10 p-3 text-[13px] text-rose-700 dark:text-rose-300">{exam.error}</p> : null}
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={() => exam.start(!currentUser)}
              disabled={!agree || exam.status === 'starting'}
              className="inline-flex h-12 items-center gap-2 rounded-full bg-gradient-to-b from-[#ffa149] to-[#f2650f] px-7 text-[15px] font-semibold text-white shadow-[0_16px_36px_-14px_rgba(242,101,15,0.8)] transition-opacity disabled:opacity-45"
            >
              {exam.status === 'starting' ? 'Tayyorlanmoqda…' : 'Imtihonni boshlash'} <ArrowRight className="h-4 w-4" />
            </button>
            <button onClick={onClose} className="inline-flex h-12 items-center rounded-full border border-line px-6 text-[14px] font-semibold text-ink dark:border-white/15 dark:text-white">
              Orqaga
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ----------------------------- Exam mode ----------------------------- */
  const footer = (
    <div className="flex items-center gap-2 px-2 py-2 sm:gap-3 sm:px-4">
      <button onClick={() => go(currentIndex - 1)} disabled={currentIndex === 0 || showReview} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line disabled:opacity-35 dark:border-white/10" aria-label="Oldingi savol">
        <ArrowLeft className="h-4 w-4" />
      </button>
      <div className="no-scrollbar flex min-w-0 flex-1 gap-1.5 overflow-x-auto py-1">
        {questions.map((q, idx) => {
          const done = answers[q.id] !== undefined;
          const cur = idx === currentIndex && !showReview;
          return (
            <button
              key={q.id}
              onClick={() => go(idx)}
              aria-label={`${idx + 1}-savol${done ? ', javob berilgan' : ''}${flagged[q.id] ? ', belgilangan' : ''}`}
              className={cn(
                'relative flex h-9 min-w-9 shrink-0 items-center justify-center rounded-lg border px-1 text-[12.5px] font-semibold tabular-nums transition-colors',
                cur ? 'border-ink bg-ink text-white dark:border-white dark:bg-white dark:text-ink' : done ? 'border-ink/25 bg-ink/[0.07] text-ink dark:border-white/25 dark:bg-white/10 dark:text-white' : 'border-line text-ink-muted hover:border-ink/30 dark:border-white/10 dark:text-stone-400'
              )}
            >
              {idx + 1}
              {flagged[q.id] ? <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-ember-500 dark:border-[#141210]" /> : null}
            </button>
          );
        })}
      </div>
      <button
        onClick={() => setShowReview((v) => !v)}
        className={cn('hidden h-10 shrink-0 items-center gap-1.5 rounded-full border px-4 text-[12.5px] font-semibold sm:inline-flex', showReview ? 'border-ink bg-ink text-white dark:border-white dark:bg-white dark:text-ink' : 'border-line dark:border-white/10')}
      >
        <ListChecks className="h-4 w-4" /> Ko‘rib chiqish
      </button>
      <button onClick={() => go(currentIndex + 1)} disabled={currentIndex === questions.length - 1 || showReview} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink text-white disabled:opacity-35 dark:bg-white dark:text-ink" aria-label="Keyingi savol">
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );

  return (
    <ExamShell
      title={test.title}
      kind={`${(test.track || '').toUpperCase()} mock · ${answeredCount}/${questions.length} javob`}
      candidate={currentUser ? `${currentUser.name} ${currentUser.surname || ''}`.trim() : 'Mehmon'}
      secondsLeft={exam.secondsLeft}
      saveState={exam.saveState}
      onFinish={() => setShowReview(true)}
      finishLabel="Topshirish"
      onExit={onClose}
      footer={footer}
      textScale={textScale}
      onTextScale={setTextScale}
    >
      {showReview ? (
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
          <h2 className="font-display text-[1.6em] font-extrabold tracking-[-0.03em]">Topshirishdan oldin ko‘rib chiqing</h2>
          <p className="mt-1 text-[0.85em] text-ink-muted dark:text-stone-400">
            {answeredCount} ta javob berilgan · {questions.length - answeredCount} ta bo‘sh · {flaggedCount} ta belgilangan. Savolga o‘tish uchun raqamni bosing.
          </p>
          <div className="mt-6 grid grid-cols-5 gap-2 sm:grid-cols-8 md:grid-cols-10">
            {questions.map((q, idx) => {
              const done = answers[q.id] !== undefined;
              return (
                <button
                  key={q.id}
                  onClick={() => go(idx)}
                  className={cn(
                    'relative flex h-12 flex-col items-center justify-center rounded-xl border text-[13px] font-semibold tabular-nums',
                    done ? 'border-emerald-500/40 bg-emerald-500/[0.08] text-emerald-800 dark:text-emerald-300' : 'border-dashed border-rose-400/60 text-rose-700 dark:text-rose-300'
                  )}
                >
                  {idx + 1}
                  <span className="text-[9.5px] font-medium opacity-70">{done ? LETTERS[answers[q.id]] : '—'}</span>
                  {flagged[q.id] ? <Flag className="absolute right-1 top-1 h-3 w-3 text-ember-600" /> : null}
                </button>
              );
            })}
          </div>
          {exam.error ? <p className="mt-5 rounded-2xl bg-rose-500/10 p-3 text-[13px] text-rose-700 dark:text-rose-300">{exam.error}</p> : null}
          <div className="mt-8 flex flex-wrap gap-3">
            <button onClick={handleSubmitTest} disabled={isSubmitting} className="inline-flex h-12 items-center gap-2 rounded-full bg-gradient-to-b from-[#ffa149] to-[#f2650f] px-7 text-[15px] font-semibold text-white disabled:opacity-50">
              <CheckCircle2 className="h-4 w-4" /> {isSubmitting ? 'Topshirilmoqda…' : 'Imtihonni topshirish'}
            </button>
            <button onClick={() => setShowReview(false)} className="inline-flex h-12 items-center rounded-full border border-line px-6 text-[14px] font-semibold dark:border-white/15">
              Imtihonga qaytish
            </button>
          </div>
          <p className="mt-4 text-[12px] text-ink-muted dark:text-stone-500">Topshirgandan keyin javoblarni o‘zgartirib bo‘lmaydi.</p>
        </div>
      ) : (
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
          <div className="mb-5 flex items-center justify-between gap-3">
            <span className="text-[0.8em] font-semibold uppercase tracking-[0.12em] text-ink-muted dark:text-stone-400">
              Savol {currentIndex + 1} / {questions.length}
            </span>
            <button
              onClick={() => toggleFlag(currentQ.id)}
              aria-pressed={!!flagged[currentQ.id]}
              className={cn(
                'inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-[0.8em] font-semibold transition-colors',
                flagged[currentQ.id] ? 'border-ember-500/50 bg-ember-500/10 text-ember-700 dark:text-ember-300' : 'border-line text-ink-muted hover:text-ink dark:border-white/10 dark:text-stone-400 dark:hover:text-white'
              )}
            >
              <Flag className="h-3.5 w-3.5" /> {flagged[currentQ.id] ? 'Belgilangan' : 'Belgilash'}
            </button>
          </div>
          <div className="text-[1.15em] font-semibold leading-[1.6] text-ink dark:text-white">
            <MathRenderer content={currentQ.prompt} />
          </div>
          {currentQ.mathFormula ? (
            <div className="my-5 rounded-2xl border border-line bg-white p-4 text-center dark:border-white/10 dark:bg-white/[0.04]">
              <MathRenderer content={currentQ.mathFormula} block />
            </div>
          ) : null}
          <div className="mt-7 space-y-2.5" role="radiogroup" aria-label={`${currentIndex + 1}-savol javoblari`}>
            {currentQ.options.map((opt, oIdx) => {
              const on = answers[currentQ.id] === oIdx;
              return (
                <button
                  key={oIdx}
                  role="radio"
                  aria-checked={on}
                  onClick={() => select(oIdx)}
                  className={cn(
                    'flex w-full items-center gap-4 rounded-2xl border bg-white px-4 py-3.5 text-left text-[0.95em] transition-all dark:bg-white/[0.03]',
                    on ? 'border-ink ring-1 ring-ink dark:border-white dark:ring-white' : 'border-line hover:border-ink/35 dark:border-white/10 dark:hover:border-white/30'
                  )}
                >
                  <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-[0.8em] font-bold', on ? 'border-ink bg-ink text-white dark:border-white dark:bg-white dark:text-ink' : 'border-line text-ink-muted dark:border-white/15 dark:text-stone-400')}>
                    {LETTERS[oIdx]}
                  </span>
                  <span className="min-w-0 flex-1 text-ink dark:text-stone-100">
                    <MathRenderer content={opt} />
                  </span>
                </button>
              );
            })}
          </div>
          <div className="mt-8 flex items-center justify-between gap-3">
            <button onClick={() => go(currentIndex - 1)} disabled={currentIndex === 0} className="inline-flex h-11 items-center gap-1.5 rounded-full border border-line px-5 text-[0.85em] font-semibold disabled:opacity-35 dark:border-white/10">
              <ArrowLeft className="h-4 w-4" /> Oldingi
            </button>
            {currentIndex < questions.length - 1 ? (
              <button onClick={() => go(currentIndex + 1)} className="inline-flex h-11 items-center gap-1.5 rounded-full bg-ink px-5 text-[0.85em] font-semibold text-white dark:bg-white dark:text-ink">
                Keyingi <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button onClick={() => setShowReview(true)} className="inline-flex h-11 items-center gap-1.5 rounded-full bg-gradient-to-b from-[#ffa149] to-[#f2650f] px-5 text-[0.85em] font-semibold text-white">
                Ko‘rib chiqish <ListChecks className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      )}
    </ExamShell>
  );
};
