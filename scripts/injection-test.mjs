// Injection regression test. LOCAL ONLY. Sends SQL/script/path payloads to public and signed-in endpoints and checks
// that the server never answers 5xx, never echoes a stack trace, and that the data tables are still intact.
// Usage: BASE_URL=http://localhost:3100 PGHOST=/tmp PGPORT=5433 PGUSER=postgres PGDATABASE=edulevel node scripts/injection-test.mjs
import { execFileSync } from 'node:child_process';

const base = process.env.BASE_URL || 'http://localhost:3100';
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(base)) { console.error('Refusing to run: BASE_URL must be a local server.'); process.exit(2); }
const psql = (sql) => execFileSync('psql', ['-At', '-c', sql], { env: process.env }).toString().trim();
const usersBefore = Number(psql('select count(*) from public.users'));

const payloads = ["' OR 1=1 --", "'; DROP TABLE public.users; --", '" OR ""="', "1; select pg_sleep(5)--", '<script>alert(1)</script>', '<img src=x onerror=alert(1)>', '../../etc/passwd', '${7*7}', '{{7*7}}', '\u0000', 'a'.repeat(5000)];
let failures = 0;
const check = (name, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!ok) failures++; };

const email = `inj-${Date.now()}@test.local`;
const reg = await fetch(`${base}/api/auth/register`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Inj', surname: 'Test', identifier: email, email, password: 'Str0ng-Pass-123!', region: 'Toshkent' }) });
const cookie = (reg.headers.getSetCookie?.() || []).map((c) => c.split(';')[0]).join('; ');
const H = { 'content-type': 'application/json', cookie };

const targets = [
  ['POST', '/api/auth/login', (p) => ({ loginInput: p, password: p })],
  ['POST', '/api/auth/register', (p) => ({ name: p, surname: p, identifier: p, email: p, password: p, region: p })],
  ['POST', '/api/support-tickets', (p) => ({ name: p, phone: p, message: p, subject: p })],
  ['POST', '/api/news/subscribe', (p) => ({ email: p, contact: p })],
  ['POST', '/api/student/promo-check', (p) => ({ code: p, planId: p })],
  ['POST', '/api/student/economy', (p) => ({ action: p, planId: p, promoCode: p })],
  ['POST', '/api/exams/start', (p) => ({ testId: p, guestKey: p })],
  ['POST', '/api/thematic-packs/grade', (p) => ({ packId: p, answers: { [p]: p } })]
];
for (const [method, path, mk] of targets) {
  let bad = 0; let worst = 0;
  for (const p of payloads) {
    const r = await fetch(base + path, { method, headers: H, body: JSON.stringify(mk(p)) });
    const text = await r.text();
    if (r.status >= 500 || /at .*\(.*:\d+:\d+\)|SyntaxError|syntax error at|pg_catalog/.test(text)) { bad++; worst = Math.max(worst, r.status); }
  }
  check(`${method} ${path}: no 5xx / stack trace for ${payloads.length} payloads`, bad === 0, bad ? `(${bad} bad, worst ${worst})` : '');
}
for (const p of ['../../etc/passwd', '%2e%2e%2f%2e%2e%2fetc%2fpasswd', "'%20OR%201=1", '<script>alert(1)</script>']) {
  const r = await fetch(`${base}/api/uploads/${encodeURIComponent(p)}`, { headers: H });
  check(`GET /api/uploads/${p.slice(0, 20)}: 404, not a file or error`, r.status === 404 || r.status === 400);
}
check('users table intact after payloads', Number(psql('select count(*) from public.users')) >= usersBefore);
check('tables still exist', psql("select count(*) from information_schema.tables where table_schema='public' and table_name in ('users','deposits','tests')") === '3');
// a ticket with a script payload is stored as text; the API returns it as JSON data, never as markup
const t = await fetch(base + '/api/support-tickets', { method: 'POST', headers: H, body: JSON.stringify({ name: 'X', phone: '+998901234567', message: '<script>alert(1)</script>', subject: 's' }) });
check('script text in a ticket does not break the API', t.status < 500);
if (failures) { console.error(`${failures} FAILED`); process.exit(1); }
console.log('All injection checks passed');
