export type Role = 'guest' | 'student' | 'owner';

export type VIPTier =
  | 'none'
  | 'free'
  | 'start'
  | 'gold'
  | 'plus'
  | 'pro'
  | 'premium'
  | 'legend'
  | 'individual'
  | (string & {});

export type LearningTrack = 'ielts' | 'cefr' | 'general';

export interface User {
  id: string;
  name: string;
  surname: string;
  phone: string;
  email?: string;
  additionalPhone?: string;
  telegramUsername?: string;
  balance?: number; // Hisob balansi (so'mda)
  role: Role;
  vipTier: VIPTier;
  vipExpiresAt?: string; // ISO date
  password?: string;
  avatar?: string;
  avatarFrame?: string; // e.g. 'neon_cyan', 'gold_flame', 'royal_violet', 'diamond_aurora'
  rankTitle?: string; // e.g. 'Novice Learner', 'Apprentice Scholar', 'Cambridge Polyglot', etc.
  inventory?: string[]; // IDs of unlocked frames, books, items
  purchasedItemIds?: string[];
  nameColor?: string; // e.g. 'gold', 'cyan', 'purple', 'ruby'
  customTitle?: string; // e.g. 'Grammar Master ⚡'
  region?: string;
  track?: LearningTrack; // IELTS, CEFR, General English
  targetScore?: string; // e.g., "IELTS 7.5+", "CEFR C1", "B2+"
  targetBand?: string;
  studyTimeDaily?: string; // e.g., "1 soat / kun"
  xp?: number; // Experience points
  points?: number;
  coins?: number; // EduCoins
  streakDays?: number; // Active streak flame
  streakFreezeCount?: number;
  clanId?: string; // 4-member clan
  readBookIds?: string[];
  isBlocked?: boolean;
  isMuted?: boolean;
  mutedUntil?: string; // ISO date or 'forever'
  muteReason?: string;
  banLevel?: 0 | 1 | 2; // 0: Normal, 1: Temp Warning Ban, 2: Permanent Blacklist
  bannedUntil?: string; // ISO date
  banReason?: string;
  registeredAt: string;
  completedLessons: string[]; // lesson IDs
  lastActiveDate?: string; // YYYY-MM-DD (Tashkent) — drives the streak
  lastDailyQuestDate?: string; // YYYY-MM-DD — daily reward claimed
  completedPackIds?: string[]; // thematic quiz packs already rewarded
}

export type CourseLevel = 'ielts' | 'cefr' | 'general' | 'grammar' | 'vocabulary' | 'masterclass';

export interface Lesson {
  id: string;
  courseId: string;
  moduleId: string;
  title: string;
  description: string;
  videoUrl: string;
  durationMinutes: number;
  pdfUrl?: string;
  notesMarkdown?: string;
  mathFormula?: string; // Or academic lexical formula
  orderIndex: number;
  testId?: string;
  isDemo?: boolean; // 1 ta maxsus bepul demo dars
  lessonType?: 'thematic' | 'regular'; // Mavzulashtirilgan vs Oddiy dars
  requiredPassingPercent?: number; // Foiz (default: 70%)
  track?: LearningTrack;
  lessonCode?: string; // e.g. "EDU-L01"
  /** Hidden from students when false (owner draft). Default: visible. */
  isPublished?: boolean;
  /** WebVTT subtitles for direct video files */
  subtitleUrl?: string;
  /** Downloadable resources shown under the lesson */
  resources?: { title: string; url: string }[];
  /** Homework (vazifa) shown to the student after the lesson. */
  homework?: string;
  /** VIP tiers allowed to watch the video (multi-select). Empty = no tier gate. Checked on the server. */
  videoTiers?: string[];
  /** Bunny Stream video GUID. Used only when BUNNY_STREAM_ENABLED=1 and keys are set on the server. */
  bunnyVideoId?: string;
  vocabularyKeywords?: {
    word: string;
    meaning: string;
    level: 'B1' | 'B2' | 'C1';
    example: string;
  }[];
}

