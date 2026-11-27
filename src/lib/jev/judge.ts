import { askNoul } from './client';

const norm = (s: string) =>
  s.toLowerCase().replace(/[‘’`ʻʼ]/g, "'").replace(/[^\p{L}\p{N}' ]+/gu, ' ').replace(/\s+/g, ' ').trim();

/** Exact match after normalising, so a correct answer never waits for the model. */
export function exactMatch(given: string, accepted: string[]): boolean {
  const g = norm(given);
  return !!g && accepted.some((a) => norm(a) === g);
}

export interface JudgeOutcome {
  match: boolean;
  /** Where the verdict came from. */
  source: 'exact' | 'jev' | 'unavailable';
  probability?: number;
  ms: number;
  message?: string;
}

/**
 * Is the student's answer a correct meaning of the word? An exact match is accepted at once; otherwise
 * Jev judges it (it tolerates small spelling mistakes and suffixes). A match needs probability 0.6 or more.
 */
export async function judgeMeaning(input: { word: string; accepted: string[]; given: string }): Promise<JudgeOutcome> {
  const t0 = Date.now();
  const given = input.given.trim().slice(0, 120);
  if (!given) return { match: false, source: 'exact', ms: 0 };
  if (exactMatch(given, input.accepted)) return { match: true, source: 'exact', ms: Date.now() - t0 };
  const r = await askNoul({
    state: `English word: ${input.word}\nCorrect meanings (any one is right): ${input.accepted.join('; ')}\nStudent's answer: ${given}`,
    instructions: 'Does the student\'s answer express the same meaning as one of the correct meanings? Small spelling mistakes and grammatical endings are acceptable.',
    yes: 'The answer means the same as a correct meaning.',
    no: 'The answer has a different meaning, or is unrelated.',
    timeoutMs: 6000
  });
  if (!r.ok) return { match: false, source: 'unavailable', ms: Date.now() - t0, message: r.message };
  return { match: r.probability >= 0.6, source: 'jev', probability: r.probability, ms: Date.now() - t0 };
}
