// Access-control regression test with two throwaway students and the owner. LOCAL ONLY (it edits a local Postgres).
// Usage: BASE_URL=http://localhost:3100 OWNER_USERNAME=jasurbek OWNER_PASSWORD=... PGHOST=/tmp PGPORT=5433 PGUSER=postgres PGDATABASE=edulevel node scripts/idor-test.mjs
import { execFileSync } from 'node:child_process';

const base = process.env.BASE_URL || 'http://localhost:3100';
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(base)) { console.error('Refusing to run: BASE_URL must be a local server.'); process.exit(2); }
const psql = (sql) => execFileSync('psql', ['-At', '-c', sql], { env: process.env }).toString().trim();
let failures = 0;
const check = (name, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!ok) failures++; };
const cookieOf = (r) => (r.headers.getSetCookie?.() || []).map((c) => c.split(';')[0]).join('; ');
const call = async (who, method, path, body) => {
  const r = await fetch(base + path, { method, headers: { 'content-type': 'application/json', ...(who ? { cookie: who } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, b: await r.json().catch(() => ({})) };
};
const register = async (tag) => {
  const email = `${tag}-${Date.now()}-${Math.floor(Math.random() * 1e4)}@test.local`;
  const r = await fetch(base + '/api/auth/register', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: tag, surname: 'Idor', identifier: email, email, password: 'Str0ng-Pass-123!', region: 'Toshkent' }) });
  return { cookie: cookieOf(r), email };
};

const RUN = Date.now();
const A = await register('A');
const B = await register('B');
const ownerLogin = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ loginInput: process.env.OWNER_USERNAME || 'jasurbek', password: process.env.OWNER_PASSWORD || '' }) });
const O = cookieOf(ownerLogin);
if (!A.cookie || !B.cookie || !O) { console.error('sign-in failed (set OWNER_PASSWORD)'); process.exit(1); }
const idA = psql(`select id from public.users where lower(email)=lower('${A.email}')`);
psql("insert into public.site_settings(key,value) values ('payment_settings','{\"cardNumber\":\"8600000000000000\",\"minDepositAmount\":1000,\"isActive\":true,\"botUsername\":\"\",\"botName\":\"\"}') on conflict (key) do update set value = excluded.value");

// 1. tickets are private
const marker = `idor-marker-${Date.now()}`;
await call(A.cookie, 'POST', '/api/support-tickets', { userName: 'A', userPhone: '+998900000001', message: marker, category: 'kurs' });
const bView = await call(B.cookie, 'GET', '/api/db/all');
check('B does not see A\'s support ticket', !JSON.stringify(bView.b).includes(marker));
const oView = await call(O, 'GET', '/api/db/all');
check('owner sees the ticket', JSON.stringify(oView.b).includes(marker));

// 2. other users are stripped of private fields
const others = (bView.b.data?.users || []).filter((u) => u.id === idA);
check('B sees A without email, phone and balance', others.length === 1 && !others[0].email && !others[0].phone && others[0].balance === undefined);

// 3. deposits: duplicate receipt, pending limit, privacy, authorization
const dep = (cookie, receipt, amount = 50000) => call(cookie, 'POST', '/api/deposits/request', { amount, receiptUrl: receipt, method: 'card' });
const r1 = await dep(A.cookie, `/api/uploads/idor-${RUN}-1`);
check('A deposit request accepted', r1.s === 200 && r1.b.transaction?.status === 'pending', String(r1.s));
check('same receipt again (same student) refused', (await dep(A.cookie, `/api/uploads/idor-${RUN}-1`)).s === 409);
check('same receipt from another student refused', (await dep(B.cookie, `/api/uploads/idor-${RUN}-1`)).s === 409);
for (let i = 2; i <= 5; i++) await dep(A.cookie, `/api/uploads/idor-${RUN}-${i}`);
check('6th pending request refused', (await dep(A.cookie, `/api/uploads/idor-${RUN}-6`)).s === 429);
check('negative and fractional amounts refused', (await dep(B.cookie, `/api/uploads/idor-${RUN}-n1`, -5000)).s === 400 && (await dep(B.cookie, `/api/uploads/idor-${RUN}-n2`, 1000.5)).s === 400);
const txId = r1.b.transaction.id;
const bDeps = (await call(B.cookie, 'GET', '/api/db/all')).b.data?.depositTransactions || [];
check('B does not see A\'s deposits', !bDeps.some((t) => t.id === txId));
check('B cannot approve A\'s deposit', (await call(B.cookie, 'POST', `/api/owner/deposits/approve/${txId}`)).s === 403);
check('B cannot reject A\'s deposit', (await call(B.cookie, 'POST', `/api/owner/deposits/reject/${txId}`)).s === 403);

// 4. owner approves twice at once: credited once
const both = await Promise.all([call(O, 'POST', `/api/owner/deposits/approve/${txId}`), call(O, 'POST', `/api/owner/deposits/approve/${txId}`)]);
check('double approval: exactly one succeeds', both.filter((x) => x.s === 200).length === 1, both.map((x) => x.s).join(','));
check('balance credited once', Number(psql(`select balance from public.users where id='${idA}'`)) === 50000);

// 5. a student cannot use owner-only actions
for (const [m, p, body] of [['POST', '/api/users/update-vip', { userId: idA, vipTier: 'pro' }], ['POST', '/api/users/toggle-block', { userId: idA }], ['POST', '/api/owner/students/update', { id: idA, balance: 99999999 }], ['POST', '/api/owner/news', { title: 'x' }], ['POST', '/api/owner/promo-codes', { code: 'FREE' }], ['PUT', '/api/owner/ai-routing', { reset: true }], ['POST', '/api/owner/bunny/upload', { title: 'x' }]]) {
  const r = await call(B.cookie, m, p, body);
  check(`student refused: ${m} ${p}`, r.s === 403 || r.s === 401, String(r.s));
}
check('A balance not changed by B\'s attempts', Number(psql(`select balance from public.users where id='${idA}'`)) === 50000);
if (failures) { console.error(`${failures} FAILED`); process.exit(1); }
console.log('All access-control checks passed');
