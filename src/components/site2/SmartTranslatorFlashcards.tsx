import React, { useState, useEffect, useRef } from 'react';
import { checkTyped } from '../../lib/jev/checkClient';
import { BLITZ_STARTER_DECK } from '../../data/blitzDeck';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import {
  Languages,
  Sparkles,
  Volume2,
  BookmarkPlus,
  CheckCircle2,
  RotateCcw,
  Clock,
  Zap,
  Award,
  ArrowRight,
  Search,
  Check,
  Star,
  Layers,
  Flame
} from 'lucide-react';
import { VocabTranslationItem, Flashcard, RankedXPCard } from '../../types';
import confetti from 'canvas-confetti';

export const SmartTranslatorFlashcards: React.FC = () => {
  const { db, translate3Level, addFlashcard, currentUser, refreshDb } = useApp();

  const [activeTab, setActiveTab] = useState<'translator' | 'sm2_cards' | 'xp_blitz'>('translator');

  // Translator state
  const [query, setQuery] = useState('Resilience');
  const [loading, setLoading] = useState(false);
  const [translationResult, setTranslationResult] = useState<VocabTranslationItem | null>(
    db.vocabTranslations?.[0] || null
  );
  const [savedSuccess, setSavedSuccess] = useState(false);

  // SM-2 Flashcards state
  // Own cards, due ones first (SM-2 order)
  const myCards = [...(db.flashcards || []).filter((c) => c.userId === currentUser?.id)].sort(
    (a, b) => new Date(a.nextReviewDate).getTime() - new Date(b.nextReviewDate).getTime()
  );
  const dueCount = myCards.filter((c) => new Date(c.nextReviewDate).getTime() <= Date.now()).length;
  const [cardIdx, setCardIdx] = useState(0);
  const [cardBusy, setCardBusy] = useState(false);
  const [cardError, setCardError] = useState('');
  const [editCard, setEditCard] = useState<{ id: string; englishWord: string; meaningUz: string; exampleEn: string } | null>(null);
  const safeIdx = myCards.length ? Math.min(cardIdx, myCards.length - 1) : 0;
  const current = myCards[safeIdx];

  const rateCard = async (grade: number) => {
    if (!current || cardBusy) return;
    setCardBusy(true);
    setCardError('');
    const res = await api.reviewFlashcard(current.id, grade);
    setCardBusy(false);
    if (!res.success) return setCardError(res.message || 'Saqlanmadi');
    setIsFlipped(false);
    await refreshDb();
    setCardIdx(0);
  };
  const removeCard = async () => {
    if (!current || !window.confirm(`"${current.englishWord}" kartasini o‘chirasizmi?`)) return;
    const res = await api.deleteFlashcard(current.id);
    if (!res.success) return setCardError(res.message || 'O‘chirilmadi');
    setIsFlipped(false);
    setCardIdx(0);
    await refreshDb();
  };
  const saveEdit = async () => {
    if (!editCard) return;
    const { id, ...fields } = editCard;
    const res = await api.updateFlashcard(id, fields);
    if (!res.success) return setCardError(res.message || 'Saqlanmadi');
    setEditCard(null);
    await refreshDb();
  };
  const dueLabel = (iso?: string) => {
    if (!iso) return '';
    const ms = new Date(iso).getTime() - Date.now();
    if (ms <= 0) return 'Takrorlash vaqti keldi';
    const h = Math.round(ms / 3600000);
    return h < 24 ? `Keyingi takror: ${Math.max(1, h)} soatdan keyin` : `Keyingi takror: ${Math.round(h / 24)} kundan keyin`;
  };
  const [isFlipped, setIsFlipped] = useState(false);

  // Vocabulary Blitz 60s Game state
  // Owner-made ranked cards when there are any; otherwise the starter deck, so Blitz always has words.
  // Each card is shaped like the owner's: the prompt word, its options, and the index of the right option.
  const usingStarter = !(db.rankedXpCards || []).length;
  const rankedCards = usingStarter
    ? BLITZ_STARTER_DECK.map((c) => ({ id: c.id, word: c.word, meaningUz: c.meaningUz, options: [c.synonym], correctIndex: 0, xpReward: c.xpReward }))
    : db.rankedXpCards;
  const [blitzActive, setBlitzActive] = useState(false);
  const [blitzSeconds, setBlitzSeconds] = useState(60);
  const [blitzScore, setBlitzScore] = useState(0);
  const [blitzCardIdx, setBlitzCardIdx] = useState(0);
  const [blitzFinished, setBlitzFinished] = useState(false);

  // Blitz timer
  useEffect(() => {
    let t: any;
    if (blitzActive && blitzSeconds > 0) {
      t = setInterval(() => setBlitzSeconds((s) => s - 1), 1000);
    } else if (blitzSeconds === 0 && blitzActive) {
      setBlitzActive(false);
      setBlitzFinished(true);
      try {
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
      } catch {}
    }
    return () => clearInterval(t);
  }, [blitzActive, blitzSeconds]);

  const handleTranslate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await translate3Level(query.trim());
      if (res.success && res.translation) {
        setTranslationResult(res.translation);
      }
    } catch {}
    setLoading(false);
  };

  const speakText = (text: string) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-US';
      u.rate = 0.9;
      window.speechSynthesis.speak(u);
    }
  };

  const handleSaveToFlashcards = (levelKey: 'b1' | 'b2' | 'c1') => {
    if (!translationResult) return;
    const detail = translationResult[levelKey];
    addFlashcard({
      englishWord: detail.word,
      ipa: detail.ipa,
      meaningUz: detail.meaningUz,
      level: levelKey.toUpperCase() as any,
      c1Synonym: translationResult.c1.word,
      exampleEn: detail.examples[0]?.en || '',
      exampleUz: detail.examples[0]?.uz || ''
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  // Blitz: the student types the answer; Jev checks it (see checkTyped). One verdict per card.
  const [blitzInput, setBlitzInput] = useState('');
  const [blitzVerdict, setBlitzVerdict] = useState<null | { match: boolean; correct: string; source: string; probability?: number | null }>(null);
  const [blitzChecking, setBlitzChecking] = useState(false);
  const blitzGo = (nextIdx: number) => {
    setBlitzInput('');
    setBlitzVerdict(null);
    if (nextIdx < rankedCards.length && blitzSecondsRef.current > 0) setBlitzCardIdx(nextIdx);
    else {
      setBlitzActive(false);
      setBlitzFinished(true);
    }
  };
  const blitzSecondsRef = useRef(60);
  useEffect(() => {
    blitzSecondsRef.current = blitzSeconds;
  }, [blitzSeconds]);
  const submitBlitz = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const card = rankedCards[blitzCardIdx];
    if (!card || blitzVerdict || blitzChecking || !blitzInput.trim()) return;
    const correct = card.options[card.correctIndex];
    setBlitzChecking(true);
    const v = await checkTyped(card.word, [correct], blitzInput);
    setBlitzChecking(false);
    if (v.match) setBlitzScore((s) => s + card.xpReward);
    setBlitzVerdict({ match: v.match, correct, source: v.source, probability: v.probability });
    window.setTimeout(() => blitzGo(blitzCardIdx + 1), v.match ? 700 : 1600);
  };

  const handleStartBlitz = () => {
    setBlitzInput('');
    setBlitzVerdict(null);
    setBlitzScore(0);
    setBlitzCardIdx(0);
    setBlitzSeconds(60);
    setBlitzActive(true);
    setBlitzFinished(false);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Top Banner */}
      <div className="p-6 rounded-3xl page-hero flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 text-xs font-bold uppercase tracking-wider mb-2">
            <Languages className="w-3.5 h-3.5" />
            <span>Edu Level Lexical Suite</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black">
            3-Darajali Aqlli Tarjimon & Flashcards
          </h2>
          <p className="text-xs text-stone-300 mt-1 max-w-2xl leading-relaxed">
            Har qanday so'zni B1, B2 va C1/C2 darajalariga o'giring, 3 tadan misol gaplarni o'rganing va SM-2 spaced repetition yoki 60 soniyalik Blitz o'yini orqali XP ishlang.
          </p>
        </div>

        {/* Tab buttons */}
        <div className="flex items-center gap-1.5 p-1 bg-stone-900 border border-stone-800 rounded-2xl shrink-0">
          <button
            onClick={() => setActiveTab('translator')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'translator'
                ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-white shadow-xs'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            3-Level Tarjimon
          </button>
          <button
            onClick={() => setActiveTab('sm2_cards')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'sm2_cards'
                ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-white shadow-xs'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            SM-2 Kartalar
          </button>
          <button
            onClick={() => setActiveTab('xp_blitz')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'xp_blitz'
                ? 'bg-gradient-to-r from-amber-500 to-rose-600 text-white shadow-xs'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            ⚡ XP Blitz (60s)
          </button>
        </div>
      </div>

      {/* 1. TRANSLATOR TAB */}
      {activeTab === 'translator' && (
        <div className="space-y-6">
          {/* Search bar */}
          <form
            onSubmit={handleTranslate}
            className="p-3 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl shadow-xs flex items-center gap-3"
          >
            <Search className="w-5 h-5 text-cyan-500 ml-3 shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Inglizcha so'z yoki iborani kiriting (masalan: Meticulous, Resilient, Overcome)..."
              className="flex-1 bg-transparent border-0 text-sm font-semibold text-stone-900 dark:text-white focus:outline-none"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-bold text-xs shadow-md cursor-pointer hover:opacity-90 disabled:opacity-50"
            >
              {loading ? 'Tarjima qilinmoqda...' : '3 Darajaga O‘girish'}
            </button>
          </form>

          {savedSuccess && (
            <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 rounded-2xl text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>So'z muvaffaqiyatli shaxsiy Flashcard to'plamingizga qo'shildi!</span>
            </div>
          )}

          {/* 3-Level Output Cards Grid */}
          {translationResult && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* B1 Card */}
              <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl p-6 shadow-xs flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-[10px] font-black uppercase">
                      B1 • Foundational
                    </span>
                    <button
                      onClick={() => speakText(translationResult.b1.word)}
                      className="p-1.5 rounded-lg text-stone-400 hover:text-cyan-500"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>

                  <h3 className="text-xl font-black text-stone-900 dark:text-white mt-3">
                    {translationResult.b1.word}
                  </h3>
                  <div className="text-xs font-mono text-cyan-600 dark:text-cyan-400">
                    {translationResult.b1.ipa}
                  </div>
                  <div className="text-xs font-bold text-stone-700 dark:text-stone-300 mt-1">
                    Ma'nosi: {translationResult.b1.meaningUz}
                  </div>

                  {/* 3 Sample Sentences */}
                  <div className="mt-4 pt-3 border-t border-stone-100 dark:border-stone-800 space-y-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
                      3 Ta Namunaviy Gap:
                    </span>
                    {translationResult.b1.examples.map((ex, i) => (
                      <div key={i} className="text-xs space-y-0.5">
                        <p className="font-semibold text-stone-800 dark:text-stone-200">
                          {i + 1}. "{ex.en}"
                        </p>
                        <p className="text-[11px] text-stone-500 italic">({ex.uz})</p>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => handleSaveToFlashcards('b1')}
                  className="w-full py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800 text-xs font-bold text-stone-700 dark:text-stone-300 flex items-center justify-center gap-1.5 cursor-pointer mt-4"
                >
                  <BookmarkPlus className="w-3.5 h-3.5 text-blue-500" />
                  <span>B1 Kartochkaga Saqlash</span>
                </button>
              </div>

              {/* B2 Card */}
              <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl p-6 shadow-xs flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-black uppercase">
                      B2 • Communicative
                    </span>
                    <button
                      onClick={() => speakText(translationResult.b2.word)}
                      className="p-1.5 rounded-lg text-stone-400 hover:text-cyan-500"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>

                  <h3 className="text-xl font-black text-stone-900 dark:text-white mt-3">
                    {translationResult.b2.word}
                  </h3>
                  <div className="text-xs font-mono text-cyan-600 dark:text-cyan-400">
                    {translationResult.b2.ipa}
                  </div>
                  <div className="text-xs font-bold text-stone-700 dark:text-stone-300 mt-1">
                    Ma'nosi: {translationResult.b2.meaningUz}
                  </div>

                  {/* 3 Sample Sentences */}
                  <div className="mt-4 pt-3 border-t border-stone-100 dark:border-stone-800 space-y-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
                      3 Ta Namunaviy Gap:
                    </span>
                    {translationResult.b2.examples.map((ex, i) => (
                      <div key={i} className="text-xs space-y-0.5">
                        <p className="font-semibold text-stone-800 dark:text-stone-200">
                          {i + 1}. "{ex.en}"
                        </p>
                        <p className="text-[11px] text-stone-500 italic">({ex.uz})</p>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => handleSaveToFlashcards('b2')}
                  className="w-full py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800 text-xs font-bold text-stone-700 dark:text-stone-300 flex items-center justify-center gap-1.5 cursor-pointer mt-4"
                >
                  <BookmarkPlus className="w-3.5 h-3.5 text-emerald-500" />
                  <span>B2 Kartochkaga Saqlash</span>
                </button>
              </div>

              {/* C1/C2 Card (Prestigious Band 8.5+) */}
              <div className="bg-gradient-to-b from-cyan-950/20 via-white dark:via-stone-900 to-white dark:to-stone-900 border-2 border-cyan-500 rounded-3xl p-6 shadow-md flex flex-col justify-between space-y-4 relative">
                <div className="absolute top-4 right-4">
                  <span className="px-2.5 py-0.5 rounded-full bg-cyan-500 text-stone-950 text-[10px] font-black uppercase tracking-wider shadow-xs">
                    C1/C2 • Band 8.5+
                  </span>
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => speakText(translationResult.c1.word)}
                      className="p-1.5 rounded-lg text-cyan-400 hover:text-cyan-300"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>

                  <h3 className="text-xl font-black text-cyan-600 dark:text-cyan-400 mt-2">
                    {translationResult.c1.word}
                  </h3>
                  <div className="text-xs font-mono text-stone-400">
                    {translationResult.c1.ipa}
                  </div>
                  <div className="text-xs font-bold text-stone-900 dark:text-white mt-1">
                    Ma'nosi: {translationResult.c1.meaningUz}
                  </div>

                  {/* 3 Sample Sentences */}
                  <div className="mt-4 pt-3 border-t border-stone-100 dark:border-stone-800 space-y-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-500 block">
                      3 Ta C1 Akademik Misol:
                    </span>
                    {translationResult.c1.examples.map((ex, i) => (
                      <div key={i} className="text-xs space-y-0.5">
                        <p className="font-semibold text-stone-900 dark:text-white">
                          {i + 1}. "{ex.en}"
                        </p>
                        <p className="text-[11px] text-cyan-600 dark:text-cyan-300 italic">({ex.uz})</p>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => handleSaveToFlashcards('c1')}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white text-xs font-bold shadow-md hover:opacity-90 flex items-center justify-center gap-1.5 cursor-pointer mt-4"
                >
                  <BookmarkPlus className="w-3.5 h-3.5" />
                  <span>C1 Kartochkaga Saqlash</span>
                </button>

                <JevPractice word={translationResult.b1.word} meaning={translationResult.b1.meaningUz} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. SM-2 FLASHCARDS TAB */}
      {activeTab === 'sm2_cards' && (
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl p-8 shadow-xs max-w-xl mx-auto text-center space-y-6">
          <div className="flex items-center justify-between text-xs text-stone-400">
            <span>Shaxsiy SM-2 Spaced Repetition sandig'i</span>
            <span className="font-mono font-bold">
              {myCards.length > 0 ? `${dueCount} ta takrorlash · ${myCards.length} karta` : '0 / 0'}
            </span>
          </div>

          {myCards.length === 0 ? (
            <div className="py-12 space-y-3">
              <Layers className="w-12 h-12 text-stone-400 mx-auto" />
              <h4 className="font-bold text-sm text-stone-900 dark:text-white">
                Hozircha saqlangan kartalaringiz yo'q
              </h4>
              <p className="text-xs text-stone-500">
                "3-Level Tarjimon" orqali so'zlarni qidiring va "Kartochkaga saqlash" tugmasini bosing.
              </p>
            </div>
          ) : (
            <>
              {/* Flip Card Container */}
              <div
                onClick={() => setIsFlipped(!isFlipped)}
                className="h-64 rounded-3xl bg-gradient-to-br from-stone-950 via-[#071320] to-stone-900 border-2 border-cyan-500/40 p-8 flex flex-col justify-between text-white cursor-pointer transition-transform hover:scale-[1.01] shadow-xl"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="px-2.5 py-0.5 rounded-full bg-cyan-500 text-stone-950 font-black uppercase text-[10px]">
                    {current?.level}
                  </span>
                  <span className="text-[11px] text-stone-400 font-mono">
                    {isFlipped ? "Orqa tomoni (O'zbekcha)" : "Oldi tomoni (Bosing)"}
                  </span>
                </div>

                {!isFlipped ? (
                  <div>
                    <h3 className="text-3xl font-black text-white mb-2">
                      {current?.englishWord}
                    </h3>
                    <div className="text-xs font-mono text-cyan-300">
                      {current?.ipa}
                    </div>
                  </div>
                ) : (
                  <div>
                    <h3 className="text-xl font-bold text-cyan-300 mb-2">
                      {current?.meaningUz}
                    </h3>
                    <p className="text-xs text-stone-300 italic">
                      "{current?.exampleEn}"
                    </p>
                  </div>
                )}

                <div className="text-[10px] text-stone-400">
                  {isFlipped ? 'Qaytarish vaqtini baholang' : 'Kartani ag‘darish uchun bosing'}
                </div>
              </div>

              {/* SM-2 Rating Buttons — saved on the server */}
              <div className="grid grid-cols-4 gap-2 pt-2">
                <button
                  type="button"
                  disabled={cardBusy}
                  onClick={() => rateCard(1)}
                  className="py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30 text-xs font-bold border cursor-pointer disabled:opacity-50"
                >
                  Qayta
                </button>
                <button
                  type="button"
                  disabled={cardBusy}
                  onClick={() => rateCard(3)}
                  className="py-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30 text-xs font-bold border cursor-pointer disabled:opacity-50"
                >
                  Qiyin
                </button>
                <button
                  type="button"
                  disabled={cardBusy}
                  onClick={() => rateCard(4)}
                  className="py-2.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border-cyan-500/30 text-xs font-bold border cursor-pointer disabled:opacity-50"
                >
                  Yaxshi
                </button>
                <button
                  type="button"
                  disabled={cardBusy}
                  onClick={() => rateCard(5)}
                  className="py-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-xs font-bold border cursor-pointer disabled:opacity-50"
                >
                  Oson
                </button>
              </div>
              <div className="flex items-center justify-between gap-3 text-[11px] text-stone-500">
                <span>{dueLabel(current?.nextReviewDate)}</span>
                <span className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => current && setEditCard({ id: current.id, englishWord: current.englishWord, meaningUz: current.meaningUz, exampleEn: current.exampleEn })}
                    className="rounded-full px-3 py-1.5 font-semibold hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
                  >
                    Tahrirlash
                  </button>
                  <button type="button" onClick={removeCard} className="rounded-full px-3 py-1.5 font-semibold text-red-600 hover:bg-red-500/10 cursor-pointer">
                    O‘chirish
                  </button>
                </span>
              </div>
              {cardError ? <p className="text-xs text-red-600">{cardError}</p> : null}
              {editCard ? (
                <div className="space-y-2 rounded-2xl border border-stone-200 dark:border-stone-700 p-4 text-left">
                  {(['englishWord', 'meaningUz', 'exampleEn'] as const).map((f) => (
                    <label key={f} className="block text-[11px] font-semibold text-stone-500">
                      {f === 'englishWord' ? 'So‘z' : f === 'meaningUz' ? 'Tarjima' : 'Misol'}
                      <input
                        value={editCard[f]}
                        onChange={(e) => setEditCard({ ...editCard, [f]: e.target.value })}
                        className="mt-1 w-full rounded-xl border border-stone-200 dark:border-stone-700 bg-transparent px-3 py-2 text-sm text-stone-900 dark:text-white"
                      />
                    </label>
                  ))}
                  <div className="flex justify-end gap-2 pt-1">
                    <button type="button" onClick={() => setEditCard(null)} className="rounded-full px-4 py-2 text-xs font-semibold hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer">
                      Bekor qilish
                    </button>
                    <button type="button" onClick={saveEdit} className="rounded-full bg-stone-900 px-4 py-2 text-xs font-semibold text-white dark:bg-white dark:text-stone-900 cursor-pointer">
                      Saqlash
                    </button>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>
      )}

      {/* 3. VOCABULARY BLITZ 60s XP GAME TAB */}
      {activeTab === 'xp_blitz' && (
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl p-6 sm:p-10 shadow-xs max-w-xl mx-auto text-center space-y-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-amber-500 flex items-center gap-1.5">
              <Zap className="w-4 h-4 fill-amber-500" />
              <span>Vocabulary Blitz (60s XP Arena){usingStarter ? ' · standart to‘plam' : ''}</span>
            </span>

            <div className="flex items-center gap-2 font-mono font-bold text-xs">
              <Clock className="w-3.5 h-3.5 text-rose-500" />
              <span className={blitzSeconds < 15 ? 'text-red-500 font-black animate-pulse' : ''}>
                {blitzSeconds}s
              </span>
            </div>
          </div>

          {!blitzActive && !blitzFinished ? (
            <div className="py-8 space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-amber-500/20 text-amber-500 flex items-center justify-center mx-auto shadow-md">
                <Flame className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-stone-900 dark:text-white">
                60 Soniyalik Tezkor Lug'at Jangi
              </h3>
              <p className="text-xs text-stone-500 max-w-sm mx-auto leading-relaxed">
                Har bir to'g'ri C1 sinonim uchun 30-35 XP oling va Leaderboard reytingida yuqoriga ko'tariling!
              </p>
              <button
                onClick={handleStartBlitz}
                className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-rose-600 hover:opacity-90 text-white font-black text-xs shadow-lg cursor-pointer"
              >
                Boshlash (Start Blitz)
              </button>
            </div>
          ) : blitzActive ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between text-xs text-stone-400">
                <span>Savol: {blitzCardIdx + 1} / {rankedCards.length}</span>
                <span className="font-bold text-amber-500">To'plangan XP: +{blitzScore}</span>
              </div>

              <div className="p-6 rounded-2xl bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800">
                <span className="text-[10px] font-bold text-cyan-500 uppercase tracking-wider block mb-1">
                  C1 Sinonimini Toping:
                </span>
                <h4 className="text-2xl font-black text-stone-900 dark:text-white mb-1">
                  {rankedCards[blitzCardIdx]?.word}
                </h4>
                <div className="text-xs text-stone-500">
                  {rankedCards[blitzCardIdx]?.meaningUz}
                </div>
              </div>

              {/* Typed answer, checked by Jev */}
              <form onSubmit={submitBlitz} className="space-y-3">
                <label htmlFor="blitz-answer" className="sr-only">Javobingiz</label>
                <input
                  id="blitz-answer"
                  autoFocus
                  autoComplete="off"
                  value={blitzInput}
                  disabled={!!blitzVerdict || blitzChecking}
                  onChange={(e) => setBlitzInput(e.target.value)}
                  placeholder="C1 sinonimini yozing…"
                  maxLength={120}
                  className="w-full rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 px-4 py-3 text-sm font-bold text-stone-900 dark:text-white outline-none focus:border-amber-500 disabled:opacity-70"
                />
                <button
                  type="submit"
                  disabled={!!blitzVerdict || blitzChecking || !blitzInput.trim()}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-rose-600 text-white font-black text-xs disabled:opacity-50 cursor-pointer"
                >
                  {blitzChecking ? 'Jev tekshirmoqda…' : 'Tekshirish'}
                </button>
              </form>
              {blitzVerdict ? (
                <div role="status" className={`rounded-2xl p-3 text-xs font-bold ${blitzVerdict.match ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'bg-rose-500/10 text-rose-700 dark:text-rose-300'}`}>
                  {blitzVerdict.match ? '✓ To‘g‘ri!' : `✗ To‘g‘ri javob: ${blitzVerdict.correct}`}
                  <span className="ml-2 font-normal opacity-70">
                    {blitzVerdict.source === 'jev' ? `(Jev ${Math.round((blitzVerdict.probability ?? 0) * 100)}%)` : blitzVerdict.source === 'local' ? '(mahalliy tekshiruv)' : ''}
                  </span>
                </div>
              ) : null}
            </div>
          ) : (
            /* Finished Blitz Screen */
            <div className="py-6 space-y-4">
              <Award className="w-14 h-14 text-amber-500 mx-auto" />
              <h3 className="text-2xl font-black text-stone-900 dark:text-white">
                Vaqt Tugadi!
              </h3>
              <div className="text-3xl font-black text-amber-500 font-mono">
                +{blitzScore} XP To'pladingiz!
              </div>
              <p className="text-xs text-stone-500">
                Bu natija shu sessiya uchun ko‘rsatiladi; XP reytingga saqlanmaydi.
              </p>
              <button
                onClick={handleStartBlitz}
                className="px-6 py-2.5 rounded-xl bg-stone-900 dark:bg-white text-white dark:text-stone-900 font-bold text-xs cursor-pointer"
              >
                Yana O'ynash
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * "Tushunganingizni tekshiring": the student types the Uzbek meaning of the English word, Jev checks it.
 * The meaning list is taken from the translator's own result, so Jev judges against real content.
 */
const JevPractice: React.FC<{ word: string; meaning: string }> = ({ word, meaning }) => {
  const [value, setValue] = useState('');
  const [result, setResult] = useState<null | { match: boolean; source: string; probability?: number | null }>(null);
  const [busy, setBusy] = useState(false);
  const accepted = meaning.split(/[,;/]/).map((x) => x.trim()).filter(Boolean);
  const check = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim() || busy || accepted.length === 0) return;
    setBusy(true);
    setResult(null);
    setResult(await checkTyped(word, accepted, value));
    setBusy(false);
  };
  return (
    <form onSubmit={check} className="mt-4 space-y-2 rounded-2xl border border-dashed border-stone-300 p-3 dark:border-stone-700">
      <label htmlFor="jev-practice" className="block text-[11px] font-bold uppercase tracking-wider text-stone-500">
        Tushunganingizni tekshiring: “{word}” ning ma’nosi?
      </label>
      <div className="flex gap-2">
        <input
          id="jev-practice"
          value={value}
          onChange={(e) => { setValue(e.target.value); setResult(null); }}
          maxLength={120}
          className="min-w-0 flex-1 rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-bold text-stone-900 outline-none focus:border-amber-500 dark:border-stone-700 dark:bg-stone-900 dark:text-white"
          placeholder="O‘zbekcha ma’nosi"
        />
        <button type="submit" disabled={busy || !value.trim()} className="rounded-xl bg-stone-900 px-3 py-2 text-xs font-bold text-white disabled:opacity-50 dark:bg-white dark:text-stone-900">
          {busy ? '…' : 'Tekshirish'}
        </button>
      </div>
      {result ? (
        <p role="status" className={`text-xs font-bold ${result.match ? 'text-emerald-600 dark:text-emerald-300' : 'text-rose-600 dark:text-rose-300'}`}>
          {result.match ? '✓ To‘g‘ri' : `✗ Ma’nosi: ${meaning}`}
          <span className="ml-2 font-normal opacity-70">{result.source === 'jev' ? `(Jev ${Math.round((result.probability ?? 0) * 100)}%)` : result.source === 'local' ? '(mahalliy tekshiruv)' : ''}</span>
        </p>
      ) : null}
    </form>
  );
};

