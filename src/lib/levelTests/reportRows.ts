export interface ReportAttempt {
  id: string;
  user_id: string | null;
  first_name: string;
  last_name: string;
  class_name: string;
  status: string;
  percent: string | number | null;
}

const clean = (value: string) => value.normalize('NFC').trim().replace(/\s+/g, ' ');
const nameCase = (value: string) => clean(value).toLocaleLowerCase('uz').replace(/(^|[\s-])\p{L}/gu, (part) => part.toLocaleUpperCase('uz'));
const classCase = (value: string) => {
  const label = clean(value).toLocaleUpperCase('uz');
  return label.replace(/^(\d{1,2})\s*[-–—]?\s*([A-Z])$/, '$1-$2');
};

function rankedScore(row: ReportAttempt): number {
  const score = Number(row.percent);
  return (row.status === 'finished' || row.status === 'expired') &&
    row.percent !== null && Number.isFinite(score) && score >= 0 && score <= 100 ? score : -1;
}

/** Candidates with tied scores preserve the first row in the report order. */
export function placementReportRows<T extends ReportAttempt>(attempts: T[], summary: boolean) {
  const best = new Map<string, T>();
  const counts = new Map<string, number>();
  const identities = new Map<string, Set<string>>();
  const fingerprint = (row: ReportAttempt) =>
    JSON.stringify([nameCase(row.first_name), nameCase(row.last_name), classCase(row.class_name)]);

  for (const row of attempts) {
    if (summary) {
      const key = fingerprint(row);
      const people = identities.get(key) ?? new Set<string>();
      people.add(row.user_id ? 'user:' + row.user_id : 'attempt:' + row.id);
      identities.set(key, people);
    }
    if (!row.user_id) continue;
    counts.set(row.user_id, (counts.get(row.user_id) ?? 0) + 1);
    const current = best.get(row.user_id);
    if (rankedScore(row) >= 0 && (!current || rankedScore(row) > rankedScore(current))) {
      best.set(row.user_id, row);
    }
  }

  return attempts.flatMap((row) => {
    const selected = row.user_id ? best.get(row.user_id) : undefined;
    // Preserve ungraded records for review even if the same account has a scored attempt.
    if (summary && selected && selected.id !== row.id && rankedScore(row) >= 0) return [];
    const review = [];
    if (!row.user_id) review.push('Hisob tasdiqlanmagan');
    if (summary && (identities.get(fingerprint(row))?.size ?? 0) > 1) review.push('Ism va sinf o‘xshash');
    if (rankedScore(row) < 0) review.push('Tasdiqlangan ball yo‘q');
    return [{
      ...row,
      first_name: summary ? nameCase(row.first_name) : row.first_name,
      last_name: summary ? nameCase(row.last_name) : row.last_name,
      class_name: summary ? classCase(row.class_name) : row.class_name,
      student_attempts: row.user_id ? counts.get(row.user_id) ?? 1 : 1,
      review: review.join(' · '),
    }];
  });
}
