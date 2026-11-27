/**
 * Server-side grading for thematic quiz packs. Pure (no I/O) so it can be unit-tested.
 * The answer key (correctAnswerIndex, explanation) never leaves the server before submission.
 */

export interface ThematicQuestionInput {
  id: string;
  options: string[];
  correctAnswerIndex: number;
  explanation?: string;
  points?: number;
}

export interface ThematicReviewItem {
  questionId: string;
  given: number | null;
  correct: boolean;
  expected: number;
  explanation: string;
  points: number;
}

export interface ThematicGradeResult {
  correctCount: number;
  totalQuestions: number;
  score: number;
  maxScore: number;
  percentage: number;
  review: ThematicReviewItem[];
}

const DEFAULT_POINTS = 20;

/** A given answer is valid only when it is an integer index into the options. */
function validIndex(raw: unknown, optionCount: number): number | null {
  if (typeof raw !== 'number' || !Number.isInteger(raw)) return null;
  return raw >= 0 && raw < optionCount ? raw : null;
}

export function gradeThematicPack(questions: ThematicQuestionInput[], answers: Record<string, unknown>): ThematicGradeResult {
  const given: Record<string, unknown> = answers && typeof answers === 'object' ? answers : {};
  const review: ThematicReviewItem[] = questions.map((q) => {
    const value = validIndex(given[q.id], (q.options || []).length);
    const points = Math.max(1, Number(q.points) || DEFAULT_POINTS);
    return {
      questionId: q.id,
      given: value,
      correct: value !== null && value === Number(q.correctAnswerIndex),
      expected: Number(q.correctAnswerIndex),
      explanation: q.explanation || '',
      points
    };
  });
  const correctCount = review.filter((r) => r.correct).length;
  const maxScore = review.reduce((a, r) => a + r.points, 0);
  const score = review.filter((r) => r.correct).reduce((a, r) => a + r.points, 0);
  return {
    correctCount,
    totalQuestions: review.length,
    score,
    maxScore,
    percentage: maxScore > 0 ? Math.round((score / maxScore) * 100) : 0,
    review
  };
}

/** Questions as a student may see them before submitting: no key, no explanation. */
export function publicThematicQuestions<T extends ThematicQuestionInput>(questions: T[]) {
  return (questions || []).map((q) => {
    const { correctAnswerIndex, explanation, ...rest } = q;
    void correctAnswerIndex;
    void explanation;
    return rest;
  });
}
