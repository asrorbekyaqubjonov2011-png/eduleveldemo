'use client';

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Layers,
  Sparkles,
  Award,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  Flame,
  Zap,
  BookOpen,
  Filter,
  Check,
  RotateCcw,
  Trophy
} from 'lucide-react';
import { ThematicQuizPack, Question } from '../../types';
import confetti from 'canvas-confetti';

export const ThematicQuizPacksView: React.FC = () => {
  const { currentUser, db, setCurrentUser } = useApp();

  // Packs are written by the owner (AI or by hand) and kept in the database. No built-in sample questions.
  const packs = (db.thematicQuizPacks || []) as ThematicQuizPack[];
  const donePackIds = new Set(currentUser?.completedPackIds || []);

  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [selectedPack, setSelectedPack] = useState<ThematicQuizPack | null>(null);

  // Active quiz: answers are collected here and graded by the server on submit. No key is known to the browser.
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [graded, setGraded] = useState<null | {
    result: { correctCount: number; totalQuestions: number; score: number; maxScore: number; percentage: number };
    review: { questionId: string; given: number | null; correct: boolean; expected: number; explanation: string }[];
    rewarded: { xp: number; points: number } | null;
  }>(null);
  const isCompleted = graded !== null;
  const selectedOption = selectedPack ? answers[selectedPack.questions[currentQIndex]?.id] ?? null : null;

  const filteredPacks = packs.filter(
    (p) => activeCategory === 'all' || p.category === activeCategory
  );

  const handleStartPack = (pack: ThematicQuizPack) => {
    setSelectedPack(pack);
    setCurrentQIndex(0);
    setAnswers({});
    setSubmitError(null);
    setGraded(null);
  };

  const handleSelectOption = (idx: number) => {
    if (!selectedPack || isCompleted || submitting) return;
    const qid = selectedPack.questions[currentQIndex].id;
    setAnswers((a) => ({ ...a, [qid]: idx }));
  };

  // Submit all answers to the server. The grade, the per-question review and the reward come back from the server only.
  const submitPack = async () => {
    if (!selectedPack || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch('/api/thematic-packs/grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packId: selectedPack.id, answers })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        setSubmitError(data.message || 'Natijani yuborib bo‘lmadi. Qayta urinib ko‘ring.');
        return;
      }
      setGraded({ result: data.result, review: data.review, rewarded: data.rewarded ?? null });
      if (data.user && setCurrentUser) setCurrentUser(data.user);
      if (data.result?.correctCount > 0) confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    } catch {
      setSubmitError('Tarmoq xatosi. Qayta urinib ko‘ring.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleNext = () => {
    if (!selectedPack) return;
    if (currentQIndex + 1 < selectedPack.questions.length) {
      setCurrentQIndex((i) => i + 1);
    } else {
      void submitPack();
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-3xl page-hero p-6 sm:p-8">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 text-xs font-bold uppercase tracking-wider mb-2 border border-cyan-500/30">
            <Layers className="w-3.5 h-3.5" />
            <span>Edu Level Thematic Quiz Packs</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Mavzulashtirilgan Testlar To‘plami (Testlar Bilimi)
          </h1>
          <p className="text-xs sm:text-sm text-stone-300 mt-1 leading-relaxed">
            Istalgan mavzudagi maxsus test packlarini tanlab ishlang. Har bir to‘g‘ri javob uchun ball va XP oling,
            seriyangizni (streak) oshiring va reytingda yuqoriga chiqing!
          </p>

          <div className="flex items-center gap-4 mt-4 text-xs font-semibold text-stone-300">
            <div className="flex items-center gap-1.5 text-cyan-400">
              <Zap className="w-4 h-4" />
              <span>Har bir to‘plamdan +150 XP</span>
            </div>
            <div className="flex items-center gap-1.5 text-amber-400">
              <Flame className="w-4 h-4" />
              <span>Streak o‘sishi</span>
            </div>
            <div className="flex items-center gap-1.5 text-purple-400">
              <Trophy className="w-4 h-4" />
              <span>Reytingga hissa</span>
            </div>
          </div>
        </div>
      </div>

      {/* Categories Filter Tabs */}
      {!selectedPack && (
        <div className="flex flex-wrap items-center gap-2 border-b border-stone-200 dark:border-stone-800 pb-2">
          {[
            { id: 'all', label: 'Barchasi', icon: '🌟' },
            { id: 'grammar', label: 'C1/C2 Grammatika', icon: '📐' },
            { id: 'vocab', label: 'IELTS 1200 Lug‘at', icon: '📚' },
            { id: 'phrasal_verbs', label: 'Phrasal Verbs', icon: '⚡' },
            { id: 'prepositions', label: 'Collocations & Prepositions', icon: '🎯' }
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                activeCategory === cat.id
                  ? 'bg-[#FF8A2B] text-stone-950 font-black shadow-md'
                  : 'bg-white/80 dark:bg-stone-900/80 text-stone-600 dark:text-stone-400 hover:text-white border border-stone-200/60 dark:border-stone-800'
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* QUIZ PACK RUNNER SCREEN */}
      {selectedPack ? (
        <div className="bg-white/85 dark:bg-stone-900/85 backdrop-blur-xl border border-stone-200/80 dark:border-stone-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-stone-200 dark:border-stone-800">
            <div>
              <span className="text-[10px] font-black uppercase text-cyan-500 tracking-wider">
                {selectedPack.badge} · {selectedPack.level}
              </span>
              <h2 className="text-xl font-black text-stone-900 dark:text-white mt-0.5">
                {selectedPack.title}
              </h2>
            </div>
            <button
              onClick={() => setSelectedPack(null)}
              className="text-xs text-stone-400 hover:text-white transition-colors"
            >
              To‘plamlarga Qaytish ✕
            </button>
          </div>

          {!isCompleted ? (
            <div className="space-y-6">
              {/* Progress bar */}
              <div className="flex items-center justify-between text-xs text-stone-400">
                <span>
                  Savol: <strong className="text-stone-900 dark:text-white">{currentQIndex + 1}</strong> / {selectedPack.questions.length}
                </span>
                <span className="font-mono text-cyan-400 font-bold">Javoblar: {Object.keys(answers).length}/{selectedPack.questions.length}</span>
              </div>
              <div className="w-full bg-stone-100 dark:bg-stone-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-[#FF8A2B] h-full transition-all duration-300"
                  style={{ width: `${((currentQIndex + 1) / selectedPack.questions.length) * 100}%` }}
                />
              </div>

              {/* Current Question */}
              <div className="space-y-4">
                <h3 className="text-base sm:text-lg font-black text-stone-900 dark:text-white leading-relaxed">
                  {selectedPack.questions[currentQIndex].prompt}
                </h3>

                <div className="space-y-3">
                  {selectedPack.questions[currentQIndex].options.map((opt, idx) => {
                    const isSelected = selectedOption === idx;
                    const style = isSelected
                      ? 'border-cyan-500 bg-cyan-500/15 text-cyan-200 ring-2 ring-cyan-500/40'
                      : 'border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950/60 text-stone-800 dark:text-stone-200 hover:border-cyan-500/50';

                    return (
                      <button
                        key={idx}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => handleSelectOption(idx)}
                        disabled={submitting}
                        className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center justify-between cursor-pointer ${style}`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-7 h-7 rounded-xl bg-stone-200 dark:bg-stone-800 flex items-center justify-center font-bold text-xs text-stone-800 dark:text-stone-200 font-mono">
                            {String.fromCharCode(65 + idx)}
                          </span>
                          <span className="text-xs sm:text-sm font-semibold">{opt}</span>
                        </div>
                        {isSelected && <Check className="w-5 h-5 text-cyan-400" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {submitError && <p role="alert" className="text-xs font-semibold text-rose-400">{submitError}</p>}

              {/* Next Question / Submit CTA. Answers are graded only on the server, after submit. */}
              <div className="flex justify-between items-center pt-4 border-t border-stone-200 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => setCurrentQIndex((i) => Math.max(0, i - 1))}
                  disabled={currentQIndex === 0 || submitting}
                  className="px-4 py-3 rounded-xl text-xs font-bold text-stone-500 disabled:opacity-40 cursor-pointer"
                >
                  Oldingi savol
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={selectedOption === null || submitting}
                  className="px-6 py-3 rounded-xl bg-[#FF8A2B] hover:bg-[#00D6BA] text-stone-950 font-black text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <span>
                    {submitting ? 'Yuborilmoqda…' : currentQIndex + 1 < selectedPack.questions.length ? 'Keyingi Savol' : 'Natijani Yuborish'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            /* Completed Screen */
            <div className="text-center py-8 space-y-4">
              <div className="w-20 h-20 mx-auto rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-4xl shadow-xl">
                🏆
              </div>
              <h3 className="text-2xl font-black text-stone-900 dark:text-white">
                Muborakbod etamiz! To‘plam Muvaffaqiyatli Yakunlandi
              </h3>
              <p className="text-xs text-stone-400 max-w-md mx-auto">
                Siz "{selectedPack.title}" to‘plamini to‘liq ishlab, profilingizga va hisobingizga yangi ochkolarni
                qo‘shdingiz!
              </p>

              <div className="inline-flex items-center gap-6 bg-stone-950/80 px-6 py-4 rounded-2xl border border-stone-800 font-mono">
                <div>
                  <span className="text-[10px] text-stone-400 uppercase font-sans block">To‘plangan Ball</span>
                  <span className="text-2xl font-black text-cyan-400">{graded?.result.score ?? 0} ball</span>
                </div>
                <div className="h-8 w-px bg-stone-800" />
                <div>
                  <span className="text-[10px] text-stone-400 uppercase font-sans block">To‘g‘ri javoblar</span>
                  <span className="text-2xl font-black text-emerald-400">
                    {graded?.result.correctCount ?? 0}/{graded?.result.totalQuestions ?? selectedPack.questions.length}
                  </span>
                </div>
                <div className="h-8 w-px bg-stone-800" />
                <div>
                  <span className="text-[10px] text-stone-400 uppercase font-sans block">Mukofot XP</span>
                  <span className="text-2xl font-black text-amber-400">+{graded?.rewarded?.xp ?? 0} XP</span>
                </div>
              </div>

              {graded && (
                <ol className="mx-auto max-w-2xl space-y-3 text-left">
                  {graded.review.map((r, i) => {
                    const q = selectedPack.questions[i];
                    return (
                      <li key={r.questionId} className="rounded-2xl border border-stone-200 dark:border-stone-800 p-4">
                        <div className="flex items-start gap-2">
                          {r.correct ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />}
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-stone-900 dark:text-white">{i + 1}. {q?.prompt}</p>
                            {!r.correct && r.expected >= 0 && q && (
                              <p className="mt-1 text-[11px] text-stone-500 dark:text-stone-400">
                                To‘g‘ri javob: {q.options[r.expected]}
                              </p>
                            )}
                            {r.explanation && <p className="mt-1 text-[11px] text-stone-500 dark:text-stone-400">{r.explanation}</p>}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}

              <div className="pt-4 flex items-center justify-center gap-3">
                <button
                  onClick={() => handleStartPack(selectedPack)}
                  className="px-5 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-white font-bold text-xs cursor-pointer flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Qaytadan Ishlash</span>
                </button>
                <button
                  onClick={() => setSelectedPack(null)}
                  className="px-6 py-2.5 rounded-xl bg-[#FF8A2B] text-stone-950 font-black text-xs cursor-pointer"
                >
                  Boshqa To‘plamlarga O‘tish
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* QUIZ PACKS GRID */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
          {filteredPacks.length === 0 ? (
            <p className="col-span-full rounded-2xl border border-dashed border-stone-300 p-6 text-center text-sm text-stone-500 dark:border-stone-700 dark:text-stone-400">Hozircha test paketlari yo‘q. Ustoz paket qo‘shganda shu yerda chiqadi.</p>
          ) : null}
          {filteredPacks.map((pack) => (
            <div
              key={pack.id}
              className="bg-white/80 dark:bg-stone-900/80 backdrop-blur-md border border-stone-200/80 dark:border-stone-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between hover:border-cyan-500/50 transition-all group"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="text-3xl">{pack.icon}</span>
                    <div>
                      <span className="px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 text-[10px] font-black uppercase text-cyan-400">
                        {pack.badge}
                      </span>
                      <h3 className="font-extrabold text-base text-stone-900 dark:text-white mt-1">
                        {pack.title}
                      </h3>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold text-stone-400">{pack.questionsCount} ta savol</span>
                  {donePackIds.has(pack.id) ? <span className="ml-2 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-300">✓ Bajarilgan</span> : null}
                </div>

                <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed mb-4">
                  {pack.description}
                </p>
              </div>

              <div className="pt-4 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-500">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>+{pack.rewardXp} XP · +{pack.rewardPoints} Ball</span>
                </div>

                <button
                  onClick={() => handleStartPack(pack)}
                  className="px-5 py-2.5 rounded-xl bg-[#FF8A2B] hover:bg-[#00D6BA] text-stone-950 font-black text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Boshlash</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
