import { availableFallbacks } from './aiRouter';
import type { AppDatabase, Lesson, User } from '../types';
import { getRankByXp } from './eduLogic';
import { telegramApi } from './telegramBot';
import { lessonBotCode, normalizeLessonCode, openLessonsFor, startLink } from './telegramLessons';
import { flashcardsDueText, nextLessonFor, runDailyReminders } from './telegramGrowth';
import { NEED_LINK, card, dateUz, esc, money, num, rankUz, tierLabel } from './telegramFormat';
import { chatFlags, linkChatToUser, privateChatForUsername } from './telegramStore';

/**
 * Thirty more bot functions. Students get 22 (progress, practice content, daily words, rankings and small tools);
 * the owner gets 8 (courses, students, review moderation, tests, news, reminders, one-to-one messages, lesson visibility).
 * Every answer is read from the site's own data. Nothing here invents results, prices or reviews.
 */

const DAY = 86_400_000;
const WEEK_AGO = () => Date.now() - 7 * DAY;

/** Day number in Tashkent time, so the daily word or tip changes at local midnight. */
function dayIndex(): number {
  return Math.floor((Date.now() + 5 * 3600 * 1000) / DAY);
}
function pickDaily<T>(items: T[]): T {
  return items[dayIndex() % items.length];
}

/** A name shown to other students: first letter and stars, e.g. "A***". */
function maskName(name: string): string {
  const clean = (name || '').trim();
  return clean ? `${clean[0]}***` : 'O‘quvchi';
}

const WORDS = [
  { w: 'achieve', uz: 'erishmoq', ex: 'She wants to achieve a band 7.' },
  { w: 'consistent', uz: 'izchil', ex: 'Consistent practice builds fluency.' },
  { w: 'improve', uz: 'yaxshilamoq', ex: 'I want to improve my writing.' },
  { w: 'opportunity', uz: 'imkoniyat', ex: 'This course is a great opportunity.' },
  { w: 'confident', uz: 'ishonchli', ex: 'He feels confident in speaking.' },
  { w: 'reliable', uz: 'ishonchli, ishonarli', ex: 'This is a reliable source.' },
  { w: 'vocabulary', uz: 'lug‘at boyligi', ex: 'Reading builds your vocabulary.' },
  { w: 'routine', uz: 'odat, tartib', ex: 'I study as part of my daily routine.' },
  { w: 'curious', uz: 'qiziquvchan', ex: 'Stay curious and ask questions.' },
  { w: 'determined', uz: 'qat’iy', ex: 'She is determined to pass the exam.' }
];
const IDIOMS = [
  { i: 'break the ice', uz: 'muzni eritmoq (suhbatni boshlamoq)', ex: 'A joke helped break the ice.' },
  { i: 'piece of cake', uz: 'juda oson', ex: 'The test was a piece of cake.' },
  { i: 'once in a blue moon', uz: 'juda kamdan-kam', ex: 'I eat fast food once in a blue moon.' },
  { i: 'hit the books', uz: 'darsga o‘tirmoq', ex: 'I have to hit the books tonight.' },
  { i: 'get the hang of it', uz: 'nimanidir o‘zlashtirmoq', ex: 'It takes time to get the hang of it.' }
];
const GRAMMAR = [
  'Present Perfect: “I have lived here since 2020.” — o‘tmishda boshlangan, hozir ham davom etayotgan ish.',
  'Articles: unique narsalar oldida “the” (the sun), birinchi marta eslatilganda “a/an”.',
  'Conditionals: First (real): “If it rains, I will stay home.”',
  'Passive voice: “The essay was written yesterday.” — ish bajarilgan, bajaruvchi muhim emas.',
  'Modal verbs: “should” maslahat beradi: “You should revise every day.”'
];
const PRONUNCIATION = [
  '“th” tovushi: tilni tishlar orasiga qo‘yib, havo chiqaring (think, this).',
  '-ed tugashi: “t” yoki “d” kabi (walked → /wɔːkt/, played → /pleɪd/).',
  'Urg‘u: “PHOtograph” va “phoTOgraphy” — urg‘u joyi o‘zgaradi.',
  '“ea” tovushi: “see” va “sit” orasidagi farqni ajrating.',
  'Gaplarda urg‘u: muhim so‘zlar aniq, yordamchi so‘zlar qisqa aytiladi.'
];
const QUOTES = [
  'Har kuni 20 daqiqa — bir yilda minglab so‘z.',
  'Xato qilish — o‘rganish yo‘lidagi bosqich.',
  'Kichik qadam ham — oldinga qadam.',
  'Bugun qilgan mashqing ertangi natijangdir.',
  'Izchillik iste’dodni yengadi.'
];

