import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeAnswer, acceptedAnswers, isTextAnswerCorrect, scoreReading, scoreMcq, sanitizeAnswers } from './scoring';

test('normalizeAnswer handles case, spacing, quotes, punctuation and TFNG aliases', () => {
  assert.equal(normalizeAnswer('  The  Ocean. '), 'the ocean');
  assert.equal(normalizeAnswer('“NOT GIVEN”'), 'not given');
  assert.equal(normalizeAnswer('ng'), 'not given');
  assert.equal(normalizeAnswer('T'), 'true');
  assert.equal(normalizeAnswer('Y'), 'yes');
  assert.equal(normalizeAnswer(undefined), '');
});

test('acceptedAnswers splits alternatives', () => {
  assert.deepEqual(acceptedAnswers('colour|color'), ['colour', 'color']);
  assert.deepEqual(acceptedAnswers('1990s / 1990’s'), ['1990s', "1990's"]);
  assert.deepEqual(acceptedAnswers(''), []);
});

test('isTextAnswerCorrect accepts alternatives and rejects empty answers', () => {
  assert.equal(isTextAnswerCorrect('Color', 'colour|color'), true);
  assert.equal(isTextAnswerCorrect('', 'x'), false);
  assert.equal(isTextAnswerCorrect('False', 'FALSE'), true);
  assert.equal(isTextAnswerCorrect('false', 'NOT GIVEN'), false);
});

test('scoreReading counts correct answers with weights and builds review', () => {
  const qs = [
    { id: 'a', correctAnswer: 'TRUE', explanation: 'e1' },
    { id: 'b', correctAnswer: 'river|stream', points: 2 },
    { id: 'c', correctAnswer: 'C' }
  ];
  const r = scoreReading(qs, { a: 't', b: 'Stream', c: 'B' }, 'general');
  assert.equal(r.correctCount, 2);
  assert.equal(r.totalQuestions, 3);
  assert.equal(r.earnedPoints, 3);
  assert.equal(r.totalPoints, 4);
  assert.equal(r.percentage, 75);
  assert.equal(r.band, undefined, 'no conversion for non-standard length');
  assert.equal(r.review.find((x) => x.id === 'c')?.isCorrect, false);
  assert.equal(r.review.find((x) => x.id === 'a')?.explanation, 'e1');
});

test('IELTS band only for exactly 40 reading questions', () => {
  const qs = Array.from({ length: 40 }, (_, i) => ({ id: 'q' + i, correctAnswer: 'x' }));
  const answers: Record<string, string> = {};
  for (let i = 0; i < 30; i++) answers['q' + i] = 'x';
  const r = scoreReading(qs, answers, 'ielts');
  assert.equal(r.correctCount, 30);
  assert.equal(r.band, 7.0);
});

test('CEFR 75-point scale only for exactly 35 reading questions', () => {
  const qs = Array.from({ length: 35 }, (_, i) => ({ id: 'q' + i, correctAnswer: 'x' }));
  const r = scoreReading(qs, { q0: 'x' }, 'cefr');
  assert.equal(r.maxScore, 75);
  assert.ok(typeof r.cefrLevel === 'string');
  const short = scoreReading(qs.slice(0, 10), { q0: 'x' }, 'cefr');
  assert.equal(short.maxScore, 10);
  assert.equal(short.cefrLevel, undefined);
});

test('scoreMcq compares option indexes and ignores invalid input', () => {
  const qs = [
    { id: 'a', correctAnswerIndex: 1 },
    { id: 'b', correctAnswerIndex: 0 },
    { id: 'c', correctAnswerIndex: 3 }
  ];
  const r = scoreMcq(qs, { a: 1, b: '0', c: 'x' }, 'ielts', 'mock');
  assert.equal(r.correctCount, 2);
  assert.equal(r.review.find((x) => x.id === 'c')?.given, null);
});

test('sanitizeAnswers drops unknown ids and long values', () => {
  const out = sanitizeAnswers({ a: 'x'.repeat(500), b: 2, evil: 'y', c: { nested: 1 } }, new Set(['a', 'b', 'c']));
  assert.equal((out.a as string).length, 200);
  assert.equal(out.b, 2);
  assert.equal('evil' in out, false);
  assert.equal('c' in out, false);
});
