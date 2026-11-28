import { requireContext } from '@/src/lib/db/context';
import { levelForPercent, scoreAnswers, GradingRule } from './logic';

/** Finalises an attempt: scores the answers, applies the owner's grading rules, and issues a certificate when earned. */
export async function finalizeAttempt(attempt: any, status: 'finished' | 'expired') {
  const pool = requireContext().client;
  const assigned = Array.isArray(attempt.question_order) ? attempt.question_order : null;
  // The runner displays the assigned IDs. Later additions belong only to new attempts.
  const qs = await pool.query(
    'select id, correct_index, points from public.level_questions where test_id = $1 and ($2::text[] is null or id = any($2::text[]))',
    [attempt.test_id, assigned]
  );
  const { score, maxScore, percent } = scoreAnswers(qs.rows, attempt.answers ?? {});
  const rules = Array.isArray(attempt.grading_rules) ? (attempt.grading_rules as GradingRule[]) : [];
  const graded = levelForPercent(percent, rules);
  const certificateCode = attempt.certificate_enabled && graded.certificate ? `EL-${crypto.randomUUID().slice(0, 8).toUpperCase()}` : null;
  await pool.query(
    `update public.level_attempts set status = $2, finished_at = now(), score = $3, max_score = $4, percent = $5,
            level_label = $6, certificate_code = $7 where id = $1 and status = 'in_progress'`,
    [attempt.id, status, score, maxScore, percent, graded.level, certificateCode]
  );
  return { score, maxScore, percent, level: graded.level, certificateCode };
}