export interface CourseModule {
  id: string;
  courseId: string;
  title: string;
  orderIndex: number;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  level: CourseLevel;
  track?: LearningTrack;
  price: number;
  coverColor: string;
  coverIcon: string;
  published: boolean;
  requiredVIP: VIPTier;
  modules: CourseModule[];
  lessonsCount: number;
  totalDurationMinutes: number;
  createdAt: string;
}

export type TestType = 'mock' | 'quiz' | 'diagnostic' | 'reading' | 'listening' | 'writing' | 'speaking';

export interface Question {
  id: string;
  testId: string;
  prompt: string;
  mathFormula?: string;
  options: string[]; // 4 options [A, B, C, D]
  correctAnswerIndex: number;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
  points?: number;
}

export interface Test {
  id: string;
  title: string;
  description: string;
  type: TestType;
  durationMinutes: number;
  maxScore: number;
  requiredVIP: VIPTier;
  published: boolean;
  questionsCount: number;
  passingScore?: number;
  category?: string;
  createdAt: string;
  track?: LearningTrack;
}

export interface TestAttempt {
  id: string;
  userId: string;
  userName: string;
  testId: string;
  testTitle: string;
  score: number;
  maxScore: number;
  correctCount: number;
  totalQuestions: number;
  answers: Record<string, any>;
  timeSpentSeconds: number;
  createdAt: string;
  percentage?: number;
  track?: LearningTrack;
  cefrLevel?: string;
}

export interface ReadingParagraph {
  label: string; // "A", "B", "C", "D"
  text: string;
}

export type ReadingQuestionType =
  | 'true_false_not_given'
  | 'yes_no_not_given'
  | 'multiple_choice'
  | 'matching_headings'
  | 'matching_statements'
  | 'open_cloze'
  | 'summary_completion';

export interface ReadingQuestion {
  id: string;
  questionNumber: number;
  partNumber?: 1 | 2 | 3 | 4 | 5;
  type: ReadingQuestionType;
  prompt: string;
  options?: string[];
  correctAnswer: string;
  evidenceParagraphLabel?: string;
  evidenceQuote?: string;
  explanation?: string;
  wordLimit?: number; // e.g. 1 for ONE WORD ONLY
}

export interface ReadingShortText {
  label: string; // "A", "B", "C", "D"
  title: string;
  text: string;
}

export interface ReadingPassage {
  id: string;
  passageNumber: number;
  partNumber?: 1 | 2 | 3 | 4 | 5;
  title: string;
  subheading?: string;
  instruction?: string;
  paragraphs?: ReadingParagraph[];
  shortTexts?: ReadingShortText[];
  headingsList?: { key: string; text: string }[];
  statementsList?: { key: string; text: string }[];
  questions: ReadingQuestion[];
}

export interface ReadingTest {
  id: string;
  title: string;
  track: 'ielts' | 'cefr' | 'general';
  durationMinutes: number;
  passages: ReadingPassage[];
}

export interface ListeningQuestion {
  id: string;
  questionNumber: number;
  prompt: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
  timestampSeconds?: number;
}

export interface ListeningSection {
  id: string;
  sectionNumber: number;
  title: string;
  audioUrl: string;
  transcript: string;
  questions: ListeningQuestion[];
}

export interface ListeningTest {
  id: string;
  title: string;
  track: 'ielts' | 'cefr';
  durationMinutes: number;
  sections: ListeningSection[];
}

export interface WritingTask {
  id: string;
  track: 'ielts' | 'cefr';
  taskType: 'task1' | 'task2' | 'cefr_letter' | 'cefr_essay';
  title: string;
  prompt: string;
  imageUrl?: string;
  minWords: number;
  timeSuggestedMinutes: number;
  band9Sample: string;
  c1Sample: string;
}

export interface WritingSubmission {
  id: string;
  userId: string;
  taskId: string;
  essayText: string;
  wordCount: number;
  overallBand: number; // e.g. 7.5
  taskAchievementScore: number;
  coherenceScore: number;
  lexicalScore: number;
  grammarScore: number;
  feedback: string;
  colorCodedErrors: {
    phrase: string;
    type: 'grammar' | 'repetition' | 'cohesion' | 'c1_idiom';
    suggestion: string;
    reason: string;
  }[];
  rewrittenBand9: string;
  rewrittenC1: string;
  createdAt: string;
}

