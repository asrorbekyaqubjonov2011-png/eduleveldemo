import React, { useRef, useState } from 'react';
import { TodayPlan } from './TodayPlan';
import { VipGiftBanner } from '../ui/VipGiftBanner';
import { computeStudentAnalytics } from '../../lib/studentAnalytics';
import { useApp } from '../../context/AppContext';
import {
  PlayCircle,
  Award,
  Sparkles,
  Clock,
  ArrowRight,
  ShieldCheck,
  Trophy,
  Flame,
  BookOpen,
  Volume2,
  Mic,
  PenTool,
  Languages,
  Radio,
  ExternalLink,
  Zap,
  Target,
  Coins,
  CheckCircle2,
  BookmarkCheck,
  TrendingUp,
  ChevronRight,
  Check,
  ChevronLeft
} from 'lucide-react';
import { Button, Glass, Pill, StatTile } from '../ui';
import { Counter, Reveal } from '../ui/motion-primitives';
import { cn } from '../ui/styles';
import confetti from 'canvas-confetti';
import { useScrollFx } from '../../lib/motion/useScrollFx';

interface StudentDashboardProps {
  onNavigateTab: (tab: string) => void;
  onOpenCourse: (courseId: string) => void;
  onOpenTest: (testId: string) => void;
}

/** Shared micro-label used across the student surface */
const MICRO = 'text-[10px] font-bold uppercase tracking-[0.14em] text-ink-muted dark:text-stone-400';
const CARD = 'rounded-[1.75rem] border border-line/70 bg-paper-raised/80 backdrop-blur-xl dark:border-white/8 dark:bg-white/[0.035]';
const CARD_SOFT = 'rounded-[1.5rem] border border-line/70 bg-white/55 dark:border-white/8 dark:bg-white/[0.03]';

/** Goal ring — pure SVG, no motion dependency */
const GoalRing: React.FC<{ percent: number; size?: number }> = ({ percent, size = 136 }) => {
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, percent));
  const offset = c - (clamped / 100) * c;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div className="pointer-events-none absolute inset-0 rounded-full bg-ember-400/20 soft-blob dark:bg-ember-500/15" />
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="relative -rotate-90">
        <defs>
          <linearGradient id="goalRingGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FFD166" />
            <stop offset="55%" stopColor="#FF8A2B" />
            <stop offset="100%" stopColor="#EF6C12" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-line/80 dark:text-white/10" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="url(#goalRingGrad)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 900ms cubic-bezier(0.22,1,0.36,1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-[26px] font-extrabold leading-none tabular-nums text-ink dark:text-white">
          {clamped}%
        </span>
        <span className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted dark:text-stone-400">Bajarildi</span>
      </div>
    </div>
  );
};

const UZ_DAYS = ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'];
const UZ_MONTHS = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'];
const formatUzDate = (d: Date) => `${UZ_DAYS[d.getDay()]}, ${d.getDate()}-${UZ_MONTHS[d.getMonth()]}`;

/** One short learning tip a day, the same all day for everyone. */
const DAILY_TIPS = [
  'Har kuni 15 daqiqa ingliz tilida eshiting: bu 2 soatlik haftalik mashqdan foydaliroq.',
  'Yangi so‘zni bitta gap ichida yozing: yakka so‘z tez unutiladi, gap esa esda qoladi.',
  'Gapirishdan qo‘rqmang: Edubek bilan “Suhbat” rejimida xato qilib ko‘ring, u hukm qilmaydi.',
  'Xatolaringizni daftarga yozing va hafta oxirida qayta o‘qing: bir xil xato kamayadi.',
  'IELTS Writing’da avval reja tuzing (2 daqiqa), keyin yozing: tuzilma ballni oshiradi.',
  'Film yoki qo‘shiqni inglizcha subtitr bilan ko‘ring va 3 ta yangi ibora yozib oling.',
  'Test oldidan uxlang: uyqu xotirani mustahkamlaydi, kechasi tong otguncha yodlash emas.'
];

