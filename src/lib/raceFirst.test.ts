import { test } from 'node:test';
import assert from 'node:assert/strict';
import { raceFirst } from './raceFirst';

const delayed = (value: string, ms: number) => () => new Promise<string>((resolve) => setTimeout(() => resolve(value), ms));
const failing = (message: string, ms: number) => () => new Promise<string>((_, reject) => setTimeout(() => reject(new Error(message)), ms));
const none = { isFatal: () => false };

test('the first answer wins; a slow first model is overtaken by the hedged second one', async () => {
  const runs: Record<string, () => Promise<string>> = { slow: delayed('slow', 400), fast: delayed('fast', 40) };
  const started = Date.now();
  const winner = await raceFirst(['slow', 'fast'], (m) => runs[m](), { hedgeMs: 60, maxRacers: 3, deadlineMs: 2000, ...none });
  assert.equal(winner, 'fast');
  assert.ok(Date.now() - started < 300, 'answered well before the slow model');
});

test('a failed model starts the next one at once', async () => {
  const runs: Record<string, () => Promise<string>> = { bad: failing('bad', 10), good: delayed('good', 10) };
  assert.equal(await raceFirst(['bad', 'good'], (m) => runs[m](), { hedgeMs: 5000, maxRacers: 3, deadlineMs: 2000, ...none }), 'good');
});

test('when every model fails the race fails with all the messages', async () => {
  const runs: Record<string, () => Promise<string>> = { a: failing('err-a', 5), b: failing('err-b', 5) };
  await assert.rejects(raceFirst(['a', 'b'], (m) => runs[m](), { hedgeMs: 5000, maxRacers: 3, deadlineMs: 2000, ...none }), (e: Error) => /err-a/.test(e.message) && /err-b/.test(e.message));
});

test('a fatal error stops the race at once', async () => {
  const fatal = new Error('API key not valid');
  const runs: Record<string, () => Promise<string>> = { a: () => Promise.reject(fatal), b: delayed('b', 30) };
  await assert.rejects(raceFirst(['a', 'b'], (m) => runs[m](), { hedgeMs: 5000, maxRacers: 3, deadlineMs: 2000, isFatal: (e) => e === fatal }), (e: Error) => e === fatal);
});

test('nothing answers before the deadline: the race fails', async () => {
  await assert.rejects(raceFirst(['a'], delayed('a', 500), { hedgeMs: 5000, maxRacers: 1, deadlineMs: 50, ...none }), /vaqt tugadi/);
});