export interface SpeakingCueCard {
  id: string;
  track: 'ielts' | 'cefr';
  part: 1 | 2 | 3 | 'cefr_dual_photo';
  topic: string;
  prompt: string;
  bulletPoints?: string[];
  photoUrls?: string[];
  questions?: string[];
}

export interface SpeakingSubmission {
  id: string;
  userId: string;
  cardId: string;
  part: 1 | 2 | 3 | 'cefr_dual_photo';
  transcript: string;
  overallBand: number;
  fluencyScore: number;
  lexicalScore: number;
  grammarScore: number;
  pronunciationScore: number;
  wpm: number;
  fillerWords: string[];
  fillerWordsCount: number;
  detailedFeedback: string;
  createdAt: string;
}

// Digital Books Library
export interface DigitalBook {
  id: string;
  title: string;
  author: string;
  category: 'ielts' | 'cefr' | 'grammar' | 'vocabulary' | 'readers' | 'fiction';
  track?: LearningTrack; // 'ielts' | 'cefr' | 'general'
  requiredVIP?: VIPTier;
  coverUrl: string;
  level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  pageCount: number;
  isFreeGuest: boolean; // First 4 books are free for guests
  isFreeRegistered: boolean; // First 6 books are free for registered users
  pdfUrl: string;
  description: string;
  downloadAllowed: boolean;
  pages: {
    pageNumber: number;
    title?: string;
    content: string;
  }[];
}

export interface BlacklistedUser {
  id: string;
  phone: string;
  telegramUsername?: string;
  name: string;
  reason: string;
  blacklistedAt: string; // ISO Date
  expiresAt: string; // ISO Date (14 days from blacklist date)
}

// 3-Level Translator & Spaced Repetition Flashcards
export interface VocabLevelDetail {
  word: string;
  ipa: string;
  meaningUz: string;
  examples: { en: string; uz: string }[];
}

export interface VocabTranslationItem {
  id: string;
  englishQuery: string;
  partOfSpeech: string;
  b1: VocabLevelDetail;
  b2: VocabLevelDetail;
  c1: VocabLevelDetail;
}

export interface Flashcard {
  id: string;
  userId: string;
  englishWord: string;
  ipa: string;
  meaningUz: string;
  level: 'B1' | 'B2' | 'C1';
  c1Synonym: string;
  exampleEn: string;
  exampleUz: string;
  intervalDays: number;
  repetitionCount: number;
  easeFactor: number;
  nextReviewDate: string;
  createdAt: string;
}

export interface RankedXPCard {
  id: string;
  word: string;
  meaningUz: string;
  level: 'B1' | 'B2' | 'C1';
  options: string[];
  correctIndex: number;
  c1Alternative: string;
  xpReward: number;
}

// Clans & 4-Member Teams
export interface ClanMember {
  userId: string;
  id?: string;
  name: string;
  avatar?: string;
  role: 'leader' | 'member';
  xpContributed: number;
  xp?: number;
  targetBand?: string;
}

export interface Clan {
  id: string;
  name: string;
  tag: string; // e.g. [APEX]
  crest: string; // Icon or emoji
  description: string;
  motto?: string;
  leaderId: string;
  leaderName?: string;
  members: ClanMember[];
  totalXp: number;
  rank: number;
  trophies?: number;
  createdAt: string;
}

export interface ClanChatMessage {
  id: string;
  clanId: string;
  userId: string;
  userName: string;
  avatar?: string;
  avatarFrame?: string;
  rankBadge?: string;
  vipTier?: VIPTier;
  message: string;
  timestamp: string;
}

export interface GlobalChatMessage {
  id: string;
  userId: string;
  userName: string;
  role: Role;
  vipTier: VIPTier;
  avatar?: string;
  avatarFrame?: string;
  clanTag?: string;
  rankBadge?: string;
  message: string;
  timestamp: string;
}

export interface LiveStreamBroadcast {
  isLive: boolean;
  title: string;
  telegramChannel: string;
  streamUrl: string;
  startedAt?: string;
}

