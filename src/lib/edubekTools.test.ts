import { test } from 'node:test';
import assert from 'node:assert/strict';
import { countWords, isBandStep, overallBand } from './edubekTools';

test('overall band: average rounded to the nearest half band', () => {
  assert.equal(overallBand(7, 7, 7, 7), 7);
  assert.equal(overallBand(7, 7, 7, 6), 7); // 6.75 rounds up to 7
  assert.equal(overallBand(7, 7, 6.5, 6), 6.5); // 6.625 rounds down to 6.5
  assert.equal(overallBand(6, 6, 6, 5), 6); // 5.75 rounds up to 6
  assert.equal(overallBand(5.5, 6, 6, 5), 5.5); // 5.625 rounds down to 5.5
  assert.equal(overallBand(5, 5, 5, 5.5), 5); // 5.125 rounds down to 5
});

test('overall band rejects values outside 0–9', () => {
  assert.equal(overallBand(10, 5, 5, 5), null);
  assert.equal(overallBand(-1, 5, 5, 5), null);
  assert.equal(overallBand(Number.NaN, 5, 5, 5), null);
});

test('band steps are whole or half bands only', () => {
  assert.ok(isBandStep(6.5));
  assert.ok(isBandStep(9));
  assert.ok(!isBandStep(6.3));
  assert.ok(!isBandStep(9.5));
});

test('word count ignores extra spaces and punctuation', () => {
  assert.equal(countWords(''), 0);
  assert.equal(countWords('   '), 0);
  assert.equal(countWords('Hello,   world!  It’s fine.'), 4);
  assert.equal(countWords('well-known fact 2026'), 3);
});
