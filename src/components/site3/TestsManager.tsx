import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { MathRenderer } from '../common/MathRenderer';
import { Test, Question, TestType, VIPTier } from '../../types';
import { Plus, Trash2, Award, X, HelpCircle, CheckCircle2, SlidersHorizontal, Sparkles, Copy } from 'lucide-react';
import { Glass, Button, Pill } from '../ui';
import { Reveal } from '../ui/motion-primitives';
import { field, label, cn } from '../ui/styles';
import { AiQuickMock } from './AiQuickMock';
import { QuestionImport } from './QuestionImport';

export const TestsManager: React.FC = () => {
  const { db, createTest, updateTest, deleteTest, createQuestion, deleteQuestion } = useApp();

  const [selectedTrack, setSelectedTrack] = useState<'cefr' | 'general' | 'ielts'>('cefr');
  const [selectedTestId, setSelectedTestId] = useState<string>(db.tests[0]?.id || '');
  const [showTestModal, setShowTestModal] = useState(false);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [showImport, setShowImport] = useState(false);

  // New Test form
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [type, setType] = useState<TestType>('mock');
  const [duration, setDuration] = useState(60);
  const [maxScore, setMaxScore] = useState(75);
  const [vipTier, setVipTier] = useState<VIPTier>('start');

  // New Question form
  const [prompt, setPrompt] = useState('');
  const [formula, setFormula] = useState('');
  const [optA, setOptA] = useState('');
  const [optB, setOptB] = useState('');
  const [optC, setOptC] = useState('');
  const [optD, setOptD] = useState('');
  const [correctIdx, setCorrectIdx] = useState(0);
  const [explanation, setExplanation] = useState('');

  // Filter tests by selected track
  const trackTests = db.tests.filter(t => (t.track || 'ielts') === selectedTrack);
  const activeTest = trackTests.find(t => t.id === selectedTestId) || trackTests[0];
  const activeQuestions = db.questions.filter(q => q.testId === activeTest?.id);

  const handleCreateTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;

    await createTest({
      title,
      description: desc,
      type,
      durationMinutes: duration,
      maxScore,
      requiredVIP: vipTier,
      published: true,
      track: selectedTrack
    });
    setShowTestModal(false);
    setTitle('');
    setDesc('');
  };

  const handleCreateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTest || !prompt || !optA || !optB) return;

    await createQuestion({
      testId: activeTest.id,
      prompt,
      mathFormula: formula,
      options: [optA, optB, optC || 'Variant C', optD || 'Variant D'],
      correctAnswerIndex: correctIdx,
      explanation,
      difficulty: 'medium'
    });

    setShowQuestionModal(false);
    setPrompt('');
    setFormula('');
    setOptA('');
    setOptB('');
    setOptC('');
    setOptD('');
    setExplanation('');
  };

  const tracks = [
    { id: 'cefr' as const, label: 'Cefr multilevel', count: db.tests.filter(t => t.track === 'cefr').length },
    { id: 'general' as const, label: 'General english', count: db.tests.filter(t => t.track === 'general').length },
    { id: 'ielts' as const, label: 'Ielts', count: db.tests.filter(t => (t.track || 'ielts') === 'ielts').length }
  ];

  return (
    <div className="space-y-7">
      {/* Header */}
      <Reveal>
        <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <Pill tone="ember">
              <Award className="h-3 w-3" />
              Testlar &amp; Sinovlar
            </Pill>
            <h1 className="mt-4 font-display text-[clamp(1.6rem,3.2vw,2.25rem)] font-extrabold leading-[1.07] tracking-[-0.035em] text-ink text-balance dark:text-white">
              Testlar va Sinovlar Konstruktori
            </h1>
            <p className="mt-2 text-[13.5px] leading-relaxed text-ink-muted dark:text-stone-400">
              Milliy sertifikat mock imtihonlari va mavzuli quizlarni qo‘shish, tahrirlash hamda savollar banki
            </p>
          </div>

          <Button
            variant="ember"
            size="md"
            onClick={() => setShowTestModal(true)}
            className="shrink-0 self-start sm:self-end"
            iconLeft={<Plus className="h-4 w-4" />}
          >
            Yangi Test Qo‘shish
          </Button>
        </header>
      </Reveal>

      <Reveal delay={40}>
        <AiQuickMock track={selectedTrack} onCreated={(id) => setSelectedTestId(id)} />
      </Reveal>

      {/* Track segmented control */}
      <Reveal delay={60}>
        <div className="glass-1 inline-flex w-full flex-col gap-1 rounded-[1.25rem] p-1.5 sm:w-auto sm:flex-row">
          {tracks.map(track => {
            const isActive = selectedTrack === track.id;
            return (
              <button
                key={track.id}
                onClick={() => {
                  setSelectedTrack(track.id as any);
                  const matching = db.tests.filter(t => (t.track || 'ielts') === track.id);
                  if (matching.length > 0) setSelectedTestId(matching[0].id);
                }}
                className={cn(
                  'inline-flex flex-1 items-center justify-center gap-2 rounded-[0.9rem] px-4 py-2.5 text-[11.5px] font-extrabold transition-all duration-200',
                  isActive
                    ? 'bg-ink text-white shadow-[0_10px_22px_-12px_rgba(18,16,14,0.7)] dark:bg-white dark:text-ink'
                    : 'text-ink-muted hover:text-ink dark:text-stone-400 dark:hover:text-white'
                )}
              >
                <span className="capitalize">{track.label}</span>
                <span
                  className={cn(
                    'rounded-full px-1.5 py-0.5 font-mono text-[9.5px] tabular-nums',
                    isActive
                      ? 'bg-white/15 text-white dark:bg-ink/10 dark:text-ink'
                      : 'bg-ink/[0.05] text-ink-muted dark:bg-white/[0.07] dark:text-stone-400'
                  )}
                >
                  {track.count}
                </span>
              </button>
            );
          })}
        </div>
      </Reveal>

      {/* Test selector */}
      <Reveal delay={85}>
        <div className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-1">
          {trackTests.map(test => {
            const isActive = test.id === activeTest?.id;
            return (
              <div
                key={test.id}
                className={cn(
                  'flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full border px-1 py-1 pl-3.5 text-[11.5px] font-semibold transition-all duration-200',
                  isActive
                    ? 'border-ember-500/40 bg-ember-500/[0.08] text-ember-800 dark:text-ember-200'
                    : 'border-line/70 bg-white/50 text-ink-muted hover:border-ember-500/30 hover:text-ink dark:border-white/10 dark:bg-white/[0.04] dark:text-stone-400 dark:hover:text-white'
                )}
              >
                <button onClick={() => setSelectedTestId(test.id)} className="max-w-[260px] truncate">
                  {test.title}
                </button>
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    // Copy the test and all its questions as a draft, so a variant can be edited without touching the original.
                    const qs = db.questions.filter((q) => q.testId === test.id);
                    const copy = await createTest({ ...test, id: undefined, title: `${test.title} (nusxa)`, published: false } as Partial<Test>);
                    const newId = copy?.test?.id || copy?.id;
                    if (newId) {
                      for (const q of qs) {
                        await createQuestion({ testId: newId, prompt: q.prompt, options: q.options, correctAnswerIndex: q.correctAnswerIndex, explanation: q.explanation || '', difficulty: q.difficulty || 'medium' });
                      }
                      setSelectedTestId(newId);
                    }
                  }}
                  title="Nusxalash (qoralama sifatida)"
                  aria-label={`${test.title} testini nusxalash`}
                  className="flex h-6 w-6 items-center justify-center rounded-full text-ink-muted/60 transition-colors hover:bg-ink/5 hover:text-ink dark:text-stone-500"
                >
                  <Copy className="h-3 w-3" />
                </button>
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (confirm(`"${test.title}" testini rostdan ham o‘chirasizmi?`)) {
                      await deleteTest(test.id);
                      const remaining = trackTests.filter(t => t.id !== test.id);
                      if (remaining.length > 0) {
                        setSelectedTestId(remaining[0].id);
                      }
                    }
                  }}
                  title="O‘chirish"
                  className="flex h-6 w-6 items-center justify-center rounded-full text-ink-muted/60 transition-colors hover:bg-red-500/10 hover:text-red-600 dark:text-stone-500"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            );
          })}
          {trackTests.length === 0 && (
            <div className="flex items-center gap-1.5 text-[11.5px] text-ink-muted dark:text-stone-400">
              <HelpCircle className="h-3.5 w-3.5" />
              Bu yo‘nalish uchun hali test mavjud emas. "Yangi Test Qo‘shish" tugmasini bosing yoki AI orqali
              yarating.
            </div>
          )}
        </div>
      </Reveal>

      {activeTest ? (
        <Reveal delay={110}>
          <Glass level={2} className="p-5 sm:p-7">
            <div className="flex flex-col gap-5 border-b border-line/70 pb-5 sm:flex-row sm:items-start sm:justify-between dark:border-white/[0.06]">
              <div className="max-w-2xl">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Pill tone="ember">{activeTest.type}</Pill>
                  <Pill tone="neutral">{activeTest.durationMinutes} daqiqa</Pill>
                  <Pill tone="neutral">Maks: {activeTest.maxScore} ball</Pill>
                  <Pill tone="neutral">VIP: {activeTest.requiredVIP.toUpperCase()}</Pill>
                </div>
                <h2 className="mt-3 font-display text-[clamp(1.15rem,2.2vw,1.5rem)] font-extrabold leading-tight tracking-[-0.03em] text-ink dark:text-white">
                  {activeTest.title}
                </h2>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-muted dark:text-stone-400">
                  {activeTest.description}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <Button
                  variant="ember"
                  size="sm"
                  onClick={() => setShowQuestionModal(true)}
                  iconLeft={<Plus className="h-3.5 w-3.5" />}
                >
                  Savol Qo‘shish
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowImport(true)}>
                  CSV dan yuklash
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-red-500/25 px-3 text-red-600 hover:bg-red-500/[0.06] dark:border-red-400/25 dark:text-red-400"
                  onClick={async () => {
                    if (confirm('Ushbu test va uning savollarini rostdan ham o‘chirasizmi?')) {
                      await deleteTest(activeTest.id);
                      const remaining = db.tests.filter(t => t.id !== activeTest.id);
                      if (remaining.length > 0) {
                        setSelectedTestId(remaining[0].id);
                      }
                    }
                  }}
                  title="Testni o‘chirish"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Questions bank */}
            <div className="mt-5">
              <div className="mb-3 flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-ink-muted dark:text-stone-400">
                  <SlidersHorizontal className="h-3 w-3" />
                  Savollar Banki
                </span>
                <Pill tone="neutral">{activeQuestions.length} ta savol</Pill>
              </div>

              {activeQuestions.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-line bg-white/30 px-6 py-12 text-center dark:border-white/10 dark:bg-white/[0.02]">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-ember-500/10 text-ember-600 dark:bg-ember-500/15 dark:text-ember-400">
                    <HelpCircle className="h-6 w-6" />
                  </div>
                  <p className="mt-4 font-display text-[14px] font-bold tracking-tight text-ink dark:text-white">
                    Bu test uchun hozircha savollar kiritilmagan.
                  </p>
                  <p className="mt-1 max-w-md text-[12px] text-ink-muted dark:text-stone-400">
                    Yuqoridagi "Savol Qo‘shish" yoki "AI Test Yaratish" bo‘limidan foydalaning.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeQuestions.map((q, idx) => (
                    <div
                      key={q.id}
                      className="space-y-3 rounded-[1.25rem] border border-line/60 bg-white/40 p-4 sm:p-5 dark:border-white/[0.06] dark:bg-white/[0.025]"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="inline-flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted dark:text-stone-500">
                          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-ember-500/[0.08] font-sans text-[10.5px] font-black text-ember-700 dark:bg-ember-500/10 dark:text-ember-300">
                            {idx + 1}
                          </span>
                          Savol
                        </span>
                        <button
                          onClick={async () => {
                            if (confirm('Ushbu savolni o‘chirasizmi?')) {
                              await deleteQuestion(q.id);
                            }
                          }}
                          className="flex h-7 w-7 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-red-500/[0.08] hover:text-red-600 dark:text-stone-500"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <div className="text-[13px] font-semibold leading-relaxed text-ink dark:text-white">
                        <MathRenderer content={q.prompt} />
                      </div>

                      {q.mathFormula && (
                        <div className="rounded-xl border border-line/60 bg-white/70 px-3 py-2.5 text-center dark:border-white/[0.06] dark:bg-black/20">
                          <MathRenderer content={q.mathFormula} block />
                        </div>
                      )}

                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {q.options.map((opt, oIdx) => {
                          const isCorrect = q.correctAnswerIndex === oIdx;
                          return (
                            <div
                              key={oIdx}
                              className={cn(
                                'flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-[12px] transition-colors',
                                isCorrect
                                  ? 'border-emerald-500/35 bg-emerald-500/[0.07] font-semibold text-emerald-900 dark:text-emerald-200'
                                  : 'border-line/60 bg-white/50 text-ink-muted dark:border-white/[0.06] dark:bg-white/[0.02] dark:text-stone-400'
                              )}
                            >
                              <div className="flex min-w-0 items-center gap-2">
                                <span
                                  className={cn(
                                    'flex h-5 w-5 shrink-0 items-center justify-center rounded-md font-mono text-[10px] font-bold',
                                    isCorrect
                                      ? 'bg-emerald-500 text-white'
                                      : 'bg-ink/[0.05] text-ink-muted dark:bg-white/[0.07] dark:text-stone-400'
                                  )}
                                >
                                  {['A', 'B', 'C', 'D'][oIdx]}
                                </span>
                                <MathRenderer content={opt} />
                              </div>
                              {isCorrect && (
                                <span className="inline-flex shrink-0 items-center gap-1 text-[9.5px] font-bold uppercase tracking-[0.1em] text-emerald-600 dark:text-emerald-400">
                                  <CheckCircle2 className="h-3 w-3" />
                                  To‘g‘ri
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {q.explanation && (
                        <div className="rounded-xl border border-line/60 bg-white/60 px-3 py-2.5 text-[11.5px] leading-relaxed text-ink-muted dark:border-white/[0.06] dark:bg-white/[0.02] dark:text-stone-400">
                          <span className="font-bold text-ember-700 dark:text-ember-400">Yechim:</span>{' '}
                          {q.explanation}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Glass>
        </Reveal>
      ) : (
        <Reveal delay={110}>
          <Glass level={1} radius="rounded-[1.75rem]">
            <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-ember-500/10 text-ember-600 dark:bg-ember-500/15 dark:text-ember-400">
                <Sparkles className="h-6 w-6" />
              </div>
              <p className="mt-4 font-display text-[15px] font-bold tracking-tight text-ink dark:text-white">
                Hozircha testlar yo‘q.
              </p>
              <p className="mt-1 max-w-sm text-[12.5px] text-ink-muted dark:text-stone-400">
                Yuqoridagi "Yangi Test Qo‘shish" tugmasini bosing.
              </p>
            </div>
          </Glass>
        </Reveal>
      )}

      {/* Add Test Modal */}
      {showTestModal && (
        <div className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-ink/45 p-4 backdrop-blur-md dark:bg-black/65">
          <div className="glass-4 my-8 w-full max-w-lg rounded-[1.75rem] p-5 sm:p-7">
            <div className="mb-5 flex items-start justify-between gap-4 border-b border-line/70 pb-4 dark:border-white/[0.07]">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-ember-700 dark:text-ember-400">
                  Testlar
                </span>
                <h3 className="mt-1 font-display text-[16px] font-extrabold tracking-[-0.02em] text-ink dark:text-white">
                  Yangi Test Sinovi Yaratish
                </h3>
              </div>
              <button
                onClick={() => setShowTestModal(false)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-ink/[0.06] hover:text-ink dark:text-stone-400 dark:hover:bg-white/[0.07] dark:hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTest} className="space-y-4">
              <div>
                <label className={label}>Test Nomi *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Masalan, Milliy Sertifikat Mock Test №2"
                  className={cn(field, 'font-semibold')}
                />
              </div>

              <div>
                <label className={label}>Tavsifi</label>
                <textarea
                  rows={2}
                  value={desc}
                  onChange={e => setDesc(e.target.value)}
                  placeholder="Test formati va mezonlari..."
                  className={cn(field, 'resize-y')}
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className={label}>Test Turi</label>
                  <select
                    value={type}
                    onChange={e => setType(e.target.value as any)}
                    className={cn(field, 'cursor-pointer')}
                  >
                    <option value="mock">Milliy Sertifikat Mock</option>
                    <option value="quiz">Mavzuli Quiz</option>
                    <option value="diagnostic">Diagnostik Test</option>
                  </select>
                </div>
                <div>
                  <label className={label}>Talab Etiladigan VIP</label>
                  <select
                    value={vipTier}
                    onChange={e => setVipTier(e.target.value as any)}
                    className={cn(field, 'cursor-pointer')}
                  >
                    <option value="free">Hamma uchun ochiq</option>
                    {db.vipPlans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className={label}>Vaqt (Daqiqa)</label>
                  <input
                    type="number"
                    value={duration}
                    onChange={e => setDuration(parseInt(e.target.value, 10))}
                    className={cn(field, 'font-mono font-bold')}
                  />
                </div>
                <div>
                  <label className={label}>Maksimal Ball</label>
                  <input
                    type="number"
                    value={maxScore}
                    onChange={e => setMaxScore(parseInt(e.target.value, 10))}
                    className={cn(field, 'font-mono font-bold')}
                  />
                </div>
              </div>

              <Button variant="ember" size="md" type="submit" className="mt-1 w-full">
                Testni Saqlash
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* Add Question Modal */}
      {showQuestionModal && (
        <div className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-ink/45 p-4 backdrop-blur-md dark:bg-black/65">
          <div className="glass-4 my-8 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[1.75rem] p-5 sm:p-7">
            <div className="mb-5 flex items-start justify-between gap-4 border-b border-line/70 pb-4 dark:border-white/[0.07]">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-ember-700 dark:text-ember-400">
                  Savollar banki
                </span>
                <h3 className="mt-1 font-display text-[16px] font-extrabold tracking-[-0.02em] text-ink dark:text-white">
                  Yangi Savol Qo‘shish
                </h3>
              </div>
              <button
                onClick={() => setShowQuestionModal(false)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-ink/[0.06] hover:text-ink dark:text-stone-400 dark:hover:bg-white/[0.07] dark:hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateQuestion} className="space-y-4">
              <div>
                <label className={label}>Savol Matni *</label>
                <textarea
                  rows={2}
                  required
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  placeholder="Savolni yozing..."
                  className={cn(field, 'resize-y')}
                />
              </div>

              <div>
                <label className={label}>Matematik Formula (LaTeX / KaTeX)</label>
                <input
                  type="text"
                  value={formula}
                  onChange={e => setFormula(e.target.value)}
                  placeholder="x^2 - 7x + 10 = 0"
                  className={cn(field, 'font-mono text-[12px]')}
                />
              </div>

              <div className="space-y-2">
                <label className={label}>Javob Variantlari *</label>
                {[
                  { v: optA, set: setOptA, ph: 'Variant A', req: true },
                  { v: optB, set: setOptB, ph: 'Variant B', req: true },
                  { v: optC, set: setOptC, ph: 'Variant C', req: false },
                  { v: optD, set: setOptD, ph: 'Variant D', req: false }
                ].map(opt => (
                  <div key={opt.ph} className="flex items-center gap-2">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-ink/[0.05] font-mono text-[10.5px] font-bold text-ink-muted dark:bg-white/[0.06] dark:text-stone-400">
                      {opt.ph.slice(-1)}
                    </span>
                    <input
                      type="text"
                      required={opt.req}
                      placeholder={opt.ph}
                      value={opt.v}
                      onChange={e => opt.set(e.target.value)}
                      className={cn(field, 'py-2.5 text-[12.5px]')}
                    />
                  </div>
                ))}
              </div>

              <div>
                <label className={label}>To‘g‘ri Javob Indeksi</label>
                <select
                  value={correctIdx}
                  onChange={e => setCorrectIdx(parseInt(e.target.value, 10))}
                  className={cn(field, 'cursor-pointer font-semibold')}
                >
                  <option value={0}>A varianti to‘g‘ri</option>
                  <option value={1}>B varianti to‘g‘ri</option>
                  <option value={2}>C varianti to‘g‘ri</option>
                  <option value={3}>D varianti to‘g‘ri</option>
                </select>
              </div>

              <div>
                <label className={label}>Yechim Tushuntirishi</label>
                <textarea
                  rows={2}
                  value={explanation}
                  onChange={e => setExplanation(e.target.value)}
                  placeholder="O‘quvchilar xatosini tushunishi uchun yechim..."
                  className={cn(field, 'resize-y')}
                />
              </div>

              <Button variant="ember" size="md" type="submit" className="mt-1 w-full">
                Savolni Saqlash
              </Button>
            </form>
          </div>
        </div>
      )}
      {showImport && activeTest ? <QuestionImport testId={activeTest.id} testTitle={activeTest.title} onClose={() => setShowImport(false)} /> : null}
    </div>
  );
};
