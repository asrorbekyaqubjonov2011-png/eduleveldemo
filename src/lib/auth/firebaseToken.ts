import { createPublicKey, verify as cryptoVerify } from 'crypto';

// Verifies a Firebase Auth ID token (RS256) without extra dependencies.
const CERTS_URL = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';

let certCache: { certs: Record<string, string>; expiresAt: number } | null = null;

let pendingCerts: Promise<Record<string, string>> | null = null;

function getCerts(): Promise<Record<string, string>> {
  if (certCache && certCache.expiresAt > Date.now()) return Promise.resolve(certCache.certs);
  pendingCerts ??= (async () => {
    const res = await fetch(CERTS_URL, { signal: AbortSignal.timeout(3500) });
    if (!res.ok) throw new Error('Google sertifikatlarini yuklab bo‘lmadi');
    const certs = (await res.json()) as Record<string, string>;
    const cacheControl = res.headers.get('cache-control') || '';
    const maxAge = Number(cacheControl.match(/max-age=(\d+)/)?.[1] || 3600);
    certCache = { certs, expiresAt: Date.now() + maxAge * 1000 };
    return certs;
  })().finally(() => { pendingCerts = null; });
  return pendingCerts;
}

function b64urlJson(part: string): any {
  return JSON.parse(Buffer.from(part, 'base64url').toString('utf8'));
}

export interface VerifiedFirebaseUser {
  uid: string;
  email: string;
  emailVerified: boolean;
  name?: string;
  picture?: string;
}

export async function verifyFirebaseIdToken(idToken: string): Promise<VerifiedFirebaseUser> {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || '';
  if (!projectId) throw new Error('Firebase sozlanmagan');
  if (!idToken || typeof idToken !== 'string') throw new Error('Token topilmadi');

  const parts = idToken.split('.');
  if (parts.length !== 3) throw new Error('Token formati noto‘g‘ri');
  const [h, p, s] = parts;
  const header = b64urlJson(h);
  const payload = b64urlJson(p);

  if (header.alg !== 'RS256' || !header.kid) throw new Error('Token algoritmi noto‘g‘ri');
  const now = Math.floor(Date.now() / 1000);
  if (payload.aud !== projectId) throw new Error('Token auditoriyasi noto‘g‘ri');
  if (payload.iss !== `https://securetoken.google.com/${projectId}`) throw new Error('Token manbasi noto‘g‘ri');
  if (typeof payload.exp !== 'number' || payload.exp <= now) throw new Error('Token muddati tugagan');
  if (typeof payload.iat !== 'number' || payload.iat > now + 60) throw new Error('Token vaqti noto‘g‘ri');
  if (typeof payload.sub !== 'string' || !payload.sub || payload.sub.length > 128) throw new Error('Token foydalanuvchisi yo‘q');
  if (typeof payload.email !== 'string' || !payload.email) throw new Error('Google e-mail manzili topilmadi');

  const certs = await getCerts();
  const pem = certs[header.kid];
  if (!pem) throw new Error('Token kaliti topilmadi');

  const ok = cryptoVerify('RSA-SHA256', Buffer.from(`${h}.${p}`), createPublicKey(pem), Buffer.from(s, 'base64url'));
  if (!ok) throw new Error('Token imzosi noto‘g‘ri');

  return {
    uid: payload.sub,
    email: String(payload.email).toLowerCase(),
    emailVerified: !!payload.email_verified,
    name: payload.name,
    picture: payload.picture
  };
}
