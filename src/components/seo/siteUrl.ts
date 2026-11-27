/**
 * Single source of truth for the public site origin.
 * Canonical production host is https://edulevel.uz; NEXT_PUBLIC_SITE_URL overrides it.
 * Invalid values fall back to the canonical host so canonicals never point at junk.
 */
const CANONICAL = 'https://edulevel.uz';

export function getSiteUrl(): string {
  const raw = (process.env.NEXT_PUBLIC_SITE_URL || '').trim().replace(/\/+$/, '');
  try {
    const u = new URL(raw);
    if (u.protocol !== 'https:' && u.hostname !== 'localhost') return CANONICAL;
    return u.origin;
  } catch {
    return CANONICAL;
  }
}

/** Preview and non-canonical deployments must not be indexed. */
export function isIndexableDeployment(): boolean {
  return getSiteUrl() === CANONICAL || process.env.ALLOW_INDEX === '1';
}
