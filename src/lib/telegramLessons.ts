import type { AppDatabase, Lesson, User } from '../types';
import { NEED_LINK, RULE, card, dateUz, esc, money, num, tierLabel } from './telegramFormat';

/**
 * Telegram bot helpers. Every video lesson has a code (EDU-L01) that is shown on the lesson page; a student sends
 * that code to the bot and gets the lesson card. This file is shared by the server and the browser, so it must not
 * import server-only modules (no `crypto`, no database).
 */

/** Small stable hash (FNV-1a) used only for lessons that have no code yet. */
function fnv1a(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(36).toUpperCase().padStart(6, '0').slice(-6);
}

/** Letters and digits only. "edu l01", "EDU-L1" and "EDUL01" are the same code: leading zeros do not count. */
export function normalizeLessonCode(raw: string): string {
  return String(raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/(?<=[A-Z])0+(?=\d)/g, '');
}

/** The code the student sends: the lesson's own code, or a stable fallback derived from its id. */
export function lessonBotCode(lesson: Pick<Lesson, 'id' | 'lessonCode'>): string {
  const own = (lesson.lessonCode || '').trim();
  return own ? own.toUpperCase() : `EDU-${fnv1a(lesson.id)}`;
}

/** Cleans a code typed by the owner: 3–20 characters, letters, digits and dashes. Returns null when invalid. */
export function cleanLessonCode(raw: unknown): string | null {
  const text = String(raw ?? '').trim().toUpperCase().replace(/\s+/g, '');
  if (!text) return null;
  return /^[A-Z0-9-]{3,20}$/.test(text) ? text : null;
}

