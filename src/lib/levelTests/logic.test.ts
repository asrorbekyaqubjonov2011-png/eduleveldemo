import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  attemptDeadline,
  canStartAttempt,
  generateUnlockCode,
  isExpired,
  levelForPercent,
  registerViolation,
  scoreAnswers,
  validateGradingRules
} from './logic';

const qs = [
  { id: 'q1', correct_index: 1, points: 2 },
  { id: 'q2', correct_index: 0, points: 3 },
  { id: 'q3', correct_index: 2, points: 1 }
];

describe('scoreAnswers', () => {
  test('counts weighted points and percent', () => {
    assert.deepEqual(scoreAnswers(qs, { q1: 1, q2: 0, q3: 0 }), { score: 5, maxScore: 6, percent: 83.33 });
  });
  test('unanswered, out-of-range and non-integer answers score zero', () => {
    assert.equal(scoreAnswers(qs, { q1: 9, q2: 0.5 as number }).score, 0);
  });
  test('no questions gives 0 percent, not NaN', () => {
    assert.deepEqual(scoreAnswers([], {}), { score: 0, maxScore: 0, percent: 0 });
  });
});

describe('levelForPercent', () => {
  const rules = [
    { min: 0, max: 39, level: 'A1' },
    { min: 40, max: 69, level: 'B1' },
    { min: 70, max: 100, level: 'C1', certificate: true }
  ];
  test('maps by inclusive ranges', () => {
    assert.equal(levelForPercent(0, rules).level, 'A1');
    assert.equal(levelForPercent(39, rules).level, 'A1');
    assert.equal(levelForPercent(40, rules).level, 'B1');
    assert.deepEqual(levelForPercent(100, rules), { level: 'C1', certificate: true });
  });
  test('no matching rule gives no level and no certificate', () => {
    assert.deepEqual(levelForPercent(50, []), { level: null, certificate: false });
    assert.equal(levelForPercent(Number.NaN, rules).level, null);
  });
});

describe('validateGradingRules', () => {
  test('accepts clean non-overlapping rules', () => {
    assert.equal(validateGradingRules([{ min: 0, max: 50, level: 'A2' }, { min: 51, max: 100, level: 'B1' }]).ok, true);
  });
  test('rejects empty and non-object rule entries without throwing', () => {
    for (const entry of [null, false, [], 'A2']) {
      assert.equal(validateGradingRules([entry]).ok, false);
    }
  });
  test('rejects overlaps, bad ranges, empty level names and non-arrays', () => {
    assert.equal(validateGradingRules([{ min: 0, max: 50, level: 'A' }, { min: 50, max: 100, level: 'B' }]).ok, false);
    assert.equal(validateGradingRules([{ min: 60, max: 40, level: 'A' }]).ok, false);
    assert.equal(validateGradingRules([{ min: 0, max: 101, level: 'A' }]).ok, false);
    assert.equal(validateGradingRules([{ min: 0, max: 10, level: '   ' }]).ok, false);
    assert.equal(validateGradingRules('x').ok, false);
  });
});

describe('timing', () => {
  const start = new Date('2026-11-24T10:00:00Z');
  test('deadline is the earlier of time limit and test end', () => {
    assert.equal(attemptDeadline(start, 1800, null).toISOString(), '2026-11-24T10:30:00.000Z');
    assert.equal(attemptDeadline(start, 1800, new Date('2026-11-24T10:10:00Z')).toISOString(), '2026-11-24T10:10:00.000Z');
  });
  test('expiry happens at the deadline', () => {
    const d = new Date('2026-11-24T10:30:00Z');
    assert.equal(isExpired(d, new Date('2026-11-24T10:29:59Z')), false);
    assert.equal(isExpired(d, d), true);
  });
});

describe('violations', () => {
  test('two warnings then blocked on the third leave (max 2)', () => {
    const a = registerViolation(0, 2);
    assert.deepEqual(a, { violations: 1, warningsLeft: 1, blocked: false });
    const b = registerViolation(a.violations, 2);
    assert.deepEqual(b, { violations: 2, warningsLeft: 0, blocked: false });
    assert.equal(registerViolation(b.violations, 2).blocked, true);
  });
  test('max 0 blocks on the first leave', () => {
    assert.equal(registerViolation(0, 0).blocked, true);
  });
});

describe('unlock codes and attempts', () => {
  test('unlock code is six digits', () => {
    assert.match(generateUnlockCode(() => 0.5), /^\d{6}$/);
    assert.match(generateUnlockCode(), /^\d{6}$/);
  });
  test('attempt limit', () => {
    assert.equal(canStartAttempt(0, 1), true);
    assert.equal(canStartAttempt(1, 1), false);
    assert.equal(canStartAttempt(2, 3), true);
    assert.equal(canStartAttempt(0, 0), true); // at least one attempt is always allowed
  });
});
