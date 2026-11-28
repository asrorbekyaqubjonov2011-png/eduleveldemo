#!/usr/bin/env node
// Mashqlar end-to-end check against a running server (use a test database).
// Usage: BASE=http://localhost:3000 OWNER_PASSWORD=... node scripts/smoke-exercises.mjs
const BASE = (process.env.BASE || 'http://localhost:3000') + '/api';
const OWNER_PASSWORD = process.env.OWNER_PASSWORD;
if (!OWNER_PASSWORD) { console.error('Set OWNER_PASSWORD'); process.exit(1); }
const phone = '+99891' + String(Date.now()).slice(-7);
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

const owner = await call('POST', 'auth/login', { loginInput: process.env.OWNER_USERNAME || 'jasurbek', password: OWNER_PASSWORD });
check('owner logs in', owner.status === 200 && !!owner.cookie);
const oc = owner.cookie;

const questions = [
  { type: 'mcq', prompt: 'What is the capital of Uzbekistan?', options: ['Samarkand', 'Tashkent', 'Bukhara', 'Namangan'], correct: 1, explanation: 'Toshkent — poytaxt.' },
  { type: 'gap', prompt: 'She ___ to school every day.', correct: 'goes', explanation: 'Present simple, third person.' },
  { type: 'short', prompt: 'Describe your daily routine.', correct: '' }
];
let r = await call('POST', 'exercises', { skill: 'reading', level: 'B1', title: 'Smoke mashq', instructions: 'Javob bering', passage: 'Text here.', questions, status: 'draft' }, oc);
check('owner saves a draft', r.status === 200 && r.json.exercise?.status === 'draft', r.json.message);
const exId = r.json.exercise?.id;

r = await call('POST', 'exercises', { skill: 'reading', level: 'B1', title: 'Bad', questions: [{ type: 'mcq', prompt: 'x', options: ['a'], correct: 0 }] }, oc);
check('invalid MCQ (one option) is rejected', r.status === 400, r.json.message);
r = await call('POST', 'exercises', { skill: 'reading', level: 'B1', title: 'Bad2', questions: [{ type: 'gap', prompt: 'no blank here', correct: 'x' }] }, oc);
check('gap without ___ is rejected', r.status === 400, r.json.message);
r = await call('POST', 'exercises', { skill: 'listening', level: 'B1', title: 'Bad3', audioUrl: 'javascript:alert(1)', questions }, oc);
check('non-http audio URL is rejected', r.status === 400, r.json.message);

const student = await call('POST', 'auth/register', { name: 'Mashq', surname: 'Talaba', identifier: phone, password: 'studentpass1', track: 'general' });
check('student registers', student.status === 200 && !!student.cookie, student.json.message);
const sc = student.cookie;

let db = await call('GET', 'db/all', null, sc);
check('draft is hidden from the student', !(db.json.data.exercises || []).some((e) => e.id === exId));

r = await call('POST', 'exercises', { id: exId, skill: 'reading', level: 'B1', title: 'Smoke mashq', instructions: 'Javob bering', passage: 'Text here.', questions, status: 'published' }, oc);
check('owner publishes the exercise', r.status === 200 && r.json.exercise?.status === 'published');

db = await call('GET', 'db/all', null, sc);
const seen = (db.json.data.exercises || []).find((e) => e.id === exId);
check('student sees the published exercise', !!seen);
const leaked = JSON.stringify(seen || {}).includes('correct') || JSON.stringify(seen || {}).includes('explanation');
check('student copy has no answer keys or explanations', !!seen && !leaked);

r = await call('POST', 'exercises/submit', { exerciseId: exId, answers: { q1: 1, q2: 'goes', q3: 'I wake up at seven.' } }, sc);
check('submission is graded on the server', r.status === 200 && r.json.attempt?.score === 2 && r.json.attempt?.maxScore === 2, `score ${r.json.attempt?.score}/${r.json.attempt?.maxScore}`);
check('short answer is not auto-graded', r.json.results?.[2]?.graded === false);

r = await call('POST', 'exercises/submit', { exerciseId: exId, answers: { q1: 0, q2: 'went' } }, sc);
check('wrong answers score 0 and reveal the expected answer', r.json.attempt?.score === 0 && r.json.results?.[0]?.expected === 1);

r = await call('POST', 'exercises/submit', { exerciseId: exId, answers: { q2: '  GOES. ' } }, sc);
check('gap answer ignores case, spaces and final punctuation', r.json.results?.[1]?.correct === true);

db = await call('GET', 'db/all', null, sc);
const mine = (db.json.data.exerciseAttempts || []).filter((a) => a.exerciseId === exId);
check('student sees own attempts', mine.length === 3, `${mine.length} attempts`);

const anon = await call('GET', 'db/all');
check('anonymous visitor sees no attempts and no drafts', (anon.json.data.exerciseAttempts || []).length === 0 && !(anon.json.data.exercises || []).some((e) => e.status === 'draft'));

r = await call('POST', 'exercises/submit', { exerciseId: 'nope', answers: {} }, sc);
check('unknown exercise is rejected', r.status === 404);

r = await call('POST', 'ai/generate-exercises', { sourceText: 'x'.repeat(60), skill: 'reading', level: 'B1' }, oc);
check('AI generation reports missing key clearly', r.status === 503 && r.json.code === 'AI_NOT_CONFIGURED', r.json.message);

r = await call('DELETE', `exercises/${exId}`, null, oc);
check('owner deletes the exercise', r.status === 200);
db = await call('GET', 'db/all', null, sc);
check('deleted exercise disappears', !(db.json.data.exercises || []).some((e) => e.id === exId));

console.log(failures ? `\n${failures} check(s) failed` : '\nAll Mashqlar checks passed');
process.exit(failures ? 1 : 0);
