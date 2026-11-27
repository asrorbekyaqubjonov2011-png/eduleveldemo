import { availableFallbacks } from './aiRouter';
import type { AppDatabase, Lesson, Question, User } from '../types';
import { channelMembership, telegramApi } from './telegramBot';
import { lessonBotCode, openLessonsFor, startLink } from './telegramLessons';
import {
  chatInfo,
  markReminded,
  privateChatForUsername,
  newSubscribersSince,
  qualifyReferral,
  referralCounts,
  referralTotals,
  reminderCandidates,
  savePoll,
  setReferralBundles
} from './telegramStore';
import { NEED_LINK, aiToHtml, card, dateUz, esc, money, num, uzText } from './telegramFormat';
import { evaluateSpeakingWithAi, executeUniversalAi, pickGeminiModelsFast, streamTutorAnswer, translate3LevelWithAi } from './universalAi';

/**
 * The bot's growth and learning features that need the site's data: rewards for referrals, quiz questions,
 * voice speaking feedback, AI answers, the daily reminder and the weekly digest.
 */

const DAY_MS = 86_400_000;

export function findUserByTelegram(db: AppDatabase, username: string): User | undefined {
  const want = username.replace(/^@/, '').toLowerCase();
  if (!want) return undefined;
  return db.users.find((u) => u.role !== 'owner' && (u.telegramUsername || '').replace(/^@/, '').toLowerCase() === want);
}

/** Adds VIP days: from today, or after the current expiry if that is later. A free account becomes "individual". */
export function grantVipDays(user: User, days: number): void {
  const now = Date.now();
  const current = user.vipExpiresAt ? Date.parse(String(user.vipExpiresAt)) : 0;
  const base = current > now ? current : now;
  user.vipExpiresAt = new Date(base + days * DAY_MS).toISOString() as User['vipExpiresAt'];
  if (!user.vipTier || (user.vipTier as string) === 'none') user.vipTier = 'individual' as User['vipTier'];
}

/**
 * Called when a student finishes a lesson. The first lesson of an invited friend gives the friend 1 day of VIP, and
 * the friend's inviter 1 day for every 3 friends who finished. Each reward is granted once.
 */
export async function rewardReferralOnLesson(db: AppDatabase, user: User, notify: (chatId: string, text: string) => Promise<unknown>): Promise<void> {
  const username = (user.telegramUsername || '').replace(/^@/, '');
  if (!username) return;
  await notifyNextLesson(db, user, notify).catch(() => undefined);
  const q = await qualifyReferral(username);
  if (!q) return;
  grantVipDays(user, 1);
  user.coins = (user.coins || 0) + 50;
  await notify(q.refereeChatId, '🎉 Birinchi darsingiz tugadi! Bonus: 1 kun VIP va 50 tanga hisobingizga qo‘shildi.');

  const inviter = await chatInfo(q.referrerChatId);
  const inviterUser = inviter?.username ? findUserByTelegram(db, inviter.username) : undefined;
  if (inviterUser) inviterUser.coins = (inviterUser.coins || 0) + 50;
  const counts = await referralCounts(q.referrerChatId);
  const earned = Math.floor(counts.qualified / 3);
  const already = inviter?.referralBundles || 0;
  if (earned > already) {
    const fresh = earned - already;
    if (inviterUser) grantVipDays(inviterUser, fresh);
    await setReferralBundles(q.referrerChatId, earned);
    await notify(
      q.referrerChatId,
      inviterUser
        ? `🎁 ${counts.qualified} ta do‘stingiz darsni tugatdi! Mukofot: +${fresh} kun VIP.`
        : `🎁 ${counts.qualified} ta do‘stingiz darsni tugatdi! Mukofotni olish uchun hisobingizni ulang: /ulash KOD`
    );
  } else {
    await notify(q.referrerChatId, `✅ Do‘stingiz darsni tugatdi. Malakali takliflar: ${counts.qualified} ta (har 3 tasi uchun 1 kun VIP).`);
  }
}