export interface StudentResult {
  id: string;
  studentName: string;
  photoUrl?: string;
  certificateImageUrl?: string;
  region: string;
  certificateType: string; // e.g. "IELTS 8.5 (Academic)", "CEFR C1"
  score: string; // e.g. "Overall 8.5 (L:9, R:8.5, W:8, S:8.5)"
  examDate: string;
  university?: string;
  certificateBadgeColor: string;
  story?: string;
  description?: string;
  isPublished: boolean;
}

export interface SiteSection {
  id: string;
  key: string;
  title: string;
  subtitle: string;
  ctaText?: string;
  ctaLink?: string;
  isVisible: boolean;
  orderIndex: number;
  customData?: Record<string, any>;
}

export interface SupportTicket {
  id: string;
  /** Set when the student was signed in when writing. */
  userId?: string;
  userName: string;
  userPhone: string;
  message: string;
  category: 'kurs' | 'tolov' | 'texnik' | 'boshqa';
  status: 'new' | 'answered' | 'closed';
  replyText?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  targetRole?: 'all' | 'vip' | 'student';
  category?: 'mock_result' | 'deadline' | 'system' | 'streak' | 'deposit';
  linkTab?: string;
  actionText?: string;
  badge?: string;
  priority?: 'normal' | 'high' | 'urgent';
  createdAt: string;
  isRead?: boolean;
}

export interface VIPPlan {
  id: VIPTier;
  name: string;
  priceMonthly: number;
  durationDays: number;
  description: string;
  badge?: string;
  features: string[];
  hasAI: boolean;
  aiDailyLimit: number;
  bookAllowanceCount?: number;
  isPopular?: boolean;
  /** Daily AI minutes of this plan, filled in by the server for display (0 = no limit). */
  aiDailyMinutes?: number;
}

export interface TeacherProfile {
  name: string;
  title: string;
  bio: string;
  photoUrl?: string;
  experienceYears: number;
  studentsCount: number;
  nationalCertCount: number; // IELTS 7.5+ / C1 count
  grantCount: number;
  phone: string;
  telegram: string;
  methodology: string;
}

export interface StudentLeaderboardEntry {
  id: string;
  studentName: string;
  avatar?: string;
  region: string;
  points: number;
  solvedTestsCount: number;
  streakDays: number;
  completedLessonsCount: number;
  nationalCertScore?: string; // e.g. "IELTS 8.0"
  badge: string;
  rank: number;
  tier: 'gold' | 'silver' | 'bronze' | 'top10';
  clanTag?: string;
}

export interface SiteCreator {
  id: string;
  name: string;
  role: string;
  photoUrl: string;
  technologies: string[];
  telegramUsername: string;
  phoneNumber: string;
  bio: string;
}

export interface OlympiadWinner {
  rank: 1 | 2 | 3;
  name: string;
  score: string;
  region: string;
  award: string;
  avatarUrl?: string;
}

export interface ThematicOlympiad {
  id: string;
  title: string;
  season: string; // e.g. "Edu Level Grand Tournament 2026"
  description: string;
  winners: OlympiadWinner[];
  nextTest: {
    title: string;
    targetDate: string; // ISO date for live countdown
    rules: string;
    questionsCount: number;
    durationMinutes: number;
    prizePool: string;
    isRegistrationOpen: boolean;
  };
}

export type BackgroundThemeId =
  | 'midnight_aurora'
  | 'ivory_editorial'
  | 'ocean_glass'
  | 'emerald_academy'
  | 'royal_violet'
  | 'sunset_coral'
  // backwards compatibility aliases:
  | 'minimal'
  | 'cosmic'
  | 'emerald'
  | 'gold'
  | 'formula_live';

export interface SiteThemeConfig {
  activeBackground: BackgroundThemeId;
  allowUserThemeOverride?: boolean;
}

export interface DepositTransaction {
  id: string;
  userId: string;
  userName: string;
  userPhone: string;
  telegramUsername?: string;
  amount: number;
  status: 'pending' | 'completed' | 'rejected';
  method: 'telegram_bot' | 'card' | 'manual';
  paymentCode: string;
  receiptUrl?: string; // To'lov kvitansiyasi / skrinshoti
  cardNumber?: string;
  note?: string;
  createdAt: string;
  approvedAt?: string;
}