function studentRows(db: AppDatabase): User[] {
  return db.users.filter((u) => u.role !== 'owner');
}

/** Each student command. Returns the text to send (and the menu to attach). */
export const EXTRA_STUDENT: Record<string, { description: string; run: (db: AppDatabase, user: User | undefined, chatId: string, arg: string) => string }> = {
  streak: {
    description: 'Seriya va muzlatish',
    run: (_db, u) => (u ? card('🔥 Seriya', [`Ketma-ket kunlar: ${u.streakDays || 0}`, `Muzlatish (kun o‘tkazish): ${u.streakFreezeCount || 0} ta`]) : NEED_LINK),
  },
  tanga: {
    description: 'Tanga, XP va daraja',
    run: (_db, u) => {
      if (!u) return NEED_LINK;
      const rank = getRankByXp(u.xp || 0);
      return card('🪙 Hisobim', [`Tanga: ${num(u.coins || 0)}`, `XP: ${num(u.xp || 0)}`, `Daraja: ${rankUz(rank.title)}`]);
    }
  },
  natijalarim: {
    description: 'Oxirgi 5 ta test natijasi',
    run: (db, u) => {
      if (!u) return NEED_LINK;
      const rows = db.testAttempts.filter((a) => a.userId === u.id).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, 5);
      if (rows.length === 0) return 'Hali test natijasi yo‘q. /test bilan boshlang.';
      return card('🧾 Natijalarim', rows.map((a) => `${esc(a.testTitle)}: ${a.score}/${a.maxScore} (${a.maxScore ? Math.round((a.score / a.maxScore) * 100) : 0}%)`));
    }
  },
  testlar: {
    description: 'Nashr etilgan testlar',
    run: (db) => {
      const tests = db.tests.filter((t) => t.published).slice(0, 15);
      if (tests.length === 0) return 'Hozircha nashr etilgan test yo‘q.';
      return card('🧠 Testlar', tests.map((t) => `• ${esc(t.title)} — ${t.questionsCount} savol, ${t.durationMinutes} daq`));
    }
  },
  paketlar: {
    description: 'Mavzuli test paketlari',
    run: (db) => {
      const packs = (db.thematicQuizPacks || []).slice(0, 12);
      if (packs.length === 0) return 'Hozircha test paketlari yo‘q.';
      return card('📦 Test paketlari', packs.map((p) => `• ${esc(p.title)} — ${esc(p.level)}, ${p.questionsCount} savol`));
    }
  },
  kutubxona: {
    description: 'Raqamli kutubxona',
    run: (db) => {
      const books = (db.digitalBooks || []).slice(0, 12);
      if (books.length === 0) return 'Kutubxonada hozircha kitob yo‘q.';
      return card('📚 Raqamli kutubxona', books.map((b) => `• ${esc(b.title)} — ${esc(b.author)}${b.requiredVIP && b.requiredVIP !== 'none' ? ' (VIP)' : ''}`));
    }
  },
  kurslar: {
    description: 'Kurslar va progress',
    run: (db, u) => {
      const track = u?.track || 'ielts';
      const done = new Set(u?.completedLessons || []);
      const courses = db.courses.filter((c) => c.published !== false && (c.track || 'ielts') === track);
      if (courses.length === 0) return 'Bu yo‘nalishda hali kurs yo‘q.';
      return card(
        '🎓 Kurslar',
        courses.map((c) => {
          const lessons = db.lessons.filter((l) => l.courseId === c.id && l.isPublished !== false);
          const finished = lessons.filter((l) => done.has(l.id)).length;
          return `• ${esc(c.title)}: ${finished}/${lessons.length} dars`;
        })
      );
    }
  },
  oxirgi: {
    description: 'Oxirgi ko‘rilgan dars',
    run: (db, u) => {
      if (!u) return NEED_LINK;
      const last = db.lessonProgress
        .filter((p) => p.userId === u.id && p.updatedAt)
        .sort((a, b) => Date.parse(b.updatedAt || '') - Date.parse(a.updatedAt || ''))[0];
      const lesson = last ? db.lessons.find((l) => l.id === last.lessonId) : undefined;
      if (!last || !lesson) return 'Hali ko‘rilgan dars yo‘q. /darslar orqali boshlang.';
      const mm = Math.floor(last.position / 60);
      const ss = String(Math.floor(last.position % 60)).padStart(2, '0');
      return card('⏯ Davom etish', [`<b>${esc(lesson.title)}</b>`, `Kod: <code>${esc(lessonBotCode(lesson))}</code>`, `To‘xtagan joy: ${mm}:${ss}`]);
    }
  },
  hafta: {
    description: 'Shu haftadagi natijalar',
    run: (db, u) => {
      if (!u) return NEED_LINK;
      const since = WEEK_AGO();
      const progress = db.lessonProgress.filter((p) => p.userId === u.id && Date.parse(p.updatedAt || '') >= since);
      const finished = progress.filter((p) => (u.completedLessons || []).includes(p.lessonId)).length;
      const minutes = Math.round(progress.reduce((sum, p) => sum + (p.watchedSeconds || 0), 0) / 60);
      const tests = db.testAttempts.filter((a) => a.userId === u.id && Date.parse(a.createdAt) >= since).length;
      return card('📊 So‘nggi 7 kun', [`Tugatilgan darslar: ${finished}`, `Ko‘rilgan vaqt: ${minutes} daqiqa`, `Topshirilgan testlar: ${tests}`]);
    }
  },
  maqsad: {
    description: 'Maqsad va kunlik vaqt',
    run: (_db, u) => {
      if (!u) return NEED_LINK;
      if (!u.targetScore && !u.targetBand && !u.studyTimeDaily) return 'Maqsad belgilanmagan. Saytda profilingizda kiriting.';
      return card('🎯 Maqsadim', [`Maqsad ball: ${u.targetBand || u.targetScore || '—'}`, `Kuniga: ${u.studyTimeDaily || '—'}`]);
    }
  },
  hisob_tarix: {
    description: 'Oxirgi 5 ta depozit',
    run: (db, u) => {
      if (!u) return NEED_LINK;
      const rows = (db.depositTransactions || []).filter((t) => t.userId === u.id).slice(0, 5);
      if (rows.length === 0) return 'Depozitlar tarixi bo‘sh.';
      const status: Record<string, string> = { completed: '✅ tasdiqlangan', pending: '⏳ kutilmoqda', rejected: '❌ rad etilgan' };
      return card('💳 Depozitlar', rows.map((t) => `${dateUz(t.createdAt)} · ${money(t.amount)} · ${status[t.status] || t.status}`));
    }
  },
  ajratish: {
    description: 'Botni hisobdan ajratish',
    run: () => '', // handled in the route (it needs the chat id); kept here so the command is listed
  },
  sor_soz: {
    description: 'Kunning so‘zi',
    run: () => {
      const w = pickDaily(WORDS);
      return card('📖 Kunning so‘zi', [`<b>${esc(w.w)}</b> — ${esc(w.uz)}`, `Misol: ${esc(w.ex)}`]);
    }
  },
  idiom: {
    description: 'Kunning idiomasi',
    run: () => {
      const i = pickDaily(IDIOMS);
      return card('💬 Kunning idiomasi', [`<b>${esc(i.i)}</b> — ${esc(i.uz)}`, `Misol: ${esc(i.ex)}`]);
    }
  },
  grammatika: {
    description: 'Kunning grammatika maslahati',
    run: () => card('📐 Grammatika', [esc(pickDaily(GRAMMAR))])
  },
  talaffuz: {
    description: 'Kunning talaffuz maslahati',
    run: () => card('🗣 Talaffuz', [esc(pickDaily(PRONUNCIATION))])
  },
  motivatsiya: {
    description: 'Kunning motivatsiyasi',
    run: () => card('✨ Bugun uchun', [esc(pickDaily(QUOTES))])
  },
  tavsiya: {
    description: 'Keyingi qadam tavsiyasi',
    run: (db, u) => {
      if (!u) return NEED_LINK;
      const next = nextLessonFor(db, u);
      if (next) return card('🧭 Tavsiya', [`Keyingi dars: <b>${esc(next.title)}</b>`, `Kod: <code>${esc(lessonBotCode(next))}</code>`, 'Keyin: /test bilan bilimingizni tekshiring.']);
      return card('🧭 Tavsiya', ['Ochiq darslar tugagan. /test bilan bilimingizni mustahkamlang.']);
    }
  },
  reyting_xp: {
    description: 'XP bo‘yicha top 10',
    run: (db) => {
      const top = studentRows(db).sort((a, b) => (b.xp || 0) - (a.xp || 0)).slice(0, 10);
      if (top.length === 0) return 'Reyting hozircha bo‘sh.';
      return card('🏆 XP reytingi', top.map((u, i) => `${i + 1}. ${esc(maskName(u.name))} — ${num(u.xp || 0)} XP`));
    }
  },
  sertifikatlar: {
    description: 'Imtihon natijalari (oxirgi 3)',
    run: (db) => {
      const rows = (db.studentResults || []).slice(0, 3);
      if (rows.length === 0) return 'Hozircha e’lon qilingan natija yo‘q.';
      return card('🎖 Natijalar', rows.map((r) => `• ${esc(maskName(r.studentName))} — ${esc(r.certificateType)}: ${r.score}`));
    }
  },
  qolgan: {
    description: 'Tugatilmagan ochiq darslar',
    run: (db, u) => {
      if (!u) return NEED_LINK;
      const done = new Set(u.completedLessons || []);
      const left = openLessonsFor(db, u).filter((l) => !done.has(l.id)).length;
      return card('📋 Qolgan darslar', [`Tugatilmagan ochiq darslar: ${left} ta`]);
    }
  },
  takror: {
    description: 'Bugungi takrorlash',
    run: (db, u) => flashcardsDueText(db, u)
  },
  sozlamalar: {
    description: 'Bot sozlamalarim',
    run: () => '', // needs the chat flags; handled in the route
  }
};

