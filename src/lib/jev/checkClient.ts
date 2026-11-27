import { api } from '../../services/api';
import { exactMatch } from './judge';

export interface TypedVerdict {
  match: boolean;
  /** exact: the words matched directly; jev: the model judged it; local: the model was unavailable, so exact matching decided. */
  source: 'exact' | 'jev' | 'local';
  probability?: number | null;
}

/** Checks a typed answer: exact match first, then Jev, and a plain local comparison when Jev is down. */
export async function checkTyped(word: string, accepted: string[], given: string): Promise<TypedVerdict> {
  const g = given.trim();
  if (!g) return { match: false, source: 'exact' };
  if (exactMatch(g, accepted)) return { match: true, source: 'exact' };
  try {
    const r = await api.judgeAnswer(word, accepted, g);
    if (r.success && typeof r.match === 'boolean') return { match: r.match, source: 'jev', probability: r.probability ?? null };
  } catch {
    /* network: fall through to the local decision */
  }
  return { match: false, source: 'local' };
}