export interface TelegramBotSettings {
  botUsername: string; // e.g. "edu_level_bot"
  botName: string;
  isActive: boolean;
  minDepositAmount: number;
  cardOrMerchantInfo: string;
  cardNumber: string;
  cardHolder: string;
  supportTelegram: string;
  autoApprovalDemo: boolean;
  /** Channel for announcements and the subscription check, e.g. "edulevel_english" (without @). */
  channelUsername?: string;
  /** The owner's Telegram username: only this account can use /statistika in the bot. */
  ownerTelegram?: string;
  /** Numeric Telegram id of the owner's account, saved on first use (see src/lib/telegramOwner.ts). Never sent to students. */
  ownerTelegramId?: string;
  /** The lesson every channel member can open from the bot for free (channel bonus). */
  channelLessonId?: string;
  /** Post every newly published lesson to the channel automatically. */
  autoAnnounce?: boolean;
}

export interface AuditLog {
  id: string;
  actor: string;
  action: string;
  entity: string;
  details: string;
  timestamp: string;
}

export interface AISettings {
  customApiKey?: string;
  provider?: 'gemini' | 'groq' | 'openai' | 'openrouter' | 'anthropic' | 'deepseek';
  activeModel?: string;
  providerLabel?: string;
  speedDesc?: string;
  updatedAt?: string;
}

export interface ClanBattleQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  points: number;
  timeLimitSeconds: number;
}

export interface ClanBattleParticipant {
  userId: string;
  userName: string;
  avatar?: string;
  avatarFrame?: string;
  rankBadge?: string;
  clanId: string;
  clanTag: string;
  score: number;
  isReady: boolean;
}

export interface ClanBattleMessage {
  id: string;
  battleId: string;
  userId: string;
  userName: string;
  clanTag: string;
  avatar?: string;
  avatarFrame?: string;
  message: string;
  timestamp: string;
}

export interface ClanBattle {
  id: string;
  title: string;
  category: string;
  clanAId: string;
  clanAName: string;
  clanATag: string;
  clanACrest: string;
  clanBId?: string;
  clanBName?: string;
  clanBTag?: string;
  clanBCrest?: string;
  status: 'waiting' | 'in_progress' | 'finished';
  participants: ClanBattleParticipant[];
  currentQuestionIndex: number;
  questions: ClanBattleQuestion[];
  clanAScore: number;
  clanBScore: number;
  winnerClanId?: string;
  prizeXp: number;
  prizeTrophies: number;
  startedAt?: string;
  endedAt?: string;
}

export interface ThematicQuizPack {
  id: string;
  title: string;
  category: 'grammar' | 'vocab' | 'phrasal_verbs' | 'reading' | 'collocations' | 'prepositions' | 'speaking_idioms';
  description: string;
  level: 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  questionsCount: number;
  rewardXp: number;
  rewardPoints: number;
  icon: string;
  badge: string;
  color: string;
  questions: Question[];
}

export interface ShopItem {
  id: string;
  title: string;
  category: 'frame' | 'color' | 'book' | 'booster' | 'badge';
  pricePoints: number;
  description: string;
  icon: string; // Emoji or SVG icon identifier
  colorClass?: string;
  styleValue?: string;
  fileUrl?: string; // PDF or file link
  isAvailable: boolean;
}

/**
 * The application state as the API sees it. Stored in Postgres (see supabase/migrations and
 * src/lib/db/snapshot.ts). Only the collections the platform actually uses are listed here.
 */
/** Owner-created discount code. Each VIP plan can have its own discount percent. */
export interface PromoCode {
  id: string;
  code: string;
  /** Percent off per VIP plan id. A plan that is missing or 0 is not covered by this code. */
  planDiscounts: Record<string, number>;
  /** 0 = unlimited uses. */
  maxUses: number;
  usedCount: number;
  /** ISO date, or null for no expiry. */
  expiresAt: string | null;
  active: boolean;
  createdAt: string;
}

/** A student's paid purchase (VIP tariff). Deposits are money in; purchases are money out. */
export interface Purchase {
  id: string;
  userId: string;
  /** Amount charged after any discount, in so'm (always positive). */
  amount: number;
  note: string;
  promoCode: string | null;
  createdAt: string;
}

