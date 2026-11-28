import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPayload, changedUrls, describeStatus, isValidKey, normalizeUrls, submitUrls } from './indexnow';

describe('IndexNow helpers', () => {
  test('only https URLs of the canonical host are kept, once each, without fragments', () => {
    const out = normalizeUrls(['https://edulevel.uz/a#x', 'https://edulevel.uz/a', 'http://edulevel.uz/b', 'https://evil.com/c', 'https://www.edulevel.uz/d', 'not a url'], 'edulevel.uz');
    assert.deepEqual(out, ['https://edulevel.uz/a']);
  });
  test('only new or modified URLs are selected (a plain deploy sends nothing)', () => {
    const entries = [{ url: 'https://edulevel.uz/a', lastModified: '2026-11-25' }, { url: 'https://edulevel.uz/b', lastModified: '2026-11-26' }, { url: 'https://edulevel.uz/c', lastModified: '2026-11-25' }];
    const done = { 'https://edulevel.uz/a': '2026-11-25', 'https://edulevel.uz/b': '2026-11-25' };
    assert.deepEqual(changedUrls(entries, done), ['https://edulevel.uz/b', 'https://edulevel.uz/c']);
    assert.deepEqual(changedUrls(entries.slice(0, 1), done), []);
  });
  test('payload and status descriptions', () => {
    assert.deepEqual(buildPayload('h', 'k', 'https://h/key', ['u']), { host: 'h', key: 'k', keyLocation: 'https://h/key', urlList: ['u'] });
    assert.equal(describeStatus(200).ok, true);
    assert.equal(describeStatus(202).ok, true);
    assert.equal(describeStatus(429).ok, false);
    assert.equal(describeStatus(null).ok, false);
    assert.equal(isValidKey('abcd1234'), true);
    assert.equal(isValidKey('bad key!'), false);
  });
  test('preview submissions stop before database access or network calls', async () => {
    let sent = false;
    const result = await submitUrls('preview.onrender.com', 'https://preview.onrender.com', ['https://preview.onrender.com/page'], 'publish', {}, async () => {
      sent = true;
      throw new Error('Unexpected network call');
    });
    assert.equal(result.skipped, 'origin');
    assert.equal(sent, false);
  });
});
