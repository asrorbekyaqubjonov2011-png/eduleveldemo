import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseAmount, stripHtml } from './telegramBot';

test('deposit accepts positive integer UZS and grouped Uzbek amounts', () => {
  for (const value of ['100000', '100 000', "100 000 so'm", '100\u00a0000 so‘m', '100000 UZS']) {
    assert.equal(parseAmount(value), 100000, value);
  }
});

test('deposit rejects unrelated numbers, decimals, negatives and ambiguous amounts', () => {
  for (const value of ['-100000', '10.5', '1,2', '100 20', '100000 ID 123', 'abc500', '0', '1000000000', '']) {
    assert.equal(parseAmount(value), null, value);
  }
});

test('plain fallback does not lose escaped angle brackets', () => {
  assert.equal(stripHtml('<b>English</b> &amp; 1 &lt; 2'), 'English & 1 < 2');
});