/** After a lesson is finished, the bot tells the student which lesson comes next (or that the open ones are done). */
async function notifyNextLesson(db: AppDatabase, user: User, notify: (chatId: string, text: string) => Promise<unknown>): Promise<void> {
  const username = (user.telegramUsername || '').replace(/^@/, '');
  const chatId = username ? await privateChatForUsername(username) : null;
  if (!chatId) return;
  const done = new Set(user.completedLessons || []);
  const next = openLessonsFor(db, user).find((l) => !done.has(l.id));
  await notify(
    chatId,
    next
      ? `✅ Dars tugadi! Keyingi dars: ${esc(next.title)}\nKod: ${lessonBotCode(next)} — botga shu kodni yuboring.`
      : '🏁 Hozir ochiq darslarning hammasi tugadi. Yangi darslar qo‘shilganda xabar beramiz.'
  );
}

/* ---------- quizzes ---------- */

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Questions a Telegram quiz poll can show: 2–10 options and a valid correct answer. */
export function questionPool(db: AppDatabase): Question[] {
  return (db.questions || []).filter(
    (q) =>
      typeof q.prompt === 'string' &&
      q.prompt.trim().length > 0 &&
      Array.isArray(q.options) &&
      q.options.length >= 2 &&
      q.options.length <= 10 &&
      Number.isInteger(q.correctAnswerIndex) &&
      q.correctAnswerIndex >= 0 &&
      q.correctAnswerIndex < q.options.length
  );
}

/** A random published test with at least 3 usable questions, and up to `count` of its questions in random order. */
export function pickTestForQuiz(db: AppDatabase, count = 5): { testId: string; title: string; questions: Question[] } | null {
  const pool = questionPool(db);
  const candidates = (db.tests || [])
    .filter((t) => t.published)
    .map((t) => ({ test: t, questions: pool.filter((q) => q.testId === t.id) }))
    .filter((c) => c.questions.length >= 3);
  if (candidates.length === 0) return null;
  const pick = candidates[Math.floor(Math.random() * candidates.length)];
  return { testId: pick.test.id, title: pick.test.title, questions: shuffle(pick.questions).slice(0, count) };
}

export function pollParams(q: Question) {
  return {
    question: q.prompt.trim().slice(0, 300),
    options: q.options.slice(0, 10).map((o) => String(o).trim().slice(0, 100) || '—'),
    correct: q.correctAnswerIndex,
    explanation: (q.explanation || '').trim().slice(0, 200) || undefined
  };
}

/** Sends a quiz poll. Private and group polls are non-anonymous so the answers can be scored. */
export async function sendQuizPoll(chat: string | number, q: Question, anonymous: boolean): Promise<string> {
  const p = pollParams(q);
  const res = await telegramApi('sendPoll', {
    chat_id: chat,
    question: p.question,
    options: p.options,
    type: 'quiz',
    correct_option_id: p.correct,
    explanation: p.explanation,
    is_anonymous: anonymous
  });
  const pollId = res?.poll?.id;
  if (!pollId) throw new Error('Telegram so‘rovnoma identifikatorini qaytarmadi');
  return String(pollId);
}

export async function sendTrackedQuizPoll(chat: string, q: Question, anonymous: boolean): Promise<string> {
  const pollId = await sendQuizPoll(chat, q, anonymous);
  await savePoll(pollId, chat, q.id, q.correctAnswerIndex);
  return pollId;
}

/* ---------- speaking ---------- */

export const SPEAKING_TOPICS = [
  'Describe a place you would like to visit and explain why.',
  'Talk about a hobby you enjoy. How did you start it?',
  'Describe your favourite book or film and what it taught you.',
  'What do you usually do at weekends? Give details.',
  'Describe a person who has influenced you. What did they do?'
];

export function randomTopic(): string {
  return SPEAKING_TOPICS[Math.floor(Math.random() * SPEAKING_TOPICS.length)];
}

/** Speech to text with Gemini (the voice message is sent as audio, the key stays on the server). */
export async function transcribeVoice(bytes: Buffer, mimeType: string, apiKey: string): Promise<string> {
  const { assertGeminiAllowed } = await import('./universalAi');
  assertGeminiAllowed();
  const models = await pickGeminiModelsFast(apiKey).catch(() => [] as string[]);
  const model = (models[0] || 'gemini-2.5-flash').replace(/^models\//, '');
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
    signal: AbortSignal.timeout(15_000),
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { inlineData: { mimeType, data: bytes.toString('base64') } },
            { text: 'Transcribe the English speech in this audio exactly as spoken. Output only the transcript text, nothing else.' }
          ]
        }
      ]
    })
  });
  if (!res.ok) throw new Error(`Ovozni matnga o‘girib bo‘lmadi (${res.status})`);
  const json: any = await res.json();
  const text = (json?.candidates?.[0]?.content?.parts || []).filter((p: any) => !p?.thought).map((p: any) => p?.text || '').join('').trim();
  return text;
}

