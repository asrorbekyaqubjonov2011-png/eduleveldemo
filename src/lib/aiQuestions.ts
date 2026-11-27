import { executeUniversalAi } from './universalAi';

/**
 * Helpers for AI-written questions.
 *
 * - balanceAllChoices: the model tends to put the right answer in the same place (always B).
 *   Each multiple-choice item gets a random correct position. Items whose options are letter
 *   references (A–D pointing at texts) or True/False/Not given sets keep their order, because
 *   shuffling would change their meaning.
 * - extractDocumentText: reads the text of an uploaded .docx, .txt or .md file.
 * - generateQuizFromText: writes multiple-choice questions from a source text.
 */

const LETTER_OPTION = /^[A-H]$|^[1-8]$/i;
const FIXED_OPTION = /^(true|false|not given|no information|yes|no|ha|yo‘q|yoq)$/i;
const ALL_OF_THE_ABOVE = /hammasi|barchasi|all of the above|none of the above|hech biri|both of/i;

/** Returns the item with its options shuffled so the correct one lands on a random position. */
export function balanceChoice<T>(item: T, random: () => number = Math.random): T {
  const q = item as any;
  const opts: unknown[] = q?.options;
  // Two schemas are in use: correctAnswerIndex (tests) and correctIndex (student practice).
  const key = typeof q?.correctAnswerIndex === 'number' ? 'correctAnswerIndex' : typeof q?.correctIndex === 'number' ? 'correctIndex' : null;
  const idx: unknown = key ? q[key] : undefined;
  if (!key || !Array.isArray(opts) || opts.length < 2 || typeof idx !== 'number' || idx < 0 || idx >= opts.length) return item;
  const texts = opts.map((o) => (typeof o === 'string' ? o.trim() : ''));
  if (texts.every((t) => LETTER_OPTION.test(t))) return item;
  if (texts.some((t) => FIXED_OPTION.test(t) || ALL_OF_THE_ABOVE.test(t))) return item;

  const correct = opts[idx];
  const others = opts.filter((_, i) => i !== idx);
  for (let i = others.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [others[i], others[j]] = [others[j], others[i]];
  }
  const target = Math.floor(random() * opts.length);
  const options = [...others.slice(0, target), correct, ...others.slice(target)];
  return { ...q, options, [key]: target } as T;
}

/** Applies balanceChoice to every multiple-choice item found anywhere in an AI result. */
export function balanceAllChoices<T>(node: T, random: () => number = Math.random): T {
  if (Array.isArray(node)) return node.map((n) => balanceAllChoices(n, random)) as unknown as T;
  if (node && typeof node === 'object') {
    const obj = node as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) out[k] = balanceAllChoices(v, random);
    return balanceChoice(out, random) as T;
  }
  return node;
}

/** Extracts plain text from an uploaded document. Word (.docx), text and Markdown are supported. */
export async function extractDocumentText(buffer: Buffer, filename: string): Promise<string> {
  const name = (filename || '').toLowerCase();
  if (name.endsWith('.docx')) {
    const mammoth = await import('mammoth');
    const result = await mammoth.extractRawText({ buffer });
    return result.value || '';
  }
  if (name.endsWith('.txt') || name.endsWith('.md')) return buffer.toString('utf8');
  if (name.endsWith('.pdf')) {
    throw new Error('PDF hozircha qo‘llanmaydi: matnni nusxalab kiriting yoki .docx / .txt fayl yuklang.');
  }
  throw new Error('Faqat .docx, .txt yoki .md fayl, yoki matn qabul qilinadi.');
}

export interface RejectedQuestion {
  prompt: string;
  reason: string;
}

const norm = (t: string) => t.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
const words = (t: string) => new Set(norm(t).split(' ').filter((w) => w.length > 2));
/** Share of words two texts have in common (0..1). */
export function similarity(a: string, b: string): number {
  const wa = words(a);
  const wb = words(b);
  if (!wa.size || !wb.size) return 0;
  let common = 0;
  wa.forEach((w) => wb.has(w) && common++);
  return common / Math.min(wa.size, wb.size);
}