export interface NewsItem {
  id: string;
  title: string;
  body: string;
  imageUrl?: string;
  /** Short label such as "Yangi" or "Aksiya". */
  tag?: string;
  pinned: boolean;
  published: boolean;
  createdAt: string;
}

/** The owner's limited-time VIP for every student. */
export interface VipGift {
  active: boolean;
  tier: string;
  title: string;
  message: string;
  startsAt: string;
  endsAt: string;
}

export interface AppDatabase {
  /** Public news shown in the landing's Yangiliklar section. */
  news: NewsItem[];
  vipGift?: VipGift;
  /** People who asked to hear about news (owner only). */
  newsSubscribers?: Array<{ id: string; contact: string; kind: 'email' | 'phone' | 'telegram'; createdAt: string }>;
  /** Public numbers shown on the landing page, counted by the server. */
  publicStats?: { students: number; activeToday: number };
  /** Owner: daily AI minutes per plan (0 = no limit). */
  /** Owner-written SEO pages (see src/lib/seo/records.ts). Owner-only here; public pages are read straight from the table. */
  seoPages?: import('../lib/seo/records').SeoRecord[];
  /** Owner's AI task routing (see src/lib/aiRouting.ts). Owner-only. */
  aiRouting?: { tasks: Record<string, { primary: string; fallbacks: string[]; timeoutMs?: number }>; disabled: string[]; budgets?: Record<string, { dailyTokens?: number; dailyRequests?: number }>; updatedAt?: string };
  aiLimits?: { freeMinutes: number; planMinutes: Record<string, number>; inPerM?: number; outPerM?: number; capSom?: number };
  /** Internal: what each student had before the gift (never sent to browsers). */
  vipGiftApplied?: Record<string, { tier: string; expiresAt?: string }>;
  users: User[];
  courses: Course[];
  lessons: Lesson[];
  lessonProgress: LessonProgress[];
  tests: Test[];
  questions: Question[];
  testAttempts: TestAttempt[];
  examSessions: ExamSession[];
  readingTests: ReadingTest[];
  listeningTests: ListeningTest[];
  writingTasks: WritingTask[];
  writingSubmissions: WritingSubmission[];
  speakingCards: SpeakingCueCard[];
  speakingSubmissions: SpeakingSubmission[];
  digitalBooks: DigitalBook[];
  shopItems: ShopItem[];
  vocabTranslations: VocabTranslationItem[];
  flashcards: Flashcard[];
  rankedXpCards: RankedXPCard[];
  thematicQuizPacks: ThematicQuizPack[];
  studentResults: StudentResult[];
  depositTransactions: DepositTransaction[];
  supportTickets: SupportTicket[];
  reviews: Review[];
  faqs: FaqItem[];
  vipPlans: VIPPlan[];
  siteSections: SiteSection[];
  teacherProfile: TeacherProfile;
  siteTheme: SiteThemeConfig;
  liveStream: LiveStreamBroadcast;
  /** Owner switches: when coinEnabled is false, the Edu Coin shop and coin rewards are hidden and disabled. */
  /** Platform switches. navHidden lists student menu items the owner hides (see owner/features). */
  features: {
    coinEnabled: boolean;
    navHidden?: string[];
    /** Owner panel sections the owner hid (see src/lib/ownerNav.ts). Locked sections are never hidden. */
    ownerNavHidden?: string[];
    /** Owner panel section names the owner chose (id → name). */
    ownerNavLabels?: Record<string, string>;
    /** Each is on unless the owner switches it off (false). */
    publicEdubek?: boolean;
    introSplash?: boolean;
    aiEnabled?: boolean;
    depositsEnabled?: boolean;
    newsSubscribe?: boolean;
    registrationOpen?: boolean;
    /** Student cabinet pieces and profile sections (on unless false). */
    profileMistakes?: boolean;
    dashTodayPlan?: boolean;
    dashEdubekTip?: boolean;
    /** Edubek sub-features and extra public pieces (on unless false). */
    edubekVoice?: boolean;
    edubekPronunciation?: boolean;
    edubekWordOfDay?: boolean;
    blitzEnabled?: boolean;
    vipGiftBanner?: boolean;
    planCompare?: boolean;
    edubekGames?: boolean;
    /** Owner settings for Edubek: greeting text and whether the figure moves. */
    edubekSettings?: { greeting?: string; animations?: boolean; voiceNotes?: boolean; files?: boolean; stickers?: boolean };
  };
  promoCodes: PromoCode[];
  purchases: Purchase[];
  telegramBotSettings: TelegramBotSettings;
  auditLogs: AuditLog[];
  aiThreads: { userId: string; threads: any[]; updatedAt: string }[];
  aiUsage: { userId: string; day: string; count: number; byOperation: Record<string, number> }[];
  /** Practice exercises (Reading, Listening, Speaking, Writing) written by the owner. */
  exercises: Exercise[];
  /** Each student's submitted exercise attempts. */
  exerciseAttempts: ExerciseAttempt[];
  /** Owner login name (default "jasurbek"). The password is stored only as a hash. */
  ownerUsername: string;
  ownerPasswordHash: string;
}