export async function speakingFeedback(transcript: string, topic: string, seconds: number, apiKey: string): Promise<string> {
  const r: any = await evaluateSpeakingWithAi({ transcript, topicPrompt: topic, part: 2, durationSeconds: seconds || 60, examSystem: 'ielts', apiKey });
  const score = (v: unknown) => (v === undefined || v === null || v === '' ? '—' : String(v));
  const lines = [
    `🎙 Speaking natijasi — band: ${score(r?.overallBand)}`,
    `Fluency: ${score(r?.fluencyScore)} · Lexical: ${score(r?.lexicalScore)} · Grammar: ${score(r?.grammarScore)} · Pronunciation: ${score(r?.pronunciationScore)}`
  ];
  const recs: unknown[] = Array.isArray(r?.practiceRecommendations) ? r.practiceRecommendations.slice(0, 3) : [];
  if (recs.length) lines.push('', 'Tavsiyalar:', ...recs.map((x) => `• ${String(x).slice(0, 200)}`));
  return lines.join('\n').slice(0, 3500);
}

/* ---------- AI ---------- */

export function aiKey(): string {
  return (process.env.GEMINI_API_KEY || '').trim();
}

/** The bot waits at most this long for an AI answer, then says so instead of leaving the chat silent. */
const AI_BOT_DEADLINE_MS = 30_000;

/**
 * An AI answer for the bot. It uses the same parallel model race as the site: a slow model no longer holds the
 * student up (the second model starts beside it after 1.6 s).
 */
export async function askTutor(question: string, studentName: string): Promise<string> {
  const key = aiKey();
  if (!key && availableFallbacks(process.env).length === 0) return 'AI xizmati hozircha ulanmagan. Ustoz bilan bog‘laning.';
  try {
    const answer = await streamTutorAnswer({ userMessage: question.slice(0, 1000), history: [], studentName, vipTier: 'individual', mode: 'tutor', apiKey: key } as any, () => undefined, AbortSignal.timeout(AI_BOT_DEADLINE_MS));
    const text = String(answer || '').trim().slice(0, 3000);
    return text ? aiToHtml(text) : 'Javob hozircha tayyor emas. Bir oz kutib, qayta urinib ko‘ring.';
  } catch {
    return 'EduBek hozir javob bera olmadi. Birozdan keyin qayta urinib ko‘ring.';
  }
}

/** Shows "typing…" in the chat while work runs. Telegram drops the status after ~5 s, so it is sent again every 4 s. */
export async function withTyping<T>(chatId: string, work: () => Promise<T>): Promise<T> {
  let sending = false;
  const send = async () => {
    if (sending) return;
    sending = true;
    try { await telegramApi('sendChatAction', { chat_id: chatId, action: 'typing' }); }
    catch { /* typing is optional */ }
    finally { sending = false; }
  };
  void send();
  const timer = setInterval(() => void send(), 4000);
  try {
    return await work();
  } finally {
    clearInterval(timer);
  }
}

export async function wordCard(word: string): Promise<string> {
  const key = aiKey();
  if (!key && availableFallbacks(process.env).length === 0) return 'AI xizmati hozircha ulanmagan. Ustoz bilan bog‘laning.';
  const r: any = await translate3LevelWithAi(word.slice(0, 80), key);
  const level = (x: any, name: string) => (x ? `${name}: ${x.word || ''} ${x.ipa || ''} — ${x.meaningUz || ''}`.trim() : '');
  const lines = [`📖 ${r?.englishQuery || word} (${r?.partOfSpeech || ''})`, level(r?.b1, 'B1'), level(r?.b2, 'B2'), level(r?.c1, 'C1/C2')].filter(Boolean);
  const example = Array.isArray(r?.b2?.examples) ? r.b2.examples[0] : undefined;
  if (example?.en) lines.push('', `Misol: ${example.en}`, `Tarjima: ${example.uz || ''}`);
  return aiToHtml(lines.join('\n').slice(0, 3000));
}

