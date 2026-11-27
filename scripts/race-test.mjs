// Concurrent-purchase regression test. LOCAL ONLY: it registers a throwaway student and sets that student's balance
// directly in a local Postgres. Usage:
//   BASE_URL=http://localhost:3100 PGHOST=/tmp PGPORT=5433 PGUSER=postgres PGDATABASE=edulevel node scripts/race-test.mjs
// Passes when exactly one of N simultaneous VIP purchases from a balance worth one plan succeeds.
import { execFileSync } from 'node:child_process';

const base = process.env.BASE_URL || 'http://localhost:3100';
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(base)) {
  console.error('Refusing to run: BASE_URL must be a local server.');
  process.exit(2);
}
const psql = (sql) => execFileSync('psql', ['-At', '-c', sql], { env: process.env }).toString().trim();

const email = `race-${Date.now()}@test.local`;
const reg = await fetch(`${base}/api/auth/register`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Race', surname: 'Test', identifier: email, email, password: 'Str0ng-Pass-123!', region: 'Toshkent' }) });
if (!reg.ok) { console.error('register failed', reg.status); process.exit(1); }
const headers = { cookie: (reg.headers.getSetCookie?.() || []).map((c) => c.split(';')[0]).join('; '), 'content-type': 'application/json' };
const all = await (await fetch(`${base}/api/db/all`, { headers })).json();
const plan = all.data.vipPlans.filter((p) => p.priceMonthly > 0).sort((a, b) => a.priceMonthly - b.priceMonthly)[0];
const uid = psql(`select id from public.users where lower(email)=lower('${email}')`);
psql(`update public.users set balance=${plan.priceMonthly} where id='${uid}'`);
const N = 8;
const statuses = await Promise.all(Array.from({ length: N }, () => fetch(`${base}/api/student/economy`, { method: 'POST', headers, body: JSON.stringify({ action: 'vip_purchase', planId: plan.id }) }).then((r) => r.status)));
const ok = statuses.filter((s) => s === 200).length;
const purchases = Number(psql(`select count(*) from public.user_records where user_id='${uid}' and kind='purchase'`));
const balance = Number(psql(`select balance from public.users where id='${uid}'`));
console.log(`successes=${ok} purchase_rows=${purchases} balance=${balance}`);
if (ok !== 1 || purchases !== 1 || balance !== 0) { console.error('FAIL: double spend'); process.exit(1); }
console.log('PASS: exactly one purchase');
