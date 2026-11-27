#!/usr/bin/env node
// End-to-end auth/authorization checks against a running instance.
// Run it against a COPY of the data (never production):
//   BASE_URL=http://localhost:3100 OWNER_USER=... OWNER_SECRET=... STUDENT_LOGIN=... STUDENT_PASSWORD=... node scripts/security-test.mjs
const BASE = process.env.BASE_URL || 'http://localhost:3000';
const OWNER_SECRET = process.env.OWNER_SECRET;
const OWNER_USER = process.env.OWNER_USER || 'jasurbek';
const STUDENT_LOGIN = process.env.STUDENT_LOGIN;
const STUDENT_PASSWORD = process.env.STUDENT_PASSWORD;
const OTHER_STUDENT_ID = process.env.OTHER_STUDENT_ID || 'student-demo-2';

let failures = 0;
let passes = 0;
const check = (name, cond, extra = '') => {
  if (cond) passes++;
  else failures++;
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? `  (${extra})` : ''}`);
};

async function call(method, p, { body, cookie, headers = {} } = {}) {
  const res = await fetch(`${BASE}/api/${p}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers, ...(cookie ? { Cookie: cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined
  });
  let json = null;
  try {
    json = await res.json();
  } catch {}
  return { status: res.status, json, setCookie: res.headers.get('set-cookie') || '' };
}

const cookieFrom = (setCookie) => (setCookie.match(/el_session=[^;]+/) || [])[0] || '';

// Owner-only write endpoints (method, path, body)
const OWNER_ROUTES = [
  ['POST', 'courses', { title: 'x' }],
  ['POST', 'lessons', { title: 'x' }],
  ['POST', 'tests', { title: 'x' }],
  ['POST', 'questions', { prompt: 'x' }],
  ['POST', 'reading-tests', { title: 'x' }],
  ['POST', 'books', { title: 'x' }],
  ['POST', 'student-results', { studentName: 'x' }],
  ['POST', 'owner/teacher-profile', {}],
  ['POST', 'owner/site-theme', {}],
  ['POST', 'owner/livestream', { isLive: false }],
  ['POST', 'owner/leaderboard', { leaderboard: [] }],
  ['POST', 'owner/olympiad', {}],
  ['POST', 'owner/bot-settings', {}],
  ['POST', 'owner/students/update', { id: OTHER_STUDENT_ID, balance: 999999 }],
  ['POST', 'owner/deposits/approve/nonexistent', {}],
  ['POST', 'owner/deposits/reject/nonexistent', {}],
  ['POST', 'owner/ai-key', { apiKey: 'x' }],
  ['POST', 'owner/ai-key/reset', {}],
  ['POST', 'owner/creators', { creators: [] }],
  ['POST', 'users/update-vip', { userId: OTHER_STUDENT_ID, vipTier: 'premium' }],
  ['POST', 'users/toggle-block', { userId: OTHER_STUDENT_ID }],
  ['POST', 'support-tickets/reply', { ticketId: 'x', replyText: 'x' }],
  ['POST', 'auth/owner-change-password', { oldPassword: 'x', newPassword: 'yyyyyyyy' }],
  ['POST', 'ai/paste-to-mock', { rawText: 'x' }],
  ['POST', 'ai/generate-test', {}],
  ['POST', 'ai/generate', { prompt: 'x' }],
  ['PUT', 'site-sections', []],
  ['PUT', 'vip-plans', []],
  ['PUT', 'courses/nonexistent', {}],
  ['PUT', 'lessons/nonexistent', {}],
  ['PUT', 'tests/nonexistent', {}],
  ['PUT', 'student-results/nonexistent', {}],
  ['DELETE', 'courses/nonexistent'],
  ['DELETE', 'lessons/nonexistent'],
  ['DELETE', 'tests/nonexistent'],
  ['DELETE', 'questions/nonexistent'],
  ['DELETE', 'student-results/nonexistent'],
  ['DELETE', 'owner/students/nonexistent'],
  ['DELETE', 'books/nonexistent'],
  ['POST', 'owner/reviews', { action: 'status', id: 'x', status: 'approved' }],
  ['POST', 'owner/faqs', { faqs: [] }],
  ['POST', 'owner/shop-items', { items: [] }]
];
const SIGNED_IN_ROUTES = [
  ['POST', 'lessons/toggle-complete', { userId: 'x', lessonId: 'x' }],
  ['POST', 'chat/global', { message: 'hi' }],
  ['POST', 'student/profile', { id: 'x' }],
  ['POST', 'deposits/request', { amount: 1000 }],
  ['POST', 'upload', { imageBase64: 'x' }],
  ['POST', 'ai/translate-3level', { query: 'x' }],
  ['POST', 'flashcards', { englishWord: 'x' }],
  ['PUT', 'flashcards/nonexistent', { grade: 3 }],
  ['DELETE', 'flashcards/nonexistent'],
  ['PUT', 'student/ai-threads', { threads: [] }],
  ['POST', 'student/economy', { action: 'daily_quest' }]
];

