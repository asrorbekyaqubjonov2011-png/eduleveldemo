import { NextRequest, NextResponse } from 'next/server';
import { answerTelegramQuestion } from '@/src/lib/telegramTutor';
import { availableFallbacks } from '@/src/lib/aiRouter';
import { checkOwner } from '@/src/lib/telegramOwner';
import { cleanTiming, recordVoiceTurn } from '@/src/lib/voiceMetrics';
import { randomUUID } from 'crypto';
import QRCode from 'qrcode';
import { syncVipGift } from '@/src/lib/vipGift';
import { canWatchLessonVideo, normalizeVideoTiers, parseBunnyVideoId, readBunnyConfig, bunnySignedEmbedUrl } from '@/src/lib/videoAccess';
import { getDatabase, logAudit, withDatabase } from '@/src/lib/dbStore';
import {
  detectAiProviderAndModel,
  executeUniversalAi,
  gradeWritingEssayWithAi,
  evaluateSpeakingWithAi,
  translate3LevelWithAi,
  generatePasteToMockWithAi,
  generateMockTestWithAi,
  generateStudentPracticeTest,
  ownerAssistantReply,
  getTemplateTest,
  generateExercisesFromText,
  AiUnavailableError,
  listGenerativeModels,
  pickGeminiModels,
  probeGenerate,
  streamTutorAnswer,
  type TutorParams
} from '@/src/lib/universalAi';
import { aiCallStore, recordAiStats, readAiStats, statsDay, type AiCallRecord } from '@/src/lib/aiStats';
import { aiMinutesFor, beatAiTime, cleanAiLimits, costSom, readAiSeconds, readAllAiSeconds, DEFAULT_AI_LIMITS } from '@/src/lib/aiTime';
import {
  User,
  Course,
  Lesson,
  Test,
  Question,
  TestAttempt,
  ReadingTest,
  StudentResult,
  SiteSection,
  VIPPlan,
  TeacherProfile,
  DepositTransaction,
  AppDatabase,
  DigitalBook,
  Exercise,
  ExerciseAttempt,
  ExerciseQuestion
} from '@/src/types';
import {
  AuthContext,
  OWNER_ID,
  canActOnUser,
  clearSessionCookie,
  forbidden,
  getAuth,
  getOwnerUsername,
  isBanned,
  verifyOwnerLogin,
  publicUser,
  readToken,
  sanitizeDatabase,
  setSessionCookie,
  unauthorized,
  verifyOwnerSecret
} from '@/src/lib/auth/guards';
import { createSession, deleteSession, revokeUserSessions } from '@/src/lib/auth/session';
import { hashPassword, verifyPassword } from '@/src/lib/auth/password';
import { rateBlockedFor, rateLimit, resetRateLimit } from '@/src/lib/auth/rateLimit';
import { uploadImage, uploadPdf, StorageError, MAX_IMAGE_BYTES, MAX_PDF_BYTES } from '@/src/lib/storage';
import { readUpload, saveUpload } from '@/src/lib/uploadStore';
import { botToken, botSetupStatus, channelMembership, downloadTelegramFile, parseAmount, publicBaseUrl, telegramApi, webhookSecret } from '@/src/lib/telegramBot';
import {
  ADMIN_MENU, BOT_COMMANDS, BOT_MENU, BOT_MENU_OWNER, BOT_WELCOME, profileCard, settingsMarkup, settingsText, welcomeText, CALLBACK_COMMANDS, SUBMENUS, bar, submenuMarkup, channelMarkup, channelText, checkLessonOpen, cleanLessonCode, findLessonByCode,
  helpText, inviteText, lessonBotCode, lessonCardText, lessonCodeTaken, lessonLink, lessonsListText, looksLikeLessonCode, nextLessonCode,
  profileText, progressText, searchText, startLink, statsText
} from '@/src/lib/telegramLessons';
import { OWNER_NAV_ITEMS, OWNER_NAV_LOCKED } from '@/src/lib/ownerNav';
import { AI_FOLLOWUP, BACK_MENU, CANCEL_MENU, IDEAS_MARKUP, NEED_LINK, POST_MARKUP, WORD_FOLLOWUP, card, dateUz, esc, money, num, tierLabel } from '@/src/lib/telegramFormat';
import {
  advanceSession, countSubscribers, endSession, getPoll, getSession, groupLeaderboard, recordAnswer, referralCounts, referralTotals,
  chatFlags, consumeLinkCode, createLinkCode, forgetChat, linkChatToUser, privateChatForUsername, setChatFlag, setPending, setSource, sourceCounts, startSession,
  subscriberBatch, topReferrers, touchChat
} from '@/src/lib/telegramStore';
import { EXTRA_NAMES, runOwnerExtra, runStudentExtra, unlinkChat } from '@/src/lib/telegramExtras';
import {
  adminDeposits, adminTickets, aiKey, approveDeposit, askTutor, draftChannelIdeas, draftChannelPost, ideaFromList, withTyping, dailyText, digestText, notifyOwnerChat, rejectDeposit, faqText, findUserByTelegram, homeworkText, isChannelMember, lessonAnnouncement, newsText, pickTestForQuiz,
  questionPool, randomTopic, reviewFromBot, teacherText, vipText,
  rewardReferralOnLesson, runDailyReminders, sendQuizPoll, sendTrackedQuizPoll, speakingFeedback, transcribeVoice, wordCard
} from '@/src/lib/telegramGrowth';
import { balanceAllChoices, extractDocumentText, generateQuizFromText } from '@/src/lib/aiQuestions';
import { verifyFirebaseIdToken } from '@/src/lib/auth/firebaseToken';
import { DEFAULT_SHOP_ITEMS, DAILY_QUEST_REWARD } from '@/src/data/shopCatalog';
import { AVATAR_FRAMES, calculateNextSm2Review } from '@/src/lib/eduLogic';
import { scoreReading, scoreMcq, sanitizeAnswers, ScoreResult } from '@/src/lib/exam/scoring';
import { gradeThematicPack } from '@/src/lib/exam/thematicGrading';

/** Calendar day in Tashkent (UTC+5) as YYYY-MM-DD. */
function tashkentDay(offsetDays = 0): string {
  const d = new Date(Date.now() + 5 * 3600 * 1000 + offsetDays * 86400 * 1000);
  return d.toISOString().slice(0, 10);
}

/** Daily streak: +1 if the student was active yesterday, unchanged today, reset after a gap. */
function touchStreak(user: User): boolean {
  const today = tashkentDay();
  if (user.lastActiveDate === today) return false;
  const yesterday = tashkentDay(-1);
  if (user.lastActiveDate === yesterday) user.streakDays = (user.streakDays || 0) + 1;
  else if (!user.lastActiveDate) user.streakDays = Math.max(1, user.streakDays || 1);
  else if ((user.streakFreezeCount || 0) > 0 && user.lastActiveDate === tashkentDay(-2)) {
    user.streakFreezeCount = (user.streakFreezeCount || 0) - 1;
    user.streakDays = (user.streakDays || 0) + 1;
  } else user.streakDays = 1;
  user.lastActiveDate = today;
  return true;
}