/** Owner-only functions (used from /admin or by typing the command). */
export const EXTRA_ADMIN: Record<string, { description: string }> = {
  admin_kurs: { description: 'Kurslar va darslar holati' },
  admin_talabalar: { description: 'Talabalar: top 5 XP' },
  admin_fikrlar: { description: 'Kutilayotgan sharhlar (tasdiqlash)' },
  admin_testlar: { description: 'Testlar va so‘nggi urinishlar' },
  admin_yangilik: { description: 'Yangilik e’loni: /admin_yangilik matn' },
  admin_eslatma: { description: 'Kunlik eslatmalarni hozir yuborish' },
  admin_xabar: { description: 'Bitta talabaga xabar: /admin_xabar username matn' },
  admin_dars: { description: 'Darsni yashirish/ochish: /admin_dars KOD on|off' },
  admin_talaba: { description: 'Talaba ma’lumoti: /admin_talaba username' },
  admin_vip: { description: 'VIP berish: /admin_vip username tarif kun' },
  admin_tanga: { description: 'Tanga qo‘shish yoki ayirish: /admin_tanga username ±son' },
  admin_xp: { description: 'XP qo‘shish yoki ayirish: /admin_xp username ±son' },
  admin_hisobot: { description: 'Bugungi hisobot: yangi talabalar, depozitlar, murojaatlar' },
  admin_holat: { description: 'Tizim holati: baza, AI kaliti, Telegram sozlamalari' },
  admin_blok: { description: 'Talabani bloklash: /admin_blok username on|off' }
};

