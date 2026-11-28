import assert from 'node:assert/strict';
import { test } from 'node:test';
import { judgeMeaning } from './judge';

test('translation grading preserves exact matches and blocks unverified OpenRouter decisions', async () => {
  const previousKey = process.env.OPENROUTER_API_KEY;
  const originalFetch = globalThis.fetch;
  let calls = 0;
  process.env.OPENROUTER_API_KEY = 'synthetic-test-key';
  globalThis.fetch = (async () => {
    calls += 1;
    throw new Error('Unexpected upstream request');
  }) as typeof fetch;
  try {
    const input = { word: 'book', accepted: ['kitob'] };
    const exact = await judgeMeaning({ ...input, given: 'Kitob!' });
    assert.equal(exact.source, 'exact');
    assert.equal(exact.match, true);
    const other = await judgeMeaning({ ...input, given: 'kitoblar' });
    assert.equal(other.source, 'unavailable');
    assert.equal(calls, 0);
  } finally {
    globalThis.fetch = originalFetch;
    if (previousKey === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = previousKey;
  }
});
