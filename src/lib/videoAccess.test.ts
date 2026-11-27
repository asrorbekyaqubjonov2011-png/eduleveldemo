import test from 'node:test';
import assert from 'node:assert/strict';
import { canWatchLessonVideo, normalizeVideoTiers, readBunnyConfig, parseBunnyVideoId, bunnySignedEmbedUrl } from './videoAccess.ts';

test('no tier list means no gate', () => {
  assert.equal(canWatchLessonVideo({ role: 'student', userTier: 'none', videoTiers: [] }), true);
  assert.equal(canWatchLessonVideo({ role: 'student', userTier: undefined, videoTiers: undefined }), true);
});

test('owner always allowed', () => {
  assert.equal(canWatchLessonVideo({ role: 'owner', userTier: 'none', videoTiers: ['legend'] }), true);
});

test('exact tier match only', () => {
  assert.equal(canWatchLessonVideo({ role: 'student', userTier: 'gold', videoTiers: ['gold', 'pro'] }), true);
  assert.equal(canWatchLessonVideo({ role: 'student', userTier: 'plus', videoTiers: ['gold', 'pro'] }), false);
  assert.equal(canWatchLessonVideo({ role: 'student', userTier: 'none', videoTiers: ['gold'] }), false);
  assert.equal(canWatchLessonVideo({ role: 'student', userTier: null, videoTiers: ['gold'] }), false);
});

test('unknown tier fails closed', () => {
  assert.equal(canWatchLessonVideo({ role: 'student', userTier: 'gold', videoTiers: ['gold', 'mystery'] }), false);
  assert.equal(canWatchLessonVideo({ role: 'student', userTier: 'mystery', videoTiers: ['gold'] }), false);
});

test('normalizeVideoTiers drops unknown and duplicate ids', () => {
  assert.deepEqual(normalizeVideoTiers([' Gold ', 'gold', 'x', 'pro', 3]), ['gold', 'pro']);
  assert.deepEqual(normalizeVideoTiers('gold'), []);
});

test('bunny is off without flag or keys', () => {
  assert.equal(readBunnyConfig({}), null);
  assert.equal(readBunnyConfig({ BUNNY_STREAM_ENABLED: '1', BUNNY_LIBRARY_ID: '1' }), null);
  assert.equal(readBunnyConfig({ BUNNY_STREAM_ENABLED: '0', BUNNY_LIBRARY_ID: '1', BUNNY_TOKEN_KEY: 'k' }), null);
  assert.deepEqual(readBunnyConfig({ BUNNY_STREAM_ENABLED: '1', BUNNY_LIBRARY_ID: '1', BUNNY_TOKEN_KEY: 'k' }), { libraryId: '1', tokenKey: 'k' });
});

test('parses bunny guid from url or bare id', () => {
  const id = '3f2504e0-4f89-11d3-9a0c-0305e82c3301';
  assert.equal(parseBunnyVideoId(id.toUpperCase()), id);
  assert.equal(parseBunnyVideoId(`https://iframe.mediadelivery.net/embed/1/${id}?autoplay=true`), id);
  assert.equal(parseBunnyVideoId('https://example.com/x'), null);
});

test('signed embed url has token and expiry', () => {
  const cfg = { libraryId: '123', tokenKey: 'test-key' };
  const { url, expires } = bunnySignedEmbedUrl(cfg, '3f2504e0-4f89-11d3-9a0c-0305e82c3301', 1000, 600);
  assert.equal(expires, 1600);
  assert.match(url, /^https:\/\/iframe\.mediadelivery\.net\/embed\/123\/3f2504e0-4f89-11d3-9a0c-0305e82c3301\?token=[0-9a-f]{64}&expires=1600$/);
});