export type Language = 'uz' | 'uz_cyrl' | 'en' | 'ru';
export type AppSiteMode = 'site1_open' | 'site2_lms' | 'site3_owner' | 'auth';

/** A student/parent opinion shown in the landing testimonials marquee. */
export interface Review {
  id: string;
  userId?: string;
  name: string;
  /** Short context line, e.g. "IELTS 7.5 · Toshkent" */
  subtitle?: string;
  track?: LearningTrack;
  text: string;
  rating: number; // 1–5
  photoUrl?: string;
  status: 'pending' | 'approved' | 'hidden';
  createdAt: string;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  orderIndex: number;
  isVisible: boolean;
}

/** Server-side timed exam attempt (autosave, recovery, duplicate-submit protection). */
export interface ExamSession {
  id: string;
  /** userId, or "guest:<random key>" for visitors */
  ownerKey: string;
  testId: string;
  kind: 'mock' | 'reading' | 'listening';
  startedAt: string;
  endsAt: string;
  answers: Record<string, string | number>;
  updatedAt: string;
  submittedAttemptId?: string;
}

/** Per-student playback progress for a lesson (resume position, watch time). */
export interface LessonProgress {
  userId: string;
  lessonId: string;
  courseId: string;
  position: number; // seconds
  duration: number; // seconds (0 if unknown)
  watchedSeconds: number;
  /** XP for completing this lesson is granted once, the first time it is completed. */
  xpAwarded?: boolean;
  /** The student pressed "Darsni ko'rib bo'ldim"; the lesson test unlocks after this. */
  watched?: boolean;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Mashqlar (practice exercises)
// ---------------------------------------------------------------------------

export type ExerciseSkill = 'reading' | 'listening' | 'speaking' | 'writing';
export type ExerciseLevel = 'A2' | 'B1' | 'B2' | 'C1';
export type ExerciseQuestionType = 'mcq' | 'gap' | 'short';

export interface ExerciseQuestion {
  id: string;
  type: ExerciseQuestionType;
  prompt: string;
  /** mcq only: 2–6 answer options. */
  options?: string[];
  /** mcq: index of the correct option. gap: the expected word or phrase. short: optional model answer. */
  correct?: number | string;
  /** Shown to the student after submitting. */
  explanation?: string;
}

export interface Exercise {
  id: string;
  skill: ExerciseSkill;
  level: ExerciseLevel;
  title: string;
  /** Short instruction shown above the exercise. */
  instructions: string;
  /** Reading text, or the listening transcript (shown after submitting for listening). */
  passage: string;
  /** Listening audio file URL (optional). */
  audioUrl: string;
  questions: ExerciseQuestion[];
  status: 'draft' | 'published';
  source: 'owner_ai' | 'teacher_text' | 'manual';
  createdAt: string;
  updatedAt: string;
}

export interface ExerciseAttempt {
  id: string;
  userId: string;
  exerciseId: string;
  skill: ExerciseSkill;
  answers: Record<string, string | number>;
  /** Points earned on auto-graded questions (mcq and gap). */
  score: number;
  /** Number of auto-graded questions. Short answers are not auto-graded. */
  maxScore: number;
  createdAt: string;
}