export const StudentDashboard: React.FC<StudentDashboardProps> = ({
  onNavigateTab,
  onOpenCourse,
  onOpenTest
}) => {
  const { db, currentUser, claimDailyQuest, addFlashcard } = useApp();

  const userTrack = currentUser?.track || 'cefr';

  // Strictly filter lessons & courses for the user's specific track
  const trackLessons = db.lessons.filter(l => l.track === userTrack);
  const trackCourses = db.courses.filter(c => c.track === userTrack);

  const totalLessons = trackLessons.length || 1;
  const completedCount = (currentUser?.completedLessons || []).filter(lId =>
    trackLessons.some(tl => tl.id === lId)
  ).length;
  const completionPercentage = Math.round((completedCount / totalLessons) * 100);

  const studentAttempts = db.testAttempts.filter(
    a => a.userId === currentUser?.id || (!currentUser && a.userId === 'guest')
  );
  const avgScore = studentAttempts.length > 0
    ? Math.round(studentAttempts.reduce((acc, a) => acc + (a.percentage || (a.score / a.maxScore * 100)), 0) / studentAttempts.length)
    : 0;

  // Next course & lesson to resume for THIS student track only
  // Continue watching: the most recently played unfinished lesson, otherwise the next incomplete one.
  const lastWatched = [...(db.lessonProgress || [])]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map((p) => trackLessons.find((l) => l.id === p.lessonId))
    .find((l) => l && !currentUser?.completedLessons?.includes(l.id));
  const firstIncompleteLesson =
    lastWatched || trackLessons.find(l => !currentUser?.completedLessons?.includes(l.id)) || trackLessons[0];
  const resumeCourse = firstIncompleteLesson
    ? db.courses.find(c => c.id === firstIncompleteLesson.courseId) || trackCourses[0]
    : trackCourses[0];

  const isVip = Boolean(
    currentUser?.vipTier &&
    currentUser.vipTier !== 'none' &&
    currentUser.vipTier !== 'free' &&
    (!currentUser.vipExpiresAt || new Date(currentUser.vipExpiresAt) > new Date())
  );
  const vipTierLabel = isVip ? `👑 VIP ${currentUser?.vipTier?.toUpperCase()}` : 'ODDIY (TEKIN)';
  const vipExpiresAtLabel = isVip
    ? currentUser?.vipExpiresAt
      ? `Faol: ${new Date(currentUser.vipExpiresAt).toLocaleDateString('uz-UZ')} gacha`
      : 'Faol (Cheksiz VIP Imtiyoz)'
    : 'Aktiv emas (Depozit talab etiladi)';

  const liveStream = db.liveStream;

  // 1. Interactive Daily Quest Checklist State
  const [completedQuestIds, setCompletedQuestIds] = useState<number[]>([]);
  // The server records the claim per day (Tashkent time), so it survives reloads.
  const todayKey = new Date(Date.now() + 5 * 3600 * 1000).toISOString().slice(0, 10);
  const [questClaimedLocal, setQuestClaimed] = useState<boolean>(false);
  const questClaimed = questClaimedLocal || currentUser?.lastDailyQuestDate === todayKey;

  const coinOn = db.features?.coinEnabled !== false;
  const dailyQuests = [
    {
      id: 1,
      title: 'Reading mashqini bajaring: matn va savollar',
      rewardXp: 40,
      rewardCoins: 10,
      tab: 'reading',
      badge: 'Reading'
    },
    {
      id: 2,
      title: 'Writing mashqini bajaring va AI bahosini ko‘ring',
      rewardXp: 50,
      rewardCoins: 10,
      tab: 'writing',
      badge: 'Writing AI'
    },
    {
      id: 3,
      title: 'Speaking mashqiga javob yozing va AI tahlilini ko‘ring',
      rewardXp: 60,
      rewardCoins: 15,
      tab: 'speaking',
      badge: 'Speaking'
    }
  ];
  // A reward already claimed today means all of today's quests were completed (the checklist itself is not stored).
  const doneQuestIds = questClaimed ? dailyQuests.map((q) => q.id) : completedQuestIds;

  const toggleQuest = (id: number) => {
    if (questClaimed) return;
    setCompletedQuestIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleClaimDailyQuest = async () => {
    if (questClaimed || doneQuestIds.length < dailyQuests.length) return;
    const res = await claimDailyQuest();
    if (res?.success) {
      setQuestClaimed(true);
      confetti({ particleCount: 70, spread: 65, origin: { y: 0.6 } });
    } else if (res?.message?.includes('allaqachon')) {
      setQuestClaimed(true);
    }
  };

  // 2. Interactive 5-Word C1 Academic Deck State
  const [wordIndex, setWordIndex] = useState<number>(0);
  const [savedWordsMap, setSavedWordsMap] = useState<Record<string, boolean>>({});
  const [isSpeakingWord, setIsSpeakingWord] = useState<boolean>(false);

  const dailyWordsDeck = [
    {
      word: 'Substantiate',
      ipa: '/səbˈstæn.ʃi.eɪt/',
      pos: 'verb · C1 Academic',
      meaningUz: 'Dalillar bilan asoslamoq, tasdiqlamoq, isbotlamoq',
      exampleEn: 'The researcher failed to substantiate their assertions with empirical scientific evidence.',
      exampleUz: 'Tadqiqotchi o‘z da’volarini empirik ilmiy dalillar bilan asoslay olmadi.',
      synonyms: 'corroborate, validate, authenticate'
    },
    {
      word: 'Ubiquitous',
      ipa: '/juːˈbɪk.wɪ.təs/',
      pos: 'adjective · C1 Academic',
      meaningUz: 'Hamma joyda uchraydigan, keng tarqalgan',
      exampleEn: 'Microplastics have become ubiquitous across marine ecosystems worldwide.',
      exampleUz: 'Mikroplastiklar butun dunyo dengiz ekotizimlarida hamma joyda uchraydigan bo‘lib qoldi.',
      synonyms: 'omnipresent, pervasive, universal'
    },
    {
      word: 'Ameliorate',
      ipa: '/əˈmiː.li.ə.reɪt/',
      pos: 'verb · C1 Formal',
      meaningUz: 'Yaxshilamoq, yumshatmoq (muammo yoki holatni)',
      exampleEn: 'Urban forestry initiatives can significantly ameliorate the urban heat island effect.',
      exampleUz: 'Shahar o‘rmonchiligi tashabbuslari shahar issiqlik oroli ta’sirini sezilarli darajada yumshatishi mumkin.',
      synonyms: 'mitigate, alleviate, improve'
    },
    {
      word: 'Paradigm',
      ipa: '/ˈpær.ə.daɪm/',
      pos: 'noun · C1 Academic',
      meaningUz: 'Namuna, model, ilmiy qarashlar tizimi',
      exampleEn: 'Renewable energy storage has triggered a fundamental paradigm shift in grid engineering.',
      exampleUz: 'Qayta tiklanuvchi energiya saqlash tarmoqlari muhandisligida tub burilish yasadi.',
      synonyms: 'framework, model, archetype'
    },
    {
      word: 'Meticulous',
      ipa: '/məˈtɪk.jə.ləs/',
      pos: 'adjective · C1 Academic',
      meaningUz: 'O‘ta sinchkov, puxta, har bir detalga e’tiborli',
      exampleEn: 'Archaeologists conducted a meticulous excavation of the ancient Silk Road caravanserai.',
      exampleUz: 'Arxeologlar qadimgi Ipak yo‘li karvonsaroyida o‘ta sinchkov qazishma ishlarini olib bordilar.',
      synonyms: 'scrupulous, thorough, painstaking'
    }
  ];

  const dailyWord = dailyWordsDeck[wordIndex] || dailyWordsDeck[0];
  const isWordSaved = Boolean(savedWordsMap[dailyWord.word]);

  const handleSpeakDailyWord = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(dailyWord.word);
      u.lang = 'en-US';
      u.rate = 0.9;
      u.onstart = () => setIsSpeakingWord(true);
      u.onend = () => setIsSpeakingWord(false);
      u.onerror = () => setIsSpeakingWord(false);
      window.speechSynthesis.speak(u);
    }
  };

  const handleSaveDailyWord = () => {
    if (isWordSaved) return;
    addFlashcard({
      englishWord: dailyWord.word,
      ipa: dailyWord.ipa,
      meaningUz: dailyWord.meaningUz,
      level: 'C1',
      c1Synonym: dailyWord.synonyms,
      exampleEn: dailyWord.exampleEn,
      exampleUz: dailyWord.exampleUz
    });
    setSavedWordsMap((prev) => ({ ...prev, [dailyWord.word]: true }));
    confetti({ particleCount: 30, spread: 45, origin: { y: 0.7 } });
  };

  // 3. Skill levels from the student's own results (no sample values)
  const analytics = computeStudentAnalytics(db, currentUser);
  const SKILL_COLORS = ['#FFB45C', '#FFA23C', '#FF8A2B', '#F57A1E'];
  const skills = analytics.skills.map((sk, i) => ({
    label: sk.skill,
    band: sk.samples ? sk.band : '—',
    score: sk.studentScore,
    color: SKILL_COLORS[i % SKILL_COLORS.length]
  }));
  const predictedBand = analytics.latestBand !== null ? analytics.latestBand.toFixed(1) : null;

  const trackBadge =
    userTrack === 'cefr' ? '🇪🇺 CEFR Multilevel Hub' : userTrack === 'general' ? '⚡ General English Arena' : '🇬🇧 IELTS Academic Pro';

  const goalPercent = Math.round((doneQuestIds.length / dailyQuests.length) * 100);

  const recentAttempts = studentAttempts.slice(0, 3);
  const dashRoot = useRef<HTMLDivElement | null>(null);
  useScrollFx(dashRoot);

  const upcomingTests = db.tests.filter((t) => !t.track || t.track === userTrack).slice(0, 3);
  const myRank = (() => {
    const ranked = (db.users || []).filter((u) => u.role === 'student').sort((a, b) => (b.xp || 0) - (a.xp || 0));
    const idx = ranked.findIndex((u) => u.id === currentUser?.id);
    return idx >= 0 ? idx + 1 : null;
  })();
  const rankLabel = myRank ? `#${myRank}` : '—';

  return (
    <div ref={dashRoot} className="animate-fadeIn space-y-8">
      <VipGiftBanner compact />
      {/* Live Stream Banner if Teacher is Live */}
      {liveStream && liveStream.isLive && (
        <Reveal>
          <div className="glass-dark relative overflow-hidden rounded-3xl border border-white/15 p-4 text-white sm:p-5">
            <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-ember-500/30 soft-blob" />
            <div className="relative flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div className="flex items-center gap-3.5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20">
                  <Radio className="h-5 w-5 text-white" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-ember-500 px-2 py-0.5 text-[9.5px] font-black uppercase tracking-[0.14em] text-white">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                      JONLI EFIR
                    </span>
                    <span className="text-[11.5px] font-medium text-white/65">{db.teacherProfile?.name}</span>
                  </div>
                  <h3 className="mt-1 truncate font-display text-[14.5px] font-bold tracking-[-0.01em] sm:text-base">
                    {liveStream.title || 'Jonli efir'}
                  </h3>
                </div>
              </div>

              <a
                href={liveStream.streamUrl || liveStream.telegramChannel || 'https://t.me/edulevel'}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full bg-white px-5 py-2.5 text-[12.5px] font-bold text-ink shadow-[0_12px_30px_-12px_rgba(0,0,0,0.6)] transition-colors hover:bg-stone-100"
              >
                <span>Telegramda Ulanish</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </Reveal>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* HERO — personal welcome + continue learning + today's goal        */}
      {/* ---------------------------------------------------------------- */}
      <Reveal>
        <div className="relative overflow-hidden rounded-[2rem] border border-line/70 bg-gradient-to-br from-paper-raised via-white/70 to-[#fff3e4] p-6 shadow-[0_24px_48px_-16px_rgba(18,16,14,0.18)] sm:p-9 dark:border-white/10 dark:from-[#1b1815] dark:via-[#1b1815] dark:to-[#2a1d12]">
          <div className="animate-orb pointer-events-none absolute -right-24 -top-28 h-96 w-96 rounded-full bg-ember-400/25 soft-blob dark:bg-ember-500/15" />
          <div className="animate-orb pointer-events-none absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-sun-300/40 soft-blob dark:bg-sun-400/10" style={{ animationDelay: '-9s' }} />

          <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-[2rem]">
            <img
              data-dash-parallax
              src="/media/intro-london.webp"
              alt=""
              loading="lazy"
              className="absolute -inset-y-[8%] inset-x-0 h-[116%] w-full object-cover object-right opacity-30 dark:opacity-40"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#fffaf3] via-[#fffaf3]/85 to-[#fffaf3]/10 dark:from-[#1b1815] dark:via-[#1b1815]/85 dark:to-[#1b1815]/20" />
          </div>

          <div className="relative z-10 grid gap-8 lg:grid-cols-12 lg:gap-10">
            {/* Left: welcome */}
            <div className="lg:col-span-7">
              <div className="flex flex-wrap items-center gap-2">
                <Pill tone="ember">
                  <Sparkles className="h-3 w-3" />
                  {trackBadge}
                </Pill>
                <span className="text-[11.5px] font-medium text-ink-muted dark:text-stone-400">
                  {formatUzDate(new Date())}
                </span>
              </div>

              <h1 className="mt-5 font-display text-[clamp(1.9rem,4.2vw,2.95rem)] font-extrabold leading-[1.02] tracking-[-0.035em] text-balance text-ink dark:text-white">
                Xush kelibsiz,{' '}
                <span className="text-ember-gradient-static">{currentUser?.name || 'Talaba'}</span>!
              </h1>
              <p className="mt-3 max-w-xl text-[13.5px] leading-relaxed text-ink-muted dark:text-stone-400">
                {userTrack === 'cefr'
                  ? 'Bugungi mashqlar tayyor: Reading, Listening, Speaking va Writing. Javoblaringiz darhol tekshiriladi.'
                  : userTrack === 'general'
                  ? 'Bugun General English amaliy muloqot va leksika arenasida o‘z darajangizni oshiring. Kundalik darslar va viktorinalar siz uchun tayyor!'
                  : 'Bugun 4-ko‘nikmali IELTS Academic arenasida o‘z darajangizni oshiring. AI Writing Baholovchi va Virtual Speaking imtihonchisi siz uchun doim faol!'}
              </p>

              {db.features?.dashEdubekTip === false ? null : (<p className="mt-4 max-w-xl rounded-2xl bg-[#f2650f]/[0.07] px-4 py-3 text-[13px] leading-relaxed text-[#8a3a09] dark:bg-[#ffa149]/10 dark:text-[#ffc08a]">
                <b>Edubek maslahati:</b> {DAILY_TIPS[Math.floor(Date.now() / 86400000) % DAILY_TIPS.length]}
              </p>)}

              {db.features?.dashTodayPlan === false ? null : <div className="mt-6"><TodayPlan onNavigateTab={onNavigateTab} /></div>}

              {/* Continue learning — the single clear primary action */}
              {resumeCourse && firstIncompleteLesson && (
                <div className="mt-6 rounded-[1.5rem] border border-line/80 bg-white/65 p-4 backdrop-blur-xl shadow-[0_12px_28px_-18px_rgba(18,16,14,0.35)] sm:p-5 dark:border-white/10 dark:bg-white/[0.05]">
                  <div className="flex items-center justify-between gap-3">
                    <span className={cn(MICRO, 'inline-flex items-center gap-1.5')}>
                      <span className="h-1.5 w-1.5 rounded-full bg-ember-500" />
                      Ketma-ketlikdagi Navbatdagi Dars
                    </span>
                    <span className="hidden text-[11px] font-semibold tabular-nums text-ink-muted sm:block dark:text-stone-400">
                      {completionPercentage}% tugatilgan
                    </span>
                  </div>

                  <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-3.5">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-b from-ember-400 to-ember-600 text-white shadow-[0_12px_26px_-12px_rgba(239,108,18,0.7)]">
                        <PlayCircle className="h-[22px] w-[22px]" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate font-display text-[15.5px] font-extrabold tracking-[-0.01em] text-ink dark:text-white">
                          {firstIncompleteLesson.title}
                        </h3>
                        <p className="mt-0.5 truncate text-[11.5px] text-ink-muted dark:text-stone-400">
                          Kurs: {resumeCourse.title} · {firstIncompleteLesson.durationMinutes} daqiqa · Test o‘tish: 70%
                        </p>
                      </div>
                    </div>
                    <Button variant="ember" size="md" className="shrink-0" onClick={() => onOpenCourse(resumeCourse.id)}>
                      <span>Darsni Boshlash</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-line/70 dark:bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-sun-400 via-ember-500 to-ember-700 transition-all duration-700"
                      data-scrub-bar
                      style={{ width: `${Math.max(4, completionPercentage)}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="mt-5 flex flex-wrap items-center gap-2.5">
                <Button variant="primary" size="sm" onClick={() => onNavigateTab('mashqlar')}>
                  <BookOpen className="h-4 w-4" />
                  <span>
                    Mashqlarni ochish
                  </span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => onNavigateTab('vip')}>
                  <ShieldCheck className="h-4 w-4 text-ember-600 dark:text-ember-400" />
                  <span>{isVip ? 'Tarifni Boshqarish' : 'Depozit & VIP Faollashtirish'}</span>
                </Button>
              </div>
            </div>

            {/* Right: today's goal ring + VIP chip */}
            <div className="flex flex-col gap-3 lg:col-span-5">
              <div className="glass-2 flex flex-1 flex-col items-center justify-center gap-5 rounded-[1.5rem] p-5 sm:flex-row sm:justify-between sm:p-6 lg:flex-col lg:items-center">
                <GoalRing percent={goalPercent} />
                <div className="w-full text-center sm:text-left lg:text-center">
                  <div className={MICRO}>Bugungi Maqsad</div>
                  <div className="mt-1 font-display text-[17px] font-extrabold tracking-[-0.02em] text-ink dark:text-white">
                    {doneQuestIds.length} / {dailyQuests.length} vazifa
                  </div>
                  <div className="mt-1 text-[11.5px] font-semibold text-ember-700 dark:text-ember-400">
                    {coinOn ? '+150 XP · +35 Coin' : '+150 XP'}
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigateTab('progress')}
                    className="mt-3 inline-flex items-center gap-1 text-[11.5px] font-bold text-ink-muted underline-offset-4 transition-colors hover:text-ink hover:underline dark:text-stone-400 dark:hover:text-white"
                  >
                    <span>Kunlik rejani ko‘rish</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 rounded-[1.25rem] border border-line/70 bg-white/45 px-4 py-3 dark:border-white/8 dark:bg-white/[0.03]">
                <div className="flex min-w-0 items-center gap-2.5">
                  <ShieldCheck className={cn('h-4 w-4 shrink-0', isVip ? 'text-ember-600 dark:text-ember-400' : 'text-ink-muted dark:text-stone-500')} />
                  <div className="min-w-0">
                    <div className="truncate text-[11.5px] font-extrabold uppercase tracking-[0.04em] text-ink dark:text-white">{vipTierLabel}</div>
                    <div className="truncate text-[10.5px] text-ink-muted dark:text-stone-400">
                      <Clock className="mr-1 inline h-3 w-3 align-[-2px]" />
                      {vipExpiresAtLabel}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => onNavigateTab('vip')}
                  className="shrink-0 text-[11px] font-bold text-ember-700 hover:underline dark:text-ember-400"
                >
                  {isVip ? 'Boshqarish' : 'Faollashtirish'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </Reveal>

      {/* ---------------------------------------------------------------- */}
      {/* KPI row — XP / streak / coins / rank                              */}
      {/* ---------------------------------------------------------------- */}
      <Reveal delay={60}>
        <Glass level={1} radius="rounded-[1.5rem]" className="px-4 py-5 sm:px-6">
          <div className="grid grid-cols-2 gap-y-6 divide-line/70 sm:grid-cols-4 sm:divide-x dark:divide-white/5">
            <StatTile
              className="sm:px-5"
              icon={<Zap className="h-4 w-4" />}
              value={<Counter value={currentUser?.xp ?? 0} />}
              label="Tajriba (XP)"
              hint={rankLabel + ' o‘rin reytingda'}
            />
            <StatTile
              className="sm:px-5"
              icon={<Flame className="h-4 w-4" />}
              value={<><Counter value={currentUser?.streakDays || 14} /> <span className="text-[13px] font-bold text-ink-muted dark:text-stone-400">kun</span></>}
              label="Uzluksiz seriya"
              hint="Har kuni mashq qiling"
            />
            {coinOn && (
              <StatTile
                className="sm:px-5"
                icon={<Coins className="h-4 w-4" />}
                value={<Counter value={currentUser?.coins ?? 0} />}
                label="EduCoin"
                hint="Do‘konda sarflash mumkin"
              />
            )}
            <StatTile
              className="sm:px-5"
              icon={<Trophy className="h-4 w-4" />}
              value={rankLabel}
              label="Haftalik o‘rin"
              hint="Ligada ko‘tarilish"
            />
          </div>
        </Glass>
      </Reveal>

      {/* ---------------------------------------------------------------- */}
      {/* Daily activity — quests / word of day / forecast                  */}
      {/* ---------------------------------------------------------------- */}
      <Reveal delay={80}>
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className={MICRO}>Bugungi Faoliyat</div>
            <h2 className="mt-1.5 font-display text-[22px] font-extrabold tracking-[-0.03em] text-ink dark:text-white">
              Kunlik ritmingiz
            </h2>
          </div>
          <button
            onClick={() => onNavigateTab('progress')}
            className="hidden items-center gap-1 text-[12px] font-bold text-ink-muted transition-colors hover:text-ink sm:inline-flex dark:text-stone-400 dark:hover:text-white"
          >
            <span>Reja</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </Reveal>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* ADDITION 1: Interactive Daily Quest Checklist (5 cols) */}
        <Reveal delay={100} className="lg:col-span-5">
          <Glass level={1} radius="rounded-[1.75rem]" className="flex h-full flex-col justify-between p-5 sm:p-6">
            <div>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#fff2e2] text-[15px] dark:bg-ember-500/12">
                    🎯
                  </div>
                  <div>
                    <h3 className="font-display text-[15px] font-extrabold tracking-[-0.01em] text-ink dark:text-white">
                      Kunlik 3 Ta Vazifa Plani
                    </h3>
                    <p className="text-[11px] tabular-nums text-ink-muted dark:text-stone-400">
                      Bajarilgan: {doneQuestIds.length} / {dailyQuests.length}
                    </p>
                  </div>
                </div>
                <Pill tone="ember" className="shrink-0">{coinOn ? '+150 XP · +35 Coin' : '+150 XP'}</Pill>
              </div>

              {/* Checklist items */}
              <div className="mt-5 space-y-2">
                {dailyQuests.map((q) => {
                  const isDone = doneQuestIds.includes(q.id);
                  return (
                    <div
                      key={q.id}
                      className={cn(
                        'group flex cursor-pointer items-center justify-between gap-3 rounded-2xl border p-3 transition-all duration-200',
                        isDone
                          ? 'border-emerald-500/25 bg-emerald-500/[0.06] dark:border-emerald-400/20 dark:bg-emerald-400/[0.07]'
                          : 'border-line/70 bg-white/40 hover:border-ember-500/30 hover:bg-ember-500/[0.04] dark:border-white/8 dark:bg-white/[0.02] dark:hover:bg-white/[0.05]'
                      )}
                      onClick={() => toggleQuest(q.id)}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div
                          className={cn(
                            'flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-lg border transition-colors',
                            isDone
                              ? 'border-emerald-500 bg-emerald-500 text-white'
                              : 'border-line bg-white/60 dark:border-white/20 dark:bg-white/5'
                          )}
                        >
                          {isDone && <Check className="h-3 w-3 stroke-[3.5]" />}
                        </div>
                        <div className="min-w-0">
                          <div
                            className={cn(
                              'text-[12px] font-semibold leading-snug',
                              isDone ? 'text-ink-muted line-through dark:text-stone-500' : 'text-ink dark:text-stone-100'
                            )}
                          >
                            {q.title}
                          </div>
                          <div className="mt-1 flex items-center gap-2 text-[10px] font-semibold tabular-nums">
                            <span className="text-ember-700 dark:text-ember-400">+{q.rewardXp} XP</span>
                            <span className="text-line dark:text-white/15">·</span>
                            <span className="text-ink-muted dark:text-stone-400">{coinOn ? `+${q.rewardCoins} Coin` : ''}</span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onNavigateTab(q.tab);
                        }}
                        className="shrink-0 rounded-full px-2.5 py-1 text-[10.5px] font-extrabold text-ember-700 transition-colors hover:bg-ember-500/10 dark:text-ember-400 dark:hover:bg-ember-400/10"
                      >
                        Boshlash →
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Claim Quest Reward */}
            <div className="mt-5 flex items-center justify-between gap-3 border-t border-line/70 pt-4 dark:border-white/5">
              <div className="text-[10.5px] leading-snug text-ink-muted dark:text-stone-400">
                {questClaimed
                  ? '✓ Mukofot muvaffaqiyatli hisobingizga o‘tkazildi!'
                  : doneQuestIds.length === dailyQuests.length
                  ? 'Barcha vazifalar bajarildi, mukofotni oling!'
                  : `${dailyQuests.length - doneQuestIds.length} ta vazifa qoldi`}
              </div>
              <button
                onClick={handleClaimDailyQuest}
                disabled={questClaimed || doneQuestIds.length < dailyQuests.length}
                className={cn(
                  'shrink-0 rounded-full px-4 py-2 text-[11.5px] font-bold transition-all duration-200 disabled:cursor-not-allowed',
                  questClaimed
                    ? 'cursor-default border border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                    : doneQuestIds.length === dailyQuests.length
                    ? 'bg-gradient-to-b from-ember-400 to-ember-600 text-white shadow-[0_12px_26px_-12px_rgba(239,108,18,0.7)] hover:from-ember-300 hover:to-ember-500'
                    : 'bg-line/60 text-ink-muted/70 dark:bg-white/5 dark:text-stone-500'
                )}
              >
                {questClaimed ? 'Olingan ✓' : 'Mukofotni Yechish'}
              </button>
            </div>
          </Glass>
        </Reveal>

        {/* ADDITION 2: 5-Word Interactive C1 Academic Deck (4 cols) */}
        <Reveal delay={140} className="lg:col-span-4">
          <Glass level={2} radius="rounded-[1.75rem]" className="flex h-full flex-col justify-between p-5 sm:p-6">
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className={MICRO}>
                  Kunlik C1 Leksika ({wordIndex + 1} / {dailyWordsDeck.length})
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setWordIndex((prev) => (prev - 1 + dailyWordsDeck.length) % dailyWordsDeck.length)}
                    className="flex h-7 w-7 items-center justify-center rounded-full border border-line/80 bg-white/60 text-ink-muted transition-colors hover:text-ink dark:border-white/10 dark:bg-white/5 dark:text-stone-400 dark:hover:text-white"
                    title="Oldingi so'z"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setWordIndex((prev) => (prev + 1) % dailyWordsDeck.length)}
                    className="flex h-7 w-7 items-center justify-center rounded-full border border-line/80 bg-white/60 text-ink-muted transition-colors hover:text-ink dark:border-white/10 dark:bg-white/5 dark:text-stone-400 dark:hover:text-white"
                    title="Keyingi so'z"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleSpeakDailyWord}
                    className={cn(
                      'flex h-7 w-7 items-center justify-center rounded-full transition-colors',
                      isSpeakingWord
                        ? 'bg-ember-500 text-white shadow-[0_8px_20px_-8px_rgba(239,108,18,0.8)]'
                        : 'border border-line/80 bg-white/60 text-ink-muted hover:text-ink dark:border-white/10 dark:bg-white/5 dark:text-stone-400 dark:hover:text-white'
                    )}
                    title="Talaffuzni eshitish"
                  >
                    <Volume2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="mt-4">
                <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                  <h4 className="font-display text-[26px] font-extrabold leading-none tracking-[-0.03em] text-ink dark:text-white">
                    {dailyWord.word}
                  </h4>
                  <span className="font-mono text-[11.5px] text-ink-muted dark:text-stone-400">
                    {dailyWord.ipa}
                  </span>
                </div>
                <div className="mt-1.5 text-[10.5px] font-bold uppercase tracking-[0.1em] text-ember-700 dark:text-ember-400">
                  {dailyWord.pos}
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-line/80 bg-white/55 p-3.5 dark:border-white/8 dark:bg-white/[0.04]">
                <div className="text-[12.5px] font-bold leading-snug text-ink dark:text-stone-100">
                  {dailyWord.meaningUz}
                </div>
                <p className="mt-2 border-l-2 border-ember-500/40 pl-3 text-[11.5px] italic leading-relaxed text-ink-muted dark:text-stone-400">
                  &ldquo;{dailyWord.exampleEn}&rdquo;
                </p>
              </div>

              <div className="mt-3 text-[10.5px] leading-relaxed text-ink-muted dark:text-stone-400">
                <span className="font-bold text-ink dark:text-stone-200">Sinonimlar: </span>
                {dailyWord.synonyms}
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between gap-3 border-t border-line/70 pt-4 dark:border-white/5">
              <button
                onClick={() => onNavigateTab('translator')}
                className="text-[11px] font-bold text-ink-muted transition-colors hover:text-ink dark:text-stone-400 dark:hover:text-white"
              >
                Lug‘atga o‘tish →
              </button>
              <button
                onClick={handleSaveDailyWord}
                disabled={isWordSaved}
                className={cn(
                  'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold transition-all',
                  isWordSaved
                    ? 'border border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                    : 'bg-ink text-white hover:bg-ink-soft dark:bg-white dark:text-ink dark:hover:bg-stone-100'
                )}
              >
                <BookmarkCheck className="h-3.5 w-3.5" />
                <span>{isWordSaved ? 'Saqlandi ✓' : 'Kartaga saqlash'}</span>
              </button>
            </div>
          </Glass>
        </Reveal>

        {/* ADDITION 3: Track-Aware Band / Rasch Target & Score Forecaster (3 cols) */}
        <Reveal delay={180} className="lg:col-span-3">
          <Glass level={1} radius="rounded-[1.75rem]" className="flex h-full flex-col justify-between p-5 sm:p-6">
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className={MICRO}>{userTrack === 'cefr' ? 'Rasch 75 Prognozi' : 'IELTS Band Prognozi'}</span>
                <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>

              <div className="mt-5 flex items-end justify-between gap-2">
                <div>
                  <div className="font-display text-[24px] font-extrabold leading-none tracking-[-0.03em] tabular-nums text-ink dark:text-white">
                    {predictedBand ? `Band ${predictedBand}` : '—'}
                  </div>
                  <div className="mt-1.5 text-[10.5px] text-ink-muted dark:text-stone-400">
                    {predictedBand ? 'Oxirgi test bo‘yicha' : 'Hali test yo‘q'}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-display text-[24px] font-extrabold leading-none tracking-[-0.03em] tabular-nums text-ember-600 dark:text-ember-400">
                    {currentUser?.targetScore || (userTrack === 'cefr' ? 'C1' : '8.0+')}
                  </div>
                  <div className="mt-1.5 text-[10.5px] text-ink-muted dark:text-stone-400">Maqsad</div>
                </div>
              </div>

              {/* Target progress bar */}
              <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-line/70 dark:bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-sun-400 via-ember-500 to-ember-700 transition-all duration-700"
                  data-scrub-bar
                  style={{ width: `${predictedBand ? Math.min(100, Math.round((Number(predictedBand) / 9) * 100)) : 0}%` }}
                />
              </div>

              <div className="mt-4 rounded-2xl border border-line/80 bg-white/50 p-3 text-[11px] leading-snug text-ink-muted dark:border-white/8 dark:bg-white/[0.04] dark:text-stone-400">
                <span className="font-bold text-ember-700 dark:text-ember-400">
                  {userTrack === 'cefr' ? '+4 Rasch ball uchun: ' : '+0.5 Band uchun: '}
                </span>
                {userTrack === 'cefr'
                  ? 'Reading Part 3 (Open Cloze) va Part 5 (Summary) mashqlarini ishlang.'
                  : 'Writing Task 2 da leksik xilma-xillikni kuchaytiring.'}
              </div>
            </div>

            <button
              onClick={() => onNavigateTab('progress')}
              className="mt-5 flex w-full items-center justify-center gap-1 rounded-full border border-line/80 bg-white/40 py-2.5 text-[11.5px] font-bold text-ink transition-colors hover:border-ink/25 hover:bg-white/70 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:hover:bg-white/[0.08]"
            >
              <span>Batafsil Tahlil (Recharts)</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </Glass>
        </Reveal>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Skill radar + metric cards                                        */}
      {/* ---------------------------------------------------------------- */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* 6-Skill Progress Radar (7 cols) */}
        <Reveal className="lg:col-span-7">
          <Glass level={1} radius="rounded-[1.75rem]" className="flex h-full flex-col p-6 sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-ember-600 dark:text-ember-400" />
                  <h3 className="font-display text-[16px] font-extrabold tracking-[-0.02em] text-ink dark:text-white">
                    Ko‘nikmalar bo‘yicha natijalar
                  </h3>
                </div>
                <p className="mt-1 text-[11.5px] text-ink-muted dark:text-stone-400">
                  Har bir bo‘lim bo‘yicha topshirilgan testlar va yutuqlaringiz monitoringi
                </p>
              </div>
              <Pill tone="emerald" className="shrink-0">{predictedBand ? `Oxirgi natija: Band ${predictedBand}` : 'Hali natija yo‘q'}</Pill>
            </div>

            {/* Skill Bars */}
            <div className="mt-6 grid flex-1 grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
              {skills.map((s) => (
                <div key={s.label} className="space-y-2">
                  <div className="flex items-baseline justify-between gap-2 text-[11.5px]">
                    <span className="font-semibold text-ink dark:text-stone-200">{s.label}</span>
                    <div className="flex shrink-0 items-baseline gap-1.5 font-mono tabular-nums">
                      <span className="font-extrabold text-ink dark:text-white">{s.band}</span>
                      <span className="text-[10px] text-ink-muted dark:text-stone-500">({s.score}%)</span>
                    </div>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-line/70 dark:bg-white/10">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      data-scrub-bar
                      style={{ width: `${s.score}%`, background: `linear-gradient(90deg, ${s.color}66, ${s.color})` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line/70 pt-4 text-[11px] text-ink-muted dark:border-white/5 dark:text-stone-400">
              <span>
                Maqsadli ball:{' '}
                <strong className="text-ink dark:text-white">
                  {userTrack === 'cefr' ? 'CEFR C1 (68+ ball / UzBMB)' : userTrack === 'general' ? 'General English B2+' : 'IELTS 8.5 Band'}
                </strong>
              </span>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => onNavigateTab('progress')}
                  className="flex items-center gap-1 font-bold text-ember-700 transition-colors hover:text-ember-600 dark:text-ember-400 dark:hover:text-ember-300"
                >
                  <span>To‘liq Progress Insight →</span>
                </button>
                <button
                  onClick={() => onNavigateTab('progress')}
                  className="font-semibold transition-colors hover:text-ink dark:hover:text-white"
                >
                  Reja →
                </button>
              </div>
            </div>
          </Glass>
        </Reveal>

        {/* Course progress + metric chips (5 cols) */}
        <Reveal delay={80} className="lg:col-span-5">
          <div className="grid h-full grid-cols-2 gap-4">
            <Glass level={2} radius="rounded-[1.5rem]" className="col-span-2 flex flex-col justify-between p-5">
              <div className="flex items-center justify-between">
                <span className={MICRO}>Darslar Jarayoni</span>
                <PlayCircle className="h-4 w-4 text-ember-600 dark:text-ember-400" />
              </div>
              <div className="mt-3 flex items-end justify-between gap-4">
                <div className="font-display text-[34px] font-extrabold leading-none tabular-nums tracking-[-0.04em] text-ink dark:text-white">
                  {completionPercentage}%
                </div>
                <span className="pb-1 text-[10.5px] text-ink-muted dark:text-stone-400">
                  {completedCount} / {totalLessons} dars tugatildi
                </span>
              </div>
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-line/70 dark:bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-sun-400 via-ember-500 to-ember-700 transition-all duration-700"
                  data-scrub-bar
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>
            </Glass>

            <div className={cn(CARD_SOFT, 'col-span-2 flex flex-col justify-between p-4')}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted dark:text-stone-400">O‘rtacha Bali</span>
                <Award className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="mt-2 font-display text-[22px] font-extrabold leading-none tabular-nums text-ink dark:text-white">
                {avgScore > 0 ? `${avgScore}%` : '—'}
              </div>
              <div className="mt-2 text-[10px] text-ink-muted dark:text-stone-500">
                {studentAttempts.length} ta topshirilgan sinov
              </div>
            </div>

          </div>
        </Reveal>
      </div>


      {/* ---------------------------------------------------------------- */}
      {/* Quick launch arena                                                */}
      {/* ---------------------------------------------------------------- */}
      <Reveal>
        <div>
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <div className={MICRO}>Tezkor O‘tish</div>
              <h3 className="mt-1.5 flex items-center gap-2 font-display text-[18px] font-extrabold tracking-[-0.02em] text-ink dark:text-white">
                <Sparkles className="h-4 w-4 text-ember-600 dark:text-ember-400" />
                IELTS & CEFR 4-Ko‘nikma Arenasi
              </h3>
            </div>
            <span className="hidden text-[11px] text-ink-muted sm:block dark:text-stone-400">6 ta modul</span>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {[
              {
                label: 'Mashqlar',
                hint: 'Reading, Listening, Speaking, Writing',
                icon: <PenTool className="h-4 w-4" />,
                tab: 'mashqlar'
              },
              {
                label: 'Edubek AI',
                hint: 'Savol bering, tushuntiraman',
                icon: <Volume2 className="h-4 w-4" />,
                tab: 'ai_studio'
              },
              {
                label: '3-Level Lug‘at',
                hint: 'B1/B2/C1 + Blitz',
                icon: <Languages className="h-4 w-4" />,
                tab: 'translator'
              },
              {
                label: 'Kutubxona',
                hint: 'Cambridge & CEFR PDF',
                icon: <BookOpen className="h-4 w-4" />,
                tab: 'library'
              }
            ].map((tile, i) => (
              <button
                key={tile.label}
                onClick={() => onNavigateTab(tile.tab)}
                className="group rounded-[1.35rem] border border-line/70 bg-paper-raised/70 p-4 text-left backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-ember-500/35 hover:shadow-[0_18px_36px_-18px_rgba(18,16,14,0.28)] dark:border-white/8 dark:bg-white/[0.035] dark:hover:border-ember-400/30"
                style={{ transitionDelay: `${i * 10}ms` }}
              >
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-ember-500/10 text-ember-700 transition-colors group-hover:bg-ember-500 group-hover:text-white dark:bg-ember-400/10 dark:text-ember-400 dark:group-hover:bg-ember-500 dark:group-hover:text-white">
                  {tile.icon}
                </div>
                <div className="text-[12px] font-bold text-ink dark:text-white">{tile.label}</div>
                <div className="mt-0.5 text-[10px] leading-snug text-ink-muted dark:text-stone-500">{tile.hint}</div>
              </button>
            ))}
          </div>
        </div>
      </Reveal>

      {/* ---------------------------------------------------------------- */}
      {/* Upcoming exams + announcements                                    */}
      {/* ---------------------------------------------------------------- */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Upcoming exams */}
        <Reveal className="lg:col-span-7">
          <Glass level={1} radius="rounded-[1.75rem]" className="h-full p-6 sm:p-7">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-ember-600 dark:text-ember-400" />
                  <h3 className="font-display text-[15.5px] font-extrabold tracking-[-0.02em] text-ink dark:text-white">
                    Tavsiya Etiladigan IELTS & CEFR Mock Sinovlari
                  </h3>
                </div>
                <p className="mt-1 text-[11.5px] text-ink-muted dark:text-stone-400">
                  Navbatdagi sinovlar — tayyor bo‘lganda boshlang
                </p>
              </div>
              <button
                onClick={() => onNavigateTab('tests')}
                className="shrink-0 text-[11px] font-bold text-ink-muted underline-offset-4 transition-colors hover:text-ink hover:underline dark:text-stone-400 dark:hover:text-white"
              >
                Barchasi →
              </button>
            </div>

            <div className="divide-y divide-line/70 dark:divide-white/5">
              {upcomingTests.map(test => (
                <div key={test.id} className="flex items-center gap-4 py-4 transition-colors hover:bg-ember-500/[0.04]">
                  <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-2xl border border-line/80 bg-white/55 dark:border-white/8 dark:bg-white/[0.04]">
                    <span className="font-display text-[14px] font-extrabold leading-none tabular-nums text-ink dark:text-white">
                      {test.durationMinutes}
                    </span>
                    <span className="mt-0.5 text-[8px] font-bold uppercase tracking-[0.1em] text-ink-muted dark:text-stone-500">daq</span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <h4 className="truncate text-[12.5px] font-bold leading-snug text-ink dark:text-white">
                      {test.title}
                    </h4>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10.5px] text-ink-muted dark:text-stone-400">
                      <span>{test.questionsCount} ta savol</span>
                      <span className="text-line dark:text-white/15">·</span>
                      <span className="font-mono tabular-nums">Maks: {test.maxScore} ball</span>
                    </div>
                  </div>

                  <Button variant="glass" size="sm" className="shrink-0" onClick={() => onOpenTest(test.id)}>
                    Boshlash
                  </Button>
                </div>
              ))}
            </div>
          </Glass>
        </Reveal>

        {/* Announcements / recent activity */}
        <Reveal delay={80} className="lg:col-span-5">
          <Glass level={2} radius="rounded-[1.75rem]" className="flex h-full flex-col p-6 sm:p-7">
            {/* Recent activity strip */}
            {recentAttempts.length > 0 && (
              <div className="mt-4 border-t border-line/70 pt-4 dark:border-white/5">
                <div className={cn(MICRO, 'mb-2.5')}>So‘nggi natijalar</div>
                <div className="space-y-1.5">
                  {recentAttempts.map(a => {
                    const pct = Math.round((a.percentage ?? (a.score / (a.maxScore || 1)) * 100));
                    return (
                      <div key={a.id} className="flex items-center justify-between gap-3 text-[10.5px]">
                        <span className="flex min-w-0 items-center gap-1.5 text-ink-muted dark:text-stone-400">
                          <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-600 dark:text-emerald-400" />
                          <span className="truncate">{a.testTitle}</span>
                        </span>
                        <span className="shrink-0 font-mono font-bold tabular-nums text-ink dark:text-white">{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </Glass>
        </Reveal>
      </div>
    </div>
  );
};
