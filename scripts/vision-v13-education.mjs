import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const base = new URL(process.env.BASE || 'https://127.0.0.1:3443');
if (base.origin !== 'https://127.0.0.1:3443') throw new Error('Isolated HTTPS fixture only');
const cookies = new Map();

async function call(role, method, path, data) {
  const headers = { 'content-type': 'application/json' };
  if (cookies.has(role)) headers.cookie = cookies.get(role);
  const res = await fetch(new URL('/api/' + path, base), { method, headers, body: JSON.stringify(data) });
  const cookie = res.headers.getSetCookie().find(value => value.startsWith('el_session='));
  if (cookie) cookies.set(role, cookie.split(';')[0]);
  return { status: res.status, data: await res.json().catch(() => null), headers: res.headers };
}

async function request(role, method, path, data, status = 200) {
  const result = await call(role, method, path, data);
  assert.equal(result.status, status, method + ' ' + path);
  return result.data;
}

await request('owner', 'POST', 'auth/login', { loginInput: process.env.OWNER_USERNAME, password: process.env.OWNER_PASSWORD });
for (const role of ['student', 'other']) {
  const email = randomUUID() + '@test.local';
  await request(role, 'POST', 'auth/register', { name: 'Test', surname: 'Fixture', email, identifier: email, password: 'OnlyFixture123!' });
}

const title = 'Library fixture ' + randomUUID();
const { url } = await request('owner', 'POST', 'upload', { kind: 'pdf', imageBase64: Buffer.from('%PDF-1.4\n%%EOF\n').toString('base64'), filename: 'fixture.pdf' });
assert.ok(url?.startsWith('/api/uploads/'));
const storedPath = url.replace('/api/', '');
const { book } = await request('owner', 'POST', 'books', {
  title, requiredVIP: 'start', track: 'ielts', pdfUrl: url,
  pages: [{ pageNumber: 1, content: 'Fixture private page' }]
});
async function catalog(role) {
  return (await request(role, 'GET', 'db/all')).data.digitalBooks.filter(book => book.title === title);
}
assert.equal(book.track, 'ielts');
assert.equal(book.requiredVIP, 'start');
assert.deepEqual((await catalog('student'))[0].pages, []);
assert.equal((await catalog('guest'))[0].pdfUrl, '');
await request('guest', 'GET', storedPath, undefined, 404);
await request('student', 'PUT', 'books/' + book.id, { requiredVIP: 'free' }, 403);
await request('owner', 'PUT', 'books/' + book.id, { requiredVIP: 'free' });
assert.equal((await catalog('student'))[0].pdfUrl, url);
assert.equal((await catalog('owner')).length, 1);
const file = await call('student', 'GET', storedPath);
assert.equal(file.status, 200);
assert.match(file.headers.get('cache-control'), /no-store/);
await request('owner', 'DELETE', 'books/' + book.id);
assert.equal((await catalog('owner')).length, 0);
await request('student', 'GET', storedPath, undefined, 404);
console.log('PASS library create, tier update in place, role checks, PDF and removal');

const open = (published) => request('owner', 'POST', 'tests', { title: 'Mock fixture', published, requiredVIP: 'free', durationMinutes: 3 });
const { test } = await open(true);
const { test: draft } = await open(false);
const { question } = await request('owner', 'POST', 'questions', { testId: test.id, prompt: 'She ___ at six.', options: ['get up', 'gets up'], correctAnswerIndex: 1 });
await request('student', 'POST', 'exams/start', { testId: draft.id }, 404);
const snapshot = (await request('student', 'GET', 'db/all')).data;
assert.equal(snapshot.questions.find(row => row.id === question.id).correctAnswerIndex, undefined);
const { session } = await request('student', 'POST', 'exams/start', { testId: test.id });
assert.ok(Date.parse(session.endsAt) > Date.parse(session.startedAt));
const answers = { [question.id]: 1 };
await request('student', 'POST', 'exams/save', { testId: test.id, sessionId: session.id, answers });
const resumed = (await request('student', 'POST', 'exams/start', { testId: test.id })).session;
assert.equal(resumed.id, session.id);
assert.deepEqual(resumed.answers, answers);
const submission = { testId: test.id, sessionId: session.id, answers };
const finished = await request('student', 'POST', 'test-attempts', submission);
assert.equal(finished.result.correctCount, 1);
assert.equal((await request('student', 'POST', 'test-attempts', submission)).duplicate, true);
await request('other', 'POST', 'exams/review', { attemptId: finished.attempt.id }, 403);
assert.equal((await request('student', 'POST', 'exams/review', { attemptId: finished.attempt.id })).review[0].correctAnswerIndex, 1);
console.log('PASS mock draft visibility, answer protection, resume, timer, grading, duplicate and review');
