import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { encodeForTest } from './snapshot';

describe('encode', () => {
  test('NUL characters are removed from text', () => {
    assert.equal(encodeForTest('a\u0000b'), 'ab');
  });
  test('NUL characters are removed inside JSON values, a literal backslash-u0000 text is kept', () => {
    const out = encodeForTest({ x: 'a\u0000b', y: ['c\u0000'], z: 'keep \\u0000 text' }, true) as string;
    assert.ok(!out.includes('\\u0000') || out.includes('keep \\\\u0000 text'));
    assert.deepEqual(JSON.parse(out), { x: 'ab', y: ['c'], z: 'keep \\u0000 text' });
  });
  test('ordinary values are unchanged and bad numbers still fail clearly', () => {
    assert.equal(encodeForTest('salom'), 'salom');
    assert.equal(encodeForTest(5), 5);
    assert.throws(() => encodeForTest(Number.NaN), /Invalid number/);
  });
});