/* ---------- reminders and digest (run by the scheduler) ---------- */

/** Tashkent calendar date, used to remind each chat once a day. */
export function tashkentDate(now = Date.now()): string {
  return new Date(now + 5 * 3600 * 1000).toISOString().slice(0, 10);
}

/** Each linked student gets the code of their next unfinished lesson, once a day. */
export async function runDailyReminders(db: AppDatabase, bot: string): Promise<{ sent: number; skipped: number; processed: number }> {
  const today = tashkentDate();
  const candidates = await reminderCandidates(today, 200);
  let sent = 0;
  let skipped = 0;
  for (const c of candidates) {
    const user = findUserByTelegram(db, c.username);
    const soon = user?.vipExpiresAt ? Date.parse(String(user.vipExpiresAt)) : 0;
    if (user && soon > Date.now() && soon - Date.now() < 3 * DAY_MS) {
      // The subscription ends within 3 days: say so, once a day.
      await telegramApi('sendMessage', {
        chat_id: c.chatId,
        text: `⭐ VIP obunangiz ${dateUz(user.vipExpiresAt)} kuni tugaydi.\nUzaytirish: 💳 Depozit (chek yuboring).`
      }).catch(() => undefined);
      await markReminded(c.chatId, today).catch(() => undefined);
      sent++;
      continue;
    }
    const done = new Set(user?.completedLessons || []);
    const next = user ? openLessonsFor(db, user).find((l) => !done.has(l.id)) : undefined;
    if (next) {
      const link = startLink(bot, `lesson_${lessonBotCode(next)}`);
      await telegramApi('sendMessage', {
        chat_id: c.chatId,
        text: `⏰ Bugungi dars: ${esc(next.title)}\nKod: ${lessonBotCode(next)}`,
        ...(link ? { reply_markup: { inline_keyboard: [[{ text: '▶️ Darsni ochish', url: link }]] } } : {})
      })
        .then(() => sent++)
        .catch(() => skipped++);
    } else {
      skipped++;
    }
    await markReminded(c.chatId, today).catch(() => undefined);
  }
  return { sent, skipped, processed: candidates.length };
}

export async function digestText(db: AppDatabase, bot: string): Promise<string> {
  const subs = await newSubscribersSince(7).catch(() => 0);
  const totals = await referralTotals().catch(() => ({ invited: 0, qualified: 0, bundles: 0 }));
  const lessons = db.lessons.filter((l) => l.isPublished !== false).length;
  return [
    '📰 Haftalik xulosa',
    '',
    `Yangi obunachilar (7 kun): ${subs}`,
    `Ochiq darslar: ${lessons} ta`,
    `Malakali takliflar (jami): ${totals.qualified}`,
    '',
    bot ? `Botda darslar, test va savollar: https://t.me/${bot}` : ''
  ]
    .filter((line, i, arr) => line !== '' || arr[i - 1] !== '')
    .join('\n');
}

/** Lesson announcement for the channel, with a button that opens the lesson in the bot. */
export function lessonAnnouncement(db: AppDatabase, lessonId: string, bot: string) {
  const lesson = db.lessons.find((l) => l.id === lessonId && l.isPublished !== false);
  if (!lesson) return null;
  const course = db.courses.find((c) => c.id === lesson.courseId);
  const link = startLink(bot, `lesson_${lessonBotCode(lesson)}`);
  const text = card('🆕 Yangi dars', [`📘 <b>${esc(lesson.title)}</b>`, course ? `Kurs: ${esc(course.title)}` : '', `Kod: <code>${esc(lessonBotCode(lesson))}</code>`].filter(Boolean));
  return { text, markup: link ? { inline_keyboard: [[{ text: '▶️ Botda ochish', url: link }]] } : undefined };
}

/** Is this user allowed the channel bonus lesson (they are a member of the channel)? */
export async function isChannelMember(channel: string, userId: number): Promise<boolean> {
  if (!channel) return false;
  return (await channelMembership(channel, userId)) === 'member';
}

/* ---------- content commands: the site's own information, read from the database ---------- */

