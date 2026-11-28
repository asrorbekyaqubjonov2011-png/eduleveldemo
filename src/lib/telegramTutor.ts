import { executeUniversalAi } from './universalAi';
import { rateLimit } from './auth/rateLimit';

/**
 * Free-text questions in the Telegram bot's private chat. The bot answers with the same AI that Edubek uses, in
 * plain text (no HTML parsing), short, in the language of the question. Limits protect the AI budget.
 */
const SYSTEM = [
  'Siz Edu Level ingliz tili platformasining Telegram botidagi yordamchi o‘qituvchisiz.',
  'Savolga qisqa, aniq va foydali javob bering. Savol o‘zbek tilida bo‘lsa o‘zbekcha, ingliz tilida bo‘lsa inglizcha javob bering.',
  'Grammatika yoki so‘z so‘ralsa, misol ko‘rsating. Tibbiy, huquqiy yoki moliyaviy maslahat bermang.',
  'Javobni 1200 belgidan oshirmang. HTML yoki Markdown belgilarini ishlatmang, oddiy matn yozing.',
  'Qat’iy cheklov: faqat ingliz tili, o‘rganish, IELTS/CEFR va Edu Level bilan bog‘liq savollarga javob bering. Tarix, siyosat, sport, tibbiyot, huquq, moliya, dasturlash va boshqa mavzularda javob bermang: muloyim rad eting va ingliz tilidagi mavzuga qaytaring.'
].join('\n');

export const TUTOR_REPLY_MAX = 3500;
const DEADLINE_MS = 20_000;
export const TUTOR_LIMIT_PER_HOUR = 30;

export type TutorReply = { ok: true; text: string } | { ok: false; reason: 'limit' | 'empty' | 'error' };

/** Returns the AI answer, or a reason the bot should show the menu instead. Never throws. */
export async function answerTelegramQuestion(chatId: string, question: string): Promise<TutorReply> {
  const lim = rateLimit(`tg-tutor:${chatId}`, TUTOR_LIMIT_PER_HOUR, 60 * 60 * 1000);
  if (!lim.allowed) return { ok: false, reason: 'limit' };
  const q = question.trim().slice(0, 1000);
  if (!q) return { ok: false, reason: 'empty' };
  const signal = AbortSignal.timeout(DEADLINE_MS);
  try {
    const text = await executeUniversalAi({ task: 'quick_qa', systemInstruction: SYSTEM, prompt: q, temperature: 0.4, maxOutputTokens: 450, signal });
    const clean = String(text || '').replace(/[*_`#]/g, '').trim();
    if (!clean) return { ok: false, reason: 'empty' };
    return { ok: true, text: clean.slice(0, TUTOR_REPLY_MAX) };
  } catch {
    return { ok: false, reason: 'error' };
  }
}
