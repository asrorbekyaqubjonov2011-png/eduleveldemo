/**
 * Shared look of the Telegram bot: one card style, numbers and dates in Uzbek form, HTML-safe text,
 * the same "not linked" message everywhere, and the back/cancel buttons under every prompt.
 */

export const RULE = '━━━━━━━━━━━━━━━━━━';

/** Escapes text for Telegram's HTML mode (use it for every value that comes from a student or the database). */
export function esc(value: unknown): string {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** 1342 → "1 342". Uzbek writes the thousands with a space. */
export function num(value: unknown): string {
  const n = Math.round(Number(value) || 0);
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/** 50000 → "50 000 so‘m". */
export function money(value: unknown): string {
  return `${num(value)} so‘m`;
}

/** An ISO date → "23.11.2026" in Tashkent time. Empty when the date is missing or invalid. */
export function dateUz(iso: unknown): string {
  if (!iso) return '';
  const d = new Date(String(iso));
  if (Number.isNaN(d.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Tashkent', day: '2-digit', month: '2-digit', year: 'numeric' }).format(d);
  return parts.replace(/\//g, '.');
}

/** The one card style: a bold title, a rule, then the lines (lines must already be escaped). */
export function card(title: string, lines: string[]): string {
  return [`<b>${title}</b>`, RULE, ...lines].join('\n');
}

/** A plain straight apostrophe in Uzbek text becomes the proper ‘ (o‘, g‘, Boshlang‘ich). */
export function uzText(value: string): string {
  return value.replace(/(\p{L})'(\p{L})/gu, '$1‘$2');
}

const RANK_UZ: Record<string, string> = {
  'Novice Learner': 'Yangi boshlovchi',
  'Apprentice Scholar': 'Shogird olim',
  'Rising Linguist': 'Yuksalayotgan tilshunos',
  'Fluent Speaker': 'Ravon so‘zlovchi',
  'Cambridge Polyglot': 'Ko‘p tilli bilimdon',
  'Academic Master': 'Akademik ustoz',
  'Diamond Elite': 'Olmos elita',
  'Grandmaster C2': 'Grossmeyster C2'
};

/** The level title in Uzbek (the site keeps the English names). */
export function rankUz(title: string): string {
  return RANK_UZ[title] || title;
}

/** The subscription name: "gold" → "GOLD", no plan → "bepul". */
export function tierLabel(tier: string | undefined): string {
  return !tier || tier === 'none' ? 'bepul' : tier.toUpperCase();
}

/** The text for a feature that needs a linked account. The same wording is used everywhere. */
export const NEED_LINK = '🔗 Bu bo‘lim uchun avval hisobingizni ulang.\nSaytda profil → “Telegram bot bilan ulash”, so‘ng kodni shu yerga yozing: /ulash KOD';

/** Buttons under a question the bot is waiting on: a press on "Bekor qilish" also cancels the question. */
export const CANCEL_MENU = { inline_keyboard: [[{ text: '❌ Bekor qilish', callback_data: 'menu:main', style: 'danger' }]] };

/** A single "back to menu" button, for answers that have no buttons of their own. */
export const BACK_MENU = { inline_keyboard: [[{ text: '⬅️ Menyu', callback_data: 'menu:main' }]] };

/** Buttons under an AI answer: ask again, or go back. The full menu is not repeated under every answer. */
export const AI_FOLLOWUP = { inline_keyboard: [[{ text: '❓ Yana savol', callback_data: 'cmd:ai', style: 'primary' }, { text: '⬅️ Menyu', callback_data: 'menu:main' }]] };

/** Buttons under a word lookup. */
export const WORD_FOLLOWUP = { inline_keyboard: [[{ text: '📖 Yana so‘z', callback_data: 'cmd:soz', style: 'primary' }, { text: '⬅️ Menyu', callback_data: 'menu:main' }]] };

/** Model output → Telegram HTML: escaped, **bold** becomes bold, "* " and "- " bullets become "•". */
export function aiToHtml(text: string): string {
  return esc(text)
    .replace(/\*\*([^*\n]+)\*\*/g, '<b>$1</b>')
    .replace(/^\s*[*-]\s+/gm, '• ');
}

/** Under an AI channel draft: send it to the channel, write another, or drop it. */
export const POST_MARKUP = { inline_keyboard: [[{ text: '✅ Kanalga yuborish', callback_data: 'post:send', style: 'success' }], [{ text: '🔁 Qayta yozish', callback_data: 'post:again', style: 'primary' }, { text: '❌ Bekor', callback_data: 'post:cancel', style: 'danger' }]] };

/** Under the weekly plan: one button per idea, a fresh list, and the owner panel. */
export const IDEAS_MARKUP = {
  inline_keyboard: [
    [1, 2, 3, 4, 5].map((n) => ({ text: `✍️ ${n}`, callback_data: `post:idea:${n}`, style: 'primary' })),
    [
      { text: '🔁 Yangi g‘oyalar', callback_data: 'post:ideas', style: 'success' },
      { text: '🛠 Ustoz paneli', callback_data: 'cmd:admin', style: 'danger' }
    ]
  ]
};
