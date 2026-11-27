/**
 * Parses questions from plain text (TXT, or the text of a Word file). Format the owner writes:
 *
 *   1. Savol matni
 *   A) birinchi variant
 *   B) to‘g‘ri javob *
 *   C) uchinchi variant
 *
 *   2. Keyingi savol
 *   ...
 *
 * A "*" at the end of an option (or a "✓" / "+" at its start) marks the correct answer. Options are A-H, in order.
 * Questions without a marked answer, or with fewer than two options, are reported and skipped, never guessed.
 */

export interface ParsedQuestion {
  prompt: string;
  options: string[];
  correctIndex: number;
  line: number;
}

export interface ParseResult {
  questions: ParsedQuestion[];
  errors: { line: number; message: string }[];
}

const Q_START = /^\s*(\d{1,3})[.)]\s+(.+)$/;
const OPT = /^\s*([A-Ha-h])[.)]\s+(.+)$/;
const MARK_END = /\s*\*\s*$/;
const MARK_START = /^\s*(✓|\+)\s*/;

export function parseQuestionText(text: string): ParseResult {
  const lines = String(text || '').replace(/\r\n?/g, '\n').split('\n');
  const questions: ParsedQuestion[] = [];
  const errors: { line: number; message: string }[] = [];
  let cur: { prompt: string; options: string[]; correct: number[]; line: number } | null = null;

  const flush = () => {
    if (!cur) return;
    if (cur.options.length < 2) {
      errors.push({ line: cur.line, message: 'Savolda kamida 2 ta variant bo‘lishi kerak.' });
    } else if (cur.correct.length !== 1) {
      errors.push({ line: cur.line, message: cur.correct.length === 0 ? 'To‘g‘ri javob belgilanmagan (variant oxiriga * qo‘ying).' : 'Bir nechta to‘g‘ri javob belgilangan.' });
    } else {
      questions.push({ prompt: cur.prompt, options: cur.options, correctIndex: cur.correct[0], line: cur.line });
    }
    cur = null;
  };

  lines.forEach((raw, i) => {
    const lineNo = i + 1;
    const line = raw.trimEnd();
    if (!line.trim()) return;
    const q = line.match(Q_START);
    const o = line.match(OPT);
    if (q && !(cur && o)) {
      flush();
      cur = { prompt: q[2].trim().slice(0, 1000), options: [], correct: [], line: lineNo };
      return;
    }
    if (o && cur) {
      let text = o[2].trim();
      let isCorrect = false;
      if (MARK_END.test(text)) {
        isCorrect = true;
        text = text.replace(MARK_END, '').trim();
      }
      if (MARK_START.test(text)) {
        isCorrect = true;
        text = text.replace(MARK_START, '').trim();
      }
      if (!text) {
        errors.push({ line: lineNo, message: 'Variant matni bo‘sh.' });
        return;
      }
      cur.options.push(text.slice(0, 300));
      if (isCorrect) cur.correct.push(cur.options.length - 1);
      return;
    }
    if (cur) {
      // Continuation of the question text (multi-line prompt) before any options.
      if (cur.options.length === 0) cur.prompt = `${cur.prompt} ${line.trim()}`.slice(0, 1000);
      else errors.push({ line: lineNo, message: 'Tushunarsiz qator, u e’tiborga olinmadi.' });
    } else {
      errors.push({ line: lineNo, message: 'Savol raqami bilan boshlanmagan qator.' });
    }
  });
  flush();
  return { questions, errors };
}