export const EXTRA_NAMES = new Set([...Object.keys(EXTRA_STUDENT), ...Object.keys(EXTRA_ADMIN)]);

export interface ExtraResult {
  text: string;
  owner?: boolean;
  markup?: { inline_keyboard: Array<Array<{ text: string; callback_data?: string; url?: string; style?: string }>> };
  /** Set when a student was blocked: their site sessions must end too. */
  revokeUserId?: string;
}

/** Owner functions. They change the site's data directly, so they run only for the owner's account. */
/** The student with this Telegram username. An empty name matches nobody. */
function findStudentByUsername(db: AppDatabase, username: string): User | undefined {
  const want = username.replace(/^@/, '').trim().toLowerCase();
  if (!want) return undefined;
  return studentRows(db).find((x) => (x.telegramUsername || '').replace(/^@/, '').toLowerCase() === want);
}

export async function runOwnerExtra(name: string, arg: string, db: AppDatabase): Promise<ExtraResult> {
  if (name === 'admin_kurs') {
    const courses = db.courses.length;
    const published = db.lessons.filter((l) => l.isPublished !== false).length;
    const drafts = db.lessons.filter((l) => l.isPublished === false).length;
    const noCode = db.lessons.filter((l) => !(l.lessonCode || '').trim()).length;
    return { owner: true, text: card('🎓 Kurslar', [`Kurslar: ${courses}`, `Nashr etilgan darslar: ${published}`, `Qoralama darslar: ${drafts}`, `Kodi yo‘q darslar: ${noCode}`]) };
  }
  if (name === 'admin_talabalar') {
    const rows = studentRows(db);
    const top = rows.sort((a, b) => (b.xp || 0) - (a.xp || 0)).slice(0, 5);
    return { owner: true, text: card('👥 Talabalar', [`Jami: ${studentRows(db).length} ta`, ...top.map((u, i) => `${i + 1}. ${esc(`${u.name} ${u.surname || ''}`.trim())} — ${num(u.xp || 0)} XP`)]) };
  }
  if (name === 'admin_fikrlar') {
    const pending = (db.reviews || []).filter((r) => r.status === 'pending').sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, 5);
    if (pending.length === 0) return { owner: true, text: 'Kutilayotgan sharh yo‘q. ✅' };
    return {
      owner: true,
      text: card('📝 Sharhlar', pending.map((r, i) => `${i + 1}. ${esc(r.name)} · ${r.rating}★ — ${esc(r.text.slice(0, 120))}`)),
      markup: { inline_keyboard: pending.map((r) => [
        { text: '✅ Tasdiqlash', callback_data: `rev:ok:${r.id}`, style: 'success' },
        { text: '🚫 Yashirish', callback_data: `rev:no:${r.id}`, style: 'danger' }
      ]) }
    };
  }
  if (name === 'admin_testlar') {
    const published = db.tests.filter((t) => t.published).length;
    const recent = db.testAttempts.filter((a) => Date.parse(a.createdAt) >= WEEK_AGO()).length;
    return { owner: true, text: card('🧠 Testlar', [`Nashr etilgan: ${published}`, `So‘nggi 7 kundagi urinishlar: ${recent}`]) };
  }
  if (name === 'admin_yangilik') {
    const body = arg.trim();
    if (!body) return { owner: true, text: 'Format: /admin_yangilik yangilik matni' };
    db.news.unshift({ id: `news-${Date.now()}`, title: body.split('\n')[0].slice(0, 80), body: body.slice(0, 2000), pinned: false, published: true, createdAt: new Date().toISOString(), tag: 'Telegram' } as any);
    return { owner: true, text: '✅ Yangilik saytda e’lon qilindi.' };
  }
  if (name === 'admin_eslatma') {
    const r = await runDailyReminders(db, (db.telegramBotSettings?.botUsername || '').replace(/^@/, ''));
    return { owner: true, text: `⏰ Eslatmalar: ${r.sent} ta yuborildi, ${r.skipped} ta o‘tkazildi.` };
  }
  if (name === 'admin_xabar') {
    const [username, ...rest] = arg.trim().split(/\s+/);
    const text = rest.join(' ').trim();
    if (!username || !text) return { owner: true, text: 'Format: /admin_xabar username matn' };
    const chat = await privateChatForUsername(username).catch(() => null);
    if (!chat) return { owner: true, text: 'Bu username botga yozmagan.' };
    await telegramApi('sendMessage', { chat_id: chat, text: `📩 Ustozdan:\n${esc(text.slice(0, 3000))}` }).catch(() => undefined);
    return { owner: true, text: `✅ @${username.replace(/^@/, '')} ga yuborildi.` };
  }
  if (name === 'admin_dars') {
    const [code, mode] = arg.trim().split(/\s+/);
    if (!code || !['on', 'off'].includes((mode || '').toLowerCase())) {
      return { owner: true, text: 'Format: /admin_dars KOD on yoki off\nMasalan: /admin_dars EDU-L01 off' };
    }
    const want = normalizeLessonCode(code);
    const lesson: Lesson | undefined = db.lessons.find((l) => normalizeLessonCode(lessonBotCode(l)) === want);
    if (!lesson) return { owner: true, text: `“${esc(code)}” kodli dars topilmadi.` };
    lesson.isPublished = mode.toLowerCase() === 'on';
    return { owner: true, text: `${esc(lesson.title)}: ${lesson.isPublished ? 'ochildi ✅' : 'yashirildi 🔒'}` };
  }
  if (name === 'admin_talaba') {
    const username = arg.trim().replace(/^@/, '');
    if (!username) return { owner: true, text: 'Format: /admin_talaba username\nMasalan: /admin_talaba ali_2026' };
    const u = findStudentByUsername(db, username);
    if (!u) return { owner: true, text: `@${esc(username)} bilan ulangan talaba topilmadi.` };
    const expires = dateUz(u.vipExpiresAt);
    return {
      owner: true,
      text: card('👤 Talaba', [
        esc(`${u.name} ${u.surname || ''}`.trim()),
        `Yo‘nalish: ${esc(u.track || 'ielts')}`,
        `Obuna: ${tierLabel(u.vipTier)}${expires ? ` (${expires} gacha)` : ''}`,
        `XP: ${num(u.xp)} · Tanga: ${num(u.coins)}`,
        `Balans: ${money(u.balance)}`,
        `Tugatilgan darslar: ${(u.completedLessons || []).length} ta`,
        `Holat: ${u.isBlocked ? '🚫 bloklangan' : '✅ faol'}`
      ])
    };
  }
  if (name === 'admin_blok') {
    const [raw, mode] = arg.trim().replace(/^@/, '').split(/\s+/);
    const m = (mode || '').toLowerCase();
    if (!raw || !['on', 'off'].includes(m)) return { owner: true, text: 'Format: /admin_blok username on yoki off\nMasalan: /admin_blok ali_2026 on' };
    const u = findStudentByUsername(db, raw);
    if (!u) return { owner: true, text: `@${esc(raw)} bilan ulangan talaba topilmadi.` };
    u.isBlocked = m === 'on';
    return {
      owner: true,
      text: `${esc(u.name)}: ${u.isBlocked ? 'bloklandi 🚫 (sayt sessiyalari ham tugatildi)' : 'blokdan chiqarildi ✅'}`,
      revokeUserId: u.isBlocked ? u.id : undefined
    };
  }
  if (name === 'admin_vip') {
    const [raw, tier, days] = arg.trim().replace(/^@/, '').split(/\s+/);
    const count = Number(days);
    const plan = tier ? db.vipPlans.find((p) => p.id === tier.toLowerCase()) : undefined;
    if (!raw || !plan || !Number.isFinite(count) || count < 1 || count > 730) {
      const tiers = db.vipPlans.map((p) => p.id).join(', ');
      return { owner: true, text: `Format: /admin_vip username tarif kun\nTariflar: ${esc(tiers)}\nMasalan: /admin_vip ali_2026 gold 30` };
    }
    const u = findStudentByUsername(db, raw);
    if (!u) return { owner: true, text: `@${esc(raw)} bilan ulangan talaba topilmadi.` };
    const base = Math.max(Date.now(), u.vipExpiresAt ? Date.parse(u.vipExpiresAt) || 0 : 0);
    u.vipTier = plan.id;
    u.vipExpiresAt = new Date(base + count * 24 * 60 * 60 * 1000).toISOString();
    return { owner: true, text: `${esc(u.name)}: ${tierLabel(plan.id)} ${count} kunga berildi (muddati ${dateUz(u.vipExpiresAt)} gacha).` };
  }
  if (name === 'admin_tanga' || name === 'admin_xp') {
    const [raw, amountText] = arg.trim().replace(/^@/, '').split(/\s+/);
    const amount = Number(amountText);
    const field = name === 'admin_tanga' ? 'coins' : 'xp';
    if (!raw || !Number.isInteger(amount) || amount === 0) {
      return { owner: true, text: `Format: /${name} username ±son\nMasalan: /${name} ali_2026 ${name === 'admin_tanga' ? '50' : '-20'}` };
    }
    if (Math.abs(amount) > 100000) return { owner: true, text: 'Son −100 000 dan 100 000 gacha bo‘lishi kerak.' };
    const u = findStudentByUsername(db, raw);
    if (!u) return { owner: true, text: `@${esc(raw)} bilan ulangan talaba topilmadi.` };
    const current = Number((u as unknown as Record<string, unknown>)[field]) || 0;
    (u as unknown as Record<string, unknown>)[field] = Math.max(0, current + amount);
    const label = field === 'coins' ? 'tanga' : 'XP';
    return { owner: true, text: `${esc(u.name)}: ${num(amount)} ${label} ${amount > 0 ? 'qo‘shildi' : 'ayirildi'}. Joriy: ${num(Math.max(0, current + amount))} ${label}.` };
  }
  if (name === 'admin_hisobot') {
    const day = Date.now() - 24 * 60 * 60 * 1000;
    const students = studentRows(db);
    const newToday = students.filter((u) => Date.parse(u.registeredAt || '') >= day).length;
    const pendingDeposits = (db.depositTransactions || []).filter((t) => t.status === 'pending');
    const depositSum = pendingDeposits.reduce((a, t) => a + (t.amount || 0), 0);
    const reviewsPending = (db.reviews || []).filter((r) => r.status === 'pending').length;
    const ticketsOpen = (db.supportTickets || []).filter((t) => t.status === 'new').length;
    const vipActive = students.filter((u) => u.vipTier && u.vipTier !== 'none' && Date.parse(u.vipExpiresAt || '') > Date.now()).length;
    return {
      owner: true,
      text: card('🧾 Bugungi hisobot', [
        `Yangi talabalar (24 soat): ${num(newToday)}`,
        `Jami talabalar: ${num(students.length)} · VIP faol: ${num(vipActive)}`,
        `Kutilayotgan depozitlar: ${num(pendingDeposits.length)} ta · ${money(depositSum)}`,
        `Ochiq murojaatlar: ${num(ticketsOpen)} · Tasdiqlanmagan sharhlar: ${num(reviewsPending)}`
      ])
    };
  }
  if (name === 'admin_holat') {
    const mark = (ok: boolean) => (ok ? '✅' : '⚠️');
    const hasAi = Boolean((process.env.GEMINI_API_KEY || '').trim()) || availableFallbacks(process.env).length > 0;
    const hasBot = Boolean((process.env.TELEGRAM_BOT_TOKEN || '').trim());
    const hasSecret = Boolean((process.env.TELEGRAM_WEBHOOK_SECRET || '').trim());
    const hasCron = Boolean((process.env.TELEGRAM_CRON_SECRET || '').trim());
    const channel = db.telegramBotSettings?.channelUsername || '';
    return {
      owner: true,
      text: card('🩺 Tizim holati', [
        `${mark(true)} Ma’lumotlar bazasi: ulangan`,
        `${mark(hasAi)} AI kaliti (Gemini): ${hasAi ? 'sozlangan' : 'sozlanmagan'}`,
        `${mark(hasBot)} Bot tokeni: ${hasBot ? 'sozlangan' : 'sozlanmagan'}`,
        `${mark(hasSecret)} Webhook maxfiy kaliti: ${hasSecret ? 'bor' : 'yo‘q'}`,
        `${mark(hasCron)} Eslatma (cron) kaliti: ${hasCron ? 'bor' : 'yo‘q'}`,
        `${channel ? '✅' : '⚠️'} Kanal: ${channel ? '@' + esc(channel) : 'ulanmagan'}`
      ])
    };
  }
  return { owner: true, text: 'Noma’lum buyruq.' };
}

/** Student functions that return text straight from the data. */
export function runStudentExtra(name: string, db: AppDatabase, user: User | undefined, chatId: string, arg: string): ExtraResult | null {
  const fn = EXTRA_STUDENT[name];
  if (!fn) return null;
  return { text: fn.run(db, user, chatId, arg) };
}

export async function unlinkChat(chatId: string): Promise<void> {
  await linkChatToUser(chatId, null);
}

export { chatFlags, startLink };