function clientIp(req: NextRequest): string {
  return (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || req.headers.get('x-real-ip') || 'local';
}

function tooMany(retryAfterSec: number) {
  return NextResponse.json(
    { success: false, message: `Juda ko'p urinish. ${retryAfterSec} soniyadan keyin qayta urinib ko'ring.` },
    { status: 429, headers: { 'Retry-After': String(retryAfterSec) } }
  );
}

// Routes that anyone may call (POST). Everything not listed here needs a session.
/** A plain message from the bot to any chat (rewards and notices). Never throws. */
const telegramNotify = (chatId: string, text: string) => telegramApi('sendMessage', { chat_id: chatId, text }).catch(() => undefined);

/** Posts the weekly digest to the channel, when a channel is set. */
async function postDigest(db: AppDatabase, bot: string) {
  const text = await digestText(db, bot);
  const channel = (db.telegramBotSettings?.channelUsername || '').replace(/^@/, '');
  if (!channel) return { posted: false, text };
  await telegramApi('sendMessage', { chat_id: `@${channel}`, text });
  return { posted: true, text };
}

/** A newly published lesson goes to the channel when the owner turned that on. It never blocks the save. */
function announceNewLesson(db: AppDatabase, lessonId: string) {
  const s = db.telegramBotSettings;
  const channel = (s?.channelUsername || '').replace(/^@/, '');
  if (!s?.autoAnnounce || !channel || !botToken()) return;
  const a = lessonAnnouncement(db, lessonId, (s.botUsername || '').replace(/^@/, ''));
  if (!a) return;
  telegramApi('sendMessage', { chat_id: `@${channel}`, text: a.text, ...(a.markup ? { reply_markup: a.markup } : {}) }).catch(() => undefined);
}

const PUBLIC_POST = new Set(['news/subscribe', 'auth/login', 'auth/register', 'auth/google', 'auth/logout', 'support-tickets', 'test-attempts', 'exams/start', 'exams/save', 'exams/review', 'thematic-packs/grade', 'telegram/webhook', 'telegram/cron']);
// Routes any signed-in user (student or owner) may call. Ownership is checked inside the handler.
const SIGNED_IN_POST = new Set([
  'student/telegram-link',
  'student/economy',
  'lessons/progress',
  'ai/voice-timing',
  'lessons/playback',
  'flashcards',
  'clans/join',
  'reviews/submit',
  'lessons/toggle-complete',
  'chat/global',
  'ai/grade-writing',
  'ai/evaluate-speaking',
  'ai/translate-3level',
  'ai/chat-tutor',
  'ai/chat-tutor-stream',
  'ai/student-test',
  'student/profile',
  'deposits/request',
  'student/password',
  'upload',
  'files/extract-text',
  'exercises/submit',
  'student/promo-check',
  'lessons/quiz-submit'
]);

/**
 * Central authorization: returns the caller's auth context (or null for public routes),
 * or an error response when the caller is not allowed.
 */
/** Paths (any write method) a signed-in user may call; handlers check ownership. */
function isSignedInPath(fullPath: string): boolean {
  return fullPath.startsWith('flashcards/') || fullPath === 'student/ai-threads';
}

/**
 * CSRF defence for cookie sessions: reject writes coming from another site.
 * Browsers send Sec-Fetch-Site / Origin on cross-origin requests; same-origin
 * fetches and non-browser clients (no Origin) pass.
 */
function crossSiteRequest(req: NextRequest): boolean {
  const site = req.headers.get('sec-fetch-site');
  if (site === 'cross-site') return true;
  const origin = req.headers.get('origin');
  if (!origin || origin === 'null') return !!origin;
  try {
    const host = (req.headers.get('x-forwarded-host') || req.headers.get('host') || '').split(',')[0].trim().toLowerCase();
    return new URL(origin).host.toLowerCase() !== host;
  } catch {
    return true;
  }
}

function authorize(req: NextRequest, method: 'POST' | 'PUT' | 'DELETE', fullPath: string): AuthContext | null | NextResponse {
  if (crossSiteRequest(req)) {
    return NextResponse.json({ success: false, message: 'So‘rov rad etildi (CSRF).', code: 'CSRF' }, { status: 403 });
  }
  const auth = getAuth(req);
  if (method === 'POST' && PUBLIC_POST.has(fullPath)) return auth;
  if (!auth) return unauthorized();
  if (method === 'POST' && SIGNED_IN_POST.has(fullPath)) return auth;
  if (isSignedInPath(fullPath)) return auth;
  // All other writes are owner-only (content, finance, users, settings).
  if (auth.role !== 'owner') return forbidden();
  return auth;
}

/**
 * Checks a promo code for one VIP plan and returns the discount in so'm.
 * The server computes every discount; the browser only displays it.
 */
function promoQuote(db: AppDatabase, rawCode: unknown, plan: { id: string; priceMonthly: number }) {
  const code = String(rawCode || '').trim().toUpperCase();
  if (!code) return { ok: true as const, promo: null, percent: 0, discount: 0 };
  const promo = (db.promoCodes || []).find((p) => p.code.toUpperCase() === code);
  if (!promo || !promo.active) return { ok: false as const, message: 'Promo kod topilmadi yoki faol emas.' };
  if (promo.expiresAt && new Date(promo.expiresAt).getTime() <= Date.now()) {
    return { ok: false as const, message: 'Promo kod muddati tugagan.' };
  }
  if (promo.maxUses > 0 && promo.usedCount >= promo.maxUses) {
    return { ok: false as const, message: 'Promo kod ishlatilish limitiga yetgan.' };
  }
  const percent = Number((promo.planDiscounts || {})[plan.id]) || 0;
  if (percent <= 0) return { ok: false as const, message: 'Bu promo kod ushbu tarifga amal qilmaydi.' };
  const discount = Math.floor((Math.max(0, Number(plan.priceMonthly) || 0) * percent) / 100);
  return { ok: true as const, promo, percent, discount };
}

const EXERCISE_SKILLS = ['reading', 'listening', 'speaking', 'writing'] as const;
const EXERCISE_LEVELS = ['A2', 'B1', 'B2', 'C1'] as const;

/** Validates an exercise written by the owner. Returns the cleaned fields or a message for the owner. */
function validateExercise(body: any): { value: Omit<Exercise, 'id' | 'createdAt' | 'updatedAt' | 'source'> } | { error: string } {
  if (!EXERCISE_SKILLS.includes(body.skill)) return { error: 'Ko‘nikma tanlanmagan (Reading, Listening, Speaking yoki Writing)' };
  if (!EXERCISE_LEVELS.includes(body.level)) return { error: 'Daraja tanlanmagan (A2, B1, B2 yoki C1)' };
  const title = String(body.title || '').trim();
  if (!title || title.length > 160) return { error: 'Sarlavha kiriting (160 belgigacha)' };
  const audioUrl = String(body.audioUrl || '').trim().slice(0, 500);
  if (audioUrl && !/^https?:\/\//i.test(audioUrl)) return { error: 'Audio havolasi http:// yoki https:// bilan boshlanishi kerak' };
  const rawQuestions = Array.isArray(body.questions) ? body.questions : [];
  if (rawQuestions.length < 1 || rawQuestions.length > 30) return { error: 'Kamida 1 ta, ko‘pi bilan 30 ta savol kerak' };

  const questions: ExerciseQuestion[] = [];
  for (const [i, raw] of rawQuestions.entries()) {
    const n = i + 1;
    const type = raw?.type;
    const prompt = String(raw?.prompt || '').trim();
    if (type !== 'mcq' && type !== 'gap' && type !== 'short') return { error: `${n}-savol turi noto‘g‘ri` };
    if (!prompt || prompt.length > 800) return { error: `${n}-savol matni bo‘sh yoki juda uzun` };
    const explanation = String(raw?.explanation || '').trim().slice(0, 600);
    const id = `q${n}`;
    if (type === 'mcq') {
      const options = Array.isArray(raw.options) ? raw.options.map((o: any) => String(o).trim()) : [];
      if (options.length < 2 || options.length > 6 || options.some((o: string) => !o || o.length > 240)) {
        return { error: `${n}-savolda 2 dan 6 gacha variant kerak` };
      }
      const correct = Number(raw.correct);
      if (!Number.isInteger(correct) || correct < 0 || correct >= options.length) return { error: `${n}-savolda to‘g‘ri javob belgilanmagan` };
      questions.push({ id, type, prompt, options, correct, explanation });
    } else if (type === 'gap') {
      const correct = String(raw.correct || '').trim();
      if (!correct || correct.length > 120) return { error: `${n}-savolda to‘ldiriladigan so‘z kiritilmagan` };
      if (!prompt.includes('___')) return { error: `${n}-savol matnida bo‘shliq "___" bo‘lishi kerak` };
      questions.push({ id, type, prompt, correct, explanation });
    } else {
      const model = String(raw.correct || '').trim().slice(0, 1500);
      questions.push({ id, type, prompt, correct: model || undefined, explanation });
    }
  }
  return {
    value: {
      skill: body.skill,
      level: body.level,
      title,
      instructions: String(body.instructions || '').trim().slice(0, 300),
      passage: String(body.passage || '').slice(0, 20000),
      audioUrl,
      questions,
      status: body.status === 'published' ? 'published' : 'draft'
    }
  };
}

/** Answers are compared without case, extra spaces or final punctuation. */
const normalizeAnswer = (value: string) => value.trim().toLowerCase().replace(/\s+/g, ' ').replace(/[.,!?;:]+$/, '');

/** Response for a student whose account is banned (see isBanned in guards.ts). */
function bannedResponse(user: User) {
  const until = user.bannedUntil && user.bannedUntil !== 'forever' ? ` ${new Date(user.bannedUntil).toLocaleDateString('uz-UZ')} gacha` : '';
  return NextResponse.json(
    { success: false, message: `Akkauntingiz vaqtincha to‘xtatilgan${until}.${user.banReason ? ' Sabab: ' + user.banReason : ''}`, code: 'BANNED' },
    { status: 403 }
  );
}

function ownerUserPayload(db: ReturnType<typeof getDatabase>) {
  return {
    id: OWNER_ID,
    name: db.teacherProfile?.name || 'Ustoz',
    surname: '',
    phone: db.teacherProfile?.phone,
    role: 'owner' as const,
    vipTier: 'individual'
  };
}

/** Largest deposit accepted in one request (UZS). Keeps amounts inside the bigint range and below 2^53. */
const MAX_DEPOSIT_UZS = 1_000_000_000_000;

// Helper to get effective AI key
function getEffectiveAiKey(): string {
  return (process.env.GEMINI_API_KEY || '').trim();
}

// -------------------------------------------------------------
// GET HANDLER
// -------------------------------------------------------------
async function handleGet(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const resolvedParams = await params;
  const pathParts = resolvedParams.path || [];
  const fullPath = pathParts.join('/');
  const db = getDatabase();

  // GET /api/uploads/<id> — files kept in the database. Receipts are private (owner and uploader only).
  if (pathParts[0] === 'uploads' && pathParts.length === 2) {
    const stored = await readUpload(pathParts[1]);
    if (!stored) return NextResponse.json({ success: false, message: 'Fayl topilmadi' }, { status: 404 });
    if (stored.visibility === 'private') {
      const auth = getAuth(req);
      if (!auth || (auth.role !== 'owner' && auth.userId !== stored.owner_id)) {
        return NextResponse.json({ success: false, message: 'Fayl topilmadi' }, { status: 404 });
      }
    }
    return new NextResponse(new Uint8Array(stored.data), {
      headers: {
        'content-type': stored.mime,
        'cache-control': stored.visibility === 'public' ? 'public, max-age=86400' : 'private, no-store',
        'x-content-type-options': 'nosniff'
      }
    });
  }

  // GET /api/telegram/qr?start=<payload> — a QR code (SVG) of the bot's link, for posters and the channel.
  if (fullPath === 'telegram/qr') {
    const bot = (db.telegramBotSettings?.botUsername || '').replace(/^@/, '');
    if (!bot) return NextResponse.json({ success: false, message: 'Bot username hali kiritilmagan' }, { status: 404 });
    const payload = (req.nextUrl.searchParams.get('start') || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 60);
    const link = payload ? startLink(bot, payload) : `https://t.me/${bot}`;
    const svg = await QRCode.toString(link, { type: 'svg', margin: 1, width: 320 });
    return new NextResponse(svg, { headers: { 'content-type': 'image/svg+xml; charset=utf-8', 'cache-control': 'public, max-age=3600' } });
  }

  // 1. GET /api/db/all
  if (fullPath === 'db/all') {
    return NextResponse.json({ success: true, data: sanitizeDatabase(db, getAuth(req)) });
  }

  // GET /api/auth/me — restores the session after reload
  if (fullPath === 'auth/me') {
    const auth = getAuth(req);
    if (!auth) return NextResponse.json({ success: true, authenticated: false });
    if (auth.role === 'owner') {
      return NextResponse.json({ success: true, authenticated: true, role: 'owner', user: ownerUserPayload(db), ownerUsername: getOwnerUsername(db) });
    }
    if (auth.user) touchStreak(auth.user);
    return NextResponse.json({ success: true, authenticated: true, role: 'student', user: publicUser(auth.user) });
  }

  // GET /api/ai/stats — owner only: what the AI used (models, tokens, time, students)
  if (fullPath === 'ai/stats') {
    if (getAuth(req)?.role !== 'owner') return forbidden();
    const [stats, seconds] = await Promise.all([readAiStats(), readAllAiSeconds()]);
    const currentKey = getEffectiveAiKey();
    const modelOrder = currentKey ? await pickGeminiModels(currentKey).catch(() => [] as string[]) : [];
    const names: Record<string, string> = {};
    for (const u of db.users || []) names[u.id] = `${u.name} ${u.surname || ''}`.trim();
    return NextResponse.json({
      success: true,
      today: statsDay(),
      stats,
      names,
      secondsToday: seconds,
      modelOrder,
      hasKey: !!currentKey,
      limits: db.aiLimits || DEFAULT_AI_LIMITS,
      plans: (db.vipPlans || []).map((p) => ({ id: p.id, name: p.name }))
    });
  }

  // GET /api/student/mistakes — the student's own wrong answers, with the right answer and explanation.
  // Built from their own exercise attempts: the answer key never leaves the server otherwise.
  if (fullPath === 'student/mistakes') {
    const auth = getAuth(req);
    if (!auth || auth.role !== 'student') return unauthorized();
    const exercises = new Map((db.exercises || []).map((e) => [e.id, e]));
    const out: Array<Record<string, unknown>> = [];
    for (const a of (db.exerciseAttempts || []).filter((x) => x.userId === auth.userId)) {
      const ex = exercises.get(a.exerciseId);
      if (!ex) continue;
      for (const q of ex.questions) {
        if (q.type !== 'mcq' && q.type !== 'gap') continue;
        const raw = a.answers?.[q.id];
        if (raw === undefined || raw === '') continue;
        const ok = q.type === 'mcq' ? Number(raw) === Number(q.correct) : normalizeAnswer(String(raw)) === normalizeAnswer(String(q.correct || ''));
        if (ok) continue;
        const show = (v: unknown) => (q.type === 'mcq' ? (q.options || [])[Number(v)] ?? String(v) : String(v ?? ''));
        out.push({ id: `${a.id}:${q.id}`, exerciseId: ex.id, exerciseTitle: ex.title, skill: ex.skill, prompt: q.prompt, given: show(raw), correct: show(q.correct), explanation: q.explanation || '', createdAt: a.createdAt });
      }
    }
    out.sort((x, y) => String(y.createdAt).localeCompare(String(x.createdAt)));
    return NextResponse.json({ success: true, mistakes: out.slice(0, 200) });
  }

  // GET /api/student/ai-threads — the caller's own AI chat threads
  if (fullPath === 'student/ai-threads') {
    const auth = getAuth(req);
    if (!auth) return unauthorized();
    const row = (db.aiThreads || []).find((t) => t.userId === auth.userId);
    return NextResponse.json({ success: true, threads: row?.threads || [] });
  }

  // 2. GET /api/ai/status
  if (fullPath === 'ai/status') {
    const currentKey = getEffectiveAiKey();
    const config = detectAiProviderAndModel(currentKey);
        const isOwner = getAuth(req)?.role === 'owner';
    // Owner only: ?diagnose=1 asks Google live (connectivity, key, which models this key can call).
    const diagnose = isOwner && currentKey && req.nextUrl.searchParams.get('diagnose')
      ? await (async () => {
          const info = await listGenerativeModels(currentKey);
          const tryOrder = await pickGeminiModels(currentKey);
          // ?test=1 also fires one tiny real request at each of the first models, to see which really answer.
          const test = req.nextUrl.searchParams.get('test');
          const prompt = 'Explain the Present Simple tense in 4 short sentences, in Uzbek.';
          const probes = test === '2'
            ? await Promise.all(
                [undefined, { thinkingLevel: 'minimal' }].map((thinking) =>
                  probeGenerate(currentKey, tryOrder[0], { thinking, prompt }).then((r) => ({ variant: JSON.stringify(thinking ?? 'default'), ...r }))
                )
              )
            : test
              ? await Promise.all(tryOrder.slice(0, 4).map((m) => probeGenerate(currentKey, m)))
              : undefined;
          return { ...info, tryOrder, probes };
        })()
      : undefined;
    return NextResponse.json({
      success: true,
      diagnose,
      provider: config.provider,
      activeModel: config.model,
      providerLabel: config.label,
      speedDesc: config.speedDesc,
      hasKey: !!currentKey,
      maskedKey: !isOwner ? undefined : currentKey ? 'Tizim kaliti (GEMINI_API_KEY) faol' : 'Kalit sozlanmagan (GEMINI_API_KEY)'
    });
  }

  return NextResponse.json({ success: false, message: `Endpoint not found: /api/${fullPath}` }, { status: 404 });
}

// -------------------------------------------------------------
// POST HANDLER
// -------------------------------------------------------------
async function handlePost(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const resolvedParams = await params;
  const pathParts = resolvedParams.path || [];
  const fullPath = pathParts.join('/');
  const db = getDatabase();

  let body: any = {};
  try {
    body = await req.json();
  } catch {}

  const authResult = authorize(req, 'POST', fullPath);
  if (authResult instanceof NextResponse) return authResult;
  const auth = authResult;

  // POST /api/auth/logout
  if (fullPath === 'auth/logout') {
    await deleteSession(readToken(req));
    const res = NextResponse.json({ success: true });
    clearSessionCookie(res);
    return res;
  }

  // 1. POST /api/auth/login
  if (fullPath === 'auth/login') {
    const { loginInput, password } = body;
    const rawInput = (loginInput || '').toString().trim();
    const rawPass = (password || '').toString().trim();
    const ip = clientIp(req);
    const limitKey = `login:${ip}:${rawInput.toLowerCase()}`;
    const ipKey = `login-ip:${ip}`;
    // Only wrong passwords count. Many students share one address (school, mobile carrier), so a successful sign-in
    // never uses up anyone's allowance, and the address limit is generous; the per-account limit still stops guessing.
    const waitFor = Math.max(rateBlockedFor(limitKey, 8), rateBlockedFor(ipKey, 60));
    if (waitFor > 0) return tooMany(waitFor);
    const loginFailed = () => {
      rateLimit(limitKey, 8, 15 * 60 * 1000);
      rateLimit(ipKey, 60, 15 * 60 * 1000);
    };

    if (!rawInput && !rawPass) {
      return NextResponse.json({ success: false, message: "Login va parolni kiriting." }, { status: 400 });
    }

    // Owner: dedicated login name + password (hash stored in the database).
    const isOwner = verifyOwnerLogin(rawInput, rawPass, db);

    if (isOwner) {
      resetRateLimit(limitKey);
      const { token } = await createSession(OWNER_ID, 'owner');
      logAudit('Owner', 'LOGIN', 'Auth', 'Owner tizimga kirdi');
      const res = NextResponse.json({ success: true, role: 'owner', user: ownerUserPayload(db) });
      setSessionCookie(res, token);
      return res;
    }

    // Student login by email or phone
    const user = db.users.find((u) => matchesLogin(u, rawInput));

    if (!user) {
      loginFailed();
      return NextResponse.json(
        {
          success: false,
          message: "Ushbu e-mail yoki telefon raqami bilan hisob topilmadi. Iltimos, 'Ro'yxatdan O'tish' bo'limidan o'quvchi hisobini oching."
        },
        { status: 404 }
      );
    }

    if (isBanned(user)) return bannedResponse(user);

    if (user.password) {
      const check = verifyPassword(rawPass, user.password);
      if (!check.ok) {
        loginFailed();
        return NextResponse.json(
          { success: false, message: "Parol noto'g'ri kiritildi. Iltimos, parolingizni qayta kiriting." },
          { status: 400 }
        );
      }
      if (check.needsRehash) {
        user.password = hashPassword(rawPass);
        
      }
    } else if (user.id.startsWith('google-')) {
      return NextResponse.json(
        { success: false, message: "Bu hisob Google orqali ochilgan. Iltimos, 'Google bilan kirish' tugmasidan foydalaning." },
        { status: 400 }
      );
    } else {
      // Legacy accounts without a password: the first login sets it (existing behaviour), now hashed.
      if (rawPass.length < 8) {
        return NextResponse.json(
          { success: false, message: "Bu hisob uchun hali parol o'rnatilmagan. Kamida 8 belgili yangi parol kiriting." },
          { status: 400 }
        );
      }
      user.password = hashPassword(rawPass);
      
    }

    resetRateLimit(limitKey);
    touchStreak(user);
    const { token } = await createSession(user.id, 'student');
    const res = NextResponse.json({ success: true, role: 'student', user: publicUser(user) });
    setSessionCookie(res, token);
    return res;
  }

  // 1.5. POST /api/auth/google (Instant 100% reliable Google Auth)
  if (fullPath === 'auth/google') {
    const { idToken, track } = body;
    const limit = rateLimit(`google:${clientIp(req)}`, 60, 15 * 60 * 1000);
    if (!limit.allowed) return tooMany(limit.retryAfterSec);
    let verified;
    try {
      verified = await verifyFirebaseIdToken(idToken);
    } catch (err: any) {
      return NextResponse.json(
        { success: false, message: `Google orqali kirishni tasdiqlab bo'lmadi: ${err?.message || 'xatolik'}` },
        { status: 401 }
      );
    }
    if (!verified.emailVerified) {
      return NextResponse.json({ success: false, message: 'Google e-mail manzili tasdiqlanmagan' }, { status: 401 });
    }
    const email = verified.email;
    const name = verified.name;
    const avatar = verified.picture;
    const uid = verified.uid;

    const cleanEmail = email.toLowerCase().trim();
    let user = db.users.find((u) => u.email && u.email.toLowerCase() === cleanEmail);

    if (!user) {
      const parts = (name || 'O‘quvchi').trim().split(' ');
      const assignedTrack = track || 'ielts';
      user = {
        id: 'google-' + (uid || Date.now()),
        name: parts[0] || 'O‘quvchi',
        surname: parts.slice(1).join(' ') || '',
        email: cleanEmail,
        phone: '',
        avatar: avatar || undefined,
        role: 'student',
        vipTier: 'none',
        balance: 0,
        xp: 150,
        streakDays: 1,
        streakFreezeCount: 1,
        track: assignedTrack,
        targetScore: assignedTrack === 'cefr' ? 'CEFR C1' : assignedTrack === 'general' ? 'Fluent English' : 'IELTS 7.5+',
        studyTimeDaily: '1.5 soat / kun',
        registeredAt: new Date().toISOString(),
        completedLessons: [],
        readBookIds: []
      };
      db.users.push(user);
      logAudit('GoogleAuth', 'REGISTER', 'User', `Google orqali yangi o'quvchi ro'yxatdan o'tdi: ${user.name} (${user.email}) - Yo'nalish: ${String(user.track || '—').toUpperCase()}`);
      
    } else {
      if (avatar && !user.avatar) {
        user.avatar = avatar;
        
      }
      logAudit('GoogleAuth', 'LOGIN', 'User', `Google orqali kirdi: ${user.name} (${user.email})`);
    }

    if (isBanned(user)) return bannedResponse(user);

    const { token } = await createSession(user.id, 'student');
    const res = NextResponse.json({ success: true, role: 'student', user: publicUser(user) });
    setSessionCookie(res, token);
    return res;
  }

  // 2. POST /api/auth/register
  if (fullPath === 'auth/register') {
    if (db.features?.registrationOpen === false) {
      return NextResponse.json({ success: false, message: 'Hozircha yangi o‘quvchilar qabul qilinmayapti.' }, { status: 403 });
    }
    const { name, surname, identifier, phone, email, password, region, track, targetScore, studyTimeDaily } = body;
    const rawIdentifier = (identifier || phone || email || '').toString().trim();
    const regLimit = rateLimit(`register:${clientIp(req)}`, 25, 60 * 60 * 1000);
    if (!regLimit.allowed) return tooMany(regLimit.retryAfterSec);

    if (!name || !name.toString().trim()) {
      return NextResponse.json({ success: false, message: 'Iltimos, ismingizni kiriting' }, { status: 400 });
    }
    if (!rawIdentifier) {
      return NextResponse.json({ success: false, message: 'Iltimos, telefon raqam yoki e-mail kiriting' }, { status: 400 });
    }
    if (!password || password.toString().trim().length < 8) {
      return NextResponse.json({ success: false, message: "Parol kamida 8 ta belgidan iborat bo'lishi shart" }, { status: 400 });
    }


    const cleanInput = rawIdentifier.toLowerCase();
    const cleanDigits = cleanInput.replace(/\D/g, '');
    const authEmail = cleanInput.includes('@') ? cleanInput : `${cleanDigits || cleanInput}@edulevel.uz`;

    const existing = db.users.find((u) => {
      const uEmail = (u.email || '').toLowerCase();
      const uPhone = (u.phone || '').replace(/\D/g, '');
      const userCleanDigits = rawIdentifier.replace(/\D/g, '');
      if (uEmail === cleanInput || uEmail === authEmail) return true;
      if (userCleanDigits && userCleanDigits.length >= 7 && uPhone.includes(userCleanDigits)) return true;
      return false;
    });

    if (existing) {
      return NextResponse.json(
        { success: false, message: "Ushbu telefon raqami yoki e-mail allaqachon ro'yxatdan o'tgan. Kirish tugmasini bosing." },
        { status: 400 }
      );
    }

    const newUser: User = {
      id: 'user-' + Date.now(),
      name: name.toString().trim(),
      surname: (surname || '').toString().trim(),
      phone: rawIdentifier.includes('@') ? '' : rawIdentifier,
      email: authEmail,
      password: hashPassword(password.toString().trim()),
      region: (region || 'Toshkent shahri').toString().trim(),
      telegramUsername: (body.telegramUsername || '').toString().replace(/^@/, '').slice(0, 64) || undefined,
      track: ['ielts', 'cefr', 'general'].includes(track) ? track : 'ielts',
      targetScore: targetScore || 'IELTS 7.5+',
      studyTimeDaily: studyTimeDaily || '1 soat / kun',
      role: 'student',
      balance: 0,
      vipTier: 'none',
      xp: 100, // Starter registration bonus XP!
      streakDays: 1,
      streakFreezeCount: 1,
      registeredAt: new Date().toISOString(),
      completedLessons: [],
      readBookIds: []
    };

    db.users.push(newUser);
    logAudit('System', 'REGISTER', 'User', `Yangi o'quvchi ro'yxatdan o'tdi: ${name} (${authEmail}) - Yo'nalish: ${String(newUser.track || '—').toUpperCase()}`);
    

    const { token } = await createSession(newUser.id, 'student');
    const res = NextResponse.json({ success: true, user: publicUser(newUser) });
    setSessionCookie(res, token);
    return res;
  }

  // POST /api/auth/owner-change-password (owner only) — change password and/or login name
  if (fullPath === 'auth/owner-change-password') {
    const { oldPassword, newPassword, newUsername } = body;
    if (!verifyOwnerSecret((oldPassword || '').toString(), db)) {
      return NextResponse.json({ success: false, message: 'Joriy parol noto‘g‘ri' }, { status: 400 });
    }
    const nextName = (newUsername || '').toString().trim();
    if (nextName) {
      if (!/^[a-zA-Z0-9._-]{3,32}$/.test(nextName)) {
        return NextResponse.json({ success: false, message: 'Login 3–32 belgidan iborat bo‘lsin (lotin harflari, raqam, . _ -)' }, { status: 400 });
      }
      db.ownerUsername = nextName;
    }
    if (newPassword) {
      if (newPassword.toString().length < 8) {
        return NextResponse.json({ success: false, message: 'Yangi parol kamida 8 ta belgidan iborat bo‘lishi kerak' }, { status: 400 });
      }
      db.ownerPasswordHash = hashPassword(newPassword.toString().trim());
    }
    if (!nextName && !newPassword) {
      return NextResponse.json({ success: false, message: 'O‘zgartirish uchun yangi login yoki parol kiriting' }, { status: 400 });
    }
    await revokeUserSessions(OWNER_ID, 'owner');
    logAudit('Owner', 'CHANGE_CREDENTIALS', 'Auth', `Owner ${newPassword ? 'paroli' : ''}${newPassword && nextName ? ' va ' : ''}${nextName ? 'logini' : ''} yangilandi`);
    
    const { token } = await createSession(OWNER_ID, 'owner');
    const res = NextResponse.json({ success: true, message: 'Ma’lumotlar muvaffaqiyatli yangilandi', ownerUsername: getOwnerUsername(db) });
    setSessionCookie(res, token);
    return res;
  }

  // POST /api/users/update-vip (owner only)
  if (fullPath === 'users/update-vip') {
    const { userId, vipTier, durationDays } = body;
    const user = db.users.find((u) => u.id === userId);
    if (!user) return NextResponse.json({ success: false, message: 'O‘quvchi topilmadi' }, { status: 404 });
    user.vipTier = vipTier;
    const days = Number(durationDays) || 30;
    user.vipExpiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
    logAudit('Owner', 'UPDATE_VIP', 'User', `${user.name} ning VIP tarifi ${String(vipTier).toUpperCase()} ga o‘zgartirildi (${days} kun)`);
    
    return NextResponse.json({ success: true, user: publicUser(user) });
  }

  // POST /api/users/toggle-block (owner only)
  if (fullPath === 'users/toggle-block') {
    const { userId } = body;
    const user = db.users.find((u) => u.id === userId);
    if (!user) return NextResponse.json({ success: false, message: 'O‘quvchi topilmadi' }, { status: 404 });
    user.isBlocked = !user.isBlocked;
    if (user.isBlocked) await revokeUserSessions(user.id);
    logAudit('Owner', user.isBlocked ? 'BLOCK' : 'UNBLOCK', 'User', `${user.name} holati o‘zgardi`);
    
    return NextResponse.json({ success: true, user: publicUser(user) });
  }

  // POST /api/owner/shop-items (owner only) — Edu Coin shop catalog
  if (fullPath === 'owner/shop-items') {
    if (!Array.isArray(body.items)) return NextResponse.json({ success: false, message: 'Noto‘g‘ri format' }, { status: 400 });
    db.shopItems = body.items.slice(0, 200).map((i: any) => ({
      id: String(i.id || 'item-' + Date.now()),
      title: String(i.title || 'Mahsulot').slice(0, 120),
      category: ['frame', 'color', 'book', 'booster', 'badge'].includes(i.category) ? i.category : 'badge',
      pricePoints: Math.max(0, Math.round(Number(i.pricePoints) || 0)),
      description: String(i.description || '').slice(0, 500),
      icon: String(i.icon || '✨').slice(0, 16),
      colorClass: i.colorClass ? String(i.colorClass).slice(0, 200) : undefined,
      styleValue: i.styleValue ? String(i.styleValue).slice(0, 80) : undefined,
      fileUrl: i.fileUrl ? String(i.fileUrl).slice(0, 500) : undefined,
      isAvailable: i.isAvailable !== false
    }));
    logAudit('Owner', 'UPDATE_SHOP', 'Shop', `Do‘kon katalogi yangilandi (${db.shopItems!.length} ta)`);
    
    return NextResponse.json({ success: true, shopItems: db.shopItems });
  }

  // POST /api/reviews/submit (student) — goes to moderation
  if (fullPath === 'reviews/submit') {
    const user = auth!.user;
    if (!user) return forbidden('Faqat o‘quvchilar uchun.');
    const text = (body.text || '').toString().trim();
    if (text.length < 20) return NextResponse.json({ success: false, message: 'Fikr kamida 20 ta belgidan iborat bo‘lsin' }, { status: 400 });
    const rl = rateLimit(`review:${user.id}`, 3, 24 * 3600 * 1000);
    if (!rl.allowed) return tooMany(rl.retryAfterSec);
    if (!db.reviews) db.reviews = [];
    const review = {
      id: 'rev-' + Date.now(),
      userId: user.id,
      name: `${user.name} ${user.surname ? user.surname[0] + '.' : ''}`.trim(),
      subtitle: [user.track ? user.track.toUpperCase() : '', user.region || ''].filter(Boolean).join(' · '),
      track: user.track,
      text: text.slice(0, 600),
      rating: Math.min(5, Math.max(1, Math.round(Number(body.rating) || 5))),
      photoUrl: user.avatar && /^https?:\/\/|^\//.test(user.avatar) ? user.avatar : undefined,
      status: 'pending' as const,
      createdAt: new Date().toISOString()
    };
    db.reviews.unshift(review);
    logAudit(user.id, 'REVIEW_SUBMIT', 'Reviews', `${review.name} fikr qoldirdi (moderatsiyada)`);
    
    return NextResponse.json({ success: true, review });
  }

  // POST /api/owner/reviews (owner only) — create / edit / moderate / delete
  if (fullPath === 'owner/reviews') {
    if (!db.reviews) db.reviews = [];
    const action = String(body.action || '');
    if (action === 'delete') {
      db.reviews = db.reviews.filter((r) => r.id !== body.id);
    } else if (action === 'status') {
      const r = db.reviews.find((x) => x.id === body.id);
      if (!r) return NextResponse.json({ success: false, message: 'Topilmadi' }, { status: 404 });
      if (['pending', 'approved', 'hidden'].includes(body.status)) r.status = body.status;
    } else if (action === 'save') {
      const inp = body.review || {};
      const clean = {
        id: String(inp.id || 'rev-' + Date.now()),
        userId: inp.userId ? String(inp.userId) : undefined,
        name: String(inp.name || '').trim().slice(0, 80),
        subtitle: String(inp.subtitle || '').trim().slice(0, 80),
        track: ['ielts', 'cefr', 'general'].includes(inp.track) ? inp.track : undefined,
        text: String(inp.text || '').trim().slice(0, 600),
        rating: Math.min(5, Math.max(1, Math.round(Number(inp.rating) || 5))),
        photoUrl: inp.photoUrl ? String(inp.photoUrl).slice(0, 500) : undefined,
        status: ['pending', 'approved', 'hidden'].includes(inp.status) ? inp.status : 'approved',
        createdAt: inp.createdAt || new Date().toISOString()
      };
      if (!clean.name || clean.text.length < 5) return NextResponse.json({ success: false, message: 'Ism va matn kerak' }, { status: 400 });
      const idx = db.reviews.findIndex((r) => r.id === clean.id);
      if (idx >= 0) db.reviews[idx] = clean as any;
      else db.reviews.unshift(clean as any);
    } else {
      return NextResponse.json({ success: false, message: 'Noma’lum amal' }, { status: 400 });
    }
    logAudit('Owner', 'REVIEWS', 'Reviews', `Fikrlar: ${action}`);
    
    return NextResponse.json({ success: true, reviews: db.reviews });
  }

  // POST /api/owner/faqs (owner only)
  if (fullPath === 'owner/faqs') {
    if (!Array.isArray(body.faqs)) return NextResponse.json({ success: false, message: 'Noto‘g‘ri format' }, { status: 400 });
    db.faqs = body.faqs.slice(0, 60).map((f: any, i: number) => ({
      id: String(f.id || 'faq-' + Date.now() + '-' + i),
      question: String(f.question || '').trim().slice(0, 240),
      answer: String(f.answer || '').trim().slice(0, 2000),
      orderIndex: Number.isFinite(Number(f.orderIndex)) ? Number(f.orderIndex) : i,
      isVisible: f.isVisible !== false
    })).filter((f: any) => f.question && f.answer);
    logAudit('Owner', 'UPDATE_FAQ', 'FAQ', `Savol-javoblar yangilandi (${db.faqs!.length} ta)`);
    
    return NextResponse.json({ success: true, faqs: db.faqs });
  }

  // POST /api/ai/voice-timing — stage durations (ms) of one EduBek voice turn from a student's browser. No text, no identifiers.
  if (fullPath === 'ai/voice-timing') {
    const lim = rateLimit(`vt:${auth!.userId}`, 120, 60 * 60 * 1000);
    if (!lim.allowed) return NextResponse.json({ success: true });
    const t = cleanTiming(body);
    if (t) recordVoiceTurn(t);
    return NextResponse.json({ success: true });
  }

  // POST /api/ai/generate (owner only) — free-form analytics report
  if (fullPath === 'ai/generate') {
    const { prompt } = body;
    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ success: false, message: 'Prompt matni kiritilmadi' }, { status: 400 });
    }
    const effectiveKey = getEffectiveAiKey();
    if (!effectiveKey && availableFallbacks(process.env).length === 0) {
      return NextResponse.json({ success: false, message: 'AI kaliti sozlanmagan (GEMINI_API_KEY yoki zaxira kalit).' }, { status: 503 });
    }
    try {
      const text = await executeUniversalAi({
        apiKey: effectiveKey,
        systemInstruction:
          "Sen Edu Level (IELTS, CEFR, General English) platformasining pedagogik maslahatchisi va tahlilchisisan. Hisobotlarni o'zbek tilida, aniq va amaliy tavsiyalar bilan tayyorla.",
        prompt,
        temperature: 0.7
      });
      if (text && text.trim()) return NextResponse.json({ success: true, text: text.trim() });
    } catch (err: any) {
      console.error('AI generate error:', err?.message || err);
    }
    return NextResponse.json({ success: false, message: 'AI hisobotini yaratib bo‘lmadi. Keyinroq qayta urinib ko‘ring.' }, { status: 502 });
  }

  // 5. POST /api/courses
  if (fullPath === 'courses') {
    const courseData = body as Partial<Course>;
    const newCourse: Course = {
      id: 'course-' + Date.now(),
      title: courseData.title || 'Yangi Ingliz Tili Kursi',
      description: courseData.description || '',
      level: courseData.level || 'ielts',
      // Every course belongs to exactly one learning track.
      track: (['ielts', 'cefr', 'general'] as const).includes(courseData.track as any)
        ? (courseData.track as any)
        : (['ielts', 'cefr', 'general'] as const).includes(courseData.level as any)
          ? (courseData.level as any)
          : 'ielts',
      price: courseData.price || 0,
      coverColor: courseData.coverColor || 'from-cyan-600 to-indigo-700',
      coverIcon: courseData.coverIcon || 'Award',
      published: courseData.published ?? true,
      requiredVIP: courseData.requiredVIP || 'start',
      modules: courseData.modules || [{ id: 'mod-' + Date.now(), courseId: 'temp', title: '1-Modul', orderIndex: 1 }],
      lessonsCount: 0,
      totalDurationMinutes: 0,
      createdAt: new Date().toISOString()
    };
    newCourse.modules.forEach((m) => (m.courseId = newCourse.id));
    db.courses.unshift(newCourse);
    logAudit('Owner', 'CREATE', 'Course', `Yangi kurs qo'shildi: ${newCourse.title}`);
    
    return NextResponse.json({ success: true, course: newCourse });
  }

  // 6. POST /api/lessons
  if (fullPath === 'lessons') {
    const lessonData = body as Partial<Lesson>;
    const requestedCode = lessonData.lessonCode ? cleanLessonCode(lessonData.lessonCode) : null;
    if (lessonData.lessonCode && !requestedCode) return NextResponse.json({ success: false, message: 'Dars kodi 3–20 belgi bo‘lsin: harf, raqam yoki tire (masalan EDU-L05).' }, { status: 400 });
    if (requestedCode && lessonCodeTaken(db.lessons, requestedCode)) return NextResponse.json({ success: false, message: 'Bu kod boshqa darsda bor. Boshqa kod tanlang.' }, { status: 400 });
    const newLesson: Lesson = {
      id: 'lesson-' + Date.now(),
      courseId: lessonData.courseId || '',
      moduleId: lessonData.moduleId || '',
      title: lessonData.title || 'Yangi Dars',
      description: lessonData.description || '',
      videoUrl: lessonData.videoUrl || '',
      durationMinutes: lessonData.durationMinutes || 30,
      pdfUrl: lessonData.pdfUrl,
      notesMarkdown: lessonData.notesMarkdown || '',
      mathFormula: lessonData.mathFormula || '',
      orderIndex: lessonData.orderIndex || db.lessons.length + 1,
      testId: lessonData.testId,
      isDemo: lessonData.isDemo ?? false,
      lessonType: lessonData.lessonType || 'thematic',
      requiredPassingPercent: lessonData.requiredPassingPercent || 70,
      // A lesson always follows its course's track.
      track: db.courses.find((c) => c.id === lessonData.courseId)?.track || lessonData.track || 'ielts',
      lessonCode: requestedCode || nextLessonCode(db.lessons),
      vocabularyKeywords: lessonData.vocabularyKeywords || [],
      homework: typeof lessonData.homework === 'string' ? lessonData.homework.slice(0, 4000) : undefined,
      subtitleUrl: lessonData.subtitleUrl || undefined,
      resources: Array.isArray(lessonData.resources) ? lessonData.resources.slice(0, 30) : [],
      isPublished: lessonData.isPublished !== false,
      videoTiers: normalizeVideoTiers(lessonData.videoTiers),
      bunnyVideoId: parseBunnyVideoId(lessonData.bunnyVideoId) || undefined
    };
    db.lessons.push(newLesson);
    if (newLesson.isPublished !== false) announceNewLesson(db, newLesson.id);
    const course = db.courses.find((c) => c.id === newLesson.courseId);
    if (course) {
      const cLessons = db.lessons.filter((l) => l.courseId === course.id);
      course.lessonsCount = cLessons.length;
      course.totalDurationMinutes = cLessons.reduce((acc, l) => acc + (l.durationMinutes || 0), 0);
    }
    logAudit('Owner', 'CREATE', 'Lesson', `Yangi dars qo'shildi: ${newLesson.title}`);
    
    return NextResponse.json({ success: true, lesson: newLesson });
  }

  // POST /api/lessons/playback — the only way to get a gated lesson's video URL. Access is checked here, on every call.
  if (fullPath === 'lessons/playback') {
    const auth = getAuth(req);
    if (!auth) return NextResponse.json({ success: false, message: 'Avval tizimga kiring' }, { status: 401 });
    const lesson = db.lessons.find((l) => l.id === body.lessonId);
    if (!lesson || (lesson.isPublished === false && auth.role !== 'owner')) return NextResponse.json({ success: false, message: 'Dars topilmadi' }, { status: 404 });
    const me = db.users.find((u) => u.id === auth.userId);
    const expired = !!me?.vipExpiresAt && Date.parse(me.vipExpiresAt) < Date.now();
    const userTier = auth.role === 'owner' ? 'owner' : expired ? 'none' : (me?.vipTier as string) || 'none';
    if (!canWatchLessonVideo({ role: auth.role, userTier, videoTiers: lesson.videoTiers })) {
      return NextResponse.json({ success: false, message: 'Bu video sizning VIP tarifingiz uchun emas' }, { status: 403 });
    }
    if (lesson.bunnyVideoId) {
      const cfg = readBunnyConfig();
      if (!cfg) return NextResponse.json({ success: false, mode: 'unavailable', message: 'Video hozircha mavjud emas' }, { status: 503 });
      const signed = bunnySignedEmbedUrl(cfg, lesson.bunnyVideoId, Date.now() / 1000);
      return NextResponse.json({ success: true, mode: 'bunny', url: signed.url, expires: signed.expires });
    }
    return NextResponse.json({ success: true, mode: 'url', url: lesson.videoUrl || '' });
  }

  // 7. POST /api/lessons/toggle-complete
  if (fullPath === 'lessons/toggle-complete') {
    const { userId, lessonId } = body;
    if (!canActOnUser(auth!, userId)) return forbidden();
    const user = db.users.find((u) => u.id === userId);
    if (!user) return NextResponse.json({ success: false, message: 'Foydalanuvchi topilmadi' }, { status: 404 });
    const lesson = db.lessons.find((l) => l.id === lessonId);
    if (!lesson) return NextResponse.json({ success: false, message: 'Dars topilmadi' }, { status: 404 });
    if (!user.completedLessons) user.completedLessons = [];
    const nowIso = new Date().toISOString();
    let entry = db.lessonProgress.find((p) => p.userId === user.id && p.lessonId === lessonId);
    if (!entry) {
      entry = { userId: user.id, lessonId, courseId: lesson.courseId, position: 0, duration: 0, watchedSeconds: 0, updatedAt: nowIso };
      db.lessonProgress.push(entry);
    }
    if (user.completedLessons.includes(lessonId)) {
      user.completedLessons = user.completedLessons.filter((id) => id !== lessonId);
    } else {
      user.completedLessons.push(lessonId);
      // XP is granted once per lesson, so toggling a lesson on and off cannot farm points.
      if (!entry.xpAwarded) {
        user.xp = (user.xp || 0) + 50;
        entry.xpAwarded = true;
      }
      await rewardReferralOnLesson(db, user, telegramNotify).catch(() => undefined);
    }
    entry.updatedAt = nowIso;
    
    return NextResponse.json({ success: true, completedLessons: user.completedLessons, xp: user.xp });
  }

  // 8. POST /api/tests
  if (fullPath === 'tests') {
    const testData = body as Partial<Test>;
    const newTest: Test = {
      id: 'test-' + Date.now(),
      title: testData.title || 'Yangi Mock Test',
      description: testData.description || '',
      type: testData.type || 'mock',
      durationMinutes: testData.durationMinutes || 60,
      maxScore: testData.maxScore || 100,
      requiredVIP: testData.requiredVIP || 'start',
      published: testData.published ?? true,
      questionsCount: 0,
      createdAt: new Date().toISOString(),
      track: testData.track || 'ielts'
    };
    db.tests.unshift(newTest);
    logAudit('Owner', 'CREATE', 'Test', `Yangi test yaratildi: ${newTest.title}`);
    
    return NextResponse.json({ success: true, test: newTest });
  }

  // 9. POST /api/questions
  if (fullPath === 'questions') {
    const qData = body as Partial<Question>;
    const newQuestion: Question = {
      id: 'q-' + Date.now(),
      testId: qData.testId || '',
      prompt: qData.prompt || 'Savol',
      mathFormula: qData.mathFormula || '',
      options: qData.options || ['A', 'B', 'C', 'D'],
      correctAnswerIndex: qData.correctAnswerIndex ?? 0,
      explanation: qData.explanation || '',
      difficulty: qData.difficulty || 'medium'
    };
    db.questions.push(newQuestion);
    const test = db.tests.find((t) => t.id === newQuestion.testId);
    if (test) {
      test.questionsCount = db.questions.filter((q) => q.testId === test.id).length;
    }
    
    return NextResponse.json({ success: true, question: newQuestion });
  }

  // ---------------------------------------------------------------------------
  // EXAM ENGINE — sessions with server timestamps, autosave, server-side scoring
  // ---------------------------------------------------------------------------
  if (fullPath === 'exams/start' || fullPath === 'exams/save' || fullPath === 'exams/review' || fullPath === 'test-attempts') {
    // Guests can open exams without an account: cap how many new sessions one address may start (shared school networks get a generous cap).
    if (fullPath === 'exams/start' || fullPath === 'test-attempts') {
      const newLimit = rateLimit(`exam-new:${clientIp(req)}`, 120, 15 * 60 * 1000);
      if (!newLimit.allowed) return tooMany(newLimit.retryAfterSec);
    }
    const exam = resolveExam(db, String(body.testId || ''));
    const ownerKey = auth ? auth.userId : body.guestKey ? 'guest:' + String(body.guestKey).slice(0, 64) : null;
    if (!db.examSessions) db.examSessions = [];
    const GRACE_MS = 90 * 1000;
    const findSession = (id: string) => db.examSessions!.find((x) => x.id === id && x.ownerKey === ownerKey);

    // Review an earlier attempt (keys are only revealed to the attempt's owner)
    if (fullPath === 'exams/review') {
      const attempt = (db.testAttempts || []).find((a) => a.id === body.attemptId);
      if (!attempt) return NextResponse.json({ success: false, message: 'Urinish topilmadi' }, { status: 404 });
      if (!auth || (auth.role !== 'owner' && attempt.userId !== auth.userId)) return forbidden();
      const ex = resolveExam(db, attempt.testId);
      if (!ex) return NextResponse.json({ success: false, message: 'Test o‘chirilgan' }, { status: 404 });
      const result = scoreExam(ex, attempt.answers || {});
      return NextResponse.json({ success: true, attempt, review: result.review });
    }

    if (!exam) return NextResponse.json({ success: false, message: 'Test topilmadi' }, { status: 404 });
    if (auth?.role === 'student' && exam.track && auth.user?.track && exam.track !== auth.user.track) {
      return forbidden('Bu test boshqa yo‘nalish uchun.');
    }

    if (fullPath === 'exams/start') {
      if (!ownerKey) return NextResponse.json({ success: false, message: 'guestKey kerak' }, { status: 400 });
      const lim = rateLimit(`exam-start:${ownerKey}`, 30, 60 * 60 * 1000);
      if (!lim.allowed) return tooMany(lim.retryAfterSec);
      const now = Date.now();
      let sess = db.examSessions.find(
        (x) => x.ownerKey === ownerKey && x.testId === exam.id && !x.submittedAttemptId && new Date(x.endsAt).getTime() + GRACE_MS > now
      );
      if (!sess) {
        sess = {
          id: 'xs-' + now + '-' + Math.random().toString(36).slice(2, 8),
          ownerKey,
          testId: exam.id,
          kind: exam.kind,
          startedAt: new Date(now).toISOString(),
          endsAt: new Date(now + exam.durationMinutes * 60000).toISOString(),
          answers: {},
          updatedAt: new Date(now).toISOString()
        };
        db.examSessions.unshift(sess);
        db.examSessions = db.examSessions.slice(0, 2000);
        
      }
      return NextResponse.json({
        success: true,
        session: { id: sess.id, startedAt: sess.startedAt, endsAt: sess.endsAt, answers: sess.answers },
        serverNow: new Date(now).toISOString(),
        // Listening transcripts are needed for synthesized playback; they are only sent once a session exists.
        transcripts: exam.kind === 'listening' ? exam.transcripts : undefined
      });
    }

    if (fullPath === 'exams/save') {
      const sess = findSession(String(body.sessionId || ''));
      if (!sess) return NextResponse.json({ success: false, message: 'Sessiya topilmadi' }, { status: 404 });
      if (sess.submittedAttemptId) return NextResponse.json({ success: false, message: 'Test allaqachon topshirilgan' }, { status: 409 });
      if (Date.now() > new Date(sess.endsAt).getTime() + GRACE_MS) {
        return NextResponse.json({ success: false, message: 'Vaqt tugagan', expired: true }, { status: 409 });
      }
      sess.answers = sanitizeAnswers(body.answers, exam.questionIds);
      sess.updatedAt = new Date().toISOString();
      
      return NextResponse.json({ success: true, savedAt: sess.updatedAt });
    }

    // POST /api/test-attempts — submit. Scores are always computed here; client scores are ignored.
    const now = Date.now();
    let sess = body.sessionId ? findSession(String(body.sessionId)) : undefined;
    if (body.sessionId && !sess) return NextResponse.json({ success: false, message: 'Sessiya topilmadi' }, { status: 404 });
    if (sess?.submittedAttemptId) {
      const prev = (db.testAttempts || []).find((a) => a.id === sess!.submittedAttemptId);
      if (prev) {
        const again = scoreExam(exam, prev.answers || {});
        return NextResponse.json({ success: true, duplicate: true, attempt: prev, review: again.review, result: summary(again) });
      }
    }
    let answers = sanitizeAnswers(body.answers, exam.questionIds);
    let late = false;
    let timeSpent = Math.min(exam.durationMinutes * 60, Math.max(0, Number(body.timeSpentSeconds) || 0));
    if (sess) {
      const ends = new Date(sess.endsAt).getTime();
      if (now > ends + GRACE_MS) {
        // Too late: only what was autosaved before the deadline counts.
        answers = sess.answers;
        late = true;
      }
      timeSpent = Math.round((Math.min(now, ends) - new Date(sess.startedAt).getTime()) / 1000);
    }
    const result = scoreExam(exam, answers);
    const userId = auth ? (auth.role === 'owner' ? OWNER_ID : auth.userId) : 'guest';
    const user = auth?.role === 'student' ? auth.user : null;
    const attempt: TestAttempt = {
      id: 'attempt-' + now + '-' + Math.random().toString(36).slice(2, 6),
      userId,
      userName: user ? `${user.name} ${user.surname || ''}`.trim() : auth?.role === 'owner' ? 'Owner' : 'Mehmon',
      testId: exam.id,
      testTitle: exam.title,
      score: result.score,
      maxScore: result.maxScore,
      correctCount: result.correctCount,
      totalQuestions: result.totalQuestions,
      answers,
      timeSpentSeconds: Math.max(0, timeSpent),
      createdAt: new Date(now).toISOString(),
      percentage: result.percentage,
      track: (exam.track || undefined) as any,
      cefrLevel: result.cefrLevel
    };
    if (!db.testAttempts) db.testAttempts = [];
    db.testAttempts.unshift(attempt);
    if (sess) {
      sess.submittedAttemptId = attempt.id;
      sess.answers = answers;
    }
    if (user) {
      // XP = percentage of the test, once per attempt; repeated attempts on the same test give half.
      const earlier = db.testAttempts.filter((a) => a.userId === user.id && a.testId === exam.id).length > 1;
      user.xp = (user.xp || 0) + Math.round(result.percentage * (earlier ? 0.5 : 1));
      touchStreak(user);
    }
    
    return NextResponse.json({ success: true, attempt, review: result.review, result: summary(result), late });
  }

  // POST /api/thematic-packs/grade — a thematic quiz pack is graded here with the stored key (the key is never in the
  // snapshot). Every submission is stored as an attempt with a server timestamp; the reward is granted once per pack.
  // A repeated submission of the same pack within 5 seconds is refused (double submit). Guests get the result, nothing saved.
  if (fullPath === 'thematic-packs/grade') {
    const gradeLimit = rateLimit(`thematic-grade:${clientIp(req)}`, 240, 15 * 60 * 1000);
    if (!gradeLimit.allowed) return tooMany(gradeLimit.retryAfterSec);
    const pack = (db.thematicQuizPacks || []).find((x) => x.id === String(body.packId || ''));
    if (!pack || !Array.isArray(pack.questions) || pack.questions.length === 0) {
      return NextResponse.json({ success: false, message: 'Paket topilmadi' }, { status: 404 });
    }
    const user = auth?.role === 'student' ? auth.user : null;
    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();
    if (user) {
      const recent = (db.testAttempts || []).find(
        (a) => a.userId === user.id && a.testId === 'thematic:' + pack.id && nowMs - new Date(a.createdAt).getTime() < 5000
      );
      if (recent) return NextResponse.json({ success: false, message: 'Javoblar allaqachon yuborilgan.', duplicate: true }, { status: 409 });
    } else {
      const lim = rateLimit(`thematic-grade:${clientIp(req)}`, 120, 60 * 60 * 1000);
      if (!lim.allowed) return tooMany(lim.retryAfterSec);
    }
    const result = gradeThematicPack(pack.questions as any, (body.answers && typeof body.answers === 'object' ? body.answers : {}) as Record<string, unknown>);
    const storedAnswers: Record<string, number> = {};
    for (const r of result.review) if (r.given !== null) storedAnswers[r.questionId] = r.given;
    const reviewOut = result.review.map(({ points, ...r }) => { void points; return r; });
    let rewarded: { xp: number; points: number } | null = null;
    let attemptId: string | null = null;
    if (user) {
      if (!db.testAttempts) db.testAttempts = [];
      attemptId = 'tpack-' + nowMs + '-' + Math.random().toString(36).slice(2, 6);
      db.testAttempts.unshift({
        id: attemptId,
        userId: user.id,
        userName: `${user.name} ${user.surname || ''}`.trim(),
        testId: 'thematic:' + pack.id,
        testTitle: pack.title,
        score: result.score,
        maxScore: result.maxScore,
        correctCount: result.correctCount,
        totalQuestions: result.totalQuestions,
        answers: storedAnswers,
        timeSpentSeconds: 0,
        createdAt: nowIso,
        percentage: result.percentage
      });
      const done = user.completedPackIds || [];
      if (!done.includes(pack.id)) {
        rewarded = { xp: pack.rewardXp || 0, points: pack.rewardPoints || 0 };
        user.completedPackIds = [...done, pack.id];
        user.xp = (user.xp || 0) + rewarded.xp;
        user.points = (user.points || 0) + rewarded.points;
      }
      touchStreak(user);
    }
    return NextResponse.json({
      success: true,
      attemptId,
      createdAt: nowIso,
      result: { correctCount: result.correctCount, totalQuestions: result.totalQuestions, score: result.score, maxScore: result.maxScore, percentage: result.percentage },
      review: reviewOut,
      rewarded,
      user: user ? publicUser(user) : undefined
    });
  }

  // 11. POST /api/student-results
  if (fullPath === 'student-results') {
    const {
      studentName,
      photoUrl,
      certificateImageUrl,
      region,
      certificateType,
      score,
      examDate,
      university,
      story,
      description,
      certificateBadgeColor
    } = body;
    const newResult: StudentResult = {
      id: 'res-' + Date.now(),
      studentName: studentName || "O'quvchi",
      photoUrl: photoUrl || '',
      certificateImageUrl: certificateImageUrl || '',
      region: region || 'Toshkent',
      certificateType: certificateType || 'IELTS Academic 8.5',
      score: score || 'Overall 8.5',
      examDate: examDate || 'Fevral, 2026',
      university: university || '',
      certificateBadgeColor: certificateBadgeColor || 'from-cyan-500 via-indigo-600 to-purple-700',
      story: story || description || '',
      description: description || story || '',
      isPublished: true
    };
    db.studentResults.unshift(newResult);
    logAudit('Owner', 'CREATE', 'StudentResult', `Yangi sertifikat natijasi kiritildi: ${newResult.studentName}`);
    
    return NextResponse.json({ success: true, result: newResult });
  }

  // POST /api/telegram/webhook — the Edu Level Telegram bot. Telegram sends every message, button press and poll answer
  // here. Private chats get the full menu; groups get the commands (/quiz, /reyting, ...); channels are posted to by the
  // owner. Every chat is remembered (telegram_chats) for broadcasts, referrals and statistics.
  if (fullPath === 'telegram/webhook') {
    const secret = webhookSecret();
    if (!secret || req.headers.get('x-telegram-bot-api-secret-token') !== secret) {
      return NextResponse.json({ ok: false }, { status: 403 });
    }
    const settings = db.telegramBotSettings;
    const botName = (settings?.botUsername || '').replace(/^@/, '');
    const channel = (settings?.channelUsername || '').replace(/^@/, '');
    const ownerTg = (settings?.ownerTelegram || '').replace(/^@/, '').toLowerCase();

    // A quiz answer: score it, and in a private test send the next question.
    if (body.poll_answer) {
      const pa = body.poll_answer;
      const pollId = String(pa.poll_id || '');
      const userId = String(pa.user?.id || '');
      const optionId = Array.isArray(pa.option_ids) && pa.option_ids.length ? Number(pa.option_ids[0]) : null;
      const poll = pollId ? await getPoll(pollId).catch(() => null) : null;
      if (!poll || !userId || optionId === null) return NextResponse.json({ ok: true });
      const correct = optionId === poll.correct;
      const fresh = await recordAnswer(pollId, userId, optionId, correct, String(pa.user?.first_name || pa.user?.username || 'Ishtirokchi')).catch(() => false);
      if (!fresh || poll.chatId !== userId) return NextResponse.json({ ok: true });
      const session = await getSession(userId).catch(() => null);
      if (session && session.questionIds[session.idx] === poll.questionId) {
        const score = session.score + (correct ? 1 : 0);
        const nextIdx = session.idx + 1;
        const total = session.questionIds.length;
        if (nextIdx < total) {
          await advanceSession(userId, score);
          const nextQ = db.questions.find((q) => q.id === session.questionIds[nextIdx]);
          if (nextQ) await sendTrackedQuizPoll(userId, nextQ, false).catch(() => undefined);
        } else {
          await endSession(userId);
          const pct = Math.round((score / total) * 100);
          const verdict = pct >= 80 ? 'Ajoyib natija!' : pct >= 50 ? 'Yaxshi, davom eting.' : 'Mavzularni qayta ko‘rib chiqing.';
          await telegramApi('sendMessage', { chat_id: userId, text: `🏁 Test tugadi: ${score}/${total} to‘g‘ri (${pct}%).\n${verdict}`, reply_markup: BOT_MENU }).catch(() => undefined);
        }
      }
      return NextResponse.json({ ok: true });
    }

    const cb = body.callback_query;
    const msg = cb ? cb.message : body.message;
    if (!msg || !msg.chat) return NextResponse.json({ ok: true });
    const chatId = String(msg.chat.id);
    const chatType = String(msg.chat.type || 'private');
    const isGroup = chatType === 'group' || chatType === 'supergroup';
    const from = cb ? cb.from : msg.from;
    const reply = (text: string, extra: Record<string, unknown> = {}) => {
      // The owner's main menu also leads to the control room.
      const markup = extra.reply_markup === BOT_MENU && isOwnerChat ? BOT_MENU_OWNER : extra.reply_markup;
      return telegramApi('sendMessage', { chat_id: chatId, text, ...extra, ...(markup ? { reply_markup: markup } : {}) }).catch(() => undefined);
    };
    const tgName = String(from?.username || '').replace(/^@/, '').toLowerCase();
    let linked = tgName ? findUserByTelegram(db, tgName) : undefined;
    const minimum = Number(settings?.minDepositAmount) || 0;
    const base = publicBaseUrl(req.nextUrl.origin);
    // The owner is the right username AND the saved numeric id (a username can be taken over by someone else).
    const ownerCheck = checkOwner({ ownerUsername: ownerTg, senderUsername: tgName, senderId: String(from?.id ?? ''), savedId: settings?.ownerTelegramId, envId: process.env.TELEGRAM_OWNER_ID });
    if (ownerCheck.bindId && db.telegramBotSettings) db.telegramBotSettings.ownerTelegramId = ownerCheck.bindId;
    const isOwnerChat = ownerCheck.isOwner;
    if (linked?.isBlocked && !isOwnerChat) {
      await reply('🚫 Hisobingiz bloklangan. Savollar uchun ustoz bilan bog‘laning.');
      return NextResponse.json({ ok: true });
    }

    // The spinner on a pressed button stops at once.
    if (cb?.id) telegramApi('answerCallbackQuery', { callback_query_id: cb.id }).catch(() => undefined);
    if (!rateLimit(`tg:${chatId}`, 40, 60 * 1000).allowed) {
      await reply('Juda tez yozyapsiz. Bir daqiqadan so‘ng qayta urinib ko‘ring.');
      return NextResponse.json({ ok: true });
    }

    if (cb) await setPending(chatId, null).catch(() => undefined);

    // The owner's AI channel post: send the draft, write another one, or drop it. The draft is the message itself.
    if (cb && String(cb.data || '').startsWith('post:')) {
      if (!isOwnerChat) {
        await reply('Bu bo‘lim faqat ustoz uchun.');
        return NextResponse.json({ ok: true });
      }
      const action = String(cb.data).slice(5);
      const draftLines = String(msg.text || '').split('\n');
      if (action === 'ideas') {
        const ideas = await withTyping(chatId, () => draftChannelIdeas()).catch((err: any) => `G‘oyalar tayyorlanmadi: ${err?.message || 'xatolik'}`);
        await reply(`🗓 Haftalik reja\n\n${esc(ideas)}`, { reply_markup: IDEAS_MARKUP });
        return NextResponse.json({ ok: true });
      }
      if (action.startsWith('idea:')) {
        const idea = ideaFromList(String(msg.text || ''), Number(action.slice(5)));
        if (!idea) {
          await reply('Bu g‘oya topilmadi. “🔁 Yangi g‘oyalar” ni bosing.', { reply_markup: IDEAS_MARKUP });
        } else {
          const draft = await withTyping(chatId, () => draftChannelPost(idea)).catch((err: any) => `Post tayyorlanmadi: ${err?.message || 'xatolik'}`);
          await reply(`📝 Mavzu: ${esc(idea.slice(0, 300))}\n\n${esc(draft)}`, { reply_markup: POST_MARKUP });
        }
        return NextResponse.json({ ok: true });
      }
      const topic = (draftLines[0] || '').replace(/^📝 Mavzu:\s*/, '').trim();
      const body = draftLines.slice(2).join('\n').trim();
      if (action === 'cancel') {
        await reply('Post bekor qilindi.', { reply_markup: ADMIN_MENU });
      } else if (action === 'again') {
        const draft = await withTyping(chatId, () => draftChannelPost(topic)).catch((err: any) => `Post tayyorlanmadi: ${err?.message || 'xatolik'}`);
        await reply(`📝 Mavzu: ${esc(topic)}\n\n${esc(draft)}`, { reply_markup: POST_MARKUP });
      } else if (action === 'send') {
        if (!channel) await reply('Kanal ulanmagan. Bot sozlamalarida kanal username ni kiriting.', { reply_markup: ADMIN_MENU });
        else if (!body) await reply('Yuboriladigan matn topilmadi. Mavzuni qayta yuboring: /post mavzu', { reply_markup: ADMIN_MENU });
        else
          await telegramApi('sendMessage', { chat_id: `@${channel}`, text: esc(body) })
            .then(() => reply('✅ Post kanalga yuborildi.', { reply_markup: ADMIN_MENU }))
            .catch((err: any) => reply(`Yuborib bo‘lmadi: ${err?.message || 'xatolik'}`, { reply_markup: ADMIN_MENU }));
      }
      return NextResponse.json({ ok: true });
    }

    if (cb && (String(cb.data || '').startsWith('set:') || cb.data === 'menu:settings')) {
      const parts = String(cb.data).split(':');
      if (parts[0] === 'set') {
        const off = parts[2] === 'off';
        if (parts[1] === 'reminders') await setChatFlag(chatId, 'reminders_off', off).catch(() => undefined);
        if (parts[1] === 'broadcast') await setChatFlag(chatId, 'opted_out', off).catch(() => undefined);
      }
      const flags = await chatFlags(chatId).catch(() => ({ optedOut: false, remindersOff: false }));
      await reply(settingsText(flags, !!linked), { reply_markup: settingsMarkup(flags) });
      return NextResponse.json({ ok: true });
    }

    if (cb && /^(admin|dep|rev):/.test(String(cb.data || ''))) {
      if (!isOwnerChat) {
        await reply('Bu bo‘lim faqat ustoz uchun.');
        return NextResponse.json({ ok: true });
      }
      const data = String(cb.data);
      const [kind, action, depId] = data.split(':');
      if (data === 'admin:stats') {
        const subscribers = await countSubscribers().catch(() => 0);
        const refs = await referralTotals().catch(() => ({ invited: 0, qualified: 0, bundles: 0 }));
        await reply(
          statsText({
            subscribers,
            linked: db.users.filter((u) => u.role !== 'owner' && (u.telegramUsername || '').trim()).length,
            pendingDeposits: (db.depositTransactions || []).filter((t) => t.status === 'pending').length,
            openLessons: db.lessons.filter((l) => l.isPublished !== false && (l.lessonCode || '').trim()).length
          }) + `\nTakliflar: ${refs.invited} ta · malakali: ${refs.qualified} ta\nTalabalar: ${db.users.filter((u) => u.role !== 'owner').length} ta` + ((await sourceCounts(5).catch(() => [])).length ? '\nManbalar: ' + (await sourceCounts(5)).map((x) => `${x.source} ${x.count}`).join(', ') : ''),
          { reply_markup: ADMIN_MENU }
        );
      } else if (data === 'admin:progress') {
        const total = db.users.filter((u) => u.role !== 'owner').length;
        const finished = db.users.filter((u) => u.role !== 'owner' && (u.completedLessons || []).length > 0).length;
        const percent = total ? Math.round((finished / total) * 100) : 0;
        await reply(`📈 Talabalar progressi\n${bar(percent)} ${percent}%\nDarsni boshlaganlar: ${finished} / ${total}`, { reply_markup: ADMIN_MENU });
      } else if (data === 'admin:deposits') {
        const view = adminDeposits(db);
        await reply(view.text, view.markup.inline_keyboard.length ? { reply_markup: view.markup } : { reply_markup: ADMIN_MENU });
      } else if (data === 'admin:tickets') {
        await reply(adminTickets(db), { reply_markup: ADMIN_MENU });
      } else if (data === 'admin:post') {
        await setPending(chatId, 'admin_post').catch(() => undefined);
        await reply('✍️ Kanal posti mavzusini yozing. Masalan: “IELTS Writing Task 2 uchun 3 ta maslahat”.', { reply_markup: CANCEL_MENU });
      } else if (data === 'admin:broadcast') {
        await setPending(chatId, 'admin_broadcast').catch(() => undefined);
        await reply('📣 Obunachilarga yuboriladigan xabar matnini yozing. (Bir martada 200 tagacha; ko‘proq bo‘lsa, saytdagi owner panelidan yuboring.)', { reply_markup: CANCEL_MENU });
      } else if (data === 'admin:channel') {
        await setPending(chatId, 'admin_channel').catch(() => undefined);
        await reply(channel ? `📢 @${esc(channel)} kanaliga yuboriladigan matnni yozing.` : 'Avval bot sozlamalarida kanal username ni kiriting.', { reply_markup: channel ? CANCEL_MENU : ADMIN_MENU });
      } else if (['admin:reviews', 'admin:students', 'admin:courses', 'admin:tests', 'admin:hisobot', 'admin:holat'].includes(data)) {
        const map: Record<string, string> = { 'admin:reviews': 'admin_fikrlar', 'admin:students': 'admin_talabalar', 'admin:courses': 'admin_kurs', 'admin:tests': 'admin_testlar', 'admin:hisobot': 'admin_hisobot', 'admin:holat': 'admin_holat' };
        const out = await runOwnerExtra(map[data], '', db);
        await reply(out.text, { reply_markup: out.markup || ADMIN_MENU });
      } else if (kind === 'rev' && depId) {
        const review = (db.reviews || []).find((r) => r.id === depId);
        if (review) review.status = action === 'ok' ? 'approved' : 'hidden';
        await reply(review ? (action === 'ok' ? '✅ Sharh tasdiqlandi va saytda chiqadi.' : '🚫 Sharh yashirildi.') : 'Sharh topilmadi.', { reply_markup: ADMIN_MENU });
      } else if (kind === 'dep' && depId) {
        const result = (action === 'ok' ? approveDeposit(db, depId) : rejectDeposit(db, depId)) as { ok: boolean; message: string; user?: any };
        if (result.ok && action === 'ok' && result.user?.telegramUsername) {
          const chat = await privateChatForUsername(result.user.telegramUsername).catch(() => null);
          if (chat) await telegramNotify(chat, `💳 Depozitingiz tasdiqlandi. ${result.message.split(': ')[1] || ''} balansingizga qo‘shildi.`);
        }
        logAudit('Owner', action === 'ok' ? 'APPROVE_DEPOSIT' : 'REJECT_DEPOSIT', 'Finance', `Telegram bot: ${result.message}`);
        const view = adminDeposits(db);
        await reply(`${result.ok ? '✅' : '⚠️'} ${result.message}\n\n${view.text}`, view.markup.inline_keyboard.length ? { reply_markup: view.markup } : { reply_markup: ADMIN_MENU });
      }
      return NextResponse.json({ ok: true });
    }

    if (cb && String(cb.data || '').startsWith('menu:')) {
      const key = String(cb.data).slice(5);
      if (key === 'main') await reply(welcomeText(linked), { reply_markup: BOT_MENU });
      else if (SUBMENUS[key]) await reply(`<b>${SUBMENUS[key].title}</b>\nKerakli bo‘limni tanlang.`, { reply_markup: submenuMarkup(key) });
      return NextResponse.json({ ok: true });
    }

    const typed = cb ? '' : String(msg.text || msg.caption || '').trim();
    const cmd = cb ? (String(cb.data || '').startsWith('cmd:') ? '/' + String(cb.data).slice(4) : CALLBACK_COMMANDS[String(cb.data || '')] || '') : typed;
    // In a group the bot only answers commands (Telegram also hides ordinary group chatter from it).
    if (isGroup && !cb && !cmd.startsWith('/')) return NextResponse.json({ ok: true });

    const is = (name: string) => new RegExp(`^/${name}(@\\w+)?(\\s|$)`, 'i').test(cmd);
    const arg = cmd.replace(/^\/\w+(@\w+)?\s*/, '').trim();

    // t.me/<bot>?start=lesson_EDU-L01 opens a lesson, ?start=ref_<chat id> records the inviter, ?start=ask opens a question.
    const startArg = is('start') ? arg : '';
    const referrer = startArg.startsWith('ref_') ? startArg.slice(4) : undefined;
    let touch: { isNew: boolean; userId: string | null; referredBy: string | null; pending: string | null } = { isNew: false, userId: null, referredBy: null, pending: null };
    try {
      touch = await touchChat(chatId, tgName, String(from?.first_name || ''), referrer && referrer !== chatId ? referrer : undefined, chatType, String(msg.chat.title || ''));
    } catch {
      /* the bot still answers when the chat table is unavailable */
    }

    if (touch.userId) {
      const byCode = db.users.find((u) => u.id === touch.userId);
      if (byCode) linked = byCode;
    }

    if (/^(utm|src)_/.test(startArg)) await setSource(chatId, startArg).catch(() => undefined);

    const sendLesson = async (code: string) => {
      const lesson = findLessonByCode(db, code);
      if (!lesson) return reply('Bunday dars kodi topilmadi. Kodni darsning sahifasidan nusxalab yuboring.', { reply_markup: BOT_MENU });
      let check = checkLessonOpen(db, linked, lesson);
      // The channel bonus lesson is open to everyone who is a member of the channel.
      if (!check.ok && channel && settings?.channelLessonId === lesson.id && (await isChannelMember(channel, Number(from?.id)))) check = { ok: true };
      if (!check.ok) return reply(check.message, { reply_markup: BOT_MENU });
      return reply(lessonCardText(db, lesson), {
        reply_markup: {
          inline_keyboard: [
            [{ text: '▶️ Darsni ochish', url: lessonLink(base, lesson) }],
            [{ text: '📚 Darslar', callback_data: 'lessons' }]
          ]
        }
      });
    };
    const sendSupport = (text: string, label = '[Telegram]') => {
      void notifyOwnerChat(db, `🆘 Yangi murojaat (${linked?.name || (tgName ? '@' + tgName : 'Telegram')}):\n${text.slice(0, 500)}`);
      db.supportTickets.unshift({
        id: 'ticket-' + Date.now(),
        userId: linked?.id,
        userName: linked ? `${linked.name} ${linked.surname || ''}`.trim() : tgName ? `@${tgName}` : 'Telegram foydalanuvchi',
        userPhone: linked?.phone || '',
        message: `${label} ${text}`.slice(0, 4000),
        category: 'boshqa',
        status: 'new',
        createdAt: new Date().toISOString()
      });
    };
    const linkFromCode = async (code: string) => {
      const uid = code ? await consumeLinkCode(code).catch(() => null) : null;
      const account = uid ? db.users.find((u) => u.id === uid) : undefined;
      if (!account) {
        await reply('Kod noto‘g‘ri yoki muddati tugagan. Saytda profilingizdan yangi kod oling: “Telegram bot bilan ulash”.', { reply_markup: BACK_MENU });
        return;
      }
      await linkChatToUser(chatId, account.id).catch(() => undefined);
      if (tgName && !account.telegramUsername) account.telegramUsername = tgName;
      linked = account;
      await reply(`✅ Hisob ulandi: ${account.name}. Endi /profil, /kunlik va boshqa buyruqlar sizning ma’lumotlaringiz bilan ishlaydi.`, { reply_markup: BOT_MENU });
    };
    const aiAllowed = () => rateLimit(`tgai:${chatId}`, 20, 60 * 60 * 1000).allowed;

    // A command or a button ends a question the bot was waiting on.
    if (touch.pending && (cb || typed.startsWith('/'))) await setPending(chatId, null).catch(() => undefined);

    // Voice message: the answer to a /speaking topic.
    const voice = msg.voice || msg.audio;
    if (voice && !cb) {
      const waiting = touch.pending || '';
      if (!waiting.startsWith('speaking|')) {
        await reply('Speaking baholash uchun avval /speaking yozing, so‘ng ovozli xabar yuboring.', { reply_markup: BOT_MENU });
        return NextResponse.json({ ok: true });
      }
      await setPending(chatId, null).catch(() => undefined);
      const key = aiKey();
      if (!key) {
        // Voice transcription needs Gemini (audio input); the text-only fallback providers cannot do it.
        await reply('Ovozli xabarni baholash hozir faqat Gemini orqali ishlaydi, u ulanmagan. Matn yozib yuboring yoki ustoz bilan bog‘laning.');
        return NextResponse.json({ ok: true });
      }
      if (Number(voice.duration) > 180) {
        await reply('Ovozli xabar 3 daqiqadan oshmasin. Qisqaroq gapirib qayta yuboring.');
        return NextResponse.json({ ok: true });
      }
      if (!aiAllowed()) {
        await reply('Bugun AI so‘rovlari limiti tugadi. Bir soatdan so‘ng urinib ko‘ring.');
        return NextResponse.json({ ok: true });
      }
      await reply('⏳ Ovozingiz baholanmoqda, bir oz kuting…');
      try {
        const bytes = await downloadTelegramFile(String(voice.file_id), 8 * 1024 * 1024);
        const transcript = await transcribeVoice(bytes, String(voice.mime_type || 'audio/ogg'), key);
        if (!transcript) {
          await reply('Ovozni tushunib bo‘lmadi. Aniqroq gapirib qayta yuboring.', { reply_markup: BOT_MENU });
        } else {
          await reply(await speakingFeedback(transcript, waiting.slice('speaking|'.length), Number(voice.duration) || 60, key), { reply_markup: BOT_MENU });
        }
      } catch (err: any) {
        await reply(`Baholashda xatolik: ${err?.message || 'noma’lum'}. Qayta urinib ko‘ring.`, { reply_markup: BOT_MENU });
      }
      return NextResponse.json({ ok: true });
    }

    // Plain text answers the question the bot asked: a search, a message to the teacher, an AI question, a word.
    if (touch.pending && !cb && typed && !typed.startsWith('/')) {
      const waiting = touch.pending;
      if (waiting.startsWith('speaking|')) {
        await reply('Ovozli xabar yuboring — men uni baholayman. Mavzu: ' + esc(waiting.slice('speaking|'.length)), { reply_markup: CANCEL_MENU });
        return NextResponse.json({ ok: true });
      }
      if ((waiting === 'ai' || waiting === 'word') && typed.length < 3) {
        await reply(waiting === 'ai' ? 'Savol juda qisqa. To‘liqroq yozing, masalan: “Present perfect qachon ishlatiladi?”' : 'So‘z juda qisqa. Masalan: achieve', { reply_markup: CANCEL_MENU });
        return NextResponse.json({ ok: true });
      }
      await setPending(chatId, null).catch(() => undefined);
      if (waiting === 'admin_post' && isOwnerChat) {
        const topic = typed.slice(0, 300);
        const draft = await withTyping(chatId, () => draftChannelPost(topic)).catch((err: any) => `Post tayyorlanmadi: ${err?.message || 'xatolik'}`);
        await reply(`📝 Mavzu: ${esc(topic)}\n\n${esc(draft)}`, { reply_markup: POST_MARKUP });
        return NextResponse.json({ ok: true });
      }
      if ((waiting === 'admin_broadcast' || waiting === 'admin_channel') && isOwnerChat) {
        const text = typed.slice(0, 3500);
        if (waiting === 'admin_channel') {
          if (!channel) await reply('Kanal ulanmagan.', { reply_markup: ADMIN_MENU });
          else await telegramApi('sendMessage', { chat_id: `@${channel}`, text }).then(() => reply('✅ Kanalga yuborildi.', { reply_markup: ADMIN_MENU })).catch((err: any) => reply(`Yuborib bo‘lmadi: ${err?.message || 'xatolik'}`));
        } else {
          const ids = await subscriberBatch(0, 200).catch(() => [] as string[]);
          let sent = 0;
          for (const id of ids) {
            await telegramApi('sendMessage', { chat_id: id, text }).then(() => sent++).catch(() => undefined);
            await new Promise((r) => setTimeout(r, 40));
          }
          await reply(`✅ Xabar ${sent} ta obunachiga yuborildi${ids.length === 200 ? ' (birinchi 200 tasi)' : ''}.`, { reply_markup: ADMIN_MENU });
        }
        return NextResponse.json({ ok: true });
      }
      if (waiting === 'search') {
        await reply(searchText(db, linked, typed), { reply_markup: BOT_MENU });
        return NextResponse.json({ ok: true });
      }
      if (waiting === 'support') {
        sendSupport(typed);
        await reply('Murojaatingiz ustozga yuborildi. Javob saytdagi “Yordam” bo‘limida chiqadi.', { reply_markup: BOT_MENU });
        return NextResponse.json({ ok: true });
      }
      if (waiting === 'ai' || waiting === 'word') {
        if (!aiAllowed()) {
          await reply('Bugun AI so‘rovlari limiti tugadi. Bir soatdan so‘ng urinib ko‘ring.', { reply_markup: BOT_MENU });
          return NextResponse.json({ ok: true });
        }
        const name = linked?.name || 'do‘st';
        const answer = await withTyping(chatId, () => (waiting === 'ai' ? askTutor(typed, name) : wordCard(typed))).catch((err: any) => `AI javob bermadi: ${err?.message || 'xatolik'}. Qayta urinib ko‘ring.`);
        await reply(answer, { reply_markup: waiting === 'ai' ? AI_FOLLOWUP : WORD_FOLLOWUP });
        return NextResponse.json({ ok: true });
      }
    }

    // Telegram Mini App: opens the site's learning shortcuts inside Telegram (the button is a web_app link, https only).
    if (is('app') && !isGroup && /^https:\/\//.test(base)) {
      await reply('📱 EduLevel Mini App — daraja testi, mock testlar va EduBek AI bir joyda.', { reply_markup: { inline_keyboard: [[{ text: '📱 Mini App ni ochish', web_app: { url: `${base}/miniapp` } }]] } });
      return NextResponse.json({ ok: true });
    }

    if (is('start') || is('menu')) {
      if (startArg.startsWith('link_')) {
        await linkFromCode(startArg.slice(5));
        return NextResponse.json({ ok: true });
      }
      if (startArg.startsWith('lesson_')) {
        await sendLesson(startArg.slice(7));
        return NextResponse.json({ ok: true });
      }
      if (startArg === 'ask') {
        await setPending(chatId, 'support').catch(() => undefined);
        await reply('Ustozga savolingizni yozing. Javob saytdagi “Yordam” bo‘limida chiqadi.', { reply_markup: CANCEL_MENU });
        return NextResponse.json({ ok: true });
      }
      const thanks = touch.isNew && referrer ? 'Sizni taklif qilgan do‘stingizga rahmat! Birinchi darsingizni tugatsangiz, ikkalangiz ham bonus olasiz.\n\n' : '';
      await reply(thanks + welcomeText(linked), { reply_markup: BOT_MENU });
      return NextResponse.json({ ok: true });
    }
    if (is('vazifa_yuborish')) {
      if (!linked) {
        await reply(NEED_LINK, { reply_markup: BACK_MENU });
      } else if (!arg) {
        await reply('Format: /vazifa_yuborish matn\nVazifangizni shu buyruq bilan yozing. Ustoz ko‘rib chiqadi.', { reply_markup: BACK_MENU });
      } else {
        sendSupport(arg.slice(0, 2000), '[Vazifa]');
        await reply('✅ Vazifangiz ustozga yuborildi.', { reply_markup: BOT_MENU });
      }
      return NextResponse.json({ ok: true });
    }
    if (is('ochirish')) {
      await forgetChat(chatId).catch(() => undefined);
      await reply('🗑 Bot ma’lumotlaringiz o‘chirildi: chat yozuvi va ulanish olib tashlandi. Qayta boshlash uchun /start yozing.');
      return NextResponse.json({ ok: true });
    }
    if (is('post')) {
      if (!isOwnerChat) {
        await reply('Bu buyruq faqat ustoz uchun.');
      } else if (!arg) {
        await setPending(chatId, 'admin_post').catch(() => undefined);
        await reply('✍️ Kanal posti mavzusini yozing. Masalan: “IELTS Writing Task 2 uchun 3 ta maslahat”.', { reply_markup: CANCEL_MENU });
      } else {
        const draft = await withTyping(chatId, () => draftChannelPost(arg)).catch((err: any) => `Post tayyorlanmadi: ${err?.message || 'xatolik'}`);
        await reply(`📝 Mavzu: ${esc(arg.slice(0, 300))}\n\n${esc(draft)}`, { reply_markup: POST_MARKUP });
      }
      return NextResponse.json({ ok: true });
    }
    if (is('reja')) {
      if (!isOwnerChat) {
        await reply('Bu buyruq faqat ustoz uchun.');
      } else {
        const ideas = await withTyping(chatId, () => draftChannelIdeas()).catch((err: any) => `G‘oyalar tayyorlanmadi: ${err?.message || 'xatolik'}`);
        await reply(`🗓 Haftalik reja\n\n${esc(ideas)}`, { reply_markup: IDEAS_MARKUP });
      }
      return NextResponse.json({ ok: true });
    }
    if (is('ulash')) {
      if (!arg) {
        await reply(card('🔗 Hisobni ulash', ['Saytda profil → “Telegram bot bilan ulash” bo‘limidan kod oling.', 'So‘ng shu yerga yozing: /ulash KOD']), { reply_markup: BACK_MENU });
      } else {
        await linkFromCode(arg);
      }
      return NextResponse.json({ ok: true });
    }
    if (is('yordam') || is('help')) {
      await reply(helpText(db.teacherProfile?.telegram || ''), { reply_markup: BOT_MENU });
      return NextResponse.json({ ok: true });
    }
    if (is('profil')) {
      await reply(profileCard(linked, tgName, db), { reply_markup: BOT_MENU });
      return NextResponse.json({ ok: true });
    }
    if (is('balans')) {
      if (!linked) {
        await reply(NEED_LINK, { reply_markup: BACK_MENU });
      } else {
        await reply(card('💰 Hisobingiz', [`Balans: ${money(linked.balance)}`, `Tanga: ${num(linked.coins)}`, `Obuna: ${tierLabel(linked.vipTier)}`]), {
          reply_markup: { inline_keyboard: [[{ text: '💳 Depozit to‘ldirish', callback_data: 'cmd:depozit', style: 'success' }], [{ text: '⬅️ Menyu', callback_data: 'menu:main' }]] }
        });
      }
      return NextResponse.json({ ok: true });
    }
    if (is('darslar')) {
      await reply(lessonsListText(db, linked), { reply_markup: BOT_MENU });
      return NextResponse.json({ ok: true });
    }
    if (is('qidir')) {
      if (arg) {
        await reply(searchText(db, linked, arg), { reply_markup: BOT_MENU });
      } else {
        await setPending(chatId, 'search').catch(() => undefined);
        await reply('Qidirish uchun dars nomi yoki kodini yozing:', { reply_markup: CANCEL_MENU });
      }
      return NextResponse.json({ ok: true });
    }
    if (is('progress')) {
      await reply(progressText(db, linked), { reply_markup: BOT_MENU });
      return NextResponse.json({ ok: true });
    }
    if (is('test') && !isGroup) {
      const picked = pickTestForQuiz(db, 5);
      if (!picked) {
        await reply('Hozircha test yo‘q. Ustoz test qo‘shgach, shu yerda paydo bo‘ladi.', { reply_markup: BOT_MENU });
        return NextResponse.json({ ok: true });
      }
      await startSession(chatId, picked.testId, picked.questions.map((q) => q.id));
      await reply(`🧠 ${picked.title}: ${picked.questions.length} ta savol. Javobni tanlang, natija oxirida chiqadi.`);
      await sendTrackedQuizPoll(chatId, picked.questions[0], false).catch(() => undefined);
      return NextResponse.json({ ok: true });
    }
    if (is('test') || is('quiz')) {
      // In a group (or with /quiz anywhere): one quiz poll from the question bank; answers are scored for /reyting.
      const pool = questionPool(db);
      if (pool.length === 0) {
        await reply('Hozircha savollar yo‘q.');
        return NextResponse.json({ ok: true });
      }
      await sendTrackedQuizPoll(chatId, pool[Math.floor(Math.random() * pool.length)], false).catch(() => undefined);
      return NextResponse.json({ ok: true });
    }
    if (is('reyting')) {
      if (isGroup) {
        const top = await groupLeaderboard(chatId, 10).catch(() => []);
        await reply(top.length ? ['🏆 Guruh reytingi (to‘g‘ri javoblar):', '', ...top.map((r, i) => `${i + 1}. ${r.name} — ${r.correct}/${r.answered}`)].join('\n') : 'Hozircha natijalar yo‘q. /quiz bilan savol yuboring.');
      } else {
        const top = await topReferrers(10).catch(() => []);
        await reply(top.length ? ['🏆 Eng faol taklif qiluvchilar:', '', ...top.map((r, i) => `${i + 1}. ${r.name || 'Ishtirokchi'} — ${r.qualified} ta do‘st`)].join('\n') : 'Hozircha reyting bo‘sh. /taklif orqali do‘stlaringizni taklif qiling.', { reply_markup: BOT_MENU });
      }
      return NextResponse.json({ ok: true });
    }
    if (is('speaking')) {
      if (isGroup) {
        await reply('Speaking faqat shaxsiy chatda. Botga bevosita yozing.');
        return NextResponse.json({ ok: true });
      }
      const topic = randomTopic();
      await setPending(chatId, `speaking|${topic}`).catch(() => undefined);
      await reply(`🎙 Mavzu: ${topic}\n\n1–2 daqiqa gapirib, ovozli xabar yuboring. Men IELTS bo‘yicha band bahosini beraman.`);
      return NextResponse.json({ ok: true });
    }
    if (is('ai')) {
      if (arg) {
        if (!aiAllowed()) {
          await reply('Bugun AI so‘rovlari limiti tugadi. Bir soatdan so‘ng urinib ko‘ring.', { reply_markup: BOT_MENU });
          return NextResponse.json({ ok: true });
        }
        await reply(await withTyping(chatId, () => askTutor(arg, linked?.name || 'do‘st')).catch((err: any) => `AI javob bermadi: ${err?.message || 'xatolik'}.`), { reply_markup: AI_FOLLOWUP });
      } else {
        await setPending(chatId, 'ai').catch(() => undefined);
        await reply('Ustozga (AI) savolingizni yozing. Masalan: “Present perfect qachon ishlatiladi?”', { reply_markup: CANCEL_MENU });
      }
      return NextResponse.json({ ok: true });
    }
    if (is('soz')) {
      if (arg) {
        if (!aiAllowed()) {
          await reply('Bugun AI so‘rovlari limiti tugadi. Bir soatdan so‘ng urinib ko‘ring.', { reply_markup: BOT_MENU });
          return NextResponse.json({ ok: true });
        }
        await reply(await withTyping(chatId, () => wordCard(arg)).catch((err: any) => `So‘z topilmadi: ${err?.message || 'xatolik'}.`), { reply_markup: WORD_FOLLOWUP });
      } else {
        await setPending(chatId, 'word').catch(() => undefined);
        await reply('Tarjima qilinadigan so‘zni yozing, masalan: achieve', { reply_markup: CANCEL_MENU });
      }
      return NextResponse.json({ ok: true });
    }
    if (is('kanal')) {
      await reply(channelText(channel), channel ? { reply_markup: channelMarkup(channel) } : {});
      return NextResponse.json({ ok: true });
    }
    if (is('obuna')) {
      if (!channel) {
        await reply('Kanal hozircha ulanmagan.', { reply_markup: BOT_MENU });
        return NextResponse.json({ ok: true });
      }
      const state = await channelMembership(channel, Number(from?.id));
      await reply(
        state === 'member'
          ? '✅ Obuna tasdiqlandi. Rahmat!'
          : state === 'none'
            ? 'Hali obuna bo‘lmagansiz. Kanalga o‘tib, qayta tekshiring.'
            : 'Obunani tekshirib bo‘lmadi. Ustoz botni kanalga admin qilishi kerak.',
        { reply_markup: BOT_MENU }
      );
      return NextResponse.json({ ok: true });
    }
    if (is('taklif')) {
      const counts = await referralCounts(chatId).catch(() => ({ invited: 0, qualified: 0 }));
      const link = botName ? startLink(botName, `ref_${chatId}`) : '';
      const text = inviteText(botName, chatId, counts.invited) + `\nMalakali (darsni tugatgan): ${counts.qualified} ta`;
      await reply(text, {
        reply_markup: {
          inline_keyboard: [
            ...(link ? [[{ text: '📤 Do‘stlarga ulashish', url: `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent('Edu Level botiga qo‘shiling — bepul dars va test!')}` }]] : []),
            [{ text: '🏆 Reyting', callback_data: 'leaders' }],
            [{ text: '📚 Menyu', callback_data: 'menu' }]
          ]
        }
      });
      return NextResponse.json({ ok: true });
    }
    if (is('murojaat')) {
      if (arg) {
        sendSupport(arg);
        await reply('Murojaatingiz ustozga yuborildi.', { reply_markup: BOT_MENU });
      } else {
        await setPending(chatId, 'support').catch(() => undefined);
        await reply('Ustozga yubormoqchi bo‘lgan savolingizni yozing:', { reply_markup: CANCEL_MENU });
      }
      return NextResponse.json({ ok: true });
    }
    if (is('statistika')) {
      if (!isOwnerChat) {
        await reply('Bu buyruq faqat ustoz uchun.');
        return NextResponse.json({ ok: true });
      }
      const subscribers = await countSubscribers().catch(() => 0);
      const refs = await referralTotals().catch(() => ({ invited: 0, qualified: 0, bundles: 0 }));
      await reply(
        statsText({
          subscribers,
          linked: db.users.filter((u) => u.role !== 'owner' && (u.telegramUsername || '').trim()).length,
          pendingDeposits: (db.depositTransactions || []).filter((t) => t.status === 'pending').length,
          openLessons: db.lessons.filter((l) => l.isPublished !== false && (l.lessonCode || '').trim()).length
        }) + `\nTakliflar: ${refs.invited} ta · malakali: ${refs.qualified} ta`,
        { reply_markup: BOT_MENU }
      );
      return NextResponse.json({ ok: true });
    }
    if (is('elon')) {
      // The owner posts to the channel from the bot: /elon <text>
      if (!isOwnerChat) {
        await reply('Bu buyruq faqat ustoz uchun.');
        return NextResponse.json({ ok: true });
      }
      if (!channel || !arg) {
        await reply('Format: /elon matn. Avval bot sozlamalarida kanal username ni kiriting.');
        return NextResponse.json({ ok: true });
      }
      await telegramApi('sendMessage', { chat_id: `@${channel}`, text: arg.slice(0, 3500) })
        .then(() => reply('✅ Kanalga yuborildi.'))
        .catch((err: any) => reply(`Kanalga yuborib bo‘lmadi: ${err?.message || 'xatolik'}`));
      return NextResponse.json({ ok: true });
    }
    if (is('admin')) {
      if (!isOwnerChat) {
        await reply('Bu buyruq faqat ustoz uchun.');
        return NextResponse.json({ ok: true });
      }
      await reply('🛠 Ustoz boshqaruv paneli. Kerakli bo‘limni tanlang:', { reply_markup: ADMIN_MENU });
      return NextResponse.json({ ok: true });
    }
    if (is('yangiliklar')) {
      await reply(newsText(db), { reply_markup: BOT_MENU });
      return NextResponse.json({ ok: true });
    }
    if (is('faq')) {
      await reply(faqText(db), { reply_markup: BOT_MENU });
      return NextResponse.json({ ok: true });
    }
    if (is('vip')) {
      await reply(vipText(db), { reply_markup: BOT_MENU });
      return NextResponse.json({ ok: true });
    }
    if (is('ustoz')) {
      await reply(teacherText(db), { reply_markup: BOT_MENU });
      return NextResponse.json({ ok: true });
    }
    if (is('kunlik')) {
      await reply(dailyText(db, linked), { reply_markup: BOT_MENU });
      return NextResponse.json({ ok: true });
    }
    if (is('vazifa')) {
      await reply(homeworkText(db, linked), { reply_markup: BOT_MENU });
      return NextResponse.json({ ok: true });
    }
    if (is('eslatma')) {
      const flags = await chatFlags(chatId).catch(() => ({ optedOut: false, remindersOff: false }));
      const v = arg.toLowerCase();
      if (v === 'on' || v === 'off') {
        await setChatFlag(chatId, 'reminders_off', v === 'off').catch(() => undefined);
        await reply(`Kunlik eslatma ${v === 'on' ? 'yoqildi' : 'o‘chirildi'}.`, { reply_markup: BOT_MENU });
      } else if (arg) {
        await reply('Faqat on yoki off yozing: /eslatma on yoki /eslatma off', { reply_markup: BOT_MENU });
      } else {
        await reply(card('⏰ Kunlik eslatma', [`Hozir: ${flags.remindersOff ? '🔕 o‘chiq' : '🔔 yoqiq'}`, '', 'O‘zgartirish: /eslatma on yoki /eslatma off']), { reply_markup: BOT_MENU });
      }
      return NextResponse.json({ ok: true });
    }
    if (is('sharh')) {
      const m = arg.match(/^([1-5])\s+([\s\S]+)$/);
      if (!m && /^\d+/.test(arg) && !/^[1-5]\s/.test(arg)) {
        await reply('Baho 1 dan 5 gacha bo‘lishi kerak. Masalan: /sharh 5 Juda foydali dars', { reply_markup: BACK_MENU });
      } else if (!m) {
        await reply('Format: /sharh 5 fikringiz\nBaho 1 dan 5 gacha. Sharh ustoz tasdiqlagach saytda chiqadi.', { reply_markup: BACK_MENU });
      } else if (!linked) {
        await reply(NEED_LINK, { reply_markup: BACK_MENU });
      } else {
        reviewFromBot(db, { userId: linked.id, name: `${linked.name} ${linked.surname || ''}`.trim(), rating: Number(m[1]), text: m[2] });
        await reply('Rahmat! Sharhingiz ustoz tasdiqlagach saytda chiqadi.', { reply_markup: BOT_MENU });
      }
      return NextResponse.json({ ok: true });
    }
    if (is('obuna_bekor') || is('obuna_qayta')) {
      const off = is('obuna_bekor');
      await setChatFlag(chatId, 'opted_out', off).catch(() => undefined);
      await reply(off ? 'Ommaviy xabarlar endi kelmaydi. Qayta yoqish: /obuna_qayta' : 'Ommaviy xabarlar qayta yoqildi.', { reply_markup: BOT_MENU });
      return NextResponse.json({ ok: true });
    }
    const extraName = (cmd.match(/^\/([\w]+)/) || [])[1]?.toLowerCase() || '';
    if (EXTRA_NAMES.has(extraName)) {
      const arg2 = cmd.replace(/^\/\w+(@\w+)?\s*/, '').trim();
      if (extraName.startsWith('admin_')) {
        if (!isOwnerChat) {
          await reply('Bu buyruq faqat ustoz uchun.');
          return NextResponse.json({ ok: true });
        }
        const out = await runOwnerExtra(extraName, arg2, db);
        if (out.revokeUserId) await revokeUserSessions(out.revokeUserId).catch(() => undefined);
        await reply(out.text, { reply_markup: out.markup || ADMIN_MENU });
        return NextResponse.json({ ok: true });
      }
      if (extraName === 'ajratish') {
        await unlinkChat(chatId);
        linked = undefined;
        await reply('Hisob botdan ajratildi. Qayta ulash uchun saytda yangi kod oling.', { reply_markup: BOT_MENU });
        return NextResponse.json({ ok: true });
      }
      if (extraName === 'sozlamalar') {
        const flags = await chatFlags(chatId).catch(() => ({ optedOut: false, remindersOff: false }));
        await reply(settingsText(flags, !!linked), { reply_markup: settingsMarkup(flags) });
        return NextResponse.json({ ok: true });
      }
      const out = runStudentExtra(extraName, db, linked, chatId, arg2);
      if (out) await reply(out.text, { reply_markup: BOT_MENU });
      return NextResponse.json({ ok: true });
    }

    if (is('depozit')) {
      const sum = parseAmount(arg);
      if (arg && (!sum || sum < minimum)) {
        await reply(`Minimal depozit: ${money(minimum)}. Summani to‘g‘ri yozing, masalan: /depozit ${num(Math.max(minimum, 100000))}`, { reply_markup: CANCEL_MENU });
      } else if (sum) {
        await reply(`Endi to‘lov chekini rasm qilib yuboring va izohga ${num(sum)} deb yozing.`, { reply_markup: CANCEL_MENU });
      } else {
        await reply(`To‘lov chekini rasm qilib yuboring va izohga summani yozing, masalan: ${num(Math.max(minimum, 100000))}\nMinimal summa: ${money(minimum)}`, { reply_markup: CANCEL_MENU });
      }
      return NextResponse.json({ ok: true });
    }

    // A receipt is a photo, or an image sent as a file (Telegram's "file" option keeps the original quality).
    const imageDoc = msg.document && /^image\//i.test(String(msg.document.mime_type || '')) ? msg.document : null;
    const photo = Array.isArray(msg.photo) && msg.photo.length ? msg.photo[msg.photo.length - 1] : imageDoc;
    // A lesson code: "/kod EDU-L01", a button, or just the code typed in the chat.
    if (!photo && (is('kod') || (!cb && looksLikeLessonCode(typed)))) {
      const code = is('kod') ? arg : typed;
      if (!code) {
        await reply('Dars kodini yozing, masalan: EDU-L01. Kodni darsning sahifasidan nusxalang.', { reply_markup: CANCEL_MENU });
      } else {
        await sendLesson(code);
      }
      return NextResponse.json({ ok: true });
    }

    if (!photo) {
      if (cb) await reply('Bu tugma eskirgan yoki noto‘g‘ri. Menyudan qayta tanlang.', { reply_markup: BOT_MENU });
      else if (!isGroup) {
        // A free question goes to the AI tutor; if it cannot answer, the menu is shown as before.
        const tutor = await answerTelegramQuestion(String(chatId), typed).catch(() => ({ ok: false as const, reason: 'error' as const }));
        if (tutor.ok) await reply(tutor.text);
        else if (tutor.reason === 'limit') await reply('Bugun savollar limiti tugadi. Bir soatdan keyin qayta yozing yoki menyudan foydalaning.', { reply_markup: BOT_MENU });
        else await reply('Hozir javob bera olmadim. Menyudan tanlang yoki dars kodini yozing.', { reply_markup: BOT_MENU });
      }
      return NextResponse.json({ ok: true });
    }
    if (!linked) {
      await reply(`${NEED_LINK}\nKeyin chekni yuboring.`, { reply_markup: BACK_MENU });
      return NextResponse.json({ ok: true });
    }
    const amount = parseAmount(typed);
    if (!amount || amount < minimum) {
      await reply(`Summani izohga yozing (kamida ${money(minimum)}), masalan: ${num(Math.max(minimum, 100000))}`, { reply_markup: CANCEL_MENU });
      return NextResponse.json({ ok: true });
    }
    if (db.features?.depositsEnabled === false) {
      await reply('Depozit qabul qilish vaqtincha to‘xtatilgan.');
      return NextResponse.json({ ok: true });
    }
    try {
      const bytes = await downloadTelegramFile(String(photo.file_id));
      const receiptUrl = await uploadImage(bytes, 'telegram-chek', { ownerId: 'telegram', visibility: 'private' });
      const depositCode = `DEP-${Math.floor(10000 + Math.random() * 90000)}`;
      const tx: DepositTransaction = {
        id: `dep-${Date.now()}`,
        userId: linked.id,
        userName: `${linked.name} ${linked.surname || ''}`.trim(),
        userPhone: linked.phone || '',
        telegramUsername: tgName,
        amount,
        status: 'pending',
        method: 'telegram_bot',
        paymentCode: depositCode,
        receiptUrl,
        cardNumber: db.telegramBotSettings?.cardNumber || '',
        note: `Telegram bot orqali. To‘lov kodi: ${depositCode}`,
        createdAt: new Date().toISOString()
      };
      if (!db.depositTransactions) db.depositTransactions = [];
      db.depositTransactions.unshift(tx);
      logAudit('System', 'DEPOSIT_REQUEST', 'Finance', `${tx.userName} (${num(amount)} so‘m, Telegram) depozit so‘rovi (Kutilmoqda)`);
      void notifyOwnerChat(db, `💳 Yangi depozit: ${esc(tx.userName)} · ${money(amount)} (${depositCode})`);
      await reply(card('✅ Chek qabul qilindi', [`Summa: ${money(amount)}`, `Kod: <code>${esc(depositCode)}</code>`, '', 'Ustoz tekshirgach balansingizga qo‘shiladi.']), { reply_markup: BACK_MENU });
    } catch (err: any) {
      // A plain reason for the student; the technical cause is in the server log.
      const why = err?.message && !/fetch failed/i.test(err.message) ? err.message : 'Telegram bilan aloqa uzildi';
      await reply(`Chekni qabul qilib bo‘lmadi: ${why}. Bir daqiqadan so‘ng chekni qayta yuboring.`);
    }
    return NextResponse.json({ ok: true });
  }

  // POST /api/student/telegram-link — a code the student sends to the bot (/ulash CODE, or the link) to connect it.
  if (fullPath === 'student/telegram-link') {
    const user = db.users.find((u) => u.id === auth!.userId);
    if (!user) return NextResponse.json({ success: false, message: 'Hisob topilmadi' }, { status: 404 });
    const bot = (db.telegramBotSettings?.botUsername || '').replace(/^@/, '');
    if (!bot) return NextResponse.json({ success: false, message: 'Telegram bot hali sozlanmagan.' }, { status: 503 });
    const code = await createLinkCode(user.id);
    return NextResponse.json({ success: true, code, link: startLink(bot, `link_${code}`), botUsername: bot, expiresInMinutes: 30 });
  }

  // POST /api/telegram/cron — run by an outside scheduler once a day (reminders) or once a week (digest).
  // The request must carry the secret from TELEGRAM_CRON_SECRET in the x-cron-secret header.
  if (fullPath === 'telegram/cron') {
    const expected = (process.env.TELEGRAM_CRON_SECRET || '').trim();
    if (!expected || req.headers.get('x-cron-secret') !== expected) return NextResponse.json({ ok: false }, { status: 403 });
    const job = String(req.nextUrl.searchParams.get('job') || body?.job || '');
    const bot = (db.telegramBotSettings?.botUsername || '').replace(/^@/, '');
    if (job === 'reminders') return NextResponse.json({ success: true, ...(await runDailyReminders(db, bot)) });
    if (job === 'digest') return NextResponse.json({ success: true, ...(await postDigest(db, bot)) });
    return NextResponse.json({ success: false, message: 'job: reminders yoki digest bo‘lsin' }, { status: 400 });
  }

  // POST /api/owner/telegram-broadcast — the owner's channel and subscriber messages, the pinned post, the Q&A post,
  // a channel quiz, the weekly digest and the reminders run by hand.
  if (fullPath === 'owner/telegram-broadcast') {
    const target = String(body.target || '');
    const bot = (db.telegramBotSettings?.botUsername || '').replace(/^@/, '');
    const channel = (db.telegramBotSettings?.channelUsername || '').replace(/^@/, '');
    if (!botToken()) return NextResponse.json({ success: false, message: 'Avval Render’da TELEGRAM_BOT_TOKEN ni kiriting.' }, { status: 503 });
    const needChannel = () => NextResponse.json({ success: false, message: 'Avval bot sozlamalarida kanal username ni kiriting.' }, { status: 400 });
    const failed = (err: any) => NextResponse.json({ success: false, message: `Telegram xatosi: ${err?.message || 'noma’lum'}. Bot kanalda admin ekanini tekshiring.` }, { status: 502 });

    if (target === 'channel_lesson') {
      if (!channel) return needChannel();
      const a = lessonAnnouncement(db, String(body.lessonId || ''), bot);
      if (!a) return NextResponse.json({ success: false, message: 'Dars topilmadi yoki hali yopiq.' }, { status: 404 });
      try {
        await telegramApi('sendMessage', { chat_id: `@${channel}`, text: a.text, ...(a.markup ? { reply_markup: a.markup } : {}) });
      } catch (err: any) {
        return failed(err);
      }
      logAudit('Owner', 'TELEGRAM_CHANNEL', 'TelegramBot', `Kanalga dars e’loni: ${db.lessons.find((l) => l.id === body.lessonId)?.title || ''}`);
      return NextResponse.json({ success: true, message: 'Dars kanalga e’lon qilindi.' });
    }

    if (target === 'channel_quiz') {
      if (!channel) return needChannel();
      const pool = questionPool(db);
      if (pool.length === 0) return NextResponse.json({ success: false, message: 'Savollar bankida yaroqli savol yo‘q.' }, { status: 400 });
      try {
        await sendQuizPoll(`@${channel}`, pool[Math.floor(Math.random() * pool.length)], true);
      } catch (err: any) {
        return failed(err);
      }
      return NextResponse.json({ success: true, message: 'Kanalga test (so‘rovnoma) yuborildi.' });
    }

    if (target === 'channel_pin') {
      if (!channel) return needChannel();
      try {
        const welcome = await telegramApi('sendMessage', {
          chat_id: `@${channel}`,
          text: '👋 Edu Level o‘quv botiga xush kelibsiz!\n\n• Dars kodi bilan darsni oling\n• Test, speaking va AI yordamchi\n• Do‘stlaringizni taklif qiling, VIP bonus oling',
          ...(bot ? { reply_markup: { inline_keyboard: [[{ text: '🤖 Botni ochish', url: `https://t.me/${bot}` }]] } } : {})
        });
        await telegramApi('pinChatMessage', { chat_id: `@${channel}`, message_id: welcome.message_id, disable_notification: true });
      } catch (err: any) {
        return failed(err);
      }
      return NextResponse.json({ success: true, message: 'Xabar kanalga joylandi va mahkamlandi.' });
    }

    if (target === 'channel_qa') {
      if (!channel) return needChannel();
      try {
        await telegramApi('sendMessage', {
          chat_id: `@${channel}`,
          text: '💬 Savol-javob: savolingizni botga yozing, ustoz javob beradi.',
          ...(bot ? { reply_markup: { inline_keyboard: [[{ text: '❓ Savol yozish', url: startLink(bot, 'ask') }]] } } : {})
        });
      } catch (err: any) {
        return failed(err);
      }
      return NextResponse.json({ success: true, message: 'Savol-javob posti kanalga yuborildi.' });
    }

    if (target === 'digest') {
      return NextResponse.json({ success: true, ...(await postDigest(db, bot)) });
    }

    if (target === 'reminders') {
      return NextResponse.json({ success: true, ...(await runDailyReminders(db, bot)) });
    }

    const text = String(body.text || '').trim().slice(0, 3500);
    if (!text) return NextResponse.json({ success: false, message: 'Xabar matnini kiriting.' }, { status: 400 });

    if (target === 'channel') {
      if (!channel) return needChannel();
      try {
        await telegramApi('sendMessage', { chat_id: `@${channel}`, text, ...(bot ? { reply_markup: { inline_keyboard: [[{ text: '🤖 Botga o‘tish', url: `https://t.me/${bot}` }]] } } : {}) });
      } catch (err: any) {
        return failed(err);
      }
      logAudit('Owner', 'TELEGRAM_CHANNEL', 'TelegramBot', `Kanalga xabar: ${text.slice(0, 80)}`);
      return NextResponse.json({ success: true, message: 'Xabar kanalga yuborildi.' });
    }

    if (target === 'subscribers') {
      // Sent in batches of 200 (the owner's panel asks for the next batch), about 20 messages a second.
      const offset = Math.max(0, Number(body.offset) || 0);
      const ids = await subscriberBatch(offset, 200);
      let sent = 0;
      let failedCount = 0;
      for (const id of ids) {
        try {
          await telegramApi('sendMessage', { chat_id: id, text });
          sent++;
        } catch {
          failedCount++;
        }
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      const done = ids.length < 200;
      if (offset === 0) logAudit('Owner', 'TELEGRAM_BROADCAST', 'TelegramBot', `Obunachilarga xabar: ${text.slice(0, 80)}`);
      return NextResponse.json({ success: true, sent, failed: failedCount, done, nextOffset: done ? null : offset + ids.length });
    }

    return NextResponse.json({ success: false, message: 'Noma’lum yo‘nalish.' }, { status: 400 });
  }

  // POST /api/owner/telegram-status — what is ready for the bot (yes/no only; no value is ever returned).
  if (fullPath === 'owner/telegram-status') {
    const st = botSetupStatus();
    return NextResponse.json({
      success: true,
      ...st,
      username: db.telegramBotSettings?.botUsername || '',
      cardSet: !!(db.telegramBotSettings?.cardNumber || '').trim(),
      lessonsReady: db.lessons.filter((l) => l.isPublished !== false).length,
      lessonsWithCode: db.lessons.filter((l) => (l.lessonCode || '').trim()).length,
      subscribers: await countSubscribers().catch(() => 0),
      referrals: await referralTotals().catch(() => ({ invited: 0, qualified: 0, bundles: 0 })),
      webhookUrl: `${publicBaseUrl(req.nextUrl.origin)}/api/telegram/webhook`,
      depositsOn: db.features?.depositsEnabled !== false
    });
  }

  // POST /api/owner/telegram-webhook — connects (or checks) the bot webhook. Needs TELEGRAM_BOT_TOKEN on the server.
  if (fullPath === 'owner/telegram-webhook') {
    if (!botToken() || !webhookSecret()) {
      return NextResponse.json({ success: false, message: 'Render’da TELEGRAM_BOT_TOKEN va TELEGRAM_WEBHOOK_SECRET ni qo‘shing.' }, { status: 503 });
    }
    try {
      if (body.action === 'info') {
        const info = await telegramApi('getWebhookInfo');
        return NextResponse.json({ success: true, info: { url: info.url, pendingUpdateCount: info.pending_update_count, lastError: info.last_error_message || null } });
      }
      const url = `${publicBaseUrl(req.nextUrl.origin)}/api/telegram/webhook`;
      await telegramApi('setWebhook', { url, secret_token: webhookSecret(), allowed_updates: ['message', 'callback_query', 'poll_answer'] });
      await telegramApi('setMyCommands', { commands: BOT_COMMANDS }).catch(() => undefined);
      // The menu button next to the message box opens the command list.
      await telegramApi('setChatMenuButton', { menu_button: { type: 'commands' } }).catch(() => undefined);
      logAudit('Owner', 'TELEGRAM_WEBHOOK', 'TelegramBot', 'Bot webhook ulandi');
      return NextResponse.json({ success: true, url });
    } catch (err: any) {
      return NextResponse.json({ success: false, message: err?.message || 'Telegram bilan bog‘lanib bo‘lmadi' }, { status: 502 });
    }
  }

  // 12. POST /api/deposits/request (2-Step Deposit)
  if (fullPath === 'deposits/request') {
    const { userName, userPhone, telegramUsername, method = 'card', receiptUrl, cardNumber, note } = body;
    const amount = Number(body.amount);
    const userId = auth!.role === 'owner' ? body.userId : auth!.userId;
    // Amounts are stored in bigint columns: whole sums only, within a sane ceiling (a decimal or 1e20 would fail the write).
    if (!Number.isSafeInteger(amount) || amount <= 0 || amount > MAX_DEPOSIT_UZS) {
      return NextResponse.json({ success: false, message: "Noto'g'ri depozit miqdori" }, { status: 400 });
    }
    // Students pay to the card the owner configured. Without it, no deposit can be requested.
    if (auth!.role !== 'owner') {
      if (db.features?.depositsEnabled === false) {
        return NextResponse.json({ success: false, message: 'Depozit qabul qilish vaqtincha to‘xtatilgan.' }, { status: 503 });
      }
      const card = (db.telegramBotSettings?.cardNumber || '').trim();
      if (!card) {
        return NextResponse.json({ success: false, message: "To‘lov rekvizitlari hali sozlanmagan. Ustozga murojaat qiling." }, { status: 503 });
      }
      const min = Number(db.telegramBotSettings?.minDepositAmount) || 0;
      if (amount < min) {
        return NextResponse.json({ success: false, message: `Minimal depozit: ${min.toLocaleString()} so‘m` }, { status: 400 });
      }
      // The receipt (chek) is what the owner checks the payment against: it must be there, and must be one of our uploads or a web link.
      if (typeof receiptUrl !== 'string' || !/^(https?:\/\/|\/)/i.test(receiptUrl.trim()) || receiptUrl.length > 800) {
        return NextResponse.json({ success: false, message: 'To‘lov chekini (skrinshot yoki rasm) yuklang.' }, { status: 400 });
      }
      if (amount > 50_000_000) {
        return NextResponse.json({ success: false, message: 'Summa juda katta.' }, { status: 400 });
      }
    }
    // Whatever role asks, a receipt link must be a plain web or site-relative link (it is shown to the owner as an image/link).
    if (receiptUrl && !(typeof receiptUrl === 'string' && /^(https?:\/\/|\/)/i.test(receiptUrl.trim()))) {
      return NextResponse.json({ success: false, message: 'Chek havolasi noto‘g‘ri.' }, { status: 400 });
    }

    // One receipt pays for one deposit, and a student cannot pile up unreviewed requests (duplicate-transaction guard).
    if (auth!.role !== 'owner') {
      const receipt = String(receiptUrl || '').trim();
      if (receipt && (db.depositTransactions || []).some((t) => t.receiptUrl === receipt && t.status !== 'rejected')) {
        return NextResponse.json({ success: false, message: 'Bu chek allaqachon yuborilgan. Yangi to‘lov uchun yangi chek yuklang.', code: 'DUPLICATE_RECEIPT' }, { status: 409 });
      }
      const pendingMine = (db.depositTransactions || []).filter((t) => t.userId === auth!.userId && t.status === 'pending').length;
      if (pendingMine >= 5) {
        return NextResponse.json({ success: false, message: 'Sizda tekshirilmagan 5 ta so‘rov bor. Ustoz ularni ko‘rib chiqquncha kuting.', code: 'TOO_MANY_PENDING' }, { status: 429 });
      }
    }

    let user = db.users.find((u) => u.id === userId);
    if (!user && userPhone && auth!.role === 'owner') {
      user = db.users.find((u) => u.phone && u.phone.replace(/\D/g, '') === userPhone.replace(/\D/g, ''));
    }

    const finalUserId = user ? user.id : userId || 'user-' + Date.now();
    const finalUserName = user ? `${user.name} ${user.surname || ''}`.trim() : userName || "O'quvchi";
    const finalUserPhone = user ? user.phone : userPhone || '';
    const code = `DEP-${Math.floor(10000 + Math.random() * 90000)}`;
    const cleanTg = (telegramUsername || user?.telegramUsername || '').replace(/^@/, '');

    const newTx: DepositTransaction = {
      id: `dep-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
      userId: finalUserId,
      userName: finalUserName,
      userPhone: finalUserPhone,
      telegramUsername: cleanTg,
      amount: Number(amount),
      status: 'pending', // Strictly pending until admin approval
      method: method || 'card',
      paymentCode: code,
      receiptUrl: receiptUrl || '',
      cardNumber: db.telegramBotSettings?.cardNumber || '',
      note: note || `To'lov kodi: ${code}`,
      createdAt: new Date().toISOString()
    };

    if (!db.depositTransactions) db.depositTransactions = [];
    db.depositTransactions.unshift(newTx);
    logAudit(
      'System',
      'DEPOSIT_REQUEST',
      'Finance',
      `${finalUserName} (${amount.toLocaleString()} so'm, ${method}) depozit so'rovi kiritdi (Kutilmoqda)`
    );
    

    return NextResponse.json({ success: true, transaction: newTx, user: publicUser(user) });
  }

  // POST /api/student/password — a student changes their own password
  if (fullPath === 'student/password') {
    if (auth!.role !== 'student') return forbidden();
    const user = db.users.find((u) => u.id === auth!.userId);
    if (!user) return NextResponse.json({ success: false, message: 'Foydalanuvchi topilmadi' }, { status: 404 });
    const lim = rateLimit(`pw:${user.id}`, 6, 15 * 60 * 1000);
    if (!lim.allowed) return tooMany(lim.retryAfterSec);
    const oldPass = String(body.oldPassword || '');
    const newPass = String(body.newPassword || '').trim();
    if (!verifyPassword(oldPass, user.password).ok) return NextResponse.json({ success: false, message: 'Joriy parol noto‘g‘ri.' }, { status: 400 });
    if (newPass.length < 8 || newPass.length > 100) return NextResponse.json({ success: false, message: 'Yangi parol kamida 8 belgi bo‘lsin.' }, { status: 400 });
    user.password = hashPassword(newPass);
    logAudit(`${user.name} ${user.surname || ''}`.trim(), 'STUDENT_PASSWORD', 'User', 'O‘quvchi parolini almashtirdi');
    return NextResponse.json({ success: true });
  }

  // 13. POST /api/owner/deposits/approve/:id
  if (fullPath.startsWith('owner/deposits/approve/')) {
    const id = fullPath.replace('owner/deposits/approve/', '');
    const tx = db.depositTransactions.find((t) => t.id === id);
    if (!tx) return NextResponse.json({ success: false, message: 'Tranzaksiya topilmadi' }, { status: 404 });
    if (tx.status !== 'pending') {
      return NextResponse.json({ success: false, message: 'Bu tranzaksiya allaqachon ko‘rib chiqilgan' }, { status: 400 });
    }

    // The student must exist before the deposit is closed: otherwise the money would never reach a balance.
    // Failing here rolls the request back (status 4xx), so the transaction stays pending for a retry.
    let user = db.users.find((u) => u.id === tx.userId);
    if (!user && tx.userPhone) {
      user = db.users.find((u) => u.phone && u.phone.replace(/\D/g, '') === tx.userPhone.replace(/\D/g, ''));
    }
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Bu depozitning o‘quvchisi topilmadi. Depozit tasdiqlanmadi.', code: 'USER_NOT_FOUND' },
        { status: 409 }
      );
    }

    tx.status = 'completed';
    tx.approvedAt = new Date().toISOString();
    {
      const who = db.users.find((u) => u.id === tx.userId);
      if (who?.telegramUsername) void privateChatForUsername(who.telegramUsername).then((chat) => chat && telegramNotify(chat, `💳 Depozitingiz tasdiqlandi: ${money(tx.amount)} balansingizga qo‘shildi.`));
    }

    user.balance = (user.balance || 0) + tx.amount;
    user.xp = (user.xp || 0) + Math.round(tx.amount / 1000); // 1 XP per 1000 UZS deposit bonus

    logAudit(
      'Owner',
      'APPROVE_DEPOSIT',
      'Finance',
      `${tx.userName} ning ${tx.amount.toLocaleString()} so'mlik depoziti tasdiqlandi. Yangi balans: ${user?.balance?.toLocaleString()} so'm`
    );
    
    return NextResponse.json({ success: true, transaction: tx, user: publicUser(user) });
  }

  // 14. POST /api/owner/deposits/reject/:id
  if (fullPath.startsWith('owner/deposits/reject/')) {
    const id = fullPath.replace('owner/deposits/reject/', '');
    const tx = db.depositTransactions.find((t) => t.id === id);
    if (!tx) return NextResponse.json({ success: false, message: 'Tranzaksiya topilmadi' }, { status: 404 });
    if (tx.status !== 'pending') {
      return NextResponse.json({ success: false, message: 'Bu tranzaksiya allaqachon ko‘rib chiqilgan' }, { status: 400 });
    }
    tx.status = 'rejected';
    logAudit('Owner', 'REJECT_DEPOSIT', 'Finance', `${tx.userName} ning depoziti rad etildi`);
    
    return NextResponse.json({ success: true, transaction: tx });
  }

  // 15. POST /api/owner/teacher-profile
  if (fullPath === 'owner/teacher-profile') {
    const current = db.teacherProfile;
    const count = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.min(1000000, Math.floor(v)) : fallback);
    const text = (v: unknown, max: number, fallback: string) => (typeof v === 'string' ? v.trim().slice(0, max) : fallback);
    const photo = typeof body.photoUrl === 'string' ? body.photoUrl.trim().slice(0, 1000) : current.photoUrl || '';
    if (photo && !/^https:\/\//.test(photo) && !photo.startsWith('/')) {
      return NextResponse.json({ success: false, message: 'Rasm havolasi https:// yoki / bilan boshlanishi kerak' }, { status: 400 });
    }
    db.teacherProfile = {
      ...current,
      name: text(body.name, 120, current.name),
      title: text(body.title, 160, current.title),
      bio: text(body.bio, 2000, current.bio),
      methodology: text(body.methodology, 2000, current.methodology),
      phone: text(body.phone, 40, current.phone),
      telegram: text(body.telegram, 200, current.telegram),
      photoUrl: photo,
      experienceYears: count(body.experienceYears, current.experienceYears),
      studentsCount: count(body.studentsCount, current.studentsCount),
      nationalCertCount: count(body.nationalCertCount, current.nationalCertCount),
      grantCount: count(body.grantCount, current.grantCount)
    };
    logAudit('Owner', 'UPDATE_TEACHER', 'TeacherProfile', `Ustoz ma'lumotlari yangilandi: ${db.teacherProfile.name}`);
    return NextResponse.json({ success: true, teacherProfile: db.teacherProfile });
  }

  // POST /api/student/promo-check — price preview for a VIP plan (the purchase repeats this check)
  if (fullPath === 'student/promo-check') {
    const plan = (db.vipPlans || []).find((p) => p.id === body.planId);
    if (!plan) return NextResponse.json({ success: false, message: 'Tanlangan tarif topilmadi.' }, { status: 404 });
    const quote = promoQuote(db, body.code, plan);
    if (!quote.ok) return NextResponse.json({ success: false, message: quote.message }, { status: 400 });
    return NextResponse.json({
      success: true,
      code: quote.promo ? quote.promo.code : null,
      percent: quote.percent,
      discount: quote.discount,
      basePrice: plan.priceMonthly,
      price: Math.max(0, plan.priceMonthly - quote.discount)
    });
  }

  // POST /api/owner/promo-codes — create or update a discount code
  if (fullPath === 'owner/promo-codes') {
    const code = String(body.code || '').trim().toUpperCase();
    if (!/^[A-Z0-9_-]{3,32}$/.test(code)) {
      return NextResponse.json({ success: false, message: 'Kod 3–32 belgi bo‘lishi kerak: lotin harflar, raqamlar, _ yoki -' }, { status: 400 });
    }
    if (db.promoCodes.some((p) => p.code.toUpperCase() === code && p.id !== body.id)) {
      return NextResponse.json({ success: false, message: 'Bu kod allaqachon mavjud.' }, { status: 409 });
    }
    const planDiscounts: Record<string, number> = {};
    for (const plan of db.vipPlans) {
      const raw = Number((body.planDiscounts || {})[plan.id]);
      if (raw === 0 || (body.planDiscounts || {})[plan.id] === undefined || (body.planDiscounts || {})[plan.id] === '') continue;
      if (!Number.isInteger(raw) || raw < 1 || raw > 90) {
        return NextResponse.json({ success: false, message: `${plan.name} uchun chegirma 1% dan 90% gacha bo‘lishi kerak` }, { status: 400 });
      }
      planDiscounts[plan.id] = raw;
    }
    if (Object.keys(planDiscounts).length === 0) {
      return NextResponse.json({ success: false, message: 'Kamida bitta tarif uchun chegirma foizini kiriting.' }, { status: 400 });
    }
    const maxUses = Number(body.maxUses);
    if (!Number.isInteger(maxUses) || maxUses < 0) {
      return NextResponse.json({ success: false, message: 'Ishlatish soni 0 (cheksiz) yoki musbat butun son bo‘lishi kerak' }, { status: 400 });
    }
    let expiresAt: string | null = null;
    if (body.expiresAt) {
      const t = new Date(body.expiresAt).getTime();
      if (!Number.isFinite(t)) return NextResponse.json({ success: false, message: 'Muddat sanasi noto‘g‘ri' }, { status: 400 });
      expiresAt = new Date(t).toISOString();
    }
    const existing = body.id ? db.promoCodes.find((p) => p.id === body.id) : undefined;
    if (existing) {
      Object.assign(existing, { code, planDiscounts, maxUses, expiresAt, active: body.active !== false });
      logAudit('Owner', 'UPDATE_PROMO', 'Promo', `${code}`);
      return NextResponse.json({ success: true, promo: existing });
    }
    const promo = {
      id: 'promo-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      code,
      planDiscounts,
      maxUses,
      usedCount: 0,
      expiresAt,
      active: body.active !== false,
      createdAt: new Date().toISOString()
    };
    db.promoCodes.unshift(promo);
    logAudit('Owner', 'CREATE_PROMO', 'Promo', `${code}`);
    return NextResponse.json({ success: true, promo });
  }

  // POST /api/owner/promo-codes/delete
  if (fullPath === 'owner/promo-codes/delete') {
    const id = String(body.id || '');
    const target = db.promoCodes.find((p) => p.id === id);
    if (!target) return NextResponse.json({ success: false, message: 'Kod topilmadi' }, { status: 404 });
    db.promoCodes = db.promoCodes.filter((p) => p.id !== id);
    logAudit('Owner', 'DELETE_PROMO', 'Promo', target.code);
    return NextResponse.json({ success: true });
  }

  // POST /api/owner/features — owner switches: Edu Coin on or off, and which student menu items are hidden
  if (fullPath === 'owner/features') {
    const STUDENT_NAV_IDS = ['dashboard', 'progress', 'courses', 'mashqlar', 'tests', 'thematic_packs', 'level_tests', 'ai_studio', 'library', 'leaderboard', 'vip', 'coin_shop'];
    const FLAG_KEYS = [
      'publicEdubek', 'introSplash', 'aiEnabled', 'depositsEnabled', 'newsSubscribe', 'registrationOpen', 'profileMistakes', 'dashTodayPlan', 'dashEdubekTip',
      'edubekVoice', 'edubekPronunciation', 'edubekWordOfDay', 'blitzEnabled', 'vipGiftBanner', 'planCompare', 'edubekGames'
    ];
    const hasCoin = typeof body.coinEnabled === 'boolean';
    const hasNav = Array.isArray(body.navHidden);
    const hasOwnerNav = Array.isArray(body.ownerNavHidden) || (body.ownerNavLabels && typeof body.ownerNavLabels === 'object');
    const flagEntries = Object.entries(body.flags && typeof body.flags === 'object' ? body.flags : {}).filter(([k, v]) => FLAG_KEYS.includes(k) && typeof v === 'boolean');
    // Edubek settings chosen by the owner: the greeting shown to students and whether the figure moves.
    const eduIn = body.edubekSettings && typeof body.edubekSettings === 'object' ? body.edubekSettings : null;
    if (!hasCoin && !hasNav && !hasOwnerNav && !flagEntries.length && !eduIn) {
      return NextResponse.json({ success: false, message: 'Sozlama noto‘g‘ri' }, { status: 400 });
    }
    const next = { ...(db.features || { coinEnabled: true }) };
    if (eduIn) {
      const prev = (next as { edubekSettings?: { greeting?: string; animations?: boolean } }).edubekSettings || {};
      // A switch keeps its saved value unless the owner sends a new one; missing switches are on.
      const pick = (key: string) => (typeof eduIn[key] === 'boolean' ? eduIn[key] : (prev as Record<string, unknown>)[key] !== false);
      (next as { edubekSettings?: unknown }).edubekSettings = {
        greeting: typeof eduIn.greeting === 'string' ? eduIn.greeting.replace(/\s+/g, ' ').trim().slice(0, 160) : prev.greeting || '',
        animations: typeof eduIn.animations === 'boolean' ? eduIn.animations : prev.animations !== false,
        voiceNotes: pick('voiceNotes'),
        files: pick('files'),
        stickers: pick('stickers')
      };
    }
    if (hasCoin) next.coinEnabled = body.coinEnabled;
    if (hasNav) {
      next.navHidden = body.navHidden.filter((x: unknown) => typeof x === 'string' && STUDENT_NAV_IDS.includes(x)).slice(0, 20);
    }
    if (hasOwnerNav) {
      const OWNER_IDS = OWNER_NAV_ITEMS.map((i) => i.id);
      if (Array.isArray(body.ownerNavHidden)) {
        next.ownerNavHidden = body.ownerNavHidden.filter((x: unknown) => typeof x === 'string' && OWNER_IDS.includes(x) && !OWNER_NAV_LOCKED.includes(x)).slice(0, 40);
      }
      if (body.ownerNavLabels && typeof body.ownerNavLabels === 'object') {
        const labels: Record<string, string> = {};
        for (const [id, name] of Object.entries(body.ownerNavLabels as Record<string, unknown>)) {
          if (OWNER_IDS.includes(id) && typeof name === 'string' && name.trim()) labels[id] = name.trim().slice(0, 40);
        }
        next.ownerNavLabels = labels;
      }
    }
    for (const [k, v] of flagEntries) (next as Record<string, unknown>)[k] = v;
    db.features = next;
    logAudit('Owner', 'FEATURES', 'Features', hasCoin ? (body.coinEnabled ? 'Edu Coin yoqildi' : 'Edu Coin o‘chirildi') : flagEntries.length ? `Funksiyalar: ${flagEntries.map(([k, v]) => `${k}=${v ? 'yoq' : 'o‘chiq'}`).join(', ')}` : 'Kabinet menyusi yangilandi');
    return NextResponse.json({ success: true, features: db.features });
  }

  // 16. POST /api/owner/site-theme
  if (fullPath === 'owner/site-theme') {
    const { activeBackground, allowUserThemeOverride } = body;
    if (!activeBackground && typeof allowUserThemeOverride !== 'boolean') {
      return NextResponse.json({ success: false, message: 'Sozlama noto‘g‘ri' }, { status: 400 });
    }
    if (activeBackground) {
      db.siteTheme.activeBackground = activeBackground;
      logAudit('Owner', 'UPDATE_THEME', 'SiteTheme', `Platforma foni yangilandi: ${activeBackground}`);
    }
    if (typeof allowUserThemeOverride === 'boolean') {
      db.siteTheme.allowUserThemeOverride = allowUserThemeOverride;
      logAudit('Owner', 'UPDATE_THEME', 'SiteTheme', `O‘quvchilar mavzuni o‘zgartirishi ${allowUserThemeOverride ? 'yoqildi' : 'o‘chirildi'}`);
    }
    
    return NextResponse.json({ success: true, siteTheme: db.siteTheme });
  }

  // POST /api/news/subscribe — a visitor asks to hear about news (public, rate limited)
  if (fullPath === 'news/subscribe') {
    if (db.features?.newsSubscribe === false) return NextResponse.json({ success: false, message: 'Obuna hozircha yopiq.' }, { status: 403 });
    const lim = rateLimit(`sub:${clientIp(req)}`, 15, 60 * 60 * 1000);
    if (!lim.allowed) return tooMany(lim.retryAfterSec);
    const raw = String(body.contact || '').trim().slice(0, 120);
    let kind: 'email' | 'phone' | 'telegram' | null = null;
    let contact = raw;
    if (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(raw)) { kind = 'email'; contact = raw.toLowerCase(); }
    else if (/^@?[A-Za-z][A-Za-z0-9_]{4,31}$/.test(raw)) { kind = 'telegram'; contact = '@' + raw.replace(/^@/, ''); }
    else if (/^\+?[\d\s()-]{9,16}$/.test(raw)) { kind = 'phone'; contact = raw.replace(/[^\d+]/g, ''); }
    if (!kind) return NextResponse.json({ success: false, message: 'E-mail, telefon yoki Telegram (@nom) kiriting.' }, { status: 400 });
    if (!db.newsSubscribers) db.newsSubscribers = [];
    if (!db.newsSubscribers.some((s) => s.contact === contact)) {
      if (db.newsSubscribers.length >= 5000) return NextResponse.json({ success: false, message: 'Obuna hozircha yopiq.' }, { status: 503 });
      db.newsSubscribers.unshift({ id: 'sub-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6), contact, kind, createdAt: new Date().toISOString() });
    }
    return NextResponse.json({ success: true, message: 'Rahmat! Yangiliklarni yetkazamiz.' });
  }

  // DELETE handled below; POST /api/owner/news — create or update one news item for the landing's Yangiliklar section
  if (fullPath === 'owner/news') {
    const title = String(body.title || '').trim();
    const text = String(body.body || '').trim();
    if (title.length < 3 || title.length > 120) return NextResponse.json({ success: false, message: 'Sarlavha 3 dan 120 belgigacha bo‘lsin' }, { status: 400 });
    if (text.length > 4000) return NextResponse.json({ success: false, message: 'Matn 4000 belgidan oshmasin' }, { status: 400 });
    const imageUrl = String(body.imageUrl || '').trim().slice(0, 500);
    if (imageUrl && !/^(https?:\/\/|\/)/i.test(imageUrl)) return NextResponse.json({ success: false, message: 'Rasm havolasi http:// yoki https:// bilan boshlansin' }, { status: 400 });
    const tag = String(body.tag || '').trim().slice(0, 24);
    db.news = db.news || [];
    const existing = body.id ? db.news.find((n) => n.id === body.id) : undefined;
    const fields = { title, body: text, imageUrl, tag, pinned: !!body.pinned, published: body.published !== false };
    let item;
    if (existing) {
      Object.assign(existing, fields);
      item = existing;
    } else {
      item = { id: 'news-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6), ...fields, createdAt: new Date().toISOString() };
      db.news.unshift(item);
    }
    logAudit('Owner', existing ? 'UPDATE_NEWS' : 'CREATE_NEWS', 'News', title);
    return NextResponse.json({ success: true, item });
  }

  // POST /api/owner/vip-gift — start or stop a limited-time VIP for every student
  if (fullPath === 'owner/vip-gift') {
    if (body.action === 'stop') {
      if (!db.vipGift) return NextResponse.json({ success: false, message: 'Faol sovg‘a yo‘q' }, { status: 400 });
      db.vipGift = { ...db.vipGift, active: false };
      syncVipGift(db);
      logAudit('Owner', 'STOP_VIP_GIFT', 'VipGift', 'VIP sovg‘a to‘xtatildi');
      return NextResponse.json({ success: true, vipGift: db.vipGift });
    }
    const tier = String(body.tier || '');
    if (!db.vipPlans.some((p) => p.id === tier)) return NextResponse.json({ success: false, message: 'Tarif tanlanmagan' }, { status: 400 });
    const hours = Math.round(Number(body.hours));
    if (!(hours >= 1 && hours <= 24 * 90)) return NextResponse.json({ success: false, message: 'Muddat 1 soatdan 90 kungacha bo‘lsin' }, { status: 400 });
    const title = String(body.title || 'Hammaga VIP sovg‘a').trim().slice(0, 80) || 'Hammaga VIP sovg‘a';
    const message = String(body.message || '').trim().slice(0, 300);
    if (db.vipGift) {
      db.vipGift = { ...db.vipGift, active: false };
      syncVipGift(db); // the previous gift ends first, so every student is back where they were
    }
    const now = Date.now();
    db.vipGift = { active: true, tier, title, message, startsAt: new Date(now).toISOString(), endsAt: new Date(now + hours * 3600_000).toISOString() };
    syncVipGift(db);
    logAudit('Owner', 'START_VIP_GIFT', 'VipGift', `${tier.toUpperCase()} · ${hours} soat`);
    return NextResponse.json({ success: true, vipGift: db.vipGift, studentsGifted: Object.keys(db.vipGiftApplied || {}).length });
  }

  // POST /api/owner/ai-limits — daily AI minutes per plan (0 = no limit)
  if (fullPath === 'owner/ai-limits') {
    const cleaned = cleanAiLimits(body);
    if (!cleaned) return NextResponse.json({ success: false, message: 'Daqiqalar noto‘g‘ri' }, { status: 400 });
    // Only real plans are stored.
    const ids = new Set(db.vipPlans.map((p) => p.id));
    cleaned.planMinutes = Object.fromEntries(Object.entries(cleaned.planMinutes).filter(([id]) => ids.has(id as any)));
    cleaned.planMinutes = cleaned.planMinutes;
    db.aiLimits = cleaned;
    logAudit('Owner', 'AI_LIMITS', 'AI', `Bepul: ${cleaned.freeMinutes} daq; ${Object.entries(cleaned.planMinutes).map(([k, v]) => `${k.toUpperCase()}: ${v}`).join(', ')}`);
    return NextResponse.json({ success: true, aiLimits: db.aiLimits });
  }

  // 17. POST /api/owner/livestream
  if (fullPath === 'owner/livestream') {
    const { isLive, title, telegramChannel, streamUrl } = body;
    db.liveStream = {
      isLive: !!isLive,
      title: title || 'IELTS / CEFR Jonli Efir',
      telegramChannel: telegramChannel || '@edulevel_english',
      streamUrl: streamUrl || 'https://t.me/edulevel_english',
      startedAt: isLive ? new Date().toISOString() : undefined
    };
    logAudit('Owner', 'LIVESTREAM', 'Broadcast', `Jonli efir holati: ${isLive ? 'FAOL' : 'YOPILDI'}`);
    
    return NextResponse.json({ success: true, liveStream: db.liveStream });
  }

  // ---------------------------------------------------------------------------
  // AI endpoints — server-side provider calls, rate limits, usage tracking.
  // If the provider fails we return a clear 503; nothing is invented.
  // ---------------------------------------------------------------------------
  if (fullPath.startsWith('ai/') && fullPath !== 'ai/generate') {
    const who = auth!.userId;
    const lim = rateLimit(`ai:${who}`, auth!.role === 'owner' ? 300 : 120, 60 * 60 * 1000);
    if (!lim.allowed) return tooMany(lim.retryAfterSec);
    if (auth!.role !== 'owner' && db.features?.aiEnabled === false) {
      return NextResponse.json({ success: false, code: 'AI_OFF', message: 'AI vaqtincha o‘chirib qo‘yilgan.' }, { status: 503 });
    }
    // The owner's monthly spending cap: when this month's AI cost reaches it, students' AI pauses until next month.
    if (auth!.role !== 'owner' && (db.aiLimits?.capSom || 0) > 0) {
      const month = statsDay().slice(0, 7);
      const stats = await readAiStats();
      const used = costSom(Object.entries(stats.days || {}).filter(([d]) => d.startsWith(month)).map(([, v]) => v), db.aiLimits);
      if (used >= (db.aiLimits?.capSom || 0)) {
        return NextResponse.json({ success: false, code: 'AI_BUDGET', message: 'AI uchun oylik mablag‘ tugadi. Keyingi oyda yana ishlaydi, ustoz bilan bog‘laning.' }, { status: 503 });
      }
    }
    // Daily AI time of the student's plan (the owner sets it per plan). The clock runs while the AI section is open.
    if (auth!.role !== 'owner') {
      const minutes = aiMinutesFor(db.aiLimits, auth!.user ?? undefined);
      if (minutes > 0 && (await readAiSeconds(who)) >= minutes * 60) {
        return NextResponse.json(
          { success: false, code: 'AI_TIME_LIMIT', message: `Bugungi AI vaqtingiz tugadi (${minutes} daqiqa). Ertaga qayta urinib ko‘ring yoki tarifingizni oshiring.` },
          { status: 429 }
        );
      }
    }
    const key = getEffectiveAiKey();
    // Template tests are curated content, not AI output: available to the owner without a key.
    if (fullPath === 'ai/generate-test' && body.useTemplate && auth!.role === 'owner') {
      const t = (['cefr', 'ielts', 'general'].includes(body.track) ? body.track : 'cefr') as 'cefr' | 'ielts' | 'general';
      return NextResponse.json({ success: true, test: getTemplateTest(t, typeof body.title === 'string' ? body.title.slice(0, 160) : undefined), isTemplate: true });
    }
    // A lesson passed to the tutor must exist, be published and match the student's track (checked before the key).
    if (fullPath === 'ai/chat-tutor' && typeof body.lessonId === 'string' && body.lessonId) {
      const picked = db.lessons.find((l) => l.id === body.lessonId && l.isPublished !== false);
      if (!picked) return NextResponse.json({ success: false, message: 'Dars topilmadi' }, { status: 404 });
      if (picked.track && auth!.user?.track && picked.track !== auth!.user.track) return forbidden();
    }
    if (!key && availableFallbacks(process.env).length === 0) {
      return NextResponse.json(
        {
          success: false,
          code: 'AI_NOT_CONFIGURED',
          message:
            auth!.role === 'owner'
              ? 'AI xizmati sozlanmagan: serverda GEMINI_API_KEY yoki owner AI kaliti kerak.'
              : 'AI xizmati hozircha ulanmagan. Birozdan so‘ng qayta urinib ko‘ring.'
        },
        { status: 503 }
      );
    }
    const track = (op: string) => {
      const day = tashkentDay();
      if (!db.aiUsage) db.aiUsage = [];
      let row = db.aiUsage.find((u) => u.userId === who && u.day === day);
      if (!row) {
        row = { userId: who, day, count: 0, byOperation: {} };
        db.aiUsage.unshift(row);
        db.aiUsage = db.aiUsage.slice(0, 5000);
      }
      row.count += 1;
      row.byOperation[op] = (row.byOperation[op] || 0) + 1;
      // Checks done outside the chat (writing, speaking, tests) count as 45 seconds of AI time each.
      if (auth!.role === 'student' && op !== 'chat-tutor') void beatAiTime(who, 45).catch(() => {});
    };
    const fail = (e: any) => {
      console.error('[ai]', fullPath, e?.detail || e?.message);
      return NextResponse.json(
        {
          success: false,
          code: 'AI_UNAVAILABLE',
          message: e?.message || 'AI xizmati javob bermadi. Birozdan so‘ng qayta urinib ko‘ring.',
          ...(auth!.role === 'owner' && e?.detail ? { detail: e.detail } : {})
        },
        { status: 503 }
      );
    };
    const str = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '');

    const aiStore = { calls: [] as AiCallRecord[] };
    const aiRes = await aiCallStore.run(aiStore, async () => {
    try {
      if (fullPath === 'ai/grade-writing') {
        const essayText = str(body.essayText, 8000);
        if (essayText.trim().split(/\s+/).filter(Boolean).length < 30) {
          return NextResponse.json({ success: false, message: 'Baholash uchun kamida 30 so‘z yozing.' }, { status: 400 });
        }
        const evaluation = await gradeWritingEssayWithAi({ essayText, taskPrompt: str(body.taskPrompt, 2000), taskType: str(body.taskType, 40), apiKey: key });
        if (!evaluation || typeof evaluation.overallBand !== 'number') throw new Error('AI javobi noto‘g‘ri formatda');
        track('grade-writing');
        // Original text and evaluation are stored separately-named fields of one record.
        if (auth!.role === 'student') {
          if (!db.writingSubmissions) db.writingSubmissions = [];
          const words = essayText.trim().split(/\s+/).filter(Boolean).length;
          db.writingSubmissions.unshift({
            id: 'ws-' + Date.now(),
            userId: who,
            taskId: str(body.taskId, 80) || 'custom',
            essayText,
            wordCount: words,
            overallBand: evaluation.overallBand,
            taskAchievementScore: evaluation.taskAchievementScore,
            coherenceScore: evaluation.coherenceScore,
            lexicalScore: evaluation.lexicalScore,
            grammarScore: evaluation.grammarScore,
            feedback: evaluation.feedback || '',
            colorCodedErrors: Array.isArray(evaluation.colorCodedErrors) ? evaluation.colorCodedErrors.slice(0, 30) : [],
            rewrittenBand9: evaluation.rewrittenBand9 || '',
            rewrittenC1: evaluation.rewrittenC1 || '',
            createdAt: new Date().toISOString(),
            isAiEstimate: true
          } as any);
        }
        
        return NextResponse.json({ success: true, evaluation, disclaimer: 'AI tomonidan taxminiy amaliyot bahosi — rasmiy IELTS/CEFR natijasi emas.' });
      }

      if (fullPath === 'ai/evaluate-speaking') {
        const transcript = str(body.transcript, 6000);
        if (transcript.trim().split(/\s+/).filter(Boolean).length < 10) {
          return NextResponse.json({ success: false, message: 'Baholash uchun nutq matni juda qisqa (kamida 10 so‘z).' }, { status: 400 });
        }
        const evaluation = await evaluateSpeakingWithAi({
          transcript,
          topicPrompt: str(body.topicPrompt, 1000),
          part: body.part,
          durationSeconds: Math.max(5, Math.min(900, Number(body.durationSeconds) || 60)),
          apiKey: key
        });
        if (!evaluation || typeof evaluation.overallBand !== 'number') throw new Error('AI javobi noto‘g‘ri formatda');
        // Pronunciation cannot be judged from a text transcript: never report it as measured.
        evaluation.pronunciationScore = undefined;
        evaluation.pronunciationNote = 'Talaffuz faqat matn asosida baholanmaydi — bu ko‘rsatkich hisoblanmadi.';
        track('evaluate-speaking');
        if (auth!.role === 'student') {
          if (!db.speakingSubmissions) db.speakingSubmissions = [];
          db.speakingSubmissions.unshift({
            id: 'ss-' + Date.now(),
            userId: who,
            cardId: str(body.cardId, 80) || 'custom',
            part: body.part || 1,
            transcript,
            overallBand: evaluation.overallBand,
            fluencyScore: evaluation.fluencyScore,
            lexicalScore: evaluation.lexicalScore,
            grammarScore: evaluation.grammarScore,
            pronunciationScore: undefined,
            wpm: evaluation.wpm,
            fillerWords: evaluation.fillerWords || [],
            fillerWordsCount: evaluation.fillerWordsCount || 0,
            detailedFeedback: evaluation.detailedFeedback || '',
            createdAt: new Date().toISOString(),
            isAiEstimate: true
          } as any);
        }
        
        return NextResponse.json({ success: true, evaluation, disclaimer: 'AI tomonidan taxminiy amaliyot bahosi — rasmiy natija emas.' });
      }

      if (fullPath === 'ai/translate-3level') {
        const query = str(body.query, 300).trim();
        if (!query) return NextResponse.json({ success: false, message: 'So‘z yoki ibora kiriting' }, { status: 400 });
        const translation = await translate3LevelWithAi(query, key);
        track('translate');
        
        return NextResponse.json({ success: true, translation });
      }

      if (fullPath === 'ai/chat-tutor' || fullPath === 'ai/chat-tutor-stream') {
        const tutorMode = body.mode === 'explain' ? 'explain' : 'tutor';
        const userMessage = str(body.userMessage, tutorMode === 'explain' ? 8000 : 4000).trim();
        if (!userMessage) return NextResponse.json({ success: false, message: 'Savol bo‘sh' }, { status: 400 });

        // The lesson the student picked is the AI's material: its konspekt, description and homework.
        // Only published lessons of the student's own track are used.
        let lesson: { title: string; code?: string; description?: string; notes?: string; homework?: string } | undefined;
        if (typeof body.lessonId === 'string' && body.lessonId) {
          const found = db.lessons.find((l) => l.id === body.lessonId && l.isPublished !== false);
          if (!found) return NextResponse.json({ success: false, message: 'Dars topilmadi' }, { status: 404 });
          if (found.track && auth!.user?.track && found.track !== auth!.user.track) return forbidden();
          lesson = {
            title: found.title,
            code: found.lessonCode || undefined,
            description: found.description,
            notes: found.notesMarkdown,
            homework: found.homework
          };
        }

        const history = (Array.isArray(body.history) ? body.history : [])
          .slice(-10)
          .map((m: any) => ({ sender: m?.sender === 'ai' ? ('ai' as const) : ('user' as const), text: str(m?.text, 1500) }))
          .filter((m: { text: string }) => m.text.trim());

        const tutorParams: TutorParams = {
          userMessage,
          lesson,
          history,
          studentName: auth!.user ? auth!.user.name : 'Ustoz',
          vipTier: auth!.user?.vipTier || 'individual',
          mode: tutorMode,
          level: ['A2', 'B1', 'B2', 'C1'].includes(body.level) ? body.level : undefined,
          simple: body.simple === true,
          talk: body.talk === true,
          scenario: typeof body.scenario === 'string' && /^[a-z_]{2,30}$/.test(body.scenario) ? body.scenario : undefined,
          apiKey: key
        };

        if (fullPath === 'ai/chat-tutor-stream') {
          // The answer is sent as the model writes it. Everything the database needs is done before the first byte.
          track('chat-tutor');
          const enc = new TextEncoder();
          const streamCalls: AiCallRecord[] = [];
          const stream = new ReadableStream<Uint8Array>({
            start(controller) {
              void aiCallStore.run({ calls: streamCalls }, async () => {
                try {
                  await streamTutorAnswer(tutorParams, (piece) => controller.enqueue(enc.encode(piece)));
                } catch (e: any) {
                  console.error('[ai] chat-tutor-stream', e?.detail || e?.message);
                  controller.enqueue(enc.encode('\u0001' + (e?.message || 'AI xizmati javob bermadi. Birozdan so‘ng qayta urinib ko‘ring.')));
                } finally {
                  controller.close();
                  void recordAiStats(streamCalls, { op: 'chat-tutor', userId: who });
                }
              });
            }
          });
          return new NextResponse(stream, {
            headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', 'X-Accel-Buffering': 'no' }
          });
        }

        // The same parallel model race as the stream: a slow model no longer holds the answer back.
        const replyCalls: AiCallRecord[] = [];
        const reply = await aiCallStore.run({ calls: replyCalls }, () => streamTutorAnswer(tutorParams, () => undefined));
        void recordAiStats(replyCalls, { op: 'chat-tutor', userId: who });
        if (!reply || typeof reply !== 'string') throw new Error('AI bo‘sh javob qaytardi');
        track('chat-tutor');

        return NextResponse.json({ success: true, reply });
      }

      if (fullPath === 'ai/quiz-from-document') {
        // Owner only: a test (lesson, course or mock) is written from a pasted text or an uploaded .docx / .txt.
        if (auth!.role !== 'owner') return forbidden();
        try {
          let text = str(body.text, 60000).trim();
          if (typeof body.fileBase64 === 'string' && body.fileBase64) {
            const payload = body.fileBase64.replace(/^data:[^;]+;base64,/, '');
            if (payload.length > 11 * 1024 * 1024) {
              return NextResponse.json({ success: false, message: 'Fayl hajmi 8 MB dan oshmasligi kerak.' }, { status: 413 });
            }
            text = (await extractDocumentText(Buffer.from(payload, 'base64'), str(body.fileName, 200))).trim();
          }
          if (text.length < 80) {
            return NextResponse.json({ success: false, message: 'Matn juda qisqa: kamida bir necha gap kerak.' }, { status: 400 });
          }
          const quiz = await generateQuizFromText({ text, count: Number(body.count) || 10, title: str(body.title, 160), apiKey: key });
          track('quiz-from-document');
          return NextResponse.json({ success: true, ...quiz });
        } catch (err: any) {
          return NextResponse.json({ success: false, message: err?.message || 'Testni yaratib bo‘lmadi.' }, { status: 400 });
        }
      }

      if (fullPath === 'ai/paste-to-mock') {
        const mock = balanceAllChoices(await generatePasteToMockWithAi(str(body.rawText, 20000), key));
        if (!mock) throw new Error('AI javobi noto‘g‘ri formatda');
        track('paste-to-mock');
        
        return NextResponse.json({ success: true, mock });
      }

      if (fullPath === 'ai/generate-test') {
        const trackName = (['cefr', 'ielts', 'general'].includes(body.track) ? body.track : 'cefr') as 'cefr' | 'ielts' | 'general';
        if (body.useTemplate) {
          return NextResponse.json({ success: true, test: getTemplateTest(trackName, str(body.title, 160)), isTemplate: true });
        }
        const generated = balanceAllChoices(await generateMockTestWithAi({ track: trackName, title: str(body.title, 160), customPrompt: str(body.customPrompt, 2000), apiKey: key }));
        track('generate-test');
        
        return NextResponse.json({ success: true, test: generated, isTemplate: false });
      }

      if (fullPath === 'ai/student-test') {
        const source = str(body.source, 8000).trim();
        if (source.length < 3) {
          return NextResponse.json({ success: false, message: 'Test yasash uchun mavzu yoki dars matnini kiriting.' }, { status: 400 });
        }
        const generated = balanceAllChoices(await generateStudentPracticeTest({
          source,
          count: Number(body.count) || 5,
          level: str(body.level, 20) || undefined,
          apiKey: key
        }));
        track('student-test');
        
        return NextResponse.json({ success: true, test: generated, disclaimer: 'AI yaratgan amaliy mashq — rasmiy test emas.' });
      }

      if (fullPath === 'ai/generate-exercises') {
        const sourceText = String(body.sourceText || '').trim();
        if (sourceText.length < 40) {
          return NextResponse.json({ success: false, message: 'Matn juda qisqa. Kamida 40 belgi kiriting.' }, { status: 400 });
        }
        if (sourceText.length > 12000) {
          return NextResponse.json({ success: false, message: 'Matn 12 000 belgidan oshmasligi kerak.' }, { status: 400 });
        }
        if (!EXERCISE_SKILLS.includes(body.skill) || !EXERCISE_LEVELS.includes(body.level)) {
          return NextResponse.json({ success: false, message: 'Ko‘nikma va darajani tanlang.' }, { status: 400 });
        }
        try {
          const generated = await generateExercisesFromText({
            source: sourceText,
            skill: body.skill,
            level: body.level,
            count: Number(body.count) || 6,
            apiKey: key
          });
          track('exercise-generate');
          return NextResponse.json({ success: true, ...generated, disclaimer: 'AI taklifi. Nashr qilishdan oldin savollarni tekshiring.' });
        } catch (err) {
          if (err instanceof AiUnavailableError) {
            return NextResponse.json({ success: false, message: 'AI mashq yarata olmadi. Matnni qisqartirib yoki qayta urinib ko‘ring.' }, { status: 502 });
          }
          throw err;
        }
      }

      if (fullPath === 'ai/owner-assistant') {
        if (auth!.role !== 'owner') return NextResponse.json({ success: false, message: 'Ruxsat yo‘q' }, { status: 403 });
        const question = str(body.question, 1500).trim();
        if (!question) return NextResponse.json({ success: false, message: 'Savol bo‘sh' }, { status: 400 });
        const students = (db.users || []).filter((u) => u.role === 'student');
        const vipCount = students.filter((u) => u.vipTier && u.vipTier !== 'none' && u.vipTier !== 'free').length;
        const byTrack: Record<string, number> = {};
        students.forEach((u) => {
          const t = (u as any).track || 'belgilanmagan';
          byTrack[t] = (byTrack[t] || 0) + 1;
        });
        const pendingDeposits = (db.depositTransactions || []).filter((t) => t.status === 'pending');
        const today = tashkentDay();
        const aiToday = (db.aiUsage || []).filter((u) => u.day === today).reduce((sum, u) => sum + u.count, 0);
        const summary = [
          `O‘quvchilar soni: ${students.length} (VIP: ${vipCount})`,
          `Yo‘nalishlar bo‘yicha: ${Object.entries(byTrack).map(([k, v]) => k + '=' + v).join(', ') || 'yo‘q'}`,
          `Kutilayotgan depozitlar: ${pendingDeposits.length} ta, jami ${pendingDeposits.reduce((a, t) => a + (t.amount || 0), 0).toLocaleString('en-US')} so‘m`,
          `Yangi murojaatlar: ${(db.supportTickets || []).filter((t) => t.status === 'new').length}`,
          `Tasdiqlanmagan fikrlar: ${(db.reviews || []).filter((r) => r.status === 'pending').length}`,
          `Kurslar: ${(db.courses || []).length}, darslar: ${(db.lessons || []).length}, mock testlar: ${(db.tests || []).length}`,
          `Bugungi AI so‘rovlar: ${aiToday}`
        ].join('\n');
        const reply = await ownerAssistantReply({ question, summary, apiKey: key });
        track('owner-assistant');
        
        return NextResponse.json({ success: true, reply });
      }
    } catch (e: any) {
      return fail(e);
    }
    });
    void recordAiStats(aiStore.calls, { op: fullPath.slice(3), userId: who });
    if (aiRes) return aiRes;
  }

  // 23C. POST /api/reading-tests
  if (fullPath === 'reading-tests') {
    const testData = body as Partial<ReadingTest>;
    const newReadingTest: ReadingTest = {
      id: testData.id || 'reading-' + Date.now(),
      title: testData.title || 'Yangi Reading Test',
      track: (testData.track || 'cefr') as any,
      durationMinutes: testData.durationMinutes || 60,
      passages: testData.passages || []
    };
    if (!db.readingTests) db.readingTests = [];
    db.readingTests.unshift(newReadingTest);
    logAudit('Owner', 'CREATE_READING_TEST', 'ReadingTest', `Yangi reading test qo'shildi: ${newReadingTest.title} (${newReadingTest.track})`);
    
    return NextResponse.json({ success: true, readingTest: newReadingTest });
  }

  // 24. POST /api/upload
  // POST /api/files/extract-text — the text of a .docx or .txt file for the chat (PDF is not read here).
  if (fullPath === 'files/extract-text') {
    const payload = typeof body.fileBase64 === 'string' ? body.fileBase64.replace(/^data:[^;]+;base64,/, '') : '';
    if (!payload) return NextResponse.json({ success: false, message: 'Fayl topilmadi.' }, { status: 400 });
    if (payload.length > 9 * 1024 * 1024) return NextResponse.json({ success: false, message: 'Fayl hajmi 6 MB dan oshmasligi kerak.' }, { status: 413 });
    const lim = rateLimit(`extract:${auth!.userId}`, 60, 60 * 60 * 1000);
    if (!lim.allowed) return tooMany(lim.retryAfterSec);
    try {
      const text = (await extractDocumentText(Buffer.from(payload, 'base64'), String(body.fileName || '').slice(0, 200))).trim();
      if (text.length < 3) return NextResponse.json({ success: false, message: 'Fayldan matn topilmadi.' }, { status: 400 });
      return NextResponse.json({ success: true, text: text.slice(0, 20000) });
    } catch (err: any) {
      return NextResponse.json({ success: false, message: err?.message || 'Faylni o‘qib bo‘lmadi.' }, { status: 400 });
    }
  }

  if (fullPath === 'upload') {
    const { imageBase64, filename, kind } = body;
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return NextResponse.json({ success: false, message: "Fayl ma'lumoti topilmadi" }, { status: 400 });
    }
    // Chat attachments (voice notes, pictures, text files): private, whitelisted types, own limit.
    if (kind === 'chat') {
      const CHAT_TYPES = ['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'image/png', 'image/jpeg', 'image/webp', 'image/gif', 'text/plain', 'application/pdf'];
      const m = imageBase64.match(/^data:([^;,]+)(?:;[^,]*)?;base64,([\s\S]*)$/);
      const mime = m ? m[1].toLowerCase() : '';
      if (!CHAT_TYPES.includes(mime)) return NextResponse.json({ success: false, message: 'Bu fayl turi qo‘llanmaydi.' }, { status: 415 });
      const bytes = Buffer.from(m ? m[2] : '', 'base64');
      if (bytes.length === 0 || bytes.length > 6 * 1024 * 1024) return NextResponse.json({ success: false, message: 'Fayl hajmi 6 MB dan oshmasligi kerak.' }, { status: 413 });
      const chatLimit = rateLimit(`chat-upload:${auth!.userId}`, 300, 60 * 60 * 1000);
      if (!chatLimit.allowed) return tooMany(chatLimit.retryAfterSec);
      const url = await saveUpload(bytes, mime, auth!.userId, 'private');
      return NextResponse.json({ success: true, url });
    }
    const upLimit = rateLimit(`upload:${auth!.userId}`, 30, 60 * 60 * 1000);
    if (!upLimit.allowed) return tooMany(upLimit.retryAfterSec);
    // PDFs (digital books) are for the owner only.
    if (kind === 'pdf') {
      if (auth!.role !== 'owner') return forbidden();
      const pdfPayload = imageBase64.replace(/^data:[^;]+;base64,/, '');
      if (pdfPayload.length > Math.ceil((MAX_PDF_BYTES * 4) / 3) + 16) {
        return NextResponse.json({ success: false, message: 'PDF hajmi 25 MB dan oshmasligi kerak' }, { status: 413 });
      }
      try {
        const pdfUrl = await uploadPdf(Buffer.from(pdfPayload, 'base64'), String(filename || 'book'), { ownerId: auth!.userId, visibility: 'public' });
        logAudit('Owner', 'UPLOAD', 'Storage', `Yangi PDF yuklandi: ${pdfUrl}`);
        return NextResponse.json({ success: true, url: pdfUrl });
      } catch (err) {
        if (err instanceof StorageError) return NextResponse.json({ success: false, message: err.message }, { status: err.status });
        throw err;
      }
    }
    const payload = imageBase64.replace(/^data:[^;]+;base64,/, '');
    if (payload.length > Math.ceil((MAX_IMAGE_BYTES * 4) / 3) + 16) {
      return NextResponse.json({ success: false, message: 'Rasm hajmi 6 MB dan oshmasligi kerak' }, { status: 413 });
    }
    try {
      const url = await uploadImage(Buffer.from(payload, 'base64'), String(filename || 'image'), { ownerId: auth!.userId, visibility: kind === 'receipt' ? 'private' : 'public' });
      logAudit(auth!.role === 'owner' ? 'Owner' : auth!.userId, 'UPLOAD', 'Storage', `Yangi rasm yuklandi: ${url}`);
      return NextResponse.json({ success: true, url });
    } catch (err) {
      if (err instanceof StorageError) return NextResponse.json({ success: false, message: err.message }, { status: err.status });
      throw err;
    }
  }

  // POST /api/exercises — owner saves a draft or publishes an exercise
  if (fullPath === 'exercises') {
    const checked = validateExercise(body);
    if ('error' in checked) return NextResponse.json({ success: false, message: checked.error }, { status: 400 });
    const now = new Date().toISOString();
    const existing = body.id ? db.exercises.find((e) => e.id === body.id) : undefined;
    const source = body.source === 'owner_ai' || body.source === 'teacher_text' ? body.source : existing?.source || 'manual';
    if (existing) {
      Object.assign(existing, checked.value, { source, updatedAt: now });
      logAudit('Owner', existing.status === 'published' ? 'PUBLISH_EXERCISE' : 'SAVE_EXERCISE', 'Exercise', existing.title);
      return NextResponse.json({ success: true, exercise: existing });
    }
    const exercise: Exercise = {
      ...checked.value,
      id: 'ex-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      source,
      createdAt: now,
      updatedAt: now
    };
    db.exercises.unshift(exercise);
    logAudit('Owner', exercise.status === 'published' ? 'PUBLISH_EXERCISE' : 'SAVE_EXERCISE', 'Exercise', exercise.title);
    return NextResponse.json({ success: true, exercise });
  }

  // POST /api/exercises/submit — the student's answers are graded here, never in the browser
  if (fullPath === 'exercises/submit') {
    const user = auth!.user;
    if (!user) return forbidden('Faqat o‘quvchilar uchun.');
    const exercise = db.exercises.find((e) => e.id === body.exerciseId && e.status === 'published');
    if (!exercise) return NextResponse.json({ success: false, message: 'Mashq topilmadi yoki hali nashr qilinmagan.' }, { status: 404 });
    const given: Record<string, unknown> = body.answers && typeof body.answers === 'object' ? body.answers : {};

    let score = 0;
    let maxScore = 0;
    const storedAnswers: Record<string, string | number> = {};
    const results = exercise.questions.map((q) => {
      const raw = given[q.id];
      if (q.type === 'mcq') {
        const value = Number(raw);
        if (Number.isInteger(value)) storedAnswers[q.id] = value;
        maxScore++;
        const ok = Number.isInteger(value) && value === q.correct;
        if (ok) score++;
        return { questionId: q.id, graded: true, correct: ok, expected: q.correct, given: value, explanation: q.explanation || '' };
      }
      const text = typeof raw === 'string' ? raw.slice(0, 3000) : '';
      storedAnswers[q.id] = text;
      if (q.type === 'gap') {
        maxScore++;
        const ok = normalizeAnswer(text) === normalizeAnswer(String(q.correct || ''));
        if (ok) score++;
        return { questionId: q.id, graded: true, correct: ok, expected: q.correct, given: text, explanation: q.explanation || '' };
      }
      return { questionId: q.id, graded: false, correct: null, expected: q.correct ?? null, given: text, explanation: q.explanation || '' };
    });

    const attempt: ExerciseAttempt = {
      id: 'exa-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      userId: user.id,
      exerciseId: exercise.id,
      skill: exercise.skill,
      answers: storedAnswers,
      score,
      maxScore,
      createdAt: new Date().toISOString()
    };
    db.exerciseAttempts.unshift(attempt);
    return NextResponse.json({ success: true, attempt, results });
  }

  // 25. POST /api/books
  if (fullPath === 'books') {
    const newBook: DigitalBook = {
      id: 'book-' + Date.now(),
      title: body.title || 'Yangi Kitob',
      author: body.author || 'Muallif',
      category: body.category || 'ielts',
      coverUrl: body.coverUrl || 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?auto=format&fit=crop&w=600&q=80',
      level: body.level || 'B2',
      pageCount: body.pageCount || 100,
      isFreeGuest: !!body.isFreeGuest,
      isFreeRegistered: !!body.isFreeRegistered,
      pdfUrl: typeof body.pdfUrl === 'string' ? body.pdfUrl.slice(0, 600) : '',
      downloadAllowed: body.downloadAllowed ?? true,
      description: body.description || '',
      pages: Array.isArray(body.pages) ? body.pages : []
    };
    if (!db.digitalBooks) db.digitalBooks = [];
    db.digitalBooks.unshift(newBook);
    logAudit('Owner', 'CREATE_BOOK', 'Books', `Yangi kitob qo'shildi: ${newBook.title}`);
    
    return NextResponse.json({ success: true, book: newBook });
  }

  // 26. POST /api/support-tickets
  if (fullPath === 'support-tickets') {
    const tLimit = rateLimit(`ticket:${clientIp(req)}`, 20, 60 * 60 * 1000);
    if (!tLimit.allowed) return tooMany(tLimit.retryAfterSec);
    const ticketText = (body.message || '').toString().trim().slice(0, 4000);
    if (!ticketText) return NextResponse.json({ success: false, message: 'Xabar matnini kiriting' }, { status: 400 });
    const newTicket = {
      id: 'ticket-' + Date.now(),
      userId: auth?.role === 'student' ? auth.userId : undefined,
      userName: (body.userName || 'Foydalanuvchi').toString().slice(0, 120),
      userPhone: (body.userPhone || '').toString().slice(0, 40),
      message: ticketText,
      category: body.category || 'kurs',
      status: 'new' as const,
      createdAt: new Date().toISOString()
    };
    db.supportTickets.unshift(newTicket);
    
    return NextResponse.json({ success: true, ticket: newTicket });
  }

  // 27. POST /api/support-tickets/reply
  if (fullPath === 'support-tickets/reply') {
    const { ticketId, replyText } = body;
    const ticket = db.supportTickets.find((t) => t.id === ticketId);
    if (!ticket) return NextResponse.json({ success: false, message: 'Topilmadi' }, { status: 404 });
    const replyClean = typeof replyText === 'string' ? replyText.trim().slice(0, 4000) : '';
    if (!replyClean) return NextResponse.json({ success: false, message: 'Javob matnini kiriting.' }, { status: 400 });
    ticket.replyText = replyClean;
    ticket.status = 'answered';
    ticket.updatedAt = new Date().toISOString();
    logAudit('Owner', 'REPLY', 'SupportTicket', `Murojaatga javob berildi: ${ticket.userName}`);
    
    return NextResponse.json({ success: true, ticket });
  }

  // 28. POST /api/owner/students/update
  if (fullPath === 'owner/students/update') {
    const { id, name, surname, phone, additionalPhone, email, telegramUsername, balance, region, vipTier, vipExpiresAt, isBlocked, bonusPoints, points, xp, bonusCoins, bonusXp } = body;
    const user = db.users.find((u) => u.id === id);
    if (!user) return NextResponse.json({ success: false, message: "O'quvchi topilmadi" }, { status: 404 });
    if (name) user.name = name;
    if (surname !== undefined) user.surname = surname;
    if (phone) user.phone = phone;
    if (additionalPhone !== undefined) user.additionalPhone = additionalPhone;
    if (email !== undefined) user.email = email;
    if (telegramUsername !== undefined) user.telegramUsername = telegramUsername?.replace(/^@/, '');
    if (typeof balance === 'number') user.balance = balance;
    if (typeof points === 'number') user.points = points;
    if (typeof xp === 'number') user.xp = xp;
    if (typeof bonusPoints === 'number' && bonusPoints !== 0) user.xp = (user.xp || 0) + bonusPoints;
    if (typeof bonusXp === 'number' && bonusXp !== 0) user.xp = (user.xp || 0) + bonusXp;
    if (typeof bonusCoins === 'number' && bonusCoins !== 0) user.points = (user.points || 0) + bonusCoins;
    if (region !== undefined) user.region = region;
    if (vipTier) user.vipTier = vipTier;
    if (vipExpiresAt) user.vipExpiresAt = vipExpiresAt;
    if (typeof isBlocked === 'boolean') user.isBlocked = isBlocked;
    const moderation = ['banLevel', 'bannedUntil', 'banReason'] as const;
    for (const key of moderation) {
      if (key in body) (user as any)[key] = body[key] === null ? undefined : body[key];
    }
    if (body.banLevel === 0 || body.isBlocked === false) {
      user.bannedUntil = undefined;
      user.banReason = undefined;
    }
    if (body.track && ['ielts', 'cefr', 'general'].includes(body.track)) user.track = body.track;
    if (typeof body.targetScore === 'string') user.targetScore = body.targetScore;
    if (user.isBlocked) await revokeUserSessions(user.id);
    logAudit('Owner', 'UPDATE_STUDENT', 'User', `${user.name} ma'lumotlari (balans/coin/xp/telefon) to'liq tahrirlandi`);
    
    return NextResponse.json({ success: true, user: publicUser(user) });
  }

  // POST /api/student/economy — every reward / purchase is validated on the server
  if (fullPath === 'student/economy') {
    const user = auth!.user;
    if (!user) return forbidden('Faqat o‘quvchilar uchun.');
    const action = String(body.action || '');
    const coinsOn = db.features?.coinEnabled !== false;
    if (!coinsOn && (action === 'shop_purchase' || action === 'frame_purchase')) {
      return NextResponse.json({ success: false, message: 'Edu Coin tizimi hozircha o‘chirilgan.' }, { status: 403 });
    }
    const ok = (extra: Record<string, any> = {}) => {
      
      return NextResponse.json({ success: true, user: publicUser(user), ...extra });
    };
    const fail = (message: string, status = 400, extra: Record<string, any> = {}) =>
      NextResponse.json({ success: false, message, ...extra }, { status });

    if (action === 'vip_purchase') {
      const plan = (db.vipPlans || []).find((p) => p.id === body.planId);
      if (!plan) return fail('Tanlangan tarif topilmadi.', 404);
      const quote = promoQuote(db, body.promoCode, plan);
      if (!quote.ok) return fail(quote.message, 400, { reason: 'promo_invalid' });
      const price = Math.max(0, (Number(plan.priceMonthly) || 0) - quote.discount);
      const balance = user.balance || 0;
      if (balance < price) {
        return fail(
          `Balansingizda mablag' yetarli emas. ${plan.name} narxi: ${price.toLocaleString()} so'm. Mavjud: ${balance.toLocaleString()} so'm.`,
          400,
          { reason: 'insufficient_balance', price, currentBal: balance, missing: price - balance }
        );
      }
      const now = Date.now();
      const sameActive = user.vipTier === plan.id && user.vipExpiresAt && new Date(user.vipExpiresAt).getTime() > now;
      const base = sameActive ? new Date(user.vipExpiresAt!).getTime() : now;
      user.balance = balance - price;
      if (quote.promo) quote.promo.usedCount += 1;
      user.vipTier = plan.id as any;
      user.vipExpiresAt = new Date(base + (plan.durationDays || 30) * 86400000).toISOString();
      user.xp = (user.xp || 0) + 200;
      if (!db.purchases) db.purchases = [];
      db.purchases.unshift({
        id: `pur-vip-${now}-${Math.floor(Math.random() * 1e6)}`,
        userId: user.id,
        amount: price,
        note: `Edu Level ${plan.name} tarifi (${plan.durationDays} kun)` + (quote.promo ? ` · promo ${quote.promo.code} −${quote.percent}% (−${quote.discount.toLocaleString()} so‘m)` : ''),
        promoCode: quote.promo ? quote.promo.code : null,
        createdAt: new Date(now).toISOString()
      });
      logAudit(user.id, 'VIP_PURCHASE', 'Finance', `${user.name}: ${plan.name} (${price.toLocaleString()} so'm)`);
      return ok({ plan });
    }

    if (action === 'shop_purchase') {
      const catalog = db.shopItems && db.shopItems.length ? db.shopItems : DEFAULT_SHOP_ITEMS;
      const item = catalog.find((i) => i.id === body.itemId && i.isAvailable !== false);
      if (!item) return fail('Mahsulot topilmadi.', 404);
      const owned = user.purchasedItemIds || [];
      if (owned.includes(item.id)) return fail('Ushbu mahsulotni allaqachon xarid qilgansiz.');
      const pts = user.points || 0;
      if (pts < item.pricePoints) return fail(`Mablag‘ yetarli emas: ${item.pricePoints} ball kerak, sizda ${pts}.`);
      user.points = pts - item.pricePoints;
      user.purchasedItemIds = [...owned, item.id];
      user.inventory = [...(user.inventory || []), item.id];
      if (item.category === 'frame' && item.styleValue) user.avatarFrame = item.styleValue;
      if (item.category === 'color' && item.styleValue) user.nameColor = item.styleValue;
      if (item.category === 'badge' && item.styleValue) user.customTitle = item.styleValue;
      if (item.category === 'booster') user.streakFreezeCount = (user.streakFreezeCount || 0) + 1;
      return ok({ item });
    }

    if (action === 'frame_purchase') {
      const frame = AVATAR_FRAMES.find((f) => f.id === body.frameId);
      if (!frame) return fail('Ramka topilmadi.', 404);
      const inv = user.inventory || [];
      if (!inv.includes(frame.id) && frame.costPoints > 0) {
        const pts = user.points || 0;
        if (pts < frame.costPoints) return fail(`Ushbu ramka uchun ${frame.costPoints} ball kerak. Sizda: ${pts}.`);
        user.points = pts - frame.costPoints;
        user.inventory = [...inv, frame.id];
      }
      user.avatarFrame = frame.id;
      return ok();
    }

    if (action === 'equip') {
      const category = String(body.category || '');
      const value = String(body.value || '');
      const catalog = db.shopItems && db.shopItems.length ? db.shopItems : DEFAULT_SHOP_ITEMS;
      const ownedValues = catalog
        .filter((i) => (user.purchasedItemIds || []).includes(i.id) && i.category === category)
        .map((i) => i.styleValue);
      const frameOwned = category === 'frame' && (AVATAR_FRAMES.some((f) => f.id === value && (f.costPoints === 0 || (user.inventory || []).includes(f.id))));
      if (value && !ownedValues.includes(value) && !frameOwned) return forbidden('Bu element sizda yo‘q.');
      if (category === 'frame') user.avatarFrame = value;
      else if (category === 'color') user.nameColor = value;
      else if (category === 'badge') user.customTitle = value;
      else return fail('Noto‘g‘ri kategoriya.');
      return ok();
    }

    if (action === 'daily_quest') {
      const today = tashkentDay();
      if (user.lastDailyQuestDate === today) return fail('Bugungi mukofot allaqachon olingan.');
      user.lastDailyQuestDate = today;
      user.xp = (user.xp || 0) + DAILY_QUEST_REWARD.xp;
      user.points = (user.points || 0) + DAILY_QUEST_REWARD.points;
      if (coinsOn) user.coins = (user.coins || 0) + DAILY_QUEST_REWARD.coins;
      return ok({ reward: { ...DAILY_QUEST_REWARD, coins: coinsOn ? DAILY_QUEST_REWARD.coins : 0 } });
    }

    // Thematic pack rewards are granted only by POST /api/thematic-packs/grade (a client cannot claim completion).
    return fail('Noma’lum amal.');
  }

  // POST /api/lessons/progress — resume position & watch time (per student)
  // POST /api/lessons/quiz-submit — the student's answers are graded here. Passing completes the lesson.
  if (fullPath === 'lessons/quiz-submit') {
    const user = auth!.user;
    if (!user) return forbidden('Faqat o‘quvchilar uchun.');
    const lesson = db.lessons.find((l) => l.id === body.lessonId && l.isPublished !== false);
    if (!lesson) return NextResponse.json({ success: false, message: 'Dars topilmadi' }, { status: 404 });
    const ordered = db.lessons
      .filter((l) => l.courseId === lesson.courseId && l.isPublished !== false)
      .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
    const position = ordered.findIndex((l) => l.id === lesson.id);
    if (position > 0 && !(user.completedLessons || []).includes(ordered[position - 1].id)) {
      return NextResponse.json({ success: false, message: 'Avval oldingi darsni tugating.' }, { status: 403 });
    }
    let entry = db.lessonProgress.find((p) => p.userId === user.id && p.lessonId === lesson.id);
    if (!entry?.watched) {
      return NextResponse.json({ success: false, message: 'Avval videoni ko‘ring va “Darsni ko‘rib bo‘ldim” tugmasini bosing.' }, { status: 400 });
    }
    const questions = db.questions.filter((q) => q.testId === lesson.testId);
    if (!lesson.testId || questions.length === 0) {
      return NextResponse.json({ success: false, message: 'Bu dars uchun test hali tayyorlanmagan.' }, { status: 400 });
    }
    const given: Record<string, unknown> = body.answers && typeof body.answers === 'object' ? body.answers : {};
    const storedAnswers: Record<string, number> = {};
    let correct = 0;
    const results = questions.map((q) => {
      const value = Number(given[q.id]);
      const answered = Number.isInteger(value) && value >= 0 && value < q.options.length;
      if (answered) storedAnswers[q.id] = value;
      const ok = answered && value === q.correctAnswerIndex;
      if (ok) correct++;
      return { questionId: q.id, correct: ok, given: answered ? value : null, expected: q.correctAnswerIndex, explanation: q.explanation || '' };
    });
    const percent = Math.round((correct / questions.length) * 100);
    const requiredPercent = lesson.requiredPassingPercent || 70;
    const passed = percent >= requiredPercent;
    const nowIso = new Date().toISOString();
    db.testAttempts.unshift({
      id: 'att-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      userId: user.id,
      userName: `${user.name} ${user.surname || ''}`.trim(),
      testId: lesson.testId,
      testTitle: lesson.title,
      score: correct,
      maxScore: questions.length,
      correctCount: correct,
      totalQuestions: questions.length,
      answers: storedAnswers,
      timeSpentSeconds: 0,
      createdAt: nowIso,
      percentage: percent,
      track: lesson.track
    });
    if (passed) {
      if (!user.completedLessons) user.completedLessons = [];
      if (!user.completedLessons.includes(lesson.id)) user.completedLessons.push(lesson.id);
      await rewardReferralOnLesson(db, user, telegramNotify).catch(() => undefined);
      if (!entry.xpAwarded) {
        user.xp = (user.xp || 0) + 50;
        entry.xpAwarded = true;
      }
    }
    return NextResponse.json({
      success: true,
      percent,
      passed,
      requiredPercent,
      correct,
      total: questions.length,
      results,
      completedLessons: user.completedLessons,
      xp: user.xp
    });
  }

  // POST /api/lessons/generate-quiz — owner creates the lesson test with AI from the lesson text
  if (fullPath === 'lessons/generate-quiz') {
    const lesson = db.lessons.find((l) => l.id === body.lessonId);
    if (!lesson) return NextResponse.json({ success: false, message: 'Dars topilmadi' }, { status: 404 });
    const source = [lesson.title, lesson.description, lesson.notesMarkdown, lesson.homework].filter(Boolean).join('\n\n').trim();
    if (source.length < 60) {
      return NextResponse.json({ success: false, message: 'Test yaratish uchun darsga konspekt yoki tavsif yozing (kamida 60 belgi).' }, { status: 400 });
    }
    const count = Math.max(3, Math.min(10, Number(body.count) || 5));
    const level = lesson.track === 'ielts' ? 'B2' : lesson.track === 'cefr' ? 'B1' : 'A2';
    let generated: Awaited<ReturnType<typeof generateStudentPracticeTest>>;
    try {
      generated = await generateStudentPracticeTest({ source, count, level, apiKey: getEffectiveAiKey() });
    } catch (err) {
      if (err instanceof AiUnavailableError) {
        return NextResponse.json({ success: false, message: 'AI test yarata olmadi. GEMINI_API_KEY sozlanganini tekshiring.' }, { status: 502 });
      }
      throw err;
    }
    // Replace only a test that was generated for this lesson; shared tests are never touched.
    const previous = lesson.testId ? db.tests.find((t) => t.id === lesson.testId && t.id.startsWith('test-lesson-')) : undefined;
    if (previous) {
      db.questions = db.questions.filter((q) => q.testId !== previous.id);
      db.tests = db.tests.filter((t) => t.id !== previous.id);
    }
    const testId = 'test-lesson-' + Date.now();
    db.tests.unshift({
      id: testId,
      title: `${lesson.title} — dars testi`,
      description: 'Dars materialiga asoslangan test (AI yaratgan, ustoz tekshirgan).',
      type: 'quiz',
      durationMinutes: 15,
      maxScore: generated.questions.length,
      requiredVIP: 'none',
      published: true,
      questionsCount: generated.questions.length,
      passingScore: lesson.requiredPassingPercent || 70,
      createdAt: new Date().toISOString(),
      track: lesson.track
    });
    generated.questions.forEach((q: { prompt: string; options: string[]; correctIndex: number; explanation?: string }, i: number) => {
      db.questions.push({
        id: `${testId}-q${i + 1}`,
        testId,
        prompt: q.prompt,
        options: q.options,
        correctAnswerIndex: q.correctIndex,
        explanation: q.explanation || '',
        difficulty: 'medium',
        points: 1
      });
    });
    lesson.testId = testId;
    logAudit('Owner', 'GENERATE_LESSON_TEST', 'Lesson', `${lesson.title}: ${generated.questions.length} ta savol`);
    return NextResponse.json({ success: true, testId, questions: generated.questions.length });
  }

  if (fullPath === 'lessons/progress') {
    const user = auth!.user;
    if (!user) return NextResponse.json({ success: true, skipped: true });
    const lesson = db.lessons.find((l) => l.id === body.lessonId);
    if (!lesson) return NextResponse.json({ success: false, message: 'Dars topilmadi' }, { status: 404 });
    if (lesson.track && user.track && lesson.track !== user.track) return forbidden();
    const position = Math.max(0, Math.min(6 * 3600, Number(body.position) || 0));
    const duration = Math.max(0, Math.min(6 * 3600, Number(body.duration) || 0));
    if (!db.lessonProgress) db.lessonProgress = [];
    let row = db.lessonProgress.find((p) => p.userId === user.id && p.lessonId === lesson.id);
    const now = new Date().toISOString();
    if (!row) {
      row = { userId: user.id, lessonId: lesson.id, courseId: lesson.courseId, position: 0, duration: 0, watchedSeconds: 0, updatedAt: now };
      db.lessonProgress.unshift(row);
    }
    // Watch time grows by at most the real time elapsed since the last report (no skipping credit).
    const elapsed = Math.max(0, (Date.now() - new Date(row.updatedAt).getTime()) / 1000);
    const delta = Math.max(0, position - row.position);
    row.watchedSeconds = Math.round(row.watchedSeconds + Math.min(delta, elapsed + 2, 60));
    row.position = position;
    if (duration) row.duration = duration;
    if (body.watched === true) row.watched = true;
    row.updatedAt = now;
    
    return NextResponse.json({ success: true, progress: row });
  }

  // POST /api/flashcards — a student's own spaced-repetition card
  if (fullPath === 'flashcards') {
    const word = (body.englishWord || '').toString().trim().slice(0, 80);
    if (!word) return NextResponse.json({ success: false, message: 'So‘z kiritilmadi' }, { status: 400 });
    const card = {
      id: 'fc-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      userId: auth!.userId,
      englishWord: word,
      ipa: (body.ipa || '').toString().slice(0, 80),
      meaningUz: (body.meaningUz || '').toString().slice(0, 300),
      level: ['B1', 'B2', 'C1'].includes(body.level) ? body.level : 'C1',
      c1Synonym: (body.c1Synonym || '').toString().slice(0, 120),
      exampleEn: (body.exampleEn || '').toString().slice(0, 400),
      exampleUz: (body.exampleUz || '').toString().slice(0, 400),
      intervalDays: 1,
      repetitionCount: 0,
      easeFactor: 2.5,
      nextReviewDate: new Date(Date.now() + 86400000).toISOString(),
      createdAt: new Date().toISOString()
    };
    if (!db.flashcards) db.flashcards = [];
    db.flashcards.unshift(card as any);
    
    return NextResponse.json({ success: true, card });
  }

  // 29. POST /api/student/profile
  if (fullPath === 'student/profile') {
    const { id, name, surname, phone, additionalPhone, email, telegramUsername, region, track, targetScore, studyTimeDaily } = body;
    if (!canActOnUser(auth!, id)) return forbidden();
    const user = db.users.find((u) => u.id === id);
    if (!user) return NextResponse.json({ success: false, message: "O'quvchi topilmadi" }, { status: 404 });
    if (name) user.name = name;
    if (surname !== undefined) user.surname = surname;
    if (phone) user.phone = phone;
    if (additionalPhone !== undefined) user.additionalPhone = additionalPhone;
    if (email !== undefined) user.email = email;
    if (telegramUsername !== undefined) user.telegramUsername = telegramUsername?.replace(/^@/, '');
    if (region !== undefined) user.region = region;
    // The learning track is chosen once at registration; only the owner can change it.
    if (track && auth!.role === 'owner' && ['ielts', 'cefr', 'general'].includes(track)) user.track = track;
    if (targetScore) user.targetScore = targetScore;
    if (studyTimeDaily) user.studyTimeDaily = studyTimeDaily;
    if (Array.isArray(body.readBookIds)) user.readBookIds = body.readBookIds.map(String).slice(0, 1000);
    if (typeof body.avatar === 'string' && body.avatar.length < 2048 && (body.avatar === '' || /^(https?:\/\/|\/)/i.test(body.avatar))) user.avatar = body.avatar;
    
    return NextResponse.json({ success: true, user: publicUser(user) });
  }

  // POST /api/owner/thematic-packs — the owner's quiz packs (create / edit / delete). Questions may come from the AI.
  if (fullPath === 'owner/thematic-packs') {
    const CATEGORIES = ['grammar', 'vocab', 'phrasal_verbs', 'reading', 'collocations', 'prepositions', 'speaking_idioms'];
    const LEVELS = ['A2', 'B1', 'B2', 'C1', 'C2'];
    if (!Array.isArray(db.thematicQuizPacks)) db.thematicQuizPacks = [];
    if (typeof body.deleteId === 'string') {
      const before = db.thematicQuizPacks.length;
      db.thematicQuizPacks = db.thematicQuizPacks.filter((x) => x.id !== body.deleteId);
      if (db.thematicQuizPacks.length === before) return NextResponse.json({ success: false, message: 'Paket topilmadi' }, { status: 404 });
      logAudit('Owner', 'DELETE_PACK', 'Packs', `Paket o‘chirildi: ${body.deleteId}`);
      return NextResponse.json({ success: true });
    }
    const raw = body.pack && typeof body.pack === 'object' ? body.pack : null;
    if (!raw) return NextResponse.json({ success: false, message: 'Paket ma’lumoti yo‘q' }, { status: 400 });
    const title = String(raw.title || '').trim().slice(0, 160);
    if (!title) return NextResponse.json({ success: false, message: 'Paket nomini kiriting' }, { status: 400 });
    if (!CATEGORIES.includes(raw.category)) return NextResponse.json({ success: false, message: 'Kategoriya noto‘g‘ri' }, { status: 400 });
    if (!LEVELS.includes(raw.level)) return NextResponse.json({ success: false, message: 'Daraja noto‘g‘ri' }, { status: 400 });
    const questions = (Array.isArray(raw.questions) ? raw.questions : [])
      .filter((q: any) => q && typeof q.prompt === 'string' && q.prompt.trim() && Array.isArray(q.options) && q.options.length >= 2 && q.options.length <= 6)
      .slice(0, 200)
      .map((q: any, i: number) => {
        const options = q.options.map((o: unknown) => String(o).slice(0, 250));
        const idx = Math.floor(Number(q.correctAnswerIndex));
        return {
          id: typeof q.id === 'string' && q.id ? q.id : `pq-${Date.now()}-${i}`,
          testId: typeof raw.id === 'string' ? raw.id : 'pack',
          prompt: String(q.prompt).slice(0, 600),
          options,
          correctAnswerIndex: Number.isInteger(idx) && idx >= 0 && idx < options.length ? idx : 0,
          explanation: typeof q.explanation === 'string' ? q.explanation.slice(0, 600) : '',
          difficulty: 'medium'
        };
      });
    const id = typeof raw.id === 'string' && /^[a-z0-9-]{3,60}$/i.test(raw.id) ? raw.id : `pack-${randomUUID().slice(0, 8)}`;
    const pack = {
      id,
      title,
      category: raw.category,
      description: String(raw.description || '').slice(0, 400),
      level: raw.level,
      questionsCount: questions.length,
      rewardXp: Math.min(Math.max(Math.round(Number(raw.rewardXp) || 0), 0), 1000),
      rewardPoints: Math.min(Math.max(Math.round(Number(raw.rewardPoints) || 0), 0), 1000),
      icon: String(raw.icon || '📘').slice(0, 8),
      badge: String(raw.badge || raw.level).slice(0, 40),
      color: 'from-orange-500 to-amber-600',
      questions: questions.map((q: any) => ({ ...q, testId: id }))
    };
    const at = db.thematicQuizPacks.findIndex((x) => x.id === id);
    if (at >= 0) db.thematicQuizPacks[at] = pack as any;
    else db.thematicQuizPacks.push(pack as any);
    logAudit('Owner', at >= 0 ? 'UPDATE_PACK' : 'CREATE_PACK', 'Packs', `${title} (${questions.length} savol)`);
    return NextResponse.json({ success: true, pack });
  }

  // 32. POST /api/owner/bot-settings
  if (fullPath === 'owner/bot-settings') {
    if (body.botSettings) {
      // The card is shown to students as-is: keep digits and spaces only, and cap the lengths.
      const incoming = { ...body.botSettings };
      if (typeof incoming.cardNumber === 'string') incoming.cardNumber = incoming.cardNumber.replace(/[^\d ]/g, '').trim().slice(0, 24);
      if (typeof incoming.cardHolder === 'string') incoming.cardHolder = incoming.cardHolder.trim().slice(0, 80);
      if (typeof incoming.channelUsername === 'string') incoming.channelUsername = incoming.channelUsername.replace(/^@|https?:\/\/t\.me\//g, '').trim().slice(0, 64);
      if (typeof incoming.channelLessonId === 'string') incoming.channelLessonId = incoming.channelLessonId.slice(0, 80);
      if (incoming.autoAnnounce !== undefined) incoming.autoAnnounce = incoming.autoAnnounce === true;
      if (typeof incoming.ownerTelegram === 'string') incoming.ownerTelegram = incoming.ownerTelegram.replace(/^@|https?:\/\/t\.me\//g, '').trim().slice(0, 64);
      // The saved owner id is never taken from the form; changing the owner username makes the bot save the new owner's id on first use.
      delete incoming.ownerTelegramId;
      const previousOwner = (db.telegramBotSettings?.ownerTelegram || '').toLowerCase();
      db.telegramBotSettings = { ...db.telegramBotSettings, ...incoming };
      if (typeof incoming.ownerTelegram === 'string' && incoming.ownerTelegram.toLowerCase() !== previousOwner) delete db.telegramBotSettings.ownerTelegramId;
      logAudit('Owner', 'UPDATE_BOT_SETTINGS', 'TelegramBot', `Bot sozlamalari yangilandi: @${db.telegramBotSettings.botUsername}`);
      
      return NextResponse.json({ success: true, botSettings: db.telegramBotSettings });
    }
    return NextResponse.json({ success: false, message: "Noto'g'ri format" }, { status: 400 });
  }

  return NextResponse.json({ success: false, message: `Unhandled POST: /api/${fullPath}` }, { status: 404 });
}

// -------------------------------------------------------------
// PUT HANDLER
// -------------------------------------------------------------
async function handlePut(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const resolvedParams = await params;
  const pathParts = resolvedParams.path || [];
  const fullPath = pathParts.join('/');
  const db = getDatabase();

  let body: any = {};
  try {
    body = await req.json();
  } catch {}

  const putAuth = authorize(req, 'PUT', fullPath);
  if (putAuth instanceof NextResponse) return putAuth;

  // PUT /api/student/ai-threads — replaces the caller's chat threads (capped)
  if (fullPath === 'student/ai-threads') {
    const auth = putAuth!;
    const str = (v: unknown, n: number) => String(v ?? '').slice(0, n);
    const threads = (Array.isArray(body.threads) ? body.threads : []).slice(0, 30).map((t: any) => ({
      id: str(t?.id, 60) || 'thread-' + Date.now(),
      title: str(t?.title, 80) || 'Suhbat',
      lessonId: str(t?.lessonId, 60) || undefined,
      scenario: /^[a-z_]{2,30}$/.test(str(t?.scenario, 30)) ? str(t?.scenario, 30) : undefined,
      updatedAt: str(t?.updatedAt, 40) || new Date().toISOString(),
      messages: (Array.isArray(t?.messages) ? t.messages : []).slice(-100).map((m: any) => ({
        id: str(m?.id, 60),
        sender: m?.sender === 'ai' ? 'ai' : 'user',
        text: str(m?.text, 6000),
        timestamp: str(m?.timestamp, 40)
      }))
    }));
    if (!db.aiThreads) db.aiThreads = [];
    const row = db.aiThreads.find((t) => t.userId === auth.userId);
    if (row) {
      row.threads = threads;
      row.updatedAt = new Date().toISOString();
    } else db.aiThreads.push({ userId: auth.userId, threads, updatedAt: new Date().toISOString() });
    
    return NextResponse.json({ success: true, count: threads.length });
  }

  // PUT /api/flashcards/:id — edit fields, or { grade: 0-5 } for an SM-2 review. Own cards only.
  if (fullPath.startsWith('flashcards/')) {
    const auth = putAuth!;
    const id = fullPath.slice('flashcards/'.length);
    const card: any = (db.flashcards || []).find((f: any) => f.id === id);
    if (!card) return NextResponse.json({ success: false, message: 'Karta topilmadi' }, { status: 404 });
    if (!canActOnUser(auth, card.userId)) return forbidden();
    if (body.grade !== undefined) {
      const grade = Number(body.grade);
      if (!Number.isFinite(grade) || grade < 0 || grade > 5) return NextResponse.json({ success: false, message: 'Baho 0–5 oralig‘ida bo‘lishi kerak' }, { status: 400 });
      const next = calculateNextSm2Review(Number(card.intervalDays) || 0, Number(card.repetitionCount) || 0, Number(card.easeFactor) || 2.5, grade);
      card.intervalDays = next.interval;
      card.repetitionCount = next.repetitions;
      card.easeFactor = Math.round(next.easeFactor * 100) / 100;
      // "Again" (grade < 3) comes back in 10 minutes within the same session
      card.nextReviewDate = grade < 3 ? new Date(Date.now() + 10 * 60000).toISOString() : next.nextDueDate;
      card.lastReviewedAt = new Date().toISOString();
    } else {
      const fields: [string, number][] = [['englishWord', 80], ['ipa', 80], ['meaningUz', 300], ['c1Synonym', 120], ['exampleEn', 400], ['exampleUz', 400]];
      for (const [f, n] of fields) if (typeof body[f] === 'string') card[f] = body[f].slice(0, n);
      if (['B1', 'B2', 'C1'].includes(body.level)) card.level = body.level;
      if (!String(card.englishWord || '').trim()) return NextResponse.json({ success: false, message: 'So‘z bo‘sh bo‘lmasin' }, { status: 400 });
    }
    
    return NextResponse.json({ success: true, card });
  }

  // 1. PUT /api/site-sections
  if (fullPath === 'site-sections') {
    db.siteSections = body as SiteSection[];
    logAudit('Owner', 'UPDATE', 'SiteBuilder', "Sayt konstruktori bo'limlari yangilandi");
    
    return NextResponse.json({ success: true, sections: db.siteSections });
  }

  // 2. PUT /api/vip-plans
  if (fullPath === 'vip-plans') {
    db.vipPlans = body as VIPPlan[];
    logAudit('Owner', 'UPDATE', 'VIPPlans', 'VIP tariflar yangilandi');
    
    return NextResponse.json({ success: true, vipPlans: db.vipPlans });
  }

  // 3. PUT /api/courses/:id
  if (fullPath.startsWith('courses/')) {
    const id = fullPath.replace('courses/', '');
    const idx = db.courses.findIndex((c) => c.id === id);
    if (idx === -1) return NextResponse.json({ success: false, message: 'Kurs topilmadi' }, { status: 404 });
    db.courses[idx] = { ...db.courses[idx], ...body };
    
    return NextResponse.json({ success: true, course: db.courses[idx] });
  }

  // 4. PUT /api/lessons/:id
  if (fullPath.startsWith('lessons/')) {
    const id = fullPath.replace('lessons/', '');
    const idx = db.lessons.findIndex((l) => l.id === id);
    if (idx === -1) return NextResponse.json({ success: false, message: 'Dars topilmadi' }, { status: 404 });
    const patch: Record<string, unknown> = { ...body };
    if (body.videoTiers !== undefined) patch.videoTiers = normalizeVideoTiers(body.videoTiers);
    if (body.bunnyVideoId !== undefined) patch.bunnyVideoId = parseBunnyVideoId(body.bunnyVideoId) || undefined;
    if (body.lessonCode !== undefined) {
      const code = cleanLessonCode(body.lessonCode);
      if (!code) return NextResponse.json({ success: false, message: 'Dars kodi 3–20 belgi bo‘lsin: harf, raqam yoki tire (masalan EDU-L05).' }, { status: 400 });
      if (lessonCodeTaken(db.lessons, code, id)) return NextResponse.json({ success: false, message: 'Bu kod boshqa darsda bor. Boshqa kod tanlang.' }, { status: 400 });
      patch.lessonCode = code;
    }
    const wasPublished = db.lessons[idx].isPublished !== false;
    db.lessons[idx] = { ...db.lessons[idx], ...patch };
    if (!wasPublished && db.lessons[idx].isPublished !== false) announceNewLesson(db, id);
    
    return NextResponse.json({ success: true, lesson: db.lessons[idx] });
  }

  // PUT /api/tests/:id
  if (fullPath.startsWith('tests/')) {
    const id = fullPath.replace('tests/', '');
    const idx = db.tests.findIndex((t) => t.id === id);
    if (idx === -1) return NextResponse.json({ success: false, message: 'Test topilmadi' }, { status: 404 });
    db.tests[idx] = { ...db.tests[idx], ...body, id };
    logAudit('Owner', 'UPDATE', 'Test', `Test tahrirlandi: ${db.tests[idx].title}`);
    
    return NextResponse.json({ success: true, test: db.tests[idx] });
  }

  // 5. PUT /api/student-results/:id
  if (fullPath.startsWith('student-results/')) {
    const id = fullPath.replace('student-results/', '');
    const idx = db.studentResults.findIndex((r) => r.id === id);
    if (idx === -1) return NextResponse.json({ success: false, message: 'Natija topilmadi' }, { status: 404 });
    db.studentResults[idx] = { ...db.studentResults[idx], ...body };
    
    return NextResponse.json({ success: true, result: db.studentResults[idx] });
  }

  return NextResponse.json({ success: false, message: `Unhandled PUT: /api/${fullPath}` }, { status: 404 });
}

// -------------------------------------------------------------
// DELETE HANDLER
// -------------------------------------------------------------
async function handleDelete(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const resolvedParams = await params;
  const pathParts = resolvedParams.path || [];
  const fullPath = pathParts.join('/');
  const db = getDatabase();

  const delAuth = authorize(req, 'DELETE', fullPath);
  if (delAuth instanceof NextResponse) return delAuth;

  // DELETE /api/exercises/:id — owner removes an exercise
  if (fullPath.startsWith('exercises/')) {
    const id = fullPath.slice('exercises/'.length);
    const target = db.exercises.find((e) => e.id === id);
    if (!target) return NextResponse.json({ success: false, message: 'Mashq topilmadi' }, { status: 404 });
    db.exercises = db.exercises.filter((e) => e.id !== id);
    logAudit('Owner', 'DELETE_EXERCISE', 'Exercise', target.title);
    return NextResponse.json({ success: true });
  }

  // DELETE /api/flashcards/:id — own cards only
  if (fullPath.startsWith('flashcards/')) {
    const id = fullPath.slice('flashcards/'.length);
    const card: any = (db.flashcards || []).find((f: any) => f.id === id);
    if (!card) return NextResponse.json({ success: false, message: 'Karta topilmadi' }, { status: 404 });
    if (!canActOnUser(delAuth!, card.userId)) return forbidden();
    db.flashcards = (db.flashcards || []).filter((f: any) => f.id !== id);
    
    return NextResponse.json({ success: true });
  }

  // 1. DELETE /api/courses/:id
  if (fullPath.startsWith('courses/')) {
    const id = fullPath.replace('courses/', '');
    db.courses = db.courses.filter((c) => c.id !== id);
    db.lessons = db.lessons.filter((l) => l.courseId !== id);
    
    return NextResponse.json({ success: true });
  }

  // 2. DELETE /api/lessons/:id
  if (fullPath.startsWith('lessons/')) {
    const id = fullPath.replace('lessons/', '');
    db.lessons = db.lessons.filter((l) => l.id !== id);
    
    return NextResponse.json({ success: true });
  }

  // 3. DELETE /api/tests/:id
  if (fullPath.startsWith('tests/')) {
    const id = fullPath.replace('tests/', '');
    db.tests = db.tests.filter((t) => t.id !== id);
    db.questions = db.questions.filter((q) => q.testId !== id);
    
    return NextResponse.json({ success: true });
  }

  // 4. DELETE /api/questions/:id
  if (fullPath.startsWith('questions/')) {
    const id = fullPath.replace('questions/', '');
    db.questions = db.questions.filter((q) => q.id !== id);
    
    return NextResponse.json({ success: true });
  }

  // 5. DELETE /api/student-results/:id
  if (fullPath.startsWith('news-subscribers/')) {
    const id = fullPath.replace('news-subscribers/', '');
    db.newsSubscribers = (db.newsSubscribers || []).filter((s) => s.id !== id);
    return NextResponse.json({ success: true });
  }

  if (fullPath.startsWith('news/')) {
    const id = fullPath.replace('news/', '');
    db.news = (db.news || []).filter((n) => n.id !== id);
    logAudit('Owner', 'DELETE_NEWS', 'News', id);
    return NextResponse.json({ success: true });
  }

  if (fullPath.startsWith('student-results/')) {
    const id = fullPath.replace('student-results/', '');
    db.studentResults = db.studentResults.filter((r) => r.id !== id);
    
    return NextResponse.json({ success: true });
  }

  // 6. DELETE /api/owner/students/:id
  if (fullPath.startsWith('owner/students/')) {
    const id = fullPath.replace('owner/students/', '');
    db.users = db.users.filter((u) => u.id !== id);
    await revokeUserSessions(id);
    logAudit('Owner', 'DELETE_STUDENT', 'User', `O'quvchi o'chirildi: ${id}`);
    
    return NextResponse.json({ success: true });
  }

  // DELETE /api/reading-tests/:id
  if (fullPath.startsWith('reading-tests/')) {
    const id = fullPath.replace('reading-tests/', '');
    db.readingTests = (db.readingTests || []).filter((t) => t.id !== id);
    logAudit('Owner', 'DELETE', 'ReadingTest', `Reading test o'chirildi: ${id}`);
    
    return NextResponse.json({ success: true });
  }

  // 7. DELETE /api/books/:id
  if (fullPath.startsWith('books/')) {
    const id = fullPath.replace('books/', '');
    db.digitalBooks = (db.digitalBooks || []).filter((b) => b.id !== id);
    
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ success: false, message: `Unhandled DELETE: /api/${fullPath}` }, { status: 404 });
}

function matchesLogin(u: User, rawInput: string): boolean {
  if (!rawInput) return false;
  if (rawInput.includes('@')) {
    return !!u.email && u.email.toLowerCase() === rawInput.toLowerCase();
  }
  const cleanInput = rawInput.replace(/\D/g, '');
  const cleanUserPhone = (u.phone || '').replace(/\D/g, '');
  // Exact phone match (ignoring formatting); allow a missing country code (last 9 digits).
  if (cleanInput.length >= 9 && cleanUserPhone && (cleanUserPhone === cleanInput || cleanUserPhone.endsWith(cleanInput) || cleanInput.endsWith(cleanUserPhone))) {
    return true;
  }
  return u.phone === rawInput;
}

// ---------------------------------------------------------------------------
// Exam resolution & scoring helpers
// ---------------------------------------------------------------------------
interface ResolvedExam {
  id: string;
  title: string;
  kind: 'mock' | 'reading' | 'listening';
  track?: string;
  durationMinutes: number;
  questionIds: Set<string>;
  transcripts?: { sectionId: string; transcript: string }[];
  raw: any;
}

function resolveExam(db: ReturnType<typeof getDatabase>, testId: string): ResolvedExam | null {
  if (!testId) return null;
  const rt = (db.readingTests || []).find((t) => t.id === testId);
  if (rt) {
    const qs = rt.passages.flatMap((p) => p.questions || []);
    return { id: rt.id, title: rt.title, kind: 'reading', track: rt.track, durationMinutes: rt.durationMinutes || 60, questionIds: new Set(qs.map((q) => q.id)), raw: rt };
  }
  const lt = (db.listeningTests || []).find((t) => t.id === testId);
  if (lt) {
    const qs = lt.sections.flatMap((s) => s.questions || []);
    return {
      id: lt.id,
      title: lt.title,
      kind: 'listening',
      track: lt.track,
      durationMinutes: lt.durationMinutes || 40,
      questionIds: new Set(qs.map((q) => q.id)),
      transcripts: lt.sections.map((s) => ({ sectionId: s.id, transcript: s.transcript })),
      raw: lt
    };
  }
  const t = (db.tests || []).find((x) => x.id === testId);
  if (t) {
    const qs = (db.questions || []).filter((q) => q.testId === t.id);
    return { id: t.id, title: t.title, kind: 'mock', track: t.track, durationMinutes: t.durationMinutes || 45, questionIds: new Set(qs.map((q) => q.id)), raw: t };
  }
  return null;
}

function scoreExam(exam: ResolvedExam, answers: Record<string, unknown>): ScoreResult {
  const db = getDatabase();
  if (exam.kind === 'reading') {
    const qs = (exam.raw.passages || []).flatMap((p: any) => p.questions || []);
    return scoreReading(qs, answers, exam.track || '');
  }
  if (exam.kind === 'listening') {
    const qs = (exam.raw.sections || []).flatMap((s: any) => s.questions || []);
    return scoreMcq(qs, answers, exam.track || '', 'listening');
  }
  const qs = (db.questions || []).filter((q) => q.testId === exam.id);
  return scoreMcq(qs, answers, exam.track || '', 'mock');
}

function summary(r: ScoreResult) {
  const { review, ...rest } = r;
  void review;
  return rest;
}

// Every request runs inside a database transaction (see src/lib/dbStore.ts).
export const GET = withDatabase(handleGet);
export const POST = withDatabase(handlePost);
export const PUT = withDatabase(handlePut);
export const DELETE = withDatabase(handleDelete);
