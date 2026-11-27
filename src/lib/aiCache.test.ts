import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { AnswerCache } from './aiCache';

describe('AnswerCache', () => {
  test('the second identical call is a hit and does not compute again', async () => {
    const c = new AnswerCache<string>();
    let calls = 0;
    const k = AnswerCache.key(['translate', 'apple']);
    assert.equal(await c.get(k, async () => (calls++, 'olma')), 'olma');
    assert.equal(await c.get(k, async () => (calls++, 'x')), 'olma');
    assert.equal(calls, 1);
    assert.deepEqual(c.stats(), { hits: 1, misses: 1, shared: 0, size: 1 });
  });
  test('two identical calls at the same moment share one computation', async () => {
    const c = new AnswerCache<string>();
    let calls = 0;
    const slow = async () => { calls++; await new Promise((r) => setTimeout(r, 20)); return 'ok'; };
    const k = AnswerCache.key(['q']);
    const [a, b] = await Promise.all([c.get(k, slow), c.get(k, slow)]);
    assert.equal(a, 'ok');
    assert.equal(b, 'ok');
    assert.equal(calls, 1);
    assert.equal(c.stats().shared, 1);
  });
  test('failures are not cached and entries expire', async () => {
    const c = new AnswerCache<string>(1000);
    const k = AnswerCache.key(['f']);
    await assert.rejects(c.get(k, async () => { throw new Error('boom'); }));
    assert.equal(await c.get(k, async () => 'fine'), 'fine');
    let calls = 0;
    await c.get(k, async () => (calls++, 'again'), Date.now() + 5000);
    assert.equal(calls, 1, 'expired entry is recomputed');
  });
  test('the oldest entry is dropped beyond the size limit; different inputs get different keys', async () => {
    const c = new AnswerCache<string>(60000, 2);
    for (const w of ['a', 'b', 'c']) await c.get(AnswerCache.key([w]), async () => w.toUpperCase());
    assert.equal(c.stats().size, 2);
    assert.notEqual(AnswerCache.key(['x', 1]), AnswerCache.key(['x', 2]));
  });
});
