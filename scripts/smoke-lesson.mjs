#!/usr/bin/env node
// Lesson flow end-to-end against a running server (use a test database):
// watch → test unlocks → graded on the server → lesson completes → next lesson opens.
// Usage: BASE=http://localhost:3000 OWNER_PASSWORD=... node scripts/smoke-lesson.mjs
const BASE = (process.env.BASE || 'http://localhost:3000') + '/api';
const OWNER_PASSWORD = process.env.OWNER_PASSWORD;
if (!OWNER_PASSWORD) { console.error('Set OWNER_PASSWORD'); process.exit(1); }
const phone = '+99894' + String(Date.now()).slice(-7);
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
const oc = owner.cookie;
check('owner logs in', owner.status === 200 && !!oc);

const course = await call('POST', 'courses', { title: 'Lesson smoke', description: 'Test', level: 'ielts', track: 'ielts', price: 0, published: true, requiredVIP: 'none' }, oc);
const courseId = course.json.course?.id || course.json.id;
const notes = 'Present Simple: ishlatiladi odatiy harakatlar uchun. He works every day. Third person singular takes -s.';
const a = await call('POST', 'lessons', { courseId, title: 'Dars A', videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', durationMinutes: 5, orderIndex: 1, notesMarkdown: notes, homework: '5 ta gap yozing', resources: [{ title: 'PDF', url: 'https://example.com/a.pdf' }] }, oc);
const b = await call('POST', 'lessons', { courseId, title: 'Dars B', videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', durationMinutes: 5, orderIndex: 2 }, oc);
const lessonA = a.json.lesson?.id, lessonB = b.json.lesson?.id;
check('owner creates two lessons with notes, homework and materials', !!lessonA && !!lessonB && a.json.lesson?.homework === '5 ta gap yozing');

const testRes = await call('POST', 'tests', { title: 'Dars A testi', type: 'quiz', published: true, track: 'ielts', durationMinutes: 10 }, oc);
const testId = testRes.json.test?.id;
const qs = [
  { prompt: 'He ___ to school.', options: ['go', 'goes', 'going'], correctAnswerIndex: 1, explanation: 'Third person -s.' },
  { prompt: 'They ___ football on Sundays.', options: ['play', 'plays'], correctAnswerIndex: 0, explanation: 'Plural subject, no -s.' },
  { prompt: 'I ___ English every day.', options: ['study', 'studies'], correctAnswerIndex: 0, explanation: 'I takes the base form.' }
];
for (const q of qs) await call('POST', 'questions', { testId, ...q }, oc);
await call('PUT', `lessons/${lessonA}`, { testId }, oc);
check('owner attaches a test to lesson A', !!testId);

const reg = await call('POST', 'auth/register', { name: 'Dars', surname: 'Talaba', identifier: phone, password: 'studentpass1', track: 'ielts' });
const sc = reg.cookie;
check('student registers on the ielts track', reg.status === 200 && !!sc, reg.json.message);

let r = await call('POST', 'lessons/quiz-submit', { lessonId: lessonA, answers: { [`${testId}`]: 0 } }, sc);
check('test is refused before the video is watched', r.status === 400, r.json.message);

r = await call('POST', 'lessons/quiz-submit', { lessonId: lessonB, answers: {} }, sc);
check('lesson B is locked until lesson A is completed', r.status === 403, r.json.message);

r = await call('POST', 'lessons/progress', { lessonId: lessonA, position: 120, duration: 300, watched: true }, sc);
check('"watched" is stored with the current position', r.status === 200 && r.json.progress?.watched === true && r.json.progress?.position === 120);

const qIds = (await call('GET', 'db/all', null, sc)).json.data.questions.filter((q) => q.testId === testId).map((q) => q.id);
check('student copy of the questions has no answer key or explanation',
  (await call('GET', 'db/all', null, sc)).json.data.questions.filter((q) => q.testId === testId).every((q) => q.correctAnswerIndex === undefined && q.explanation === undefined));

const wrong = Object.fromEntries(qIds.map((id) => [id, 0]));
r = await call('POST', 'lessons/quiz-submit', { lessonId: lessonA, answers: wrong }, sc);
check('wrong answers are graded on the server, lesson not completed', r.status === 200 && r.json.passed === false && r.json.percent === 67, `percent ${r.json.percent} (2 of 3 answers 0 are correct)`);

const right = { [qIds[0]]: 1, [qIds[1]]: 0, [qIds[2]]: 0 };
r = await call('POST', 'lessons/quiz-submit', { lessonId: lessonA, answers: right }, sc);
check('correct answers pass the test and complete the lesson', r.status === 200 && r.json.passed === true && r.json.percent === 100);
check('explanations are returned after submitting', (r.json.results || []).every((x) => typeof x.explanation === 'string'));

const after = (await call('GET', 'db/all', null, sc)).json.data;
const me = after.users.find((u) => u.phone === phone);
check('lesson A is in completed lessons', (me.completedLessons || []).includes(lessonA));
const xpAfterPass = me.xp;
await call('POST', 'lessons/quiz-submit', { lessonId: lessonA, answers: right }, sc);
const xpAgain = (await call('GET', 'db/all', null, sc)).json.data.users.find((u) => u.phone === phone).xp;
check('passing again does not award XP twice', xpAgain === xpAfterPass, `${xpAfterPass} → ${xpAgain}`);

r = await call('POST', 'lessons/progress', { lessonId: lessonB, position: 0, duration: 0, watched: true }, sc);
r = await call('POST', 'lessons/quiz-submit', { lessonId: lessonB, answers: {} }, sc);
check('lesson B has no test yet and says so', r.status === 400, r.json.message);

r = await call('POST', 'lessons/generate-quiz', { lessonId: lessonA, count: 5 }, oc);
check('AI test generation without a key explains what to configure', r.status === 502 || r.status === 200, r.json.message || 'generated');

console.log(failures ? `\n${failures} check(s) failed` : '\nAll lesson checks passed');
process.exit(failures ? 1 : 0);
