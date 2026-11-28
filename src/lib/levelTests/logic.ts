/**
 * Pure rules for "Levelni aniqlash" tests and tournaments. No I/O: the server route loads rows, calls these,
 * and writes the result back. Keeping the rules here makes grading, timing and blocking testable on their own.
 */

export type GradingRule = { min: number; max: number; level: string; certificate?: boolean };

export interface QuestionRow {
  id: string;
  correct_index: number;
  points: number;
}

/** Score a set of answers (question id -> chosen option index). Unanswered and out-of-range answers score 0. */
export function scoreAnswers(questions: QuestionRow[], answers: Record<string, number>) {
  let score = 0;
  let maxScore = 0;
  for (const q of questions) {
    const pts = Math.max(0, Math.floor(q.points));
    maxScore += pts;
    const chosen = answers[q.id];
    if (typeof chosen === 'number' && Number.isInteger(chosen) && chosen === q.correct_index) score += pts;
  }
  const percent = maxScore === 0 ? 0 : Math.round((score / maxScore) * 10000) / 100;
  return { score, maxScore, percent };
}

/** The owner's grading rules decide the level. Ranges are inclusive on both ends; the first match wins. Unknown or empty rules give no level. */
export function levelForPercent(percent: number, rules: GradingRule[]): { level: string | null; certificate: boolean } {
  if (!Number.isFinite(percent)) return { level: null, certificate: false };
  for (const r of rules) {
    if (!r || typeof r.min !== 'number' || typeof r.max !== 'number' || typeof r.level !== 'string') continue;
    if (percent >= r.min && percent <= r.max) return { level: r.level, certificate: r.certificate === true };
  }
  return { level: null, certificate: false };
}

/** Validates owner-supplied rules before saving: numeric ranges within 0..100, non-empty level names, no overlaps. */
export function validateGradingRules(rules: unknown): { ok: true; rules: GradingRule[] } | { ok: false; error: string } {
  if (!Array.isArray(rules)) return { ok: false, error: 'Baholash qoidalari ro‘yxat bo‘lishi kerak.' };
  const clean: GradingRule[] = [];
  for (const raw of rules) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return { ok: false, error: 'Har bir baholash qoidasi obyekt bo‘lishi kerak.' };
    }
    const r = raw as Partial<GradingRule>;
    if (typeof r.min !== 'number' || typeof r.max !== 'number' || !Number.isFinite(r.min) || !Number.isFinite(r.max)) {
      return { ok: false, error: 'Har bir qoidada min va max raqam bo‘lishi kerak.' };
    }
    if (r.min < 0 || r.max > 100 || r.min > r.max) return { ok: false, error: 'Diapazon 0 dan 100 gacha va min ≤ max bo‘lishi kerak.' };
    if (typeof r.level !== 'string' || !r.level.trim() || r.level.length > 40) return { ok: false, error: 'Daraja nomi bo‘sh bo‘lmasligi kerak.' };
    clean.push({ min: r.min, max: r.max, level: r.level.trim(), certificate: r.certificate === true });
  }
  const sorted = [...clean].sort((a, b) => a.min - b.min);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].min <= sorted[i - 1].max) return { ok: false, error: 'Baholash diapazonlari bir-birini kesmasligi kerak.' };
  }
  return { ok: true, rules: clean };
}

/** Deadline for an attempt: the shorter of the time limit and the test's end time. */
export function attemptDeadline(startedAt: Date, timeLimitSeconds: number, endsAt: Date | null): Date {
  const byLimit = new Date(startedAt.getTime() + timeLimitSeconds * 1000);
  if (endsAt && endsAt.getTime() < byLimit.getTime()) return endsAt;
  return byLimit;
}

export function isExpired(deadline: Date, now: Date): boolean {
  return now.getTime() >= deadline.getTime();
}

/**
 * Violation policy: each time the student leaves fullscreen or switches page, one violation is counted.
 * When violations exceed max_violations the attempt is blocked and needs the owner's unlock code.
 * With max = 2 the 1st and 2nd leave are warnings and the 3rd blocks.
 */
export function registerViolation(current: number, maxViolations: number): { violations: number; warningsLeft: number; blocked: boolean } {
  const violations = current + 1;
  const warningsLeft = Math.max(0, maxViolations - violations);
  return { violations, warningsLeft, blocked: violations > maxViolations };
}

/** Owner unlock codes: 6 digits, compared as hashes only; the plain code is shown to the owner once. */
export function generateUnlockCode(random: () => number = Math.random): string {
  let code = '';
  for (let i = 0; i < 6; i++) code += Math.floor(random() * 10).toString();
  return code;
}

/** Attempts allowed for one student on one test (count of attempts already made). */
export function canStartAttempt(madeAttempts: number, attemptsAllowed: number): boolean {
  return madeAttempts < Math.max(1, attemptsAllowed);
}