/** The first lesson of this student that is open and not finished yet. */
export function nextLessonFor(db: AppDatabase, user: User | undefined): Lesson | undefined {
  if (!user) return undefined;
  const done = new Set(user.completedLessons || []);
  return openLessonsFor(db, user).find((l) => !done.has(l.id));
}

export function newsText(db: AppDatabase): string {
  const items = (db.news || [])
    .filter((n) => n.published)
    .sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) || Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .slice(0, 5);
  if (items.length === 0) return 'Hozircha yangiliklar yo‘q.';
  return card('📰 So‘nggi yangiliklar', items.flatMap((n) => [`• ${n.tag ? `<i>[${esc(n.tag)}]</i> ` : ''}<b>${esc(n.title)}</b>`, `  ${esc(n.body.replace(/\s+/g, ' ').slice(0, 160))}`, '']).slice(0, -1));
}

export function faqText(db: AppDatabase): string {
  const items = (db.faqs || [])
    .filter((f) => f.isVisible)
    .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0))
    .slice(0, 8);
  if (items.length === 0) return 'Savollar ro‘yxati hozircha bo‘sh. Savolingizni /murojaat orqali yuboring.';
  return card('❓ Ko‘p so‘raladigan savollar', items.flatMap((f) => [`<b>Savol:</b> ${esc(f.question)}`, `Javob: ${esc(f.answer.replace(/\s+/g, ' ').slice(0, 300))}`, '']).slice(0, -1));
}

export function vipText(db: AppDatabase): string {
  const plans = (db.vipPlans || []).filter((p) => p.name);
  if (plans.length === 0) return 'Tariflar hozircha sozlanmagan.';
  const lines = plans.map((p) => {
    const price = p.priceMonthly ? `${money(p.priceMonthly)} / oy` : 'bepul';
    const features = (p.features || []).slice(0, 3).map((f) => `  • ${esc(uzText(f))}`).join('\n');
    return `⭐ <b>${esc(uzText(p.name))}</b> — ${price}${p.durationDays ? ` (${p.durationDays} kun)` : ''}${p.description ? `\n  ${esc(uzText(p.description))}` : ''}${features ? `\n${features}` : ''}`;
  });
  return card('💎 VIP tariflar', [lines.join('\n\n'), '', 'Tarifni yoqish uchun: 💳 Depozit — to‘lov chekini yuboring.']);
}

export function teacherText(db: AppDatabase): string {
  const t = db.teacherProfile;
  if (!t?.name) return 'Ustoz ma’lumoti hozircha sozlanmagan.';
  return card(`👩‍🏫 ${esc(t.name)}`, [
    esc(t.title || ''),
    t.experienceYears ? `Tajriba: ${t.experienceYears} yil` : '',
    t.telegram ? `Telegram: ${esc(t.telegram)}` : '',
    '',
    'Savolingiz bo‘lsa, /murojaat orqali yozing.'
  ].filter((line) => line !== ''));
}

export function dailyText(db: AppDatabase, user: User | undefined): string {
  if (!user) return NEED_LINK;
  const next = nextLessonFor(db, user);
  return card('📅 Bugungi reja', [
    next ? `1) Dars: <b>${esc(next.title)}</b> — kod: <code>${esc(lessonBotCode(next))}</code>` : '1) Ochiq darslarning hammasi tugagan. Yangi dars kutilmoqda.',
    '2) Test: /test',
    '3) Speaking: /speaking',
    '',
    `Seriya: ${user.streakDays || 0} kun`
  ]);
}

export function homeworkText(db: AppDatabase, user: User | undefined): string {
  if (!user) return NEED_LINK;
  const next = nextLessonFor(db, user);
  if (!next) return 'Hozir ochiq dars yo‘q, shuning uchun vazifa ham yo‘q.';
  const hw = (next.homework || '').trim();
  return hw ? `📝 <b>${esc(next.title)}</b> — vazifa:\n\n${esc(hw.slice(0, 3000))}` : `<b>${esc(next.title)}</b>: bu dars uchun vazifa yozilmagan.`;
}