(async () => {
  console.log(`Target: ${BASE}\n`);

  // --- Anonymous ---
  for (const [m, p, b] of [...OWNER_ROUTES, ...SIGNED_IN_ROUTES]) {
    const r = await call(m, p, { body: b });
    check(`anonymous ${m} /${p} -> 401`, r.status === 401, `got ${r.status}`);
  }

  // Public DB view must not leak secrets
  const pub = await call('GET', 'db/all');
  const pubText = JSON.stringify(pub.json);
  check('db/all hides ownerPasswordHash', !pubText.includes('ownerPasswordHash'));
  check('db/all hides password fields', !/"password"\s*:/.test(pubText));
  check('db/all hides other users phone/email', !(pub.json?.data?.users || []).some((u) => u.phone || u.email));
  check('db/all hides deposits for anonymous', (pub.json?.data?.depositTransactions || []).length === 0);
  check('db/all hides audit logs for anonymous', (pub.json?.data?.auditLogs || []).length === 0);

  // Generic / previously hardcoded backdoor codes must not work.
  // Extra legacy values can be supplied via LEGACY_CODES="a,b,c" (never commit real ones).
  const legacy = (process.env.LEGACY_CODES || '').split(',').map((s) => s.trim()).filter(Boolean);
  for (const code of ['admin', 'creator', 'owner', 'password', '12345678', ...legacy]) {
    if (code === OWNER_SECRET) continue;
    const r = await call('POST', 'auth/login', { body: { loginInput: code, password: '' } });
    check(`legacy code "${code}" rejected`, !(r.json?.success && r.json?.role === 'owner'), `status ${r.status}`);
  }

  // Forged Google login without a valid token must fail
  const g = await call('POST', 'auth/google', { body: { email: 'victim@example.com', name: 'x' } });
  check('google login without verified token rejected', !g.json?.success, `status ${g.status}`);

  // --- Student ---
  let studentCookie = '';
  let studentId = '';
  if (STUDENT_LOGIN && STUDENT_PASSWORD) {
    const bad = await call('POST', 'auth/login', { body: { loginInput: STUDENT_LOGIN, password: STUDENT_PASSWORD + 'x' } });
    check('student wrong password rejected', !bad.json?.success, `status ${bad.status}`);

    const ok = await call('POST', 'auth/login', { body: { loginInput: STUDENT_LOGIN, password: STUDENT_PASSWORD } });
    studentCookie = cookieFrom(ok.setCookie);
    studentId = ok.json?.user?.id;
    check('student login works', ok.json?.success && ok.json?.role === 'student');
    check('student session cookie is HttpOnly', /HttpOnly/i.test(ok.setCookie));
    check('student session cookie SameSite=Lax', /SameSite=Lax/i.test(ok.setCookie));
    check('login response hides password', !('password' in (ok.json?.user || {})));

    const me = await call('GET', 'auth/me', { cookie: studentCookie });
    check('auth/me returns student', me.json?.role === 'student' && me.json?.user?.id === studentId);

    for (const [m, p, b] of OWNER_ROUTES) {
      const r = await call(m, p, { body: b, cookie: studentCookie });
      check(`student ${m} /${p} -> 403`, r.status === 403, `got ${r.status}`);
    }

    // Ownership (IDOR) checks
    const prof = await call('POST', 'student/profile', { body: { id: OTHER_STUDENT_ID, name: 'Hacked' }, cookie: studentCookie });
    check('student cannot edit another profile', prof.status === 403, `got ${prof.status}`);
    const tog = await call('POST', 'lessons/toggle-complete', { body: { userId: OTHER_STUDENT_ID, lessonId: 'x' }, cookie: studentCookie });
    check('student cannot toggle lessons for others', tog.status === 403, `got ${tog.status}`);
    const own = await call('POST', 'student/profile', { body: { id: studentId }, cookie: studentCookie });
    check('student can update own profile', own.json?.success === true, `got ${own.status}`);
    // Deposit checks run in the owner section, where the card requisites can be set first.

    const priv = await call('GET', 'db/all', { cookie: studentCookie });
    const others = (priv.json?.data?.users || []).filter((u) => u.id !== studentId);
    check('student db view hides other users contacts', others.every((u) => !u.phone && !u.email && u.balance === undefined));

    // Answer keys are never sent before submission
    const keys = JSON.stringify(priv.json?.data?.questions || []) + JSON.stringify(priv.json?.data?.readingTests || []) + JSON.stringify(priv.json?.data?.listeningTests || []);
    check('student db view hides answer keys', !/"correctAnswer(Index)?"\s*:/.test(keys) && !/"transcript"\s*:/.test(keys));
    const econ = await call('POST', 'student/economy', { body: { action: 'vip_purchase', planId: 'nonexistent' }, cookie: studentCookie });
    check('economy rejects unknown VIP plan', !econ.json?.success);
    const fc = await call('POST', 'flashcards', { body: { englishWord: 'probe' }, cookie: studentCookie });
    check('student can create own flashcard', fc.json?.success === true);
    if (fc.json?.card?.id) await call('DELETE', `flashcards/${fc.json.card.id}`, { cookie: studentCookie });

    // CSRF: cross-site writes are refused even with a valid cookie
    const csrf1 = await call('POST', 'student/profile', { body: { id: studentId }, cookie: studentCookie, headers: { Origin: 'https://attacker.example' } });
    check('CSRF: foreign Origin rejected', csrf1.status === 403, `got ${csrf1.status}`);
    const csrf2 = await call('POST', 'student/profile', { body: { id: studentId }, cookie: studentCookie, headers: { 'Sec-Fetch-Site': 'cross-site' } });
    check('CSRF: Sec-Fetch-Site cross-site rejected', csrf2.status === 403, `got ${csrf2.status}`);

    // Logout invalidates the session
    await call('POST', 'auth/logout', { cookie: studentCookie });
    const after = await call('GET', 'auth/me', { cookie: studentCookie });
    check('logout invalidates session', after.json?.authenticated === false);
  } else {
    console.log('SKIP  student checks (set STUDENT_LOGIN and STUDENT_PASSWORD)');
  }

  // --- Owner ---
  if (OWNER_SECRET) {
    const wrong = await call('POST', 'auth/login', { body: { loginInput: OWNER_USER, password: OWNER_SECRET + 'x' } });
    check('owner wrong password rejected', !wrong.json?.success);
    const codeOnly = await call('POST', 'auth/login', { body: { loginInput: OWNER_SECRET, password: '' } });
    check('owner password alone (no username) rejected', !(codeOnly.json?.success && codeOnly.json?.role === 'owner'));
    const r = await call('POST', 'auth/login', { body: { loginInput: OWNER_USER, password: OWNER_SECRET } });
    const ownerCookie = cookieFrom(r.setCookie);
    check('owner login with username + password works', r.json?.success && r.json?.role === 'owner');
    const me = await call('GET', 'auth/me', { cookie: ownerCookie });
    check('auth/me returns owner', me.json?.role === 'owner');
    // No-op probe: write back the background that is already active, so nothing changes.
    const current = await call('GET', 'db/all', { cookie: ownerCookie });
    const activeBackground = current.json?.data?.siteTheme?.activeBackground;
    const theme = await call('POST', 'owner/site-theme', { body: { activeBackground }, cookie: ownerCookie });
    check('owner can call owner route', theme.json?.success === true, `got ${theme.status}`);
    const emptyTheme = await call('POST', 'owner/site-theme', { body: {}, cookie: ownerCookie });
    check('owner theme route refuses an empty request (400)', emptyTheme.status === 400, `got ${emptyTheme.status}`);
    const afterTheme = await call('GET', 'db/all', { cookie: ownerCookie });
    const themeLogs = (afterTheme.json?.data?.auditLogs || [])
      .filter((l) => l.action === 'UPDATE_THEME')
      .sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp)));
    check('theme audit line never says "undefined"', themeLogs.length > 0 && !/undefined/.test(themeLogs[0].details), themeLogs[0]?.details || 'no entry');
    const del = await call('DELETE', 'books/nonexistent', { cookie: ownerCookie });
    check('owner can call DELETE route', del.status === 200, `got ${del.status}`);
    const all = await call('GET', 'db/all', { cookie: ownerCookie });
    check('owner db view still hides password hashes', !/"password"\s*:/.test(JSON.stringify(all.json)));

    // Deposits: the owner's card requisites are required; without them the request is refused (503).
    if (studentCookie) {
      // The student session was ended by the logout check above, so sign in again.
      const relog = await call('POST', 'auth/login', { body: { loginInput: STUDENT_LOGIN, password: STUDENT_PASSWORD } });
      const depCookie = cookieFrom(relog.setCookie);
      await call('POST', 'owner/bot-settings', { body: { botSettings: { cardNumber: '' } }, cookie: ownerCookie });
      const noCard = await call('POST', 'deposits/request', { body: { amount: 50000 }, cookie: depCookie });
      check('deposit refused until owner sets card requisites', noCard.status === 503, `got ${noCard.status}`);

      await call('POST', 'owner/bot-settings', {
        body: { botSettings: { cardNumber: '8600 0000 0000 0000', cardHolder: 'TEST HOLDER', minDepositAmount: 10000 } },
        cookie: ownerCookie
      });
      const dep = await call('POST', 'deposits/request', { body: { userId: OTHER_STUDENT_ID, amount: 50000, receiptUrl: '/receipt-test.png' }, cookie: depCookie });
      check('deposit is always recorded for the caller', dep.json?.transaction?.userId === studentId, `got ${dep.status}`);
      check('deposit stays pending', dep.json?.transaction?.status === 'pending');
      const noReceipt = await call('POST', 'deposits/request', { body: { amount: 50000 }, cookie: depCookie });
      check('deposit without a receipt is refused', noReceipt.status === 400, `got ${noReceipt.status}`);
      const badReceipt = await call('POST', 'deposits/request', { body: { amount: 50000, receiptUrl: 'javascript:alert(1)' }, cookie: depCookie });
      check('deposit receipt must be a web or site link', badReceipt.status === 400, `got ${badReceipt.status}`);
      // A test the owner has not published is a draft: students must not receive it.
      const draft = await call('POST', 'tests', { body: { title: 'QA qoralama test', type: 'quiz', published: false, track: 'general', durationMinutes: 5, maxScore: 1 }, cookie: ownerCookie });
      const draftId = draft.json?.test?.id;
      const studentView = await call('GET', 'db/all', { cookie: depCookie });
      check('a draft test is not sent to students', !!draftId && !(studentView.json?.data?.tests || []).some((t) => t.id === draftId), `status ${draft.status}`);
      if (draftId) await call('DELETE', `tests/${draftId}`, { cookie: ownerCookie });
      const below = await call('POST', 'deposits/request', { body: { amount: 1000 }, cookie: depCookie });
      check('deposit below minimum refused', below.status === 400, `got ${below.status}`);
    }

    await call('POST', 'auth/logout', { cookie: ownerCookie });
  } else {
    console.log('SKIP  owner checks (set OWNER_SECRET)');
  }

  // Brute-force limiter
  let limited = false;
  for (let i = 0; i < 12; i++) {
    const r = await call('POST', 'auth/login', { body: { loginInput: '+998900000000', password: 'wrong-password' } });
    if (r.status === 429) {
      limited = true;
      break;
    }
  }
  check('login rate limit kicks in', limited);

  console.log(`\n${passes} passed, ${failures} failed`);
  process.exit(failures ? 1 : 0);
})();
