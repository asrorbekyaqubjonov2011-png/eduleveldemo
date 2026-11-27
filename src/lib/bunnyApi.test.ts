import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { bunnyCreateVideo, bunnyListVideos, readBunnyApiConfig, tusSignature, BunnyError } from './bunnyApi';

const on = { BUNNY_STREAM_ENABLED: '1', BUNNY_LIBRARY_ID: '12345', BUNNY_API_KEY: 'api-key-test' };

describe('bunnyApi config', () => {
  test('needs the flag, a numeric library id and the Stream API key', () => {
    assert.deepEqual(readBunnyApiConfig(on), { libraryId: '12345', apiKey: 'api-key-test' });
    assert.equal(readBunnyApiConfig({ ...on, BUNNY_STREAM_ENABLED: 'true' }), null);
    assert.equal(readBunnyApiConfig({ ...on, BUNNY_LIBRARY_ID: 'abc' }), null);
    assert.equal(readBunnyApiConfig({ BUNNY_STREAM_ENABLED: '1', BUNNY_LIBRARY_ID: '1', BUNNY_TOKEN_KEY: 'only-token' }), null);
  });
  test('accepts the alternative env name', () => {
    assert.equal(readBunnyApiConfig({ BUNNY_STREAM_ENABLED: '1', BUNNY_LIBRARY_ID: '9', BUNNY_STREAM_API_KEY: 'k' })?.apiKey, 'k');
  });
});

describe('bunnyApi', () => {
  test('upload signature follows the documented sha256 scheme', () => {
    const expected = createHash('sha256').update('12345' + 'api-key-test' + '1700000000' + 'vid-1').digest('hex');
    assert.equal(tusSignature('12345', 'api-key-test', 1700000000, 'vid-1'), expected);
  });
  test('list and create call the library with the AccessKey header only on the server side', async () => {
    const seen: { url: string; key: string }[] = [];
    const fake = (async (url: string, init: RequestInit) => {
      seen.push({ url, key: (init.headers as Record<string, string>).AccessKey });
      return new Response(JSON.stringify(url.includes('/videos?') ? { totalItems: 1, currentPage: 1, items: [{ guid: 'g1', title: 'Dars 1', length: 61, status: 4, encodeProgress: 100 }] } : { guid: 'new-guid' }), { status: 200 });
    }) as typeof fetch;
    const list = await bunnyListVideos(readBunnyApiConfig(on)!, 1, '', fake);
    assert.equal(list.items[0].guid, 'g1');
    assert.equal(list.items[0].lengthSec, 61);
    assert.equal(await bunnyCreateVideo(readBunnyApiConfig(on)!, 'Yangi', fake), 'new-guid');
    assert.ok(seen.every((s) => s.url.startsWith('https://video.bunnycdn.com/library/12345/') && s.key === 'api-key-test'));
  });
  test('a rejected key gets a clear message that separates the API key from the token key', async () => {
    const fake = (async () => new Response('', { status: 401 })) as typeof fetch;
    await assert.rejects(bunnyListVideos(readBunnyApiConfig(on)!, 1, '', fake), (e: Error) => e instanceof BunnyError && /Token Authentication kaliti emas/.test(e.message));
  });
});