/** A review from a student: stays "pending" until the owner approves it on the site. */
export function reviewFromBot(db: AppDatabase, input: { userId?: string; name: string; rating: number; text: string }): void {
  db.reviews.unshift({
    id: `review-${Date.now()}`,
    userId: input.userId,
    name: input.name.slice(0, 80) || 'Talaba',
    subtitle: 'Telegram bot',
    text: input.text.slice(0, 1000),
    rating: Math.min(5, Math.max(1, Math.round(input.rating))),
    status: 'pending',
    createdAt: new Date().toISOString()
  });
}

/* ---------- owner's control room in the bot ---------- */

export function adminDeposits(db: AppDatabase): { text: string; markup: { inline_keyboard: Array<Array<{ text: string; callback_data: string; style?: string }>> } } {
  const pending = (db.depositTransactions || []).filter((t) => t.status === 'pending').sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, 8);
  if (pending.length === 0) return { text: 'Kutilayotgan depozit yo‘q. ✅', markup: { inline_keyboard: [] } };
  const text = card('💳 Kutilayotgan depozitlar', pending.map((t, i) => `${i + 1}. ${esc(t.userName)} · ${money(t.amount)}`));
  const markup = {
    inline_keyboard: pending.map((t) => [
      { text: `✅ ${num(t.amount)}`, callback_data: `dep:ok:${t.id}`, style: 'success' },
      { text: '❌ Rad etish', callback_data: `dep:no:${t.id}`, style: 'danger' }
    ])
  };
  return { text, markup };
}

export function adminTickets(db: AppDatabase): string {
  const open = (db.supportTickets || []).filter((t) => t.status === 'new').sort((a, b) => Date.parse(b.createdAt || '') - Date.parse(a.createdAt || '')).slice(0, 8);
  if (open.length === 0) return 'Yangi murojaat yo‘q. ✅';
  return ['🆘 Yangi murojaatlar', '', ...open.map((t, i) => `${i + 1}. ${esc(t.userName)}: ${esc(t.message.slice(0, 140))}`)].join('\n');
}

/** Approves a pending deposit with the same rules as the site's owner panel. Returns the account it credited. */
export function approveDeposit(db: AppDatabase, id: string): { ok: boolean; message: string; user?: User } {
  const tx = (db.depositTransactions || []).find((t) => t.id === id);
  if (!tx) return { ok: false, message: 'Tranzaksiya topilmadi' };
  if (tx.status !== 'pending') return { ok: false, message: 'Bu tranzaksiya allaqachon ko‘rib chiqilgan' };
  tx.status = 'completed';
  tx.approvedAt = new Date().toISOString();
  const user = db.users.find((u) => u.id === tx.userId);
  if (user) {
    user.balance = (user.balance || 0) + tx.amount;
    user.xp = (user.xp || 0) + Math.round(tx.amount / 1000);
  }
  return { ok: true, message: `${esc(tx.userName)}: ${money(tx.amount)} tasdiqlandi`, user };
}

export function rejectDeposit(db: AppDatabase, id: string): { ok: boolean; message: string } {
  const tx = (db.depositTransactions || []).find((t) => t.id === id);
  if (!tx) return { ok: false, message: 'Tranzaksiya topilmadi' };
  if (tx.status !== 'pending') return { ok: false, message: 'Bu tranzaksiya allaqachon ko‘rib chiqilgan' };
  tx.status = 'rejected';
  return { ok: true, message: `${tx.userName}: depozit rad etildi` };
}

/** Flashcards waiting for review today, for this student. */
export function flashcardsDueText(db: AppDatabase, user: User | undefined): string {
  if (!user) return 'Takrorlash uchun avval hisobingizni ulang: /ulash KOD';
  const due = (db.flashcards || []).filter((f) => f.userId === user.id && Date.parse(f.nextReviewDate || '') <= Date.now()).length;
  const total = (db.flashcards || []).filter((f) => f.userId === user.id).length;
  if (total === 0) return 'Sizda hali so‘zlar yo‘q. Saytda AI bo‘limida so‘z kartochkalari yarating.';
  return ['🃏 Takrorlash', '━━━━━━━━━━━━━━━━━━', `Bugun takrorlash kerak: ${due} ta so‘z`, `Jami kartochkalar: ${total} ta`, '', 'Saytda flashcards bo‘limida takrorlang.'].join('\n');
}

