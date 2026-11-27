import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateIeltsBand,
  calculateCefrLevel,
  calculateNextSm2Review,
  checkVipFeatureAccess,
  calculateWpmAndFillers,
} from './eduLogic';

test('calculateIeltsBand calculates correct IELTS band scores', () => {
  assert.equal(calculateIeltsBand(40), 9.0);
  assert.equal(calculateIeltsBand(39), 9.0);
  assert.equal(calculateIeltsBand(37), 8.5);
  assert.equal(calculateIeltsBand(35), 8.0);
  assert.equal(calculateIeltsBand(30), 7.0);
  assert.equal(calculateIeltsBand(23), 6.0);
  assert.equal(calculateIeltsBand(10), 4.0);
  assert.equal(calculateIeltsBand(5), 3.5);
});

test('calculateCefrLevel maps percentages to official CEFR scales', () => {
  assert.equal(calculateCefrLevel(95), 'C2');
  assert.equal(calculateCefrLevel(78), 'C1');
  assert.equal(calculateCefrLevel(65), 'B2');
  assert.equal(calculateCefrLevel(50), 'B1');
  assert.equal(calculateCefrLevel(35), 'A2');
  assert.equal(calculateCefrLevel(20), 'A1');
});

test('calculateNextSm2Review handles SuperMemo intervals and lapses', () => {
  const step1 = calculateNextSm2Review(0, 0, 2.5, 5);
  assert.equal(step1.repetitions, 1);
  assert.equal(step1.interval, 1);
  assert.ok(step1.easeFactor >= 2.5);

  const step2 = calculateNextSm2Review(step1.interval, step1.repetitions, step1.easeFactor, 4);
  assert.equal(step2.repetitions, 2);
  assert.equal(step2.interval, 6);

  const fail = calculateNextSm2Review(step2.interval, step2.repetitions, step2.easeFactor, 1);
  assert.equal(fail.repetitions, 0);
  assert.equal(fail.interval, 1);
});

test('checkVipFeatureAccess enforces tier hierarchy across 7 Edu Level tiers', () => {
  assert.equal(checkVipFeatureAccess('free', 'start'), false);
  assert.equal(checkVipFeatureAccess('start', 'start'), true);
  assert.equal(checkVipFeatureAccess('gold', 'start'), true);
  assert.equal(checkVipFeatureAccess('pro', 'gold'), true);
  assert.equal(checkVipFeatureAccess('pro', 'legend'), false);
  assert.equal(checkVipFeatureAccess('legend', 'pro'), true);
  assert.equal(checkVipFeatureAccess('individual', 'legend'), true);
});

test('calculateWpmAndFillers accurately calculates speaking telemetry', () => {
  const speech = "Well, um, I believe that technology, you know, basically changes education.";
  const result = calculateWpmAndFillers(speech, 6);
  assert.ok(result.wordCount > 5);
  assert.ok(result.wpm > 50);
  assert.ok(result.fillerCount >= 2);
  assert.ok(result.fillerRate > 0);
});
