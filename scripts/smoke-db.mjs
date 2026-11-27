#!/usr/bin/env node
// End-to-end check of the database-backed flows against a running server.
// Usage: BASE=http://localhost:3000 OWNER_PASSWORD=... node scripts/smoke-db.mjs
// Creates a course, a lesson and a student account in the target database.
// Run it against a test database, not production data.
const OWNER_PASSWORD = process.env.OWNER_PASSWORD;
// A new student per run, so the script can be repeated on the same database.
const PHONE = "+99890" + String(Date.now()).slice(-7);
const BASE = process.env.BASE || 'http://localhost:3000';
const jars = { owner: '', student: '' };
const cookieFrom = (res) => (res.headers.get('set-cookie') || '').match(/el_session=([^;]+)/)?.[1] || '';
async function call(who, method, path, body) {
  const headers = { 'content-type': 'application/json' };
  if (jars[who]) headers.cookie = `el_session=${jars[who]}`;
  const res = await fetch(`${BASE}/api/${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const tok = cookieFrom(res);
  if (tok) jars[who] = tok;
  let json = null; try { json = await res.json(); } catch {}
  return { status: res.status, json };
}
const step = (name, r, ok) => console.log(`${ok ? 'PASS' : 'FAIL'} ${name} -> ${r.status}${r.json?.message ? ' | ' + String(r.json.message).slice(0, 90) : ''}`);

const results = {};
let r = await call('owner', 'POST', 'auth/login', { loginInput: 'jasurbek', password: OWNER_PASSWORD });
results.ownerLogin = r; step('owner login', r, r.status === 200 && r.json?.role === 'owner');

r = await call('owner', 'POST', 'courses', { title: 'Smoke kurs', description: 'Test', level: 'ielts', track: 'ielts', price: 0, published: true, requiredVIP: 'none' });
step('owner creates course', r, r.status < 300);
const courseId = r.json?.course?.id || r.json?.id;
console.log('   course id:', courseId);

r = await call('owner', 'POST', 'lessons', { courseId, title: 'Dars 1', videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', durationMinutes: 5, orderIndex: 0, isPublished: true, moduleId: '' });
step('owner creates lesson', r, r.status < 300);
const lessonId = r.json?.lesson?.id || r.json?.id;
console.log('   lesson id:', lessonId);

r = await call('student', 'POST', 'auth/register', { name: 'Test', surname: 'Talaba', identifier: PHONE, password: 'studentpass1', region: 'Toshkent', track: 'ielts', targetScore: '7.0', studyTimeDaily: '1 soat' });
step('student registers', r, r.status < 300 && !!r.json?.user);
r = await call('student', 'GET', 'auth/me');
step('student /auth/me', r, r.status === 200);
const studentId = r.json?.user?.id;
console.log('   student id:', studentId);

r = await call('student', 'POST', 'lessons/toggle-complete', { userId: studentId, lessonId });
step('student completes lesson', r, r.status < 300);

r = await call('student', 'POST', 'deposits/request', { amount: 190000, method: 'card', note: 'smoke', receiptUrl: '/receipt-test-' + Date.now() + '.png' });
step('student requests deposit', r, r.status < 300);
const depId = r.json?.deposit?.id || r.json?.transaction?.id || r.json?.id;
console.log('   deposit id:', depId);
if (depId) { r = await call('owner', 'POST', `owner/deposits/approve/${depId}`, {}); step('owner approves deposit', r, r.status < 300); }

r = await call('student', 'POST', 'support-tickets', { message: 'Savol: smoke', category: 'kurs', userName: 'Test Talaba', userPhone: PHONE });
step('student opens support ticket', r, r.status < 300);

r = await call('owner', 'GET', 'db/all');
const d = r.json?.data || {};
console.log('   db counts:', { users: d.users?.length, courses: d.courses?.length, lessons: d.lessons?.length, deposits: d.depositTransactions?.length, tickets: d.supportTickets?.length, vipPlans: d.vipPlans?.length, sections: d.siteSections?.length });
const me = (d.users || []).find((u) => u.id === studentId);
console.log('   student after deposit/complete:', { balance: me?.balance, completed: me?.completedLessons });

r = await call('student', 'POST', 'auth/login', { loginInput: PHONE, password: 'wrongpass99' });
step('wrong password rejected', r, r.status === 400 || r.status === 401);
r = await call('student', 'POST', 'auth/login', { loginInput: PHONE, password: 'studentpass1' });
step('student login (correct password)', r, r.status === 200);

// XP farming guard: toggle the lesson on, off, on again — XP must be granted once.
const before = (await call('owner', 'GET', 'db/all')).json.data.users.find((u) => u.id === studentId)?.xp;
await call('student', 'POST', 'lessons/toggle-complete', { userId: studentId, lessonId });
await call('student', 'POST', 'lessons/toggle-complete', { userId: studentId, lessonId });
await call('student', 'POST', 'lessons/toggle-complete', { userId: studentId, lessonId });
const after = (await call('owner', 'GET', 'db/all')).json.data.users.find((u) => u.id === studentId);
console.log(`XP guard: xp before=${before}, after 3 toggles=${after?.xp}, completed=${JSON.stringify(after?.completedLessons)}`);
console.log(typeof before === 'number' && typeof after?.xp === 'number' && after.xp === before ? 'PASS no XP farming (toggles did not add XP)' : 'FAIL XP check invalid or farming possible');
