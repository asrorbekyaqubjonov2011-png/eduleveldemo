import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import { verifyFirebaseIdToken } from './firebaseToken';

test('Firebase verification reuses one certificate request for parallel logins and caches the result', async () => {
  const priorProject = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const originalFetch = globalThis.fetch;
  const project = 'edulevel-local-fixture';
  const kid = 'fixture-signing-key';
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const idToken = (audience = project) => {
    const data = encode({ alg: 'RS256', kid }) + '.' + encode({
      aud: audience, iss: 'https://securetoken.google.com/' + project, exp: now + 300,
      iat: now, sub: 'fixture-student', email: 'student@test.local', email_verified: true,
    });
    return data + '.' + sign('RSA-SHA256', Buffer.from(data), privateKey).toString('base64url');
  };
  let reads = 0;
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = project;
  globalThis.fetch = (async (_url, options) => {
    reads++;
    assert.ok(options?.signal instanceof AbortSignal);
    await Promise.resolve();
    return Response.json({ [kid]: publicKey.export({ type: 'spki', format: 'pem' }) }, {
      headers: { 'Cache-Control': 'public, max-age=60' },
    });
  }) as typeof fetch;
  try {
    await assert.rejects(() => verifyFirebaseIdToken(idToken('another-project')), /auditoriyasi/);
    assert.equal(reads, 0);
    const results = await Promise.all([verifyFirebaseIdToken(idToken()), verifyFirebaseIdToken(idToken())]);
    assert.equal(reads, 1);
    assert.ok(results.every(result => result.uid === 'fixture-student' && result.emailVerified));
    assert.equal((await verifyFirebaseIdToken(idToken())).email, 'student@test.local');
    assert.equal(reads, 1);
  } finally {
    globalThis.fetch = originalFetch;
    if (priorProject === undefined) delete process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    else process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = priorProject;
  }
});
