// Owner forms and the student view of their results. LOCAL ONLY (creates throwaway data in the local database).
// Usage: BASE_URL=http://localhost:3100 OWNER_USERNAME=jasurbek OWNER_PASSWORD=... node scripts/owner-forms-test.mjs
const base = process.env.BASE_URL || 'http://localhost:3100';
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(base)) { console.error('Refusing to run: BASE_URL must be a local server.'); process.exit(2); }
let failures = 0;
const check = (name, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!ok) failures++; };
const cookieOf = (r) => (r.headers.getSetCookie?.() || []).map((c) => c.split(';')[0]).join('; ');
const call = async (who, method, path, body) => {
  const r = await fetch(base + path, { method, headers: { 'content-type': 'application/json', ...(who ? { cookie: who } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, b: await r.json().catch(() => ({})) };
};
const email = `forms-${Date.now()}@test.local`;
const stuRes = await fetch(base + '/api/auth/register', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Forms', surname: 'Test', identifier: email, email, password: 'Str0ng-Pass-123!', region: 'Toshkent' }) });
const S = cookieOf(stuRes);
const ownerRes = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ loginInput: process.env.OWNER_USERNAME || 'jasurbek', password: process.env.OWNER_PASSWORD || '' }) });
const O = cookieOf(ownerRes);
if (!S || !O) { console.error('sign-in failed (set OWNER_PASSWORD)'); process.exit(1); }

// FAQ: save, hidden item stays hidden from students, HTML stays text
const tag = `faq-${Date.now()}`;
const saved = await call(O, 'POST', '/api/owner/faqs', { faqs: [{ question: `Ko'rinadigan ${tag}?`, answer: '<b>Ha</b>', isVisible: true }, { question: `Yashirin ${tag}?`, answer: 'yo\'q', isVisible: false }, { question: '', answer: 'bo\'sh savol tashlanadi' }] });
check('FAQ saved, empty question dropped', saved.s === 200 && saved.b.faqs.length === 2, String(saved.s));
const stuView = (await call(S, 'GET', '/api/db/all')).b.data;
const visible = (stuView.faqs || []).filter((f) => f.question.includes(tag));
check('student gets the visible FAQ', visible.some((f) => f.question.startsWith("Ko'rinadigan")));
check('hidden FAQ still hidden from students', !JSON.stringify(stuView.faqs || []).includes('Yashirin ' + tag) || (stuView.faqs || []).every((f) => f.isVisible !== false));
check('anonymous cannot save FAQ', (await call(null, 'POST', '/api/owner/faqs', { faqs: [] })).s === 401);
check('student cannot save FAQ', (await call(S, 'POST', '/api/owner/faqs', { faqs: [] })).s === 403);
await call(O, 'POST', '/api/owner/faqs', { faqs: [] });

// Tickets: student asks, owner replies, student sees the reply
const t = await call(S, 'POST', '/api/support-tickets', { userName: 'Forms Test', userPhone: '+998901112233', message: 'Savolim bor ' + tag, category: 'kurs' });
check('ticket created', t.s === 200 && t.b.ticket?.id);
const tid = t.b.ticket.id;
check('empty reply refused', (await call(O, 'POST', '/api/support-tickets/reply', { ticketId: tid, replyText: '   ' })).s === 400);
check('object reply refused', (await call(O, 'POST', '/api/support-tickets/reply', { ticketId: tid, replyText: { x: 1 } })).s === 400);
check('student cannot reply to tickets', (await call(S, 'POST', '/api/support-tickets/reply', { ticketId: tid, replyText: 'o‘zimga' })).s === 403);
const rep = await call(O, 'POST', '/api/support-tickets/reply', { ticketId: tid, replyText: 'Javob ' + tag });
check('owner reply saved', rep.s === 200 && rep.b.ticket.status === 'answered');
const mine = (await call(S, 'GET', '/api/db/all')).b.data.supportTickets || [];
check('student sees the reply on their ticket', mine.some((x) => x.id === tid && x.replyText === 'Javob ' + tag));

// Promo codes: format, duplicate, hidden from students, delete
const code = 'TEST' + String(Date.now()).slice(-6);
check('bad promo code refused', (await call(O, 'POST', '/api/owner/promo-codes', { code: 'x y' })).s === 400);
const pc = await call(O, 'POST', '/api/owner/promo-codes', { code, planDiscounts: { start: 10 }, maxUses: 5, active: true });
check('promo created', pc.s === 200 || pc.s === 201, String(pc.s));
check('duplicate promo refused', (await call(O, 'POST', '/api/owner/promo-codes', { code })).s === 409);
check('promo codes are not in the student view', !JSON.stringify((await call(S, 'GET', '/api/db/all')).b.data.promoCodes || []).includes(code));
const ownerView = (await call(O, 'GET', '/api/db/all')).b.data.promoCodes || [];
const created = ownerView.find((p) => p.code === code);
check('owner sees the promo', Boolean(created));
if (created) check('promo deleted', (await call(O, 'POST', '/api/owner/promo-codes/delete', { id: created.id })).s === 200);

// Audit log: owner actions are recorded and students cannot read them
const audit = (await call(O, 'GET', '/api/db/all')).b.data.auditLogs || [];
check('audit log records owner actions', audit.some((a) => /FAQ|REPLY|PROMO/i.test(a.action)));
check('students get no audit log', ((await call(S, 'GET', '/api/db/all')).b.data.auditLogs || []).length === 0);
if (failures) { console.error(`${failures} FAILED`); process.exit(1); }
console.log('All owner form checks passed');
