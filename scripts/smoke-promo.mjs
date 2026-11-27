#!/usr/bin/env node
// Promo codes end-to-end against a running server (use a test database).
// Usage: BASE=http://localhost:3000 OWNER_PASSWORD=... node scripts/smoke-promo.mjs
const BASE = (process.env.BASE || 'http://localhost:3000') + '/api';
const OWNER_PASSWORD = process.env.OWNER_PASSWORD;
if (!OWNER_PASSWORD) { console.error('Set OWNER_PASSWORD'); process.exit(1); }
const phone = '+99893' + String(Date.now()).slice(-7);
const code = 'SMK' + String(Date.now()).slice(-6);
let failures = 0;
const check = (name, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`); if (!ok) failures++; };

async function call(method, path, body, cookie) {
  const res = await fetch(`${BASE}/${path}`, {
    method,
    headers: { 'content-type': 'application/json', ...(cookie ? { cookie: `el_session=${cookie}` } : {}) },
    body: body ? JSON.stringify(body) : undefined
  });
  const set = res.headers.get('set-cookie') || '';
  return { status: res.status, json: await res.json().catch(() => ({})), cookie: set.match(/el_session=([^;]+)/)?.[1] };
}

const owner = await call('POST', 'auth/login', { loginInput: 'jasurbek', password: OWNER_PASSWORD });
check('owner logs in', owner.status === 200 && !!owner.cookie);
const oc = owner.cookie;

const reg = await call('POST', 'auth/register', { name: 'Promo', surname: 'Talaba', identifier: phone, password: 'studentpass1', track: 'general' });
check('student registers', reg.status === 200 && !!reg.cookie, reg.json.message);
const sc = reg.cookie;
const me = (await call('GET', 'auth/me', null, sc)).json.user;

const dep = await call('POST', 'deposits/request', { amount: 1000000, method: 'card', note: 'promo test', receiptUrl: '/receipt-test.png' }, sc);
const depId = dep.json.transaction?.id;
check('deposit requested', dep.status === 200 && !!depId);
await call('POST', `owner/deposits/approve/${depId}`, {}, oc);

let r = await call('POST', 'owner/promo-codes', { code: 'a', planDiscounts: { start: 10 }, maxUses: 0 }, oc);
check('too short code is rejected', r.status === 400, r.json.message);
r = await call('POST', 'owner/promo-codes', { code, planDiscounts: { start: 95 }, maxUses: 0 }, oc);
check('discount above 90% is rejected', r.status === 400, r.json.message);

r = await call('POST', 'owner/promo-codes', { code, planDiscounts: { start: 20 }, maxUses: 1 }, oc);
check('owner creates a code for the start plan only', r.status === 200 && r.json.promo?.planDiscounts?.start === 20, r.json.message);
const promoId = r.json.promo?.id;

r = await call('POST', 'student/promo-check', { code, planId: 'gold' }, sc);
check('code does not apply to a plan without a discount', r.status === 400, r.json.message);
r = await call('POST', 'student/promo-check', { code, planId: 'start' }, sc);
check('student sees the discounted price (190 000 − 20%)', r.status === 200 && r.json.price === 152000 && r.json.discount === 38000, `price ${r.json.price}`);

r = await call('POST', 'student/economy', { action: 'vip_purchase', planId: 'start', promoCode: code }, sc);
check('purchase charges the discounted price', r.status === 200 && r.json.user?.balance === 1000000 - 152000, `status ${r.status} ${r.json.message || ''} ${r.json.reason || ''}`);

const after = (await call('GET', 'db/all', null, oc)).json.data;
const tx = (after.purchases || []).find((t) => t.userId === me.id && t.amount === 152000);
check('purchase is recorded with the promo code', !!tx && tx.promoCode === code && /promo/.test(tx.note || ''), tx?.note || 'no record');
check('code usage is counted', (after.promoCodes || []).find((p) => p.id === promoId)?.usedCount === 1);

r = await call('POST', 'student/promo-check', { code, planId: 'start' }, sc);
check('a code past its use limit is refused', r.status === 400, r.json.message);

const priv = await call('GET', 'db/all', null, sc);
check('students cannot see the list of codes', (priv.json.data.promoCodes || []).length === 0);

r = await call('POST', 'owner/promo-codes/delete', { id: promoId }, oc);
check('owner deletes the code', r.status === 200);

console.log(failures ? `\n${failures} check(s) failed` : '\nAll promo checks passed');
process.exit(failures ? 1 : 0);