/** Owner's notice: a new deposit, a new ticket or homework. Sent to the owner's Telegram chat, if it is known. */
export async function notifyOwnerChat(db: AppDatabase, text: string): Promise<void> {
  const tg = (db.telegramBotSettings?.ownerTelegram || '').replace(/^@/, '');
  if (!tg) return;
  const chat = await privateChatForUsername(tg).catch(() => null);
  if (chat) await telegramApi('sendMessage', { chat_id: chat, text: text.slice(0, 3500) }).catch(() => undefined);
}

/* ---------- the owner's channel posts, drafted by the AI ---------- */

const POST_SYSTEM = [
  'Siz “Edu Level” ingliz tili platformasining Telegram kanali uchun post yozasiz.',
  'Post o‘zbek tilida, qisqa va o‘qishga qulay bo‘lsin (600–900 belgi), 2–3 ta emoji bilan, 2–3 qisqa xatboshi.',
  'Oxirida o‘quvchini harakatga chaqiring: botga yozish yoki darsga kirish.',
  'Raqam, narx, sana, natija yoki va’da o‘ylab topmang; faqat berilgan mavzu bilan ishlang.',
  'Faqat post matnini qaytaring: sarlavha, izoh yoki “Mana post:” kabi so‘zlarsiz.'
].join('\n');

/** A channel post on the given topic. The owner reviews it before anything is sent to the channel. */
export async function draftChannelPost(topic: string): Promise<string> {
  const key = aiKey();
  if (!key && availableFallbacks(process.env).length === 0) return 'AI xizmati hozircha ulanmagan. GEMINI_API_KEY yoki zaxira kalit sozlanishi kerak.';
  try {
    const text = await executeUniversalAi({ task: 'telegram_post', apiKey: key, systemInstruction: POST_SYSTEM, prompt: `Mavzu: ${topic.slice(0, 300)}`, temperature: 0.7, maxOutputTokens: 900, signal: AbortSignal.timeout(AI_BOT_DEADLINE_MS) });
    return String(text || '').trim().slice(0, 3500) || 'Post tayyorlab bo‘lmadi. Mavzuni boshqacha yozib ko‘ring.';
  } catch { return 'Post tayyorlab bo‘lmadi. Birozdan keyin qayta urinib ko‘ring.'; }
}

const IDEAS_SYSTEM = [
  'Siz “Edu Level” ingliz tili platformasining Telegram kanali uchun haftalik kontent rejasini tuzasiz.',
  'Aynan 5 ta g‘oya bering, har biri alohida qatorda, shunday: “1. Mavzu — qisqa izoh”.',
  'Mavzular IELTS, CEFR va General English bo‘yicha bo‘lsin: grammatika, so‘z boyligi, Writing, Speaking, motivatsiya.',
  'Hech qanday raqam, narx yoki va’da yozmang. Faqat ro‘yxatni qaytaring.'
].join('\n');

/** Five post ideas for the week. Each one is turned into a draft by the owner's button. */
export async function draftChannelIdeas(): Promise<string> {
  const key = aiKey();
  if (!key && availableFallbacks(process.env).length === 0) return 'AI xizmati hozircha ulanmagan. GEMINI_API_KEY yoki zaxira kalit sozlanishi kerak.';
  try {
    const text = await executeUniversalAi({ task: 'telegram_post', apiKey: key, systemInstruction: IDEAS_SYSTEM, prompt: 'Bu hafta uchun 5 ta kanal posti g‘oyasi.', temperature: 0.8, maxOutputTokens: 600, signal: AbortSignal.timeout(AI_BOT_DEADLINE_MS) });
    return String(text || '').trim().slice(0, 2500) || 'G‘oyalar tayyorlab bo‘lmadi. Qayta urinib ko‘ring.';
  } catch { return 'G‘oyalar tayyorlab bo‘lmadi. Birozdan keyin qayta urinib ko‘ring.'; }
}

/** The idea with this number from a list made by draftChannelIdeas (lines "1. …", "2. …"). */
export function ideaFromList(list: string, n: number): string | null {
  const pattern = new RegExp('^' + n + '[.)]\\s+(.+)$');
  for (const raw of list.split('\n')) {
    const match = raw.trim().match(pattern);
    if (match) return match[1].trim();
  }
  return null;
}
