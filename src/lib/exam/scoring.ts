/**
 * Server-side exam scoring. Pure functions (no I/O) so they can be unit-tested.
 * Answer keys never leave the server before submission; the review returned after
 * submission is built here.
 */
import { calculateIeltsBand, calculateIeltsListeningBand, calculateMultilevelCefrScore } from '../eduLogic';

export interface ReviewItem {
  id: string;
  given: string | number | null;
  isCorrect: boolean;
  /** Reading: text key. MCQ/Listening: option index. */
  correctAnswer?: string;
  correctAnswerIndex?: number;
  explanation?: string;
  evidenceQuote?: string;
  evidenceParagraphLabel?: string;
  points: number;
}

export interface ScoreResult {
  correctCount: number;
  totalQuestions: number;
  earnedPoints: number;
  totalPoints: number;
  percentage: number;
  /** Final score shown to the student and its maximum */
  score: number;
  maxScore: number;
  /** Only set when a verified conversion table applies to this exact test length */
  band?: number;
  cefrLevel?: string;
  scaleNote: string;
  review: ReviewItem[];
}

const TFNG: Record<string, string> = {
  t: 'true',
  true: 'true',
  f: 'false',
  false: 'false',
  ng: 'not given',
  'not given': 'not given',
  notgiven: 'not given',
  y: 'yes',
  yes: 'yes',
  n: 'no',
  no: 'no'
};

/** Normalizes a free-text answer: case, whitespace, quotes, surrounding punctuation. */
export function normalizeAnswer(value: unknown): string {
  const s = String(value ?? '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[‘’`´]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^["'(\[]+|["')\].,;:!?]+$/g, '')
    .trim();
  return TFNG[s] ?? s;
}

/** Accepted alternatives are separated by "|" or "/" in the stored key (e.g. "colour|color"). */
export function acceptedAnswers(key: unknown): string[] {
  const raw = String(key ?? '');
  if (!raw.trim()) return [];
  return raw
    .split(/\s*[|/]\s*/)
    .map(normalizeAnswer)
    .filter(Boolean);
}

export function isTextAnswerCorrect(given: unknown, key: unknown): boolean {
  const g = normalizeAnswer(given);
  if (!g) return false;
  return acceptedAnswers(key).includes(g);
}

function pct(n: number, d: number) {
  return d > 0 ? Math.round((n / d) * 100) : 0;
}

interface ReadingLikeQuestion {
  id: string;
  correctAnswer: string;
  explanation?: string;
  evidenceQuote?: string;
  evidenceParagraphLabel?: string;
  points?: number;
}

/** Reading (text keys). Official conversions are applied only for the exact test lengths they are defined for. */
export function scoreReading(
  questions: ReadingLikeQuestion[],
  answers: Record<string, unknown>,
  track: string
): ScoreResult {
  const review: ReviewItem[] = questions.map((q) => {
    const given = answers?.[q.id];
    const points = Math.max(1, Number(q.points) || 1);
    return {
      id: q.id,
      given: given === undefined || given === null || given === '' ? null : String(given),
      isCorrect: isTextAnswerCorrect(given, q.correctAnswer),
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      evidenceQuote: q.evidenceQuote,
      evidenceParagraphLabel: q.evidenceParagraphLabel,
      points
    };
  });
  return finalize(review, track, 'reading');
}

interface McqQuestion {
  id: string;
  correctAnswerIndex: number;
  explanation?: string;
  points?: number;
}

/** Multiple-choice tests (mock tests, listening). */
export function scoreMcq(questions: McqQuestion[], answers: Record<string, unknown>, track: string, kind: 'mock' | 'listening'): ScoreResult {
  const review: ReviewItem[] = questions.map((q) => {
    const raw = answers?.[q.id];
    const given = raw === undefined || raw === null || raw === '' ? null : Number(raw);
    const points = Math.max(1, Number(q.points) || 1);
    return {
      id: q.id,
      given: given !== null && Number.isFinite(given) ? given : null,
      isCorrect: given !== null && given === Number(q.correctAnswerIndex),
      correctAnswerIndex: Number(q.correctAnswerIndex),
      explanation: q.explanation,
      points
    };
  });
  return finalize(review, track, kind);
}

function finalize(review: ReviewItem[], track: string, kind: 'reading' | 'mock' | 'listening'): ScoreResult {
  const correctCount = review.filter((r) => r.isCorrect).length;
  const totalQuestions = review.length;
  const totalPoints = review.reduce((a, r) => a + r.points, 0);
  const earnedPoints = review.filter((r) => r.isCorrect).reduce((a, r) => a + r.points, 0);
  const percentage = pct(earnedPoints, totalPoints);

  const base: ScoreResult = {
    correctCount,
    totalQuestions,
    earnedPoints,
    totalPoints,
    percentage,
    score: earnedPoints,
    maxScore: totalPoints,
    scaleNote: 'Ball = to‘g‘ri javoblar soni (amaliyot natijasi, rasmiy baho emas).',
    review
  };

  // IELTS Academic Reading raw→band table is defined for 40 questions only.
  if (kind === 'reading' && track === 'ielts' && totalQuestions === 40) {
    return { ...base, band: calculateIeltsBand(correctCount), scaleNote: 'IELTS Academic Reading 40 savollik jadval bo‘yicha taxminiy band (rasmiy natija emas).' };
  }
  if (kind === 'listening' && track === 'ielts' && totalQuestions === 40) {
    return { ...base, band: calculateIeltsListeningBand(correctCount), scaleNote: 'IELTS Listening 40 savollik jadval bo‘yicha taxminiy band (rasmiy natija emas).' };
  }
  // CEFR Multilevel reading scale used by the platform is defined for 35 questions.
  if (kind === 'reading' && track === 'cefr' && totalQuestions === 35) {
    const c = calculateMultilevelCefrScore(correctCount);
    return {
      ...base,
      score: c.standardizedScore75,
      maxScore: 75,
      cefrLevel: c.cefrLevel,
      scaleNote: 'Platformaning 35 savollik CEFR Multilevel shkalasi bo‘yicha taxminiy natija (rasmiy natija emas).'
    };
  }
  return base;
}

/** Keeps only answers for known question ids, as short strings/numbers. */
export function sanitizeAnswers(answers: unknown, allowedIds: Set<string>): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  if (!answers || typeof answers !== 'object') return out;
  for (const [k, v] of Object.entries(answers as Record<string, unknown>)) {
    if (!allowedIds.has(k)) continue;
    if (typeof v === 'number' && Number.isFinite(v)) out[k] = v;
    else if (typeof v === 'string') out[k] = v.slice(0, 200);
  }
  return out;
}