/** The next free "EDU-Lnn" code, after the highest number in use. */
export function nextLessonCode(lessons: Array<Pick<Lesson, 'lessonCode'>>): string {
  let max = 0;
  for (const l of lessons) {
    const m = /(\d+)\s*$/.exec(l.lessonCode || '');
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `EDU-L${String(max + 1).padStart(2, '0')}`;
}

/** True when another lesson already uses this code. */
export function lessonCodeTaken(lessons: Array<Pick<Lesson, 'id' | 'lessonCode'>>, code: string, exceptId?: string): boolean {
  const want = normalizeLessonCode(code);
  return lessons.some((l) => l.id !== exceptId && normalizeLessonCode(lessonBotCode(l)) === want);
}

/** Finds the lesson for a typed code. A published match wins over a draft with the same code. */
export function findLessonByCode(db: AppDatabase, typed: string): Lesson | undefined {
  const want = normalizeLessonCode(typed);
  if (!want) return undefined;
  const matches = db.lessons.filter((l) => normalizeLessonCode(lessonBotCode(l)) === want);
  return matches.find((l) => l.isPublished !== false) || matches[0];
}

/** Lesson order inside its course, the same order the student sees. */
function courseOrder(db: AppDatabase, courseId: string): Lesson[] {
  return db.lessons
    .filter((l) => l.courseId === courseId && l.isPublished !== false)
    .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
}

export type OpenCheck = { ok: true } | { ok: false; message: string };

/**
 * Same rules as the site: a demo lesson is open to everyone; other lessons need a linked account in the same
 * track, and open one after another (the previous lesson must be completed).
 */
export function checkLessonOpen(db: AppDatabase, user: User | undefined, lesson: Lesson): OpenCheck {
  if (lesson.isPublished === false) return { ok: false, message: 'Bu dars hozircha yopiq. Ustoz ochgach, qayta urinib ko‘ring.' };
  if (lesson.isDemo) return { ok: true };
  if (!user) return { ok: false, message: 'Bu darsni ochish uchun hisobingizni ulang: /ulash KOD' };
  if (user.role === 'owner') return { ok: true };
  const course = db.courses.find((c) => c.id === lesson.courseId);
  const track = course?.track || lesson.track || 'ielts';
  if ((user.track || 'ielts') !== track) return { ok: false, message: 'Bu dars sizning yo‘nalishingizga tegishli emas.' };
  const ordered = courseOrder(db, lesson.courseId);
  const idx = ordered.findIndex((l) => l.id === lesson.id);
  const done = new Set(user.completedLessons || []);
  if (idx <= 0 || done.has(lesson.id) || done.has(ordered[idx - 1].id)) return { ok: true };
  return { ok: false, message: `Bu dars hali ochilmagan. Avval “${esc(ordered[idx - 1].title)}” darsini tugating.` };
}

/** Lessons this student may open right now. */
export function openLessonsFor(db: AppDatabase, user: User | undefined): Lesson[] {
  return db.lessons.filter((l) => checkLessonOpen(db, user, l).ok);
}

/** The lesson's page on the site. The site opens it after sign-in (see the ?lesson= handling in AppContext). */
export function lessonLink(base: string, lesson: Pick<Lesson, 'id'>): string {
  return `${base.replace(/\/$/, '')}/?lesson=${encodeURIComponent(lesson.id)}`;
}

/** A Telegram deep link into the bot: t.me/<bot>?start=<payload>. Payloads use letters, digits, "_" and "-". */
export function startLink(bot: string, payload: string): string {
  const name = bot.replace(/^@/, '').trim();
  return name ? `https://t.me/${name}?start=${encodeURIComponent(payload)}` : '';
}

export function lessonCardText(db: AppDatabase, lesson: Lesson): string {
  const course = db.courses.find((c) => c.id === lesson.courseId);
  return [
    `📘 <b>${esc(lesson.title)}</b>`,
    course ? `Kurs: ${esc(course.title)}` : '',
    lesson.durationMinutes ? `Davomiyligi: ${lesson.durationMinutes} daqiqa` : '',
    `Kod: <code>${esc(lessonBotCode(lesson))}</code>`
  ]
    .filter(Boolean)
    .join('\n');
}

const TRACK_LABEL: Record<string, string> = { ielts: 'IELTS', cefr: 'CEFR', general: 'General English' };

export function profileText(user: User | undefined, tgName: string): string {
  if (!user) return card('👤 Profil', [NEED_LINK, '', `Telegram: @${esc(tgName || '—')}`]);
  const expires = dateUz(user.vipExpiresAt);
  return card(`👤 ${esc(`${user.name} ${user.surname || ''}`.trim())}`, [
    `Yo‘nalish: ${TRACK_LABEL[user.track || 'ielts'] || esc(user.track)}`,
    `Obuna: ${tierLabel(user.vipTier)}${expires ? ` (muddati: ${expires} gacha)` : ''}`,
    `Balans: ${money(user.balance)}`,
    `Tugatilgan darslar: ${(user.completedLessons || []).length} ta`,
    `Seriya: ${user.streakDays || 0} kun · Tanga: ${num(user.coins)}`,
    `Telegram: @${esc(tgName || '—')}`
  ]);
}

/** One lesson line: the code is tap-to-copy in Telegram. */
function lessonLine(l: Lesson): string {
  return `<code>${esc(lessonBotCode(l))}</code> · ${esc(l.title)}`;
}

export function lessonsListText(db: AppDatabase, user: User | undefined): string {
  if (!user) return NEED_LINK;
  const open = openLessonsFor(db, user).slice(0, 25);
  if (open.length === 0) return 'Hozircha ochiq darslar yo‘q. Ustoz yangi dars qo‘shgach, shu yerda paydo bo‘ladi.';
  return ['<b>📚 Ochiq darslar</b>', 'Kodni bosib nusxalang yoki yuboring:', '', ...open.map(lessonLine)].join('\n');
}

/** Search among the lessons this student may open, by title or by code. */
export function searchText(db: AppDatabase, user: User | undefined, query: string): string {
  const q = query.trim();
  if (!q) return 'Qidirish uchun dars nomi yoki kodini yozing.';
  const words = q.toLowerCase();
  const codeQ = normalizeLessonCode(q);
  const hits = openLessonsFor(db, user)
    .filter((l) => l.title.toLowerCase().includes(words) || (codeQ.length > 0 && normalizeLessonCode(lessonBotCode(l)).includes(codeQ)))
    .slice(0, 10);
  if (hits.length === 0) return `“${esc(q)}” bo‘yicha ochiq dars topilmadi. Boshqa so‘z bilan urinib ko‘ring yoki Darslar ro‘yxatini oching.`;
  return [`<b>🔍 “${esc(q)}”</b> bo‘yicha natijalar:`, 'Kodni bosib nusxalang yoki yuboring:', '', ...hits.map(lessonLine)].join('\n');
}

/** Progress per course for the student's track. */
export function progressText(db: AppDatabase, user: User | undefined): string {
  if (!user) return NEED_LINK;
  const track = user.track || 'ielts';
  const done = new Set(user.completedLessons || []);
  const courses = db.courses.filter((c) => c.published !== false && (c.track || 'ielts') === track);
  if (courses.length === 0) return 'Bu yo‘nalishda hali kurs yo‘q.';
  const lines = courses.map((c) => {
    const lessons = courseOrder(db, c.id);
    const finished = lessons.filter((l) => done.has(l.id)).length;
    const percent = lessons.length ? Math.round((finished / lessons.length) * 100) : 0;
    return `<b>${esc(c.title)}</b>\n${bar(percent)} ${finished}/${lessons.length} dars (${percent}%)`;
  });
  return card('📈 Sizning progressingiz', [lines.join('\n\n')]);
}

export function channelText(channel: string): string {
  if (!channel) return 'Kanal hozircha ulanmagan.';
  return card('📢 Kanalimiz', [
    `Obuna bo‘ling: https://t.me/${esc(channel)}`,
    '',
    'Yangi darslar va e’lonlarni birinchi bo‘lib kanalda e’lon qilamiz.',
    'Obuna bo‘lgach “✅ Obunani tekshirish” tugmasini bosing.'
  ]);
}

export function channelMarkup(channel: string) {
  return {
    inline_keyboard: [
      [{ text: '📢 Kanalga o‘tish', url: `https://t.me/${channel}` }],
      [{ text: '✅ Obunani tekshirish', callback_data: 'checksub' }]
    ]
  };
}

export function inviteText(bot: string, chatId: string, referrals: number): string {
  const link = startLink(bot, `ref_${chatId}`);
  if (!link) return 'Taklif havolasi hali tayyor emas. Ustoz bot username ni sozlashi kerak.';
  return card('👥 Do‘stlaringizni taklif qiling', [
    'Havolani do‘stingizga yuboring:',
    `<code>${esc(link)}</code>`,
    '',
    `Siz taklif qilganlar: ${num(referrals)} ta`,
    'Do‘stingiz darsni tugatsa, ikkalangiz ham bonus olasiz.'
  ]);
}

export function statsText(counts: { subscribers: number; linked: number; pendingDeposits: number; openLessons: number }): string {
  return card('📊 Bot statistikasi', [
    `Obunachilar: ${num(counts.subscribers)}`,
    `Hisobi ulangan talabalar: ${num(counts.linked)}`,
    `Kutilayotgan depozitlar: ${num(counts.pendingDeposits)}`,
    `Ochiq darslar (kodli): ${num(counts.openLessons)}`
  ]);
}

export function helpText(teacherTelegram: string): string {
  const contact = teacherTelegram ? `\n\nUstoz bilan bog‘lanish: ${esc(teacherTelegram)}` : '';
  return card('🆘 Yordam', [
    '<b>Asosiy bo‘limlar</b>',
    '📘 O‘qish — darslar, qidirish, progress',
    '🧠 Mashq — test, speaking, AI savol, so‘z',
    '👤 Hisob — profil, balans, depozit, obuna',
    '📢 Kanal va do‘stlar — kanal, taklif havolasi',
    '',
    '<b>Tez buyruqlar</b>',
    '<code>/kod EDU-L01</code> — darsni ochish',
    '<code>/murojaat</code> — ustozga savol yuborish',
    '<code>/ulash KOD</code> — saytdagi hisobni ulash',
    '',
    'Dars kodini darsning sahifasidan nusxalang.',
    'Guruhda: /quiz — savol-javob, /reyting — natijalar.'
  ]) + contact;
}

export const BOT_WELCOME = 'Assalomu alaykum! Edu Level o‘quv botiga xush kelibsiz. Quyidagi menyudan tanlang yoki dars kodini yozing.';

/** The main menu: five groups, so it stays easy to read on a phone. */
export const BOT_MENU = {
  inline_keyboard: [
    [
      { text: '📘 O‘qish', callback_data: 'menu:learn', style: 'primary' },
      { text: '🧠 Mashq', callback_data: 'menu:practice', style: 'success' }
    ],
    [
      { text: '👤 Hisob', callback_data: 'menu:account', style: 'primary' },
      { text: '📢 Kanal va do‘stlar', callback_data: 'menu:community', style: 'success' }
    ],
    [{ text: '✨ Ko‘proq', callback_data: 'menu:extra', style: 'success' }, { text: '🆘 Yordam', callback_data: 'menu:help' }]
  ]
};

/** A 10-cell progress bar for messages: ▰▰▰▱▱▱▱▱▱▱ */
export function bar(percent: number): string {
  const cells = Math.max(0, Math.min(10, Math.round(percent / 10)));
  return '▰'.repeat(cells) + '▱'.repeat(10 - cells);
}

/** The owner's main menu: the student menu plus a button to the control room. */
export const BOT_MENU_OWNER = {
  inline_keyboard: [...BOT_MENU.inline_keyboard, [{ text: '🛠 Ustoz paneli', callback_data: 'cmd:admin', style: 'danger' }]]
};

/** The owner's control room, reached with /admin (only from the owner's Telegram account). */
export const ADMIN_MENU = {
  inline_keyboard: [
    [
      { text: '📊 Statistika', callback_data: 'admin:stats', style: 'primary' },
      { text: '💳 Depozitlar', callback_data: 'admin:deposits', style: 'success' }
    ],
    [
      { text: '🆘 Murojaatlar', callback_data: 'admin:tickets', style: 'primary' },
      { text: '📈 Progress', callback_data: 'admin:progress' }
    ],
    [
      { text: '📣 Hammaga xabar', callback_data: 'admin:broadcast', style: 'danger' },
      { text: '📢 Kanalga e’lon', callback_data: 'admin:channel', style: 'success' }
    ],
    [{ text: '✍️ AI kanal posti', callback_data: 'admin:post', style: 'success' }],
    [
      { text: '🧾 Hisobot', callback_data: 'admin:hisobot', style: 'primary' },
      { text: '🩺 Holat', callback_data: 'admin:holat' }
    ],
    [
      { text: '🎓 Kurslar', callback_data: 'admin:courses', style: 'primary' },
      { text: '👥 Talabalar', callback_data: 'admin:students', style: 'primary' }
    ],
    [
      { text: '📝 Sharhlar', callback_data: 'admin:reviews', style: 'success' },
      { text: '🧠 Testlar', callback_data: 'admin:tests' }
    ],
    [{ text: '⬅️ Asosiy menyu', callback_data: 'menu:main' }]
  ]
};

type Button = { text: string; callback_data: string; style?: 'primary' | 'success' | 'danger' };

/** Each group's buttons. A group opens from the main menu and has a "back" button. */
export const SUBMENUS: Record<string, { title: string; rows: Button[][]; parent?: string }> = {
  learn: {
    title: '📘 O‘qish bo‘limi',
    rows: [
      [{ text: '📚 Darslar', callback_data: 'lessons' }, { text: '🔑 Dars kodi', callback_data: 'enter' }],
      [{ text: '🔍 Qidirish', callback_data: 'search' }, { text: '📈 Progress', callback_data: 'progress' }],
      [{ text: '📅 Kunlik reja', callback_data: 'daily' }, { text: '📝 Vazifa', callback_data: 'homework' }],
      [{ text: '📰 Yangiliklar', callback_data: 'news' }, { text: '👩‍🏫 Ustoz', callback_data: 'teacher' }]
    ]
  },
  practice: {
    title: '🧠 Mashq bo‘limi',
    rows: [
      [{ text: '🧠 Test', callback_data: 'test' }, { text: '🎙 Speaking', callback_data: 'speaking' }],
      [{ text: '🤖 AI savol', callback_data: 'ai' }, { text: '📖 So‘z', callback_data: 'word' }],
      [{ text: '🏆 Reyting', callback_data: 'leaders' }, { text: '❓ Savollar (FAQ)', callback_data: 'faq' }]
    ]
  },
  account: {
    title: '👤 Hisob bo‘limi',
    rows: [
      [{ text: '👤 Profil', callback_data: 'profile' }, { text: '💰 Balans', callback_data: 'balance' }],
      [{ text: '💳 Depozit', callback_data: 'deposit' }, { text: '⭐ VIP tariflar', callback_data: 'vip' }],
      [{ text: '⚙️ Sozlamalar', callback_data: 'menu:settings', style: 'primary' }, { text: '🆘 Murojaat', callback_data: 'support' }]
    ]
  },
  community: {
    title: '📢 Kanal va do‘stlar',
    rows: [
      [{ text: '📢 Kanal', callback_data: 'channel' }, { text: '👥 Taklif', callback_data: 'invite' }],
      [{ text: '✍️ Sharh yozish', callback_data: 'review' }, { text: '🔕 Xabarlarni o‘chirish', callback_data: 'optout' }]
    ]
  },
  extra: {
    title: '✨ Qo‘shimcha funksiyalar',
    rows: [
      [{ text: '📊 Natijalarim', callback_data: 'menu:extra_results', style: 'primary' }, { text: '🧩 Mashq va o‘rganish', callback_data: 'menu:extra_learn', style: 'primary' }],
      [{ text: '🧾 Xizmatlar', callback_data: 'menu:extra_services', style: 'primary' }]
    ]
  },
  extra_results: {
    title: '📊 Mening natijalarim',
    parent: 'extra',
    rows: [
      [{ text: '🔥 Seriya', callback_data: 'cmd:streak', style: 'primary' }, { text: '🪙 Tanga', callback_data: 'cmd:tanga', style: 'primary' }],
      [{ text: '🧾 Natijalarim', callback_data: 'cmd:natijalarim', style: 'primary' }, { text: '📊 Hafta', callback_data: 'cmd:hafta', style: 'primary' }],
      [{ text: '🎯 Maqsad', callback_data: 'cmd:maqsad', style: 'primary' }, { text: '🏆 XP reyting', callback_data: 'cmd:reyting_xp', style: 'primary' }],
      [{ text: '🎖 Sertifikatlar', callback_data: 'cmd:sertifikatlar', style: 'primary' }, { text: '📋 Qolgan', callback_data: 'cmd:qolgan', style: 'primary' }]
    ]
  },
  extra_learn: {
    title: '🧩 Mashq va o‘rganish',
    parent: 'extra',
    rows: [
      [{ text: '🃏 Takror', callback_data: 'cmd:takror', style: 'primary' }, { text: '📖 Kun so‘zi', callback_data: 'cmd:sor_soz', style: 'primary' }],
      [{ text: '💬 Idiom', callback_data: 'cmd:idiom', style: 'primary' }, { text: '📐 Grammatika', callback_data: 'cmd:grammatika', style: 'primary' }],
      [{ text: '🗣 Talaffuz', callback_data: 'cmd:talaffuz', style: 'primary' }, { text: '✨ Motivatsiya', callback_data: 'cmd:motivatsiya', style: 'primary' }],
      [{ text: '🧭 Tavsiya', callback_data: 'cmd:tavsiya', style: 'primary' }, { text: '🧠 Testlar', callback_data: 'cmd:testlar', style: 'primary' }]
    ]
  },
  extra_services: {
    title: '🧾 Xizmatlar',
    parent: 'extra',
    rows: [
      [{ text: '📦 Paketlar', callback_data: 'cmd:paketlar', style: 'primary' }, { text: '📚 Kutubxona', callback_data: 'cmd:kutubxona', style: 'primary' }],
      [{ text: '🎓 Kurslar', callback_data: 'cmd:kurslar', style: 'primary' }, { text: '⏯ Davom etish', callback_data: 'cmd:oxirgi', style: 'primary' }],
      [{ text: '💳 Tarix', callback_data: 'cmd:hisob_tarix', style: 'primary' }, { text: '🔌 Ajratish', callback_data: 'cmd:ajratish', style: 'primary' }],
      [{ text: '⚙️ Sozlamalar', callback_data: 'cmd:sozlamalar', style: 'primary' }]
    ]
  },
  help: {
    title: '🆘 Yordam',
    rows: [
      [{ text: '❔ Yordam', callback_data: 'help' }, { text: '🆘 Murojaat', callback_data: 'support' }],
      [{ text: '❓ Savollar (FAQ)', callback_data: 'faq' }, { text: '👩‍🏫 Ustoz', callback_data: 'teacher' }]
    ]
  }
};

/** Keyboard for one group: its buttons, then the back button. */
export function submenuMarkup(key: string) {
  const group = SUBMENUS[key];
  const back = group?.parent ? `menu:${group.parent}` : 'menu:main';
  return { inline_keyboard: [...(group ? group.rows : []), [{ text: '⬅️ Orqaga', callback_data: back }]] };
}

/** What each button does, as the command it stands for. */
export const CALLBACK_COMMANDS: Record<string, string> = {
  menu: '/start',
  lessons: '/darslar',
  enter: '/kod',
  search: '/qidir',
  progress: '/progress',
  test: '/test',
  speaking: '/speaking',
  ai: '/ai',
  word: '/soz',
  channel: '/kanal',
  checksub: '/obuna',
  'admin:stats': '/admin_stat',
  'admin:deposits': '/admin_depozit',
  'admin:tickets': '/admin_murojaat',
  'admin:progress': '/admin_progress',
  'admin:broadcast': '/admin_xabar',
  'admin:channel': '/admin_kanal',
  invite: '/taklif',
  balance: '/balans',
  deposit: '/depozit',
  profile: '/profil',
  support: '/murojaat',
  help: '/yordam',
  leaders: '/reyting',
  news: '/yangiliklar',
  faq: '/faq',
  vip: '/vip',
  teacher: '/ustoz',
  daily: '/kunlik',
  homework: '/vazifa',
  reminders: '/eslatma',
  review: '/sharh',
  optout: '/obuna_bekor',
  'admin:courses': '/admin_kurs',
  'admin:students': '/admin_talabalar',
  'admin:reviews': '/admin_fikrlar',
  'admin:tests': '/admin_testlar'
};

/** Shown in Telegram's command menu (set with setMyCommands). */
export const BOT_COMMANDS = [
  { command: 'start', description: 'Asosiy menyu' },
  { command: 'darslar', description: 'Ochiq darslar ro‘yxati' },
  { command: 'kod', description: 'Dars kodi: /kod EDU-L01' },
  { command: 'kunlik', description: 'Bugungi reja' },
  { command: 'vazifa', description: 'Keyingi darsning vazifasi' },
  { command: 'qidir', description: 'Dars qidirish' },
  { command: 'progress', description: 'Kurslar bo‘yicha natija' },
  { command: 'test', description: 'Test yechish (5 savol)' },
  { command: 'speaking', description: 'Ovozli speaking baholash' },
  { command: 'ai', description: 'AI ustozdan savol' },
  { command: 'soz', description: 'So‘z: B1/B2/C1 tarjima' },
  { command: 'faq', description: 'Ko‘p so‘raladigan savollar' },
  { command: 'yangiliklar', description: 'So‘nggi yangiliklar' },
  { command: 'vip', description: 'VIP tariflar' },
  { command: 'ustoz', description: 'Ustoz haqida' },
  { command: 'balans', description: 'Hisob balansi' },
  { command: 'depozit', description: 'Depozit uchun chek yuborish' },
  { command: 'profil', description: 'Profil va obuna' },
  { command: 'kanal', description: 'Kanalimiz va obuna' },
  { command: 'taklif', description: 'Do‘stlarni taklif qilish' },
  { command: 'reyting', description: 'Reyting' },
  { command: 'sharh', description: 'Sharh yozish: /sharh 5 fikringiz' },
  { command: 'eslatma', description: 'Kunlik eslatma: on/off' },
  { command: 'murojaat', description: 'Ustozga savol yuborish' },
  { command: 'yordam', description: 'Yordam' },
  { command: 'obuna_bekor', description: 'Ommaviy xabarlarni o‘chirish' },
  { command: 'obuna_qayta', description: 'Ommaviy xabarlarni qayta yoqish' },
  { command: 'streak', description: 'Seriya' },
  { command: 'tanga', description: 'Tanga va daraja' },
  { command: 'natijalarim', description: 'Oxirgi test natijalari' },
  { command: 'testlar', description: 'Nashr etilgan testlar' },
  { command: 'paketlar', description: 'Test paketlari' },
  { command: 'kutubxona', description: 'Raqamli kutubxona' },
  { command: 'kurslar', description: 'Kurslar va progress' },
  { command: 'oxirgi', description: 'Oxirgi ko‘rilgan dars' },
  { command: 'hafta', description: 'Shu haftadagi natijalar' },
  { command: 'maqsad', description: 'Maqsad va kunlik vaqt' },
  { command: 'hisob_tarix', description: 'Depozitlar tarixi' },
  { command: 'ajratish', description: 'Botni hisobdan ajratish' },
  { command: 'sor_soz', description: 'Kunning so‘zi' },
  { command: 'idiom', description: 'Kunning idiomasi' },
  { command: 'grammatika', description: 'Kunning grammatika maslahati' },
  { command: 'talaffuz', description: 'Kunning talaffuz maslahati' },
  { command: 'motivatsiya', description: 'Kunning motivatsiyasi' },
  { command: 'tavsiya', description: 'Keyingi qadam tavsiyasi' },
  { command: 'reyting_xp', description: 'XP bo‘yicha top 10' },
  { command: 'sertifikatlar', description: 'Imtihon natijalari' },
  { command: 'qolgan', description: 'Tugatilmagan darslar' },
  { command: 'sozlamalar', description: 'Bot sozlamalarim' },
  { command: 'ulash', description: 'Saytdagi hisobni botga ulash: /ulash KOD' },
  { command: 'post', description: 'Ustoz: kanal posti (AI)' },
  { command: 'reja', description: 'Ustoz: haftalik kanal rejasi (AI)' },
  { command: 'takror', description: 'Bugungi so‘z takrorlash' },
  { command: 'vazifa_yuborish', description: 'Vazifa yuborish: /vazifa_yuborish matn' },
  { command: 'ochirish', description: 'Bot ma’lumotlarimni o‘chirish' },
  { command: 'admin', description: 'Ustoz boshqaruv paneli (faqat ustoz)' }
];

/** A message that looks like a lesson code, e.g. "EDU-L01", "edu l1", "EDUL01". */
export function looksLikeLessonCode(text: string): boolean {
  return /^[A-Za-z]{2,6}[-\s]?[A-Za-z]?\d{1,4}$/.test(text.trim());
}

/* ---------- design: welcome, settings card, profile card ---------- */


/** A short, personal welcome: name, streak and coins when the account is linked. */
export function welcomeText(user: User | undefined): string {
  if (!user) {
    return [
      '<b>👋 Assalomu alaykum!</b>',
      RULE,
      'Edu Level o‘quv botiga xush kelibsiz.',
      'Bot sizning hisobingiz bilan ishlashi uchun: 👤 Hisob → ⚙️ Sozlamalar → Hisobni ulash.',
      'Hozir ham dars kodini yozishingiz mumkin (masalan EDU-L01).'
    ].join('\n');
  }
  return [
    `<b>👋 Salom, ${esc(user.name)}!</b>`,
    RULE,
    `🔥 Seriya: ${user.streakDays || 0} kun   🪙 Tanga: ${num(user.coins)}`,
    '',
    'Quyidagi menyudan tanlang yoki dars kodini yozing.'
  ].join('\n');
}

/** The settings card: the current state of each switch, and buttons to change it. */
export function settingsText(flags: { optedOut: boolean; remindersOff: boolean }, linked: boolean): string {
  return card('⚙️ Sozlamalar', [
    `👤 Hisob: ${linked ? '✅ ulangan' : '❌ ulanmagan'}`,
    `⏰ Kunlik eslatma: ${flags.remindersOff ? '🔕 o‘chiq' : '🔔 yoqiq'}`,
    `📣 Ommaviy xabarlar: ${flags.optedOut ? '🔕 o‘chiq' : '📨 yoqiq'}`,
    '',
    linked ? 'O‘zgartirish uchun pastdagi tugmalardan foydalaning.' : 'Hisobni ulash: saytda profil → “Telegram bot bilan ulash”, so‘ng /ulash KOD.'
  ]);
}

export function settingsMarkup(flags: { optedOut: boolean; remindersOff: boolean }) {
  return {
    inline_keyboard: [
      [{ text: flags.remindersOff ? '🔔 Eslatmani yoqish' : '🔕 Eslatmani o‘chirish', callback_data: flags.remindersOff ? 'set:reminders:on' : 'set:reminders:off', style: flags.remindersOff ? 'success' : 'danger' }],
      [{ text: flags.optedOut ? '📨 Xabarlarni yoqish' : '🔕 Xabarlarni o‘chirish', callback_data: flags.optedOut ? 'set:broadcast:on' : 'set:broadcast:off', style: flags.optedOut ? 'success' : 'danger' }],
      [{ text: '⬅️ Hisob', callback_data: 'menu:account' }]
    ]
  };
}

/** The profile card with a progress bar for the track. */
export function profileCard(user: User | undefined, tgName: string, db: AppDatabase): string {
  if (!user) return profileText(undefined, tgName);
  const track = user.track || 'ielts';
  const lessons = db.lessons.filter((l) => l.isPublished !== false && (db.courses.find((c) => c.id === l.courseId)?.track || 'ielts') === track);
  const done = new Set(user.completedLessons || []);
  const finished = lessons.filter((l) => done.has(l.id)).length;
  const percent = lessons.length ? Math.round((finished / lessons.length) * 100) : 0;
  const expires = dateUz(user.vipExpiresAt);
  return card(`👤 ${esc(`${user.name} ${user.surname || ''}`.trim())}`, [
    `🎓 Yo‘nalish: ${TRACK_LABEL[track] || esc(track)}`,
    `⭐ Obuna: ${tierLabel(user.vipTier)}${expires ? ` (${expires} gacha)` : ''}`,
    `💰 Balans: ${money(user.balance)}`,
    `🔥 Seriya: ${user.streakDays || 0} kun · 🪙 ${num(user.coins)}`,
    '',
    `📈 Progress: ${bar(percent)} ${percent}%`,
    `✅ Tugatilgan darslar: ${finished}/${lessons.length}`,
    '',
    `Telegram: @${esc(tgName || '—')}`
  ]);
}