/**
 * Quality gate for AI-written multiple-choice questions. Drops, with a reason the owner can read:
 * a prompt that is too short, fewer than 3 or more than 6 options, an empty option, two identical options,
 * an out-of-range correct index, and a question that repeats an earlier one (same words, 85% or more).
 * It cannot prove the keyed answer is right: that stays a human check before publishing.
 */
export function validateGeneratedQuestions(input: GeneratedQuestion[]): { valid: GeneratedQuestion[]; rejected: RejectedQuestion[] } {
  const valid: GeneratedQuestion[] = [];
  const rejected: RejectedQuestion[] = [];
  for (const q of input) {
    const reject = (reason: string) => rejected.push({ prompt: q.prompt.slice(0, 80), reason });
    if (norm(q.prompt).length < 8) { reject('Savol matni juda qisqa'); continue; }
    if (q.options.length < 3 || q.options.length > 6) { reject(`Variantlar soni noto‘g‘ri (${q.options.length})`); continue; }
    if (q.options.some((o) => !norm(o))) { reject('Bo‘sh variant bor'); continue; }
    const normalized = q.options.map(norm);
    if (new Set(normalized).size !== normalized.length) { reject('Bir xil variantlar bor'); continue; }
    if (!Number.isInteger(q.correctAnswerIndex) || q.correctAnswerIndex < 0 || q.correctAnswerIndex >= q.options.length) { reject('To‘g‘ri javob ko‘rsatkichi noto‘g‘ri'); continue; }
    if (valid.some((v) => similarity(v.prompt, q.prompt) >= 0.85)) { reject('Oldingi savolning takrori'); continue; }
    valid.push(q);
  }
  return { valid, rejected };
}

export interface GeneratedQuestion {
  prompt: string;
  options: string[];
  correctAnswerIndex: number;
  explanation?: string;
}

/** Writes multiple-choice questions from a source text. The result is checked and balanced. */
export async function generateQuizFromText(params: { text: string; count: number; title?: string; apiKey?: string }): Promise<{ title: string; questions: GeneratedQuestion[]; rejected: RejectedQuestion[] }> {
  const count = Math.min(Math.max(Math.round(params.count) || 10, 3), 40);
  const source = params.text.trim().slice(0, 24000);
  const systemInstruction = `You write English assessment questions from a source text.
Write exactly ${count} multiple-choice questions that can be answered from the text only.
Rules:
- Every question has exactly 4 options. Exactly one option is correct; the other three are plausible but wrong.
- Spread the correct answer over all four positions. Pick a different correctAnswerIndex (0, 1, 2 or 3) for each question as your own choice.
- Cover different parts of the text. No question may give away another question's answer.
- Keep the language of the source text. Explanations are one short sentence.
Output strictly JSON:
{"title": "short test title", "questions": [{"prompt": "...", "options": ["...", "...", "...", "..."], "correctAnswerIndex": 0, "explanation": "..."}]}`;

  const raw = await executeUniversalAi({
    task: 'test_generation',
    apiKey: params.apiKey,
    systemInstruction,
    prompt: `Source text:\n"""\n${source}\n"""`,
    temperature: 0.5,
    jsonMode: true
  });
  const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const parsed = JSON.parse(cleaned);
  const questions: GeneratedQuestion[] = (Array.isArray(parsed?.questions) ? parsed.questions : [])
    .filter((q: any) => q && typeof q.prompt === 'string' && Array.isArray(q.options) && q.options.length >= 2 && typeof q.correctAnswerIndex === 'number')
    .map((q: any) => ({
      prompt: String(q.prompt).slice(0, 600),
      options: q.options.map((o: unknown) => String(o).slice(0, 250)),
      correctAnswerIndex: Math.min(Math.max(0, Math.floor(q.correctAnswerIndex)), q.options.length - 1),
      explanation: typeof q.explanation === 'string' ? q.explanation.slice(0, 600) : undefined
    }));
  const checked = validateGeneratedQuestions(questions);
  if (checked.valid.length === 0) throw new Error('AI savollar yarata olmadi yoki sifat tekshiruvidan o‘tmadi. Matnni tekshirib, qayta urinib ko‘ring.');
  const balanced = balanceAllChoices(checked.valid);
  return { title: (params.title || parsed?.title || 'Test').toString().slice(0, 160), questions: balanced, rejected: checked.rejected };
}
