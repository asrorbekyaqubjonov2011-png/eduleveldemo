// Level tests (Levelni aniqlash) end-to-end check against a LOCAL or staging server.
// Usage: BASE=http://localhost:3100 OWNER_USERNAME=jasurbek OWNER_PASSWORD=... node scripts/e2e-levels.mjs
// Creates a test, questions, a throwaway student and attempts. Do not run against production data.
const BASE = process.env.BASE || 'http://localhost:3100';
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(BASE)) { console.error('Refusing to run: BASE must be a local server.'); process.exit(2); }
const cookieOf = (res) => (res.headers.getSetCookie?.() || []).map((c) => c.split(';')[0]).find((c) => c.startsWith('el_session='))?.split('=')[1];
const ownerRes = await fetch(BASE + '/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ loginInput: process.env.OWNER_USERNAME || 'jasurbek', password: process.env.OWNER_PASSWORD || '' }) });
const owner = cookieOf(ownerRes);
const email = `lv-${Date.now()}@test.local`;
const stuRes = await fetch(BASE + '/api/auth/register', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Lv', surname: 'Test', identifier: email, email, password: 'Str0ng-Pass-123!', region: 'Toshkent' }) });
const stu = cookieOf(stuRes);
if (!owner || !stu) throw new Error('could not sign in (set OWNER_PASSWORD)');
const O = { cookie: `el_session=${owner}`, 'content-type': 'application/json' };
const S = { cookie: `el_session=${stu}`, 'content-type': 'application/json' };
let fails = 0;
const check = (name, cond, extra = '') => { console.log(`${cond ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!cond) fails++; };
const j = async (url, init = {}) => { const r = await fetch(BASE + url, init); const b = await r.json().catch(() => ({})); return { s: r.status, b, r }; };

// 1. owner creates an open test, adds questions, publishes
const t = await j('/api/levels/owner', { method: 'POST', headers: O, body: JSON.stringify({ kind: 'test', title: 'E2E test', access: 'open', timeLimitSeconds: 300, attemptsAllowed: 2, maxViolations: 2, gradingRules: [{ min: 0, max: 49, level: 'A2' }, { min: 50, max: 100, level: 'B1', certificate: true }], certificateEnabled: true }) });
check('owner creates test', t.s === 201 && t.b.id, JSON.stringify(t.s));
const id = t.b.id;
const qs = await j(`/api/levels/owner/${id}/questions`, { method: 'POST', headers: O, body: JSON.stringify({ questions: [{ prompt: 'Q1', options: ['a', 'b', 'c'], correctIndex: 1, points: 2 }, { prompt: 'Q2', options: ['x', 'y'], correctIndex: 0 }] }) });
check('owner adds 2 questions', qs.s === 201 && qs.b.added === 2, JSON.stringify(qs.b));
const pub0 = await j(`/api/levels/owner/${id}`, { method: 'PATCH', headers: O, body: JSON.stringify({ status: 'published' }) });
check('owner publishes', pub0.s === 200, JSON.stringify(pub0.b));

// 2. student list shows it, no answers leak
const list = await j('/api/levels/tests', { headers: S });
const mine = list.b.tests?.find((x) => x.id === id);
check('student sees published test', !!mine);
check('list has no correct_index', !JSON.stringify(list.b).includes('correct_index'));

// 3. start
const st = await j(`/api/levels/tests/${id}/start`, { method: 'POST', headers: S, body: JSON.stringify({ firstName: 'Ali', lastName: 'Valiyev', className: '9-A' }) });
check('student starts attempt', st.s === 201 && st.b.attemptId, JSON.stringify(st.b));
const aid = st.b.attemptId;

// 4. state has questions without the key
const state = await j(`/api/levels/attempts/${aid}`, { headers: S });
check('state in_progress', state.b.status === 'in_progress');
check('questions have no correct_index', !JSON.stringify(state.b).includes('correct_index'));
check('questions count 2', state.b.questions?.length === 2);

// 5. answer: pick correct for Q1 (index 1) and wrong for Q2
const q1 = state.b.questions.find((q) => q.prompt === 'Q1');
const q2 = state.b.questions.find((q) => q.prompt === 'Q2');
await j(`/api/levels/attempts/${aid}`, { method: 'PUT', headers: S, body: JSON.stringify({ questionId: q1.id, choice: 1 }) });
await j(`/api/levels/attempts/${aid}`, { method: 'PUT', headers: S, body: JSON.stringify({ questionId: q2.id, choice: 1 }) });

// 6. violations: 2 warnings then block on the 3rd
const v1 = await j(`/api/levels/attempts/${aid}`, { method: 'PATCH', headers: S, body: JSON.stringify({ event: 'blur' }) });
check('violation 1 warning', v1.b.status === 'in_progress' && v1.b.warningsLeft === 1, JSON.stringify(v1.b));
const v2 = await j(`/api/levels/attempts/${aid}`, { method: 'PATCH', headers: S, body: JSON.stringify({ event: 'hidden' }) });
check('violation 2 warning', v2.b.status === 'in_progress' && v2.b.warningsLeft === 0);
const v3 = await j(`/api/levels/attempts/${aid}`, { method: 'PATCH', headers: S, body: JSON.stringify({ event: 'fullscreen' }) });
check('violation 3 blocks', v3.b.blocked === true || v3.b.status === 'blocked', JSON.stringify(v3.b));

// 7. start again while blocked -> 423
const again = await j(`/api/levels/tests/${id}/start`, { method: 'POST', headers: S, body: JSON.stringify({ firstName: 'Ali', lastName: 'Valiyev', className: '9-A' }) });
check('blocked start returns 423', again.s === 423, String(again.s));

// 8. owner lists attempts (blocked filter) and issues unlock code
const list2 = await j(`/api/levels/owner/${id}/attempts?status=blocked`, { headers: O });
check('owner sees blocked attempt', list2.b.attempts?.some((a) => a.id === aid));
const unl = await j(`/api/levels/owner/${id}/attempts`, { method: 'POST', headers: O, body: JSON.stringify({ attemptId: aid }) });
check('owner gets 6-digit unlock code', /^\d{6}$/.test(unl.b.unlockCode || ''), JSON.stringify(unl.b));
const aList = await j(`/api/levels/owner/${id}/attempts?status=blocked`, { headers: O });
check('unlock code stays visible to owner', aList.b.attempts?.find((a) => a.id === aid)?.unlock_code === unl.b.unlockCode);

// 9. wrong code rejected, right code unlocks, reuse rejected
const wrong = await j(`/api/levels/attempts/${aid}/unlock`, { method: 'POST', headers: S, body: JSON.stringify({ code: unl.b.unlockCode === '000000' ? '111111' : '000000' }) });
check('wrong unlock code rejected', wrong.s === 403, String(wrong.s));
const right = await j(`/api/levels/attempts/${aid}/unlock`, { method: 'POST', headers: S, body: JSON.stringify({ code: unl.b.unlockCode }) });
check('right unlock code opens attempt', right.s === 200 && right.b.success, JSON.stringify(right.b));
const reuse = await j(`/api/levels/attempts/${aid}/unlock`, { method: 'POST', headers: S, body: JSON.stringify({ code: unl.b.unlockCode }) });
check('unlock code cannot be reused', reuse.s === 409, String(reuse.s));

// 10. finish -> score, level from rules, certificate
const fin = await j(`/api/levels/attempts/${aid}`, { method: 'POST', headers: S });
check('finish returns result', fin.b.success && fin.b.result, JSON.stringify(fin.b));
check('score 2 of 3 points = 67% -> B1', fin.b.result?.level === 'B1' && Math.round(fin.b.result?.percent) === 67, JSON.stringify(fin.b.result));
check('certificate issued for B1 rule', !!fin.b.result?.certificateCode);

// 11. second attempt allowed (attempts 2), and then limit
const st2 = await j(`/api/levels/tests/${id}/start`, { method: 'POST', headers: S, body: JSON.stringify({ firstName: 'Ali', lastName: 'Valiyev', className: '9-A' }) });
check('second attempt allowed', st2.s === 201, String(st2.s));
await j(`/api/levels/attempts/${st2.b.attemptId}`, { method: 'POST', headers: S });
const st3 = await j(`/api/levels/tests/${id}/start`, { method: 'POST', headers: S, body: JSON.stringify({ firstName: 'Ali', lastName: 'Valiyev', className: '9-A' }) });
check('third attempt refused', st3.s === 409, String(st3.s));

// 12. report
const rep = await fetch(`${BASE}/api/levels/owner/${id}/report?format=xlsx`, { headers: O });
const buf = Buffer.from(await rep.arrayBuffer());
check('xlsx report downloads', rep.status === 200 && buf.slice(0, 2).toString() === 'PK', String(rep.status));
fs.writeFileSync('/tmp/e2e-report.xlsx', buf);
const repd = await fetch(`${BASE}/api/levels/owner/${id}/report?format=docx`, { headers: O });
check('docx report downloads', repd.status === 200 && Buffer.from(await repd.arrayBuffer()).slice(0, 2).toString() === 'PK');

// 13. code-protected test
const ct = await j('/api/levels/owner', { method: 'POST', headers: O, body: JSON.stringify({ kind: 'tournament', title: 'E2E kodli turnir', access: 'code', timeLimitSeconds: 600 }) });
const cid = ct.b.id;
const code = ct.b.entryCode;
check('code tournament gets entry code', /^\d{6}$/.test(code || ''));
const cd = await j(`/api/levels/owner/${cid}`, { headers: O });
check('entry code stays visible to owner', cd.b.test?.entry_code === code, String(cd.b.test?.entry_code));
await j(`/api/levels/owner/${cid}/questions`, { method: 'POST', headers: O, body: JSON.stringify({ questions: [{ prompt: 'T1', options: ['a', 'b'], correctIndex: 0 }] }) });
await j(`/api/levels/owner/${cid}`, { method: 'PATCH', headers: O, body: JSON.stringify({ status: 'published' }) });
const noCode = await j(`/api/levels/tests/${cid}/start`, { method: 'POST', headers: S, body: JSON.stringify({ firstName: 'A', lastName: 'B', className: '1' }) });
check('code test refuses without code', noCode.s === 403, String(noCode.s));
const withCode = await j(`/api/levels/tests/${cid}/start`, { method: 'POST', headers: S, body: JSON.stringify({ firstName: 'A', lastName: 'B', className: '1', entryCode: code }) });
check('code test accepts right code', withCode.s === 201, String(withCode.s));

// 14. import TXT with preview then commit
const txt = '1. Yangi savol\nA) bir\nB) ikki *\n\n2. Noto‘g‘ri savol\nA) yo‘q\nB) yo‘q';
const fd = new FormData();
fd.append('file', new Blob([txt], { type: 'text/plain' }), 'q.txt');
const prev = await fetch(`${BASE}/api/levels/owner/${id}/import`, { method: 'POST', headers: { cookie: `el_session=${owner}` }, body: fd });
const pj = await prev.json();
check('import preview finds 1 valid question', pj.count === 1 && pj.errors.length === 1, JSON.stringify(pj));
const fd2 = new FormData();
fd2.append('file', new Blob([txt], { type: 'text/plain' }), 'q.txt');
const com = await fetch(`${BASE}/api/levels/owner/${id}/import?commit=1`, { method: 'POST', headers: { cookie: `el_session=${owner}` }, body: fd2 });
check('import commit adds 1', com.status === 201, String(com.status));

// 15. security: student cannot use owner routes; anon cannot list
const sOwn = await j('/api/levels/owner', { headers: S });
check('student blocked from owner list', sOwn.s === 403, String(sOwn.s));
const anon = await j('/api/levels/tests');
check('anonymous blocked from student list', anon.s === 401, String(anon.s));

console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED');
process.exit(fails ? 1 : 0);
