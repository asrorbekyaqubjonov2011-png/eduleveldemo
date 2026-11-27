import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';

// Format: scrypt$N$r$p$<salt base64>$<hash base64>
const PREFIX = 'scrypt';
const N = 16384;
const R = 8;
const P = 1;
const KEYLEN = 64;

export function isPasswordHash(value: string | undefined | null): boolean {
  return typeof value === 'string' && value.startsWith(`${PREFIX}$`) && value.split('$').length === 6;
}

export function hashPassword(plain: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(plain, salt, KEYLEN, { N, r: R, p: P, maxmem: 64 * 1024 * 1024 });
  return [PREFIX, N, R, P, salt.toString('base64'), hash.toString('base64')].join('$');
}

/** Constant-time string comparison (for plaintext secrets such as env values). */
export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  if (ab.length !== bb.length) {
    // Compare against itself to keep timing similar, then fail.
    timingSafeEqual(ab, ab);
    return false;
  }
  return timingSafeEqual(ab, bb);
}

/**
 * Verifies a password against a stored value.
 * - Hashed values are verified with scrypt.
 * - Legacy plaintext values are compared in constant time and flagged for rehash.
 */
export function verifyPassword(plain: string, stored: string | undefined | null): { ok: boolean; needsRehash: boolean } {
  if (!stored || !plain) return { ok: false, needsRehash: false };

  if (!isPasswordHash(stored)) {
    return { ok: safeEqual(plain, stored), needsRehash: true };
  }

  const [, n, r, p, saltB64, hashB64] = stored.split('$');
  try {
    const salt = Buffer.from(saltB64, 'base64');
    const expected = Buffer.from(hashB64, 'base64');
    const actual = scryptSync(plain, salt, expected.length, {
      N: Number(n),
      r: Number(r),
      p: Number(p),
      maxmem: 64 * 1024 * 1024
    });
    const ok = actual.length === expected.length && timingSafeEqual(actual, expected);
    return { ok, needsRehash: ok && (Number(n) !== N || Number(r) !== R || Number(p) !== P) };
  } catch {
    return { ok: false, needsRehash: false };
  }
}
