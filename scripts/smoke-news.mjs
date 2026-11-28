#!/usr/bin/env node
// News and the limited-time VIP gift, end to end against a running server (use a test database).
// Usage: BASE=http://localhost:3000 OWNER_PASSWORD=... node scripts/smoke-news.mjs
const BASE = (process.env.BASE || 'http://localhost:3000') + '/api';
const OWNER_PASSWORD = process.env.OWNER_PASSWORD;
if (!OWNER_PASSWORD) { console.error('Set OWNER_PASSWORD'); process.exit(1); }
let failures = 0;
const check = (name, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`); if (!ok) failures++; };

async function call(method, path, body, cookie) {
  const res = await fetch(`${BASE}/${path}`, { method, headers: { 'content-type': 'application/json', ...(cookie ? { cookie: `el_session=${cookie}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const set = res.headers.get('set-cookie') || '';
  return { status: res.status, json: await res.json().catch(() => ({})), cookie: set.match(/el_session=([^;]+)/)?.[1] };
}
const phone = () => '+99895' + String(Date.now()).slice(-7) + Math.floor(Math.random() * 9);

const owner = await call('POST', 'auth/login', { loginInput: process.env.OWNER_USERNAME || 'jasurbek', password: OWNER_PASSWORD });
const oc = owner.cookie;
check('owner logs in', owner.status === 200 && !!oc);
const plans = (await call('GET', 'db/all', null, oc)).json.data.vipPlans;
const gold = plans.find((p) => p.id === 'gold') || plans[plans.length - 1];

// A gift left over from an earlier aborted run would change what "previous plan" means.
await call('POST', 'owner/vip-gift', { action: 'stop' }, oc);

// News
let r = await call('POST', 'owner/news', { title: 'x' }, oc);
check('news title that is too short is refused', r.status === 400, r.json.message);
r = await call('POST', 'owner/news', { title: 'Yangi kurs ochildi', body: 'IELTS 7.0 guruhi.', tag: 'Yangi', pinned: true }, oc);
const newsId = r.json.item?.id;
check('owner publishes a news item', r.status === 200 && !!newsId, r.json.message);
r = await call('POST', 'owner/news', { title: 'Qoralama yangilik', body: 'Hali e’lon qilinmagan', published: false }, oc);
const draftId = r.json.item?.id;
check('owner saves a draft', r.status === 200 && !!draftId);

const s1 = await call('POST', 'auth/register', { name: 'Yangi', surname: 'Talaba', identifier: phone(), password: 'studentpass1', track: 'general' });
const sc = s1.cookie;
check('student registers', s1.status === 200 && !!sc, s1.json.message);
let sdb = (await call('GET', 'db/all', null, sc)).json.data;
check('student sees the published news', sdb.news.some((n) => n.id === newsId));
check('student does not see the draft', !sdb.news.some((n) => n.id === draftId));
r = await call('POST', 'owner/news', { title: 'Hack urinish', body: 'x' }, sc);
check('student cannot write news', r.status === 403);
r = await call('DELETE', `news/${newsId}`, null, sc);
check('student cannot delete news', r.status === 403);
check('anonymous visitors see published news only', ((await call('GET', 'db/all')).json.data.news || []).every((n) => n.published));

// VIP gift
r = await call('POST', 'owner/vip-gift', { tier: 'nope', hours: 2 }, oc);
check('unknown plan is refused', r.status === 400, r.json.message);
r = await call('POST', 'owner/vip-gift', { tier: gold.id, hours: 0 }, oc);
check('zero duration is refused', r.status === 400, r.json.message);
r = await call('POST', 'owner/vip-gift', { tier: gold.id, hours: 3 }, sc);
check('student cannot start a gift', r.status === 403);

// a student who already has a higher plan must be left alone
const rich = await call('POST', 'auth/register', { name: 'Boy', surname: 'Talaba', identifier: phone(), password: 'studentpass1', track: 'general' });
const richId = rich.json.user?.id;
const top = plans[plans.length - 1].id;
await call('POST', 'users/update-vip', { userId: richId, vipTier: top, days: 30 }, oc);

const before = (await call('GET', 'auth/me', null, sc)).json.user;
r = await call('POST', 'owner/vip-gift', { tier: gold.id, hours: 3, title: 'Test sovg‘a', message: 'Hammaga 3 soat' }, oc);
check('owner starts a gift for everyone', r.status === 200 && r.json.vipGift?.active === true, r.json.message);
const me = () => call('GET', 'auth/me', null, sc).then((x) => x.json.user);
let u = await me();
check('student now has the gifted tier', u.vipTier === gold.id, `tier ${u.vipTier}`);
check('gift end date is set on the student', !!u.vipExpiresAt && Math.abs(Date.parse(u.vipExpiresAt) - Date.now() - 3 * 3600_000) < 120_000);
sdb = (await call('GET', 'db/all', null, sc)).json.data;
check('student sees the gift but not the bookkeeping', sdb.vipGift?.active === true && sdb.vipGiftApplied === undefined);
const richNow = (await call('GET', 'db/all', null, oc)).json.data.users.find((x) => x.id === richId);
check('a student with a higher plan keeps it', richNow.vipTier === top, `tier ${richNow.vipTier}`);
const late = await call('POST', 'auth/register', { name: 'Kech', surname: 'Talaba', identifier: phone(), password: 'studentpass1', track: 'general' });
const lateMe = (await call('GET', 'auth/me', null, late.cookie)).json.user;
check('a student who joins during the gift receives it', lateMe.vipTier === gold.id, `tier ${lateMe.vipTier}`);

r = await call('POST', 'owner/vip-gift', { action: 'stop' }, oc);
check('owner stops the gift', r.status === 200 && r.json.vipGift?.active === false);
u = await me();
check('student is back on the previous plan', u.vipTier === before.vipTier && u.vipExpiresAt === before.vipExpiresAt, `tier ${u.vipTier} (was ${before.vipTier})`);
check('the higher plan is still there after the gift ends', (await call('GET', 'db/all', null, oc)).json.data.users.find((x) => x.id === richId).vipTier === top);
check('students no longer see a stopped gift', (await call('GET', 'db/all', null, sc)).json.data.vipGift === undefined);

// cleanup
await call('DELETE', `news/${newsId}`, null, oc);
await call('DELETE', `news/${draftId}`, null, oc);
for (const id of [richId, u.id, lateMe.id]) if (id) await call('DELETE', `owner/students/${id}`, null, oc);
check('news cleaned up', !(await call('GET', 'db/all', null, oc)).json.data.news.some((n) => n.id === newsId));
console.log(failures ? `\n${failures} check(s) failed` : '\nAll news and gift checks passed');
process.exit(failures ? 1 : 0);
