'use client';

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import {
  Sparkles,
  Award,
  Zap,
  BookOpen,
  CheckCircle,
  AlertCircle,
  Trash2,
  Save,
  FileText,
  Layers,
  ArrowRight,
  Shield,
  HelpCircle,
  CheckCircle2
} from 'lucide-react';
import { ReadingTest, LearningTrack } from '../../types';

export const AIQuizGenerator: React.FC = () => {
  const { db, createTest, createQuestion, createReadingTest } = useApp();

  // STRICT REQUIREMENT: Only 3 tracks to select from
  const [selectedTrack, setSelectedTrack] = useState<LearningTrack>('cefr');

  const [testTitle, setTestTitle] = useState(
    'UzBMB Multilevel CEFR Reading Master Mock (5 Parts)'
  );
  const [inputContent, setInputContent] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(60);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [publishSuccess, setPublishSuccess] = useState(false);
  const [publishedTestTitle, setPublishedTestTitle] = useState('');
  const [generatedTest, setGeneratedTest] = useState<ReadingTest | null>(null);
  const [isTemplate, setIsTemplate] = useState(false);
  const [aiFailed, setAiFailed] = useState(false);

  // When track switches, update title default
  const handleTrackChange = (track: LearningTrack) => {
    setSelectedTrack(track);
    setGeneratedTest(null);
    setPublishSuccess(false);
    setErrorMsg('');

    if (track === 'cefr') {
      setTestTitle('UzBMB Multilevel CEFR Reading Master Mock (5 Parts)');
      setDurationMinutes(60);
    } else if (track === 'ielts') {
      setTestTitle('Cambridge IELTS Academic Reading Simulation');
      setDurationMinutes(60);
    } else {
      setTestTitle('General English Practical Life & Workplace Reading Mock');
      setDurationMinutes(45);
    }
  };

  // Track configurations & details
  const trackDetails: Record<
    LearningTrack,
    {
      title: string;
      badge: string;
      color: string;
      description: string;
      partsInfo: { name: string; desc: string; count: string }[];
      presets: { title: string; prompt: string }[];
    }
  > = {
    cefr: {
      title: 'Cefr multilevel',
      badge: 'UzBMB 75-Ballik Rasch Standarti',
      color: 'from-emerald-600 to-teal-700',
      description:
        'Haqiqiy Multilevel CEFR imtihonining 5 ta qismdan (Part 1-5) iborat to‘liq 35 ta savolli Reading mock testi. Faqat CEFR yo‘nalishidagi o‘quvchilarga ko‘rinadi.',
      partsInfo: [
        {
          name: 'Part 1: Matching Short Texts (Exercise 24)',
          desc: '4 ta qisqa joy/xizmat ta\'rifi (A-D) va 6 ta bayonotni moslashtirish',
          count: '6 savol'
        },
        {
          name: 'Part 2: Matching Headings (Exercise 12)',
          desc: '6 ta paragraf va 8 ta sarlavha (A-H, 2 ta ortiqcha chalg‘ituvchi)',
          count: '6 savol'
        },
        {
          name: 'Part 3: Open Cloze (Exercise 92)',
          desc: 'Matndan bitta so‘z (ONE word) tanlab bo‘shliqlarni to‘ldirish',
          count: '6 savol'
        },
        {
          name: 'Part 4: Narrative & Comprehension (Exercise 6)',
          desc: 'Tarixiy/badiiy matn: 4 ta Multiple Choice + 5 ta True/False/No Info',
          count: '9 savol'
        },
        {
          name: 'Part 5: Analytical Passage (Exercise 3)',
          desc: 'Akademik matn: 4 ta Note Completion (1 ta so‘z/raqam) + 4 ta Multiple Choice',
          count: '8 savol'
        }
      ],
      presets: [
        {
          title: 'CEFR Official Set: Hotels, Water Climate, Moon, Llandudno & Pop Art',
          prompt:
            'Focus on Exercise 24 Hotel Matching, Exercise 12 Water and Climate, Exercise 92 Moon Exploration, Exercise 6 Llandudno Victorian heritage, and Exercise 3 Modern Art Rauschenberg & Warhol.'
        },
        {
          title: 'CEFR Ecology & Technology Set: Smart Agriculture & AI Robotics',
          prompt:
            'Topics: Precision farming in Central Asia, autonomous drones, renewable energy grids, urban vertical gardens, and space materials.'
        }
      ]
    },
    general: {
      title: 'General english',
      badge: 'A2-B2 Amaliy Ingliz Tili',
      color: 'from-amber-500 to-orange-600',
      description:
        'Kundalik hayot, ish joyi xabarlari, e’lonlar, sayohat qo‘llanmalari va umumiy tushunish bo‘yicha amaliy testlar. Faqat General English o‘quvchilariga ko‘rinadi.',
      partsInfo: [
        {
          name: 'Section 1: Workplace Notices & Safety Guidelines',
          desc: 'Ofis qoidalari, transport jadvali va xavfsizlik e\'lonlari tahlili',
          count: '5-8 savol'
        },
        {
          name: 'Section 2: Travel, Culture & Leisure Articles',
          desc: 'Sayohat maqolalari, mehmonxona bron qilish va kontekstual leksika',
          count: '6-10 savol'
        }
      ],
      presets: [
        {
          title: 'Everyday Practical: Coworking Spaces & Eco-Tourism Notice',
          prompt:
            'Focus on modern coworking space rules, smart public transportation, and community volunteer guidelines.'
        },
        {
          title: 'Career & Workplace: Job Interview Etiquette & Client Relations',
          prompt:
            'Business emails, remote collaboration guidelines, and cross-cultural communication protocols.'
        }
      ]
    },
    ielts: {
      title: 'Ielts',
      badge: 'Cambridge Band 0–9.0 Shkalasi',
      color: 'from-purple-600 to-indigo-700',
      description:
        'Cambridge Academic Reading formati: 3 ta chuqur ilmiy/tarixiy passage, True/False/Not Given, Headings va Summary Completion. Faqat IELTS o‘quvchilariga ko‘rinadi.',
      partsInfo: [
        {
          name: 'Passage 1: Science, Nature & Ecology',
          desc: 'True/False/Not Given va Multiple Choice savollari',
          count: '13-14 savol'
        },
        {
          name: 'Passage 2: Social Sciences & Innovation',
          desc: 'Matching Headings va Summary Gap-Fill savollari',
          count: '13-14 savol'
        },
        {
          name: 'Passage 3: Neurobiology, AI & Philosophy',
          desc: 'Yes/No/Not Given va Murakkab Multiple Choice savollari',
          count: '13-14 savol'
        }
      ],
      presets: [
        {
          title: 'IELTS Academic Set: Bilingual Brain, Urban E-Waste & Deep Sleep',
          prompt:
            'Cognitive neuroscience of bilingualism, circular economy in electronics, and circadian rhythm sleep architecture.'
        },
        {
          title: 'IELTS GT Set: Workplace Communication & Environmental Protection',
          prompt:
            'Workplace dispute resolution, renewable wind turbines in coastal areas, and wildlife reintroduction programs.'
        }
      ]
    }
  };

  const currentTrackConfig = trackDetails[selectedTrack];

  // AI Generation Handler
  const handleGenerate = async (useTemplate = false) => {
    setErrorMsg('');
    setAiFailed(false);
    setLoading(true);
    setPublishSuccess(false);

    try {
      const res = await api.generateMockTestWithAi(
        selectedTrack,
        testTitle,
        inputContent.trim(),
        useTemplate
      );

      if (res.success && res.test) {
        setGeneratedTest(res.test);
        setIsTemplate(!!res.isTemplate);
      } else {
        if (res.code === 'AI_UNAVAILABLE' || res.code === 'AI_NOT_CONFIGURED') setAiFailed(true);
        throw new Error(res.message || 'AI test generatsiyasida xatolik yuz berdi');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'AI test generatsiyasida xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  // Publish to LMS
  const handlePublishToLMS = async () => {
    if (!generatedTest) return;

    setLoading(true);
    try {
      // 1. Save to readingTests with exact track
      await createReadingTest({
        id: generatedTest.id || 'reading-' + Date.now(),
        title: generatedTest.title,
        track: selectedTrack,
        durationMinutes: generatedTest.durationMinutes || durationMinutes,
        passages: generatedTest.passages
      });

      // 2. Also register in db.tests for full mock examination
      const allQuestions = (generatedTest.passages || []).flatMap(
        (p) => p.questions || []
      );
      const isCefr = selectedTrack === 'cefr';
      const maxScore = isCefr ? 75 : selectedTrack === 'ielts' ? 9 : 100;

      const newTest = await createTest({
        title: generatedTest.title,
        description: `Owner AI tomonidan professional tarzda tuzilgan ${selectedTrack.toUpperCase()} sinovi (${generatedTest.passages.length} qism, ${allQuestions.length} savol). Faqat ${selectedTrack.toUpperCase()} o‘quvchilariga taqdim etiladi.`,
        durationMinutes: generatedTest.durationMinutes || durationMinutes,
        maxScore,
        type: 'mock',
        published: true,
        category: selectedTrack.toUpperCase(),
        track: selectedTrack
      });

      // Only real multiple-choice questions go into the mock test; text answers stay in the reading test.
      for (const q of allQuestions) {
        if (!Array.isArray(q.options) || q.options.length < 2 || q.options.indexOf(q.correctAnswer) < 0) continue;
        await createQuestion({
          testId: newTest.id,
          prompt: q.prompt,
          options: q.options || ['A', 'B', 'C', 'D'],
          correctAnswerIndex: Array.isArray(q.options)
            ? Math.max(0, q.options.indexOf(q.correctAnswer))
            : 0,
          explanation: q.explanation || 'Rasmiy imtihon mezoniga muvofiq to‘g‘ri javob.',
          difficulty: 'medium',
          points: isCefr ? 2 : 1
        });
      }

      setPublishedTestTitle(generatedTest.title);
      setPublishSuccess(true);
    } catch (err: any) {
      setErrorMsg(err?.message || 'LMS tizimiga saqlashda xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-stone-900 via-stone-950 to-stone-900 text-white rounded-3xl p-6 sm:p-8 shadow-md border border-stone-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-bold mb-2">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>OWNER AI TEST & MOCK GENERATOR</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
            AI Bilan Mock & Reading Testlarini Yaratish
          </h2>
          <p className="text-xs sm:text-sm text-stone-300 mt-1 max-w-2xl leading-relaxed">
            Quyidagi 3 ta yo‘nalishdan birini tanlang. Yaratilgan testlar faqat
            shu yo‘nalishga biriktirilgan o‘quvchilar kabinetida aks etadi.
          </p>
        </div>

      </div>

      {/* STRICT 3-MENU TRACK SELECTOR */}
      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 px-1 flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-[#FF8A2B]" />
          <span>Iltimos, Yo‘nalishni Tanlang (Faqat 3 ta menyu):</span>
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-1.5 bg-white/80 dark:bg-stone-900/80 backdrop-blur-md rounded-2xl border border-stone-200/80 dark:border-stone-800 shadow-xs">
          {[
            {
              id: 'cefr',
              label: 'Cefr multilevel',
              tag: '5-Part Reading · UzBMB 75 Ball',
              icon: '🇪🇺'
            },
            {
              id: 'general',
              label: 'General english',
              tag: 'Kundalik & Amaliy Muloqot',
              icon: '⚡'
            },
            {
              id: 'ielts',
              label: 'Ielts',
              tag: 'Cambridge Academic · Band 9.0',
              icon: '🇬🇧'
            }
          ].map((item) => {
            const isSelected = selectedTrack === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleTrackChange(item.id as LearningTrack)}
                className={`p-4 rounded-xl text-left transition-all relative cursor-pointer border ${
                  isSelected
                    ? 'bg-[#FF8A2B] text-stone-950 font-black border-[#FF8A2B] shadow-md scale-[1.01]'
                    : 'bg-stone-50/60 dark:bg-stone-800/40 text-stone-700 dark:text-stone-300 border-stone-200/80 dark:border-stone-700/80 hover:bg-stone-100 dark:hover:bg-stone-800'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xl">{item.icon}</span>
                  {isSelected && (
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-stone-950 text-white">
                      Tanlangan ✓
                    </span>
                  )}
                </div>
                <div className="text-sm font-extrabold capitalize">{item.label}</div>
                <div
                  className={`text-[11px] mt-0.5 ${
                    isSelected ? 'text-stone-900' : 'text-stone-400'
                  }`}
                >
                  {item.tag}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Track Deep Information & Official Format Card */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white/80 dark:bg-stone-900/80 border border-stone-200/80 dark:border-stone-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 dark:border-stone-800 pb-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
              <span>Yo‘nalish:</span>
              <span className="capitalize font-extrabold text-[#FF8A2B]">
                {currentTrackConfig.title}
              </span>
              <span>·</span>
              <span className="text-emerald-500">{currentTrackConfig.badge}</span>
            </div>
            <p className="text-xs text-stone-500">{currentTrackConfig.description}</p>
          </div>

          <div className="text-right shrink-0">
            <span className="text-xs font-bold text-stone-400">Ko‘rinish doirasi:</span>
            <div className="text-xs font-extrabold text-stone-900 dark:text-white">
              Faqat {currentTrackConfig.title.toUpperCase()} o‘quvchilariga
            </div>
          </div>
        </div>

        {/* Structure Preview of Test Parts */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-2.5">
            📋 Ushbu test qismlari va tuzilishi:
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {currentTrackConfig.partsInfo.map((p, idx) => (
              <div
                key={idx}
                className="p-3 rounded-2xl bg-stone-50/80 dark:bg-stone-800/50 border border-stone-200/60 dark:border-stone-700/60 text-xs space-y-1"
              >
                <div className="flex items-center justify-between font-bold text-stone-900 dark:text-white">
                  <span className="truncate">{p.name}</span>
                  <span className="px-1.5 py-0.5 rounded bg-stone-200 dark:bg-stone-700 text-[10px] font-mono shrink-0 ml-1">
                    {p.count}
                  </span>
                </div>
                <p className="text-[11px] text-stone-500 leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Test Creation Parameters Form */}
      <div className="bg-white/80 dark:bg-stone-900/80 backdrop-blur-md border border-stone-200/80 dark:border-stone-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider mb-1.5">
              Test Nomi *
            </label>
            <input
              type="text"
              value={testTitle}
              onChange={(e) => setTestTitle(e.target.value)}
              placeholder="Masalan: UzBMB Multilevel CEFR Reading Master Mock"
              className="w-full px-4 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs sm:text-sm text-stone-900 dark:text-white focus:outline-hidden focus:border-[#FF8A2B]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider mb-1.5">
              Imtihon Vaqti (Daqiqa)
            </label>
            <input
              type="number"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(parseInt(e.target.value, 10))}
              className="w-full px-4 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs sm:text-sm text-stone-900 dark:text-white focus:outline-hidden focus:border-[#FF8A2B]"
            />
          </div>
        </div>

        {/* Custom Prompt or Content */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider">
              Qo‘shimcha AI Ko‘rsatmasi yoki Asosiy Mavzular (Ixtiyoriy)
            </label>
            <span className="text-[11px] text-stone-400 font-mono">
              {inputContent.length} belgi
            </span>
          </div>

          <textarea
            rows={4}
            value={inputContent}
            onChange={(e) => setInputContent(e.target.value)}
            placeholder={
              selectedTrack === 'cefr'
                ? "Masalan: Part 1 mehmonxonalar haqida, Part 2 suv va iqlim, Part 3 oyga parvoz va atmosfera, Part 4 Llandudno kurort shahri, Part 5 Robert Rauschenberg va Andy Warhol zamonaviy san'ati bo'lsin..."
                : selectedTrack === 'ielts'
                ? "Masalan: Cambridge 19 standartidagi ilmiy mavzular (neyrobiologiya, ekologik shaharsozlik, sun'iy intellekt)..."
                : "Masalan: Kundalik ish joyi e'lonlari, mehmonxona bron qilish, shahar transporti qoidalari..."
            }
            className="w-full p-4 rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs sm:text-sm text-stone-900 dark:text-white focus:outline-hidden focus:border-[#FF8A2B] leading-relaxed font-mono"
          />
        </div>

        {/* Preset quick buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-stone-400 font-medium">Tezkor shablonlar:</span>
          {currentTrackConfig.presets.map((sp, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setTestTitle(sp.title);
                setInputContent(sp.prompt);
              }}
              className="text-[11px] px-3 py-1 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:border-[#FF8A2B] border border-stone-200 dark:border-stone-700 transition-colors cursor-pointer"
            >
              {sp.title.slice(0, 36)}...
            </button>
          ))}
        </div>

        {/* Generate Button */}
        <div>
          <button
            onClick={() => handleGenerate(false)}
            disabled={loading}
            className="w-full sm:w-auto px-8 py-3.5 text-xs font-black rounded-xl bg-[#FF8A2B] text-stone-950 hover:bg-[#00D6BA] disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 cursor-pointer transition-all"
          >
            <Sparkles className="w-4 h-4 text-stone-950" />
            <span>
              {loading
                ? `AI ${currentTrackConfig.title.toUpperCase()} Testini Shakllantirmoqda...`
                : `AI Bilan ${currentTrackConfig.title.toUpperCase()} Testini Yaratish`}
            </span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs flex items-center gap-2 font-semibold">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="flex-1">{errorMsg}</span>
          {aiFailed ? (
            <button
              type="button"
              onClick={() => handleGenerate(true)}
              className="shrink-0 rounded-full bg-stone-900 px-4 py-2 text-[11px] font-bold text-white dark:bg-white dark:text-stone-900 cursor-pointer"
            >
              Tayyor shablonni yuklash
            </button>
          ) : null}
        </div>
      )}

      {/* Generated Test Results & Publishing Area */}
      {generatedTest && (
        <div className="bg-white/80 dark:bg-stone-900/80 backdrop-blur-md border border-stone-200/80 dark:border-stone-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200/60 dark:border-stone-800 pb-5">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-xs font-bold mb-1">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>
                  {generatedTest.passages.length} Ta Qism · Jami{' '}
                  {generatedTest.passages.reduce(
                    (acc, p) => acc + (p.questions?.length || 0),
                    0
                  )}{' '}
                  Ta Savol Tayyor
                </span>
              </div>
              {isTemplate ? (
                <div className="mb-1 inline-flex items-center rounded-full bg-amber-500/15 px-3 py-1 text-[11px] font-bold text-amber-700 dark:text-amber-300">
                  Tayyor shablon (AI natijasi emas) — chop etishdan oldin tekshiring
                </div>
              ) : null}
              <h3 className="font-black text-lg text-stone-900 dark:text-white">
                {generatedTest.title}
              </h3>
              <p className="text-xs text-stone-400 mt-0.5">
                Biriktirilgan yo‘nalish: <strong>{selectedTrack.toUpperCase()}</strong>{' '}
                · Vaqt: {generatedTest.durationMinutes} daqiqa
              </p>
            </div>

            <button
              onClick={handlePublishToLMS}
              disabled={loading}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-extrabold text-xs shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              <Save className="w-4 h-4" />
              <span>LMS ga Saqlash & O‘quvchilarga Faollashtirish</span>
            </button>
          </div>

          {publishSuccess && (
            <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-800 text-emerald-300 text-xs flex items-center justify-between gap-3 animate-fadeIn">
              <div className="flex items-center gap-2.5 font-bold">
                <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                <span>
                  "{publishedTestTitle}" muvaffaqiyatli saqlandi va faqat{' '}
                  <span className="uppercase underline font-black">
                    {selectedTrack}
                  </span>{' '}
                  yo‘nalishidagi barcha o‘quvchilar kabinetiga joylandi!
                </span>
              </div>
            </div>
          )}

          {/* Passages / Parts Accordion Preview */}
          <div className="space-y-6">
            {generatedTest.passages.map((passage, pIdx) => (
              <div
                key={passage.id || pIdx}
                className="p-5 sm:p-6 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50/60 dark:bg-stone-800/40 space-y-4"
              >
                <div className="flex items-start justify-between gap-3 border-b border-stone-200/50 dark:border-stone-700/50 pb-3">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-950/60 px-2 py-0.5 rounded-md">
                      {passage.partNumber ? `Part ${passage.partNumber}` : `Passage ${passage.passageNumber}`}
                    </span>
                    <h4 className="font-extrabold text-sm sm:text-base text-stone-900 dark:text-white mt-1">
                      {passage.title}
                    </h4>
                    {passage.instruction && (
                      <p className="text-xs text-stone-500 italic mt-0.5">
                        {passage.instruction}
                      </p>
                    )}
                  </div>
                  <span className="text-xs font-mono font-bold text-stone-400">
                    {passage.questions.length} ta savol
                  </span>
                </div>

                {/* Short texts for Part 1 if present */}
                {passage.shortTexts && passage.shortTexts.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {passage.shortTexts.map((st) => (
                      <div
                        key={st.label}
                        className="p-3 rounded-xl bg-white dark:bg-stone-900 border border-stone-200/70 dark:border-stone-700/70 text-xs space-y-1"
                      >
                        <div className="flex items-center gap-1.5 font-bold text-stone-900 dark:text-white">
                          <span className="w-5 h-5 rounded-md bg-[#FF8A2B] text-stone-950 flex items-center justify-center font-black text-[11px]">
                            {st.label}
                          </span>
                          <span>{st.title}</span>
                        </div>
                        <p className="text-stone-600 dark:text-stone-300 text-[11px] leading-relaxed">
                          {st.text}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Headings list for Part 2 if present */}
                {passage.headingsList && passage.headingsList.length > 0 && (
                  <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs space-y-1.5">
                    <span className="font-extrabold text-purple-700 dark:text-purple-300 text-[11px] uppercase tracking-wider block">
                      Sarlavhalar ro‘yxati (List of Headings A-H):
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 font-sans">
                      {passage.headingsList.map((h) => (
                        <div
                          key={h.key}
                          className="flex items-center gap-2 p-1.5 bg-white/60 dark:bg-stone-900/60 rounded-lg text-[11px]"
                        >
                          <span className="w-5 h-5 rounded-md bg-purple-600 text-white font-bold flex items-center justify-center shrink-0">
                            {h.key}
                          </span>
                          <span className="text-stone-700 dark:text-stone-300">{h.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Paragraphs preview */}
                {passage.paragraphs && passage.paragraphs.length > 0 && (
                  <div className="space-y-2 max-h-48 overflow-y-auto p-3 bg-white dark:bg-stone-900 rounded-xl border border-stone-200/60 dark:border-stone-700/60 font-serif text-xs leading-relaxed text-stone-700 dark:text-stone-300">
                    {passage.paragraphs.map((p) => (
                      <div key={p.label} className="space-y-0.5">
                        <strong className="text-purple-600 font-sans">[{p.label}]: </strong>
                        <span>{p.text}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Questions preview */}
                <div className="space-y-2 pt-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400 block">
                    Savollar:
                  </span>
                  <div className="space-y-2">
                    {passage.questions.map((q) => (
                      <div
                        key={q.id || q.questionNumber}
                        className="p-3 rounded-xl bg-white dark:bg-stone-900 border border-stone-200/70 dark:border-stone-700/70 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-[#FF8A2B]">
                              #{q.questionNumber}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-stone-500 uppercase font-mono">
                              {q.type.replace(/_/g, ' ')}
                            </span>
                            <span className="font-semibold text-stone-900 dark:text-white">
                              {q.prompt}
                            </span>
                          </div>
                          {q.options && (
                            <div className="flex flex-wrap gap-1.5 pl-6">
                              {q.options.map((opt, oIdx) => (
                                <span
                                  key={oIdx}
                                  className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                                    opt === q.correctAnswer
                                      ? 'bg-emerald-500/20 text-emerald-500 font-bold border border-emerald-500/40'
                                      : 'bg-stone-100 dark:bg-stone-800 text-stone-500'
                                  }`}
                                >
                                  {opt}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-[11px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                            Javob: {q.correctAnswer}
                          </span>
                          <button
                            onClick={() => {
                              passage.questions = passage.questions.filter(
                                (item) => item.questionNumber !== q.questionNumber
                              );
                              setGeneratedTest({ ...generatedTest });
                            }}
                            className="text-stone-400 hover:text-red-500"
                            title="O‘chirish"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
