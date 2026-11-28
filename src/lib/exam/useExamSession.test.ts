import assert from 'node:assert/strict';
import { test } from 'node:test';
import { guestKey } from './useExamSession';

test('guest exam identity stays stable when browser storage is unavailable', () => {
  const original = globalThis.localStorage;
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem() { throw new Error('Storage unavailable'); },
      setItem() { throw new Error('Storage unavailable'); }
    }
  });
  try {
    const first = guestKey();
    assert.ok(first.length >= 8);
    assert.equal(guestKey(), first);
  } finally {
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: original });
  }
});
