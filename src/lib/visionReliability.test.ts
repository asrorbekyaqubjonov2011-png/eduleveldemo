import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readChatStream, runFallbackChain, resetProviderCooldowns } from './aiRouter';
import { OWNER_CONFIRMED_TEST_ONLY } from './aiTestFixtures';

function sse(lines: string[]): Response {
  const bytes = new TextEncoder().encode(lines.join(''));
  return new Response(new ReadableStream<Uint8Array>({
    start(c) { for (let i = 0; i < bytes.length; i += 3) c.enqueue(bytes.slice(i, i + 3)); c.close(); }
  }), { headers: { 'content-type': 'text/event-stream' } });
}
const delta = (content: string) => 'data: ' + JSON.stringify({ choices: [{ delta: { content } }] }) + '\r\n\r\n';
const env = {
  AI_CONFIRMED_FREE: OWNER_CONFIRMED_TEST_ONLY,
  CLOUDFLARE_API_TOKEN: 'test-only',
  CLOUDFLARE_ACCOUNT_ID: 'test-only',
  SAMBANOVA_API_KEY: 'test-only'
};

test('SSE handles split UTF-8, CRLF, usage and excludes hidden reasoning', async () => {
  const pieces: string[] = [];
  const res = sse([
    'data: {"choices":[{"delta":{"reasoning_content":"private"}}]}\r\n\r\n',
    delta('Salom, '), delta('o‘quvchi!'),
    'data: {"choices":[],"usage":{"prompt_tokens":3,"completion_tokens":5}}\r\n\r\n',
    'data: [DONE]\r\n\r\n'
  ]);
  const result = await readChatStream(res, new AbortController().signal, x => pieces.push(x));
  assert.deepEqual(pieces, ['Salom, ', 'o‘quvchi!']);
  assert.equal(result.text, 'Salom, o‘quvchi!');
  assert.equal(result.inTok, 3); assert.equal(result.outTok, 5);
});

test('rate-limited provider falls back and delivers real deltas', async () => {
  resetProviderCooldowns();
  const requests: string[] = [], pieces: string[] = [];
  const fakeFetch = (async (url: string, init: RequestInit) => {
    requests.push(url);
    assert.equal(JSON.parse(String(init.body)).stream, true);
    if (url.includes('cloudflare')) return new Response('{}', { status: 429 });
    return sse([delta('Hello'), delta(' there'), 'data: [DONE]\n\n']);
  }) as typeof fetch;
  const result = await runFallbackChain({ prompt: 'hello', onText: p => pieces.push(p) }, env, fakeFetch, undefined, ['cloudflare', 'sambanova']);
  assert.equal(result.provider, 'sambanova');
  assert.deepEqual(pieces, ['Hello', ' there']); assert.equal(requests.length, 2);
});

test('no second provider after partial text has reached the user', async () => {
  resetProviderCooldowns();
  let count = 0;
  const fakeFetch = (async () => {
    count++;
    return sse([delta('Partial'), 'data: invalid-json\n\n']);
  }) as typeof fetch;
  const pieces: string[] = [];
  await assert.rejects(runFallbackChain({ prompt: 'hello', onText: p => pieces.push(p) }, env, fakeFetch, undefined, ['cloudflare','sambanova']));
  assert.equal(count, 1); assert.deepEqual(pieces, ['Partial']);
});

test('cancellation releases a stalled stream', async () => {
  let cancelled = false;
  const ctrl = new AbortController();
  const res = new Response(new ReadableStream<Uint8Array>({ cancel() { cancelled = true; } }));
  const result = readChatStream(res, ctrl.signal, () => assert.fail('unexpected token'));
  ctrl.abort();
  await assert.rejects(result);
  assert.equal(cancelled, true);
});

test('already cancelled request sends no provider call', async () => {
  resetProviderCooldowns();
  const ctrl = new AbortController(); ctrl.abort();
  let sent = 0;
  const fakeFetch = (async () => { sent++; return sse([delta('bad')]); }) as typeof fetch;
  await assert.rejects(runFallbackChain({ prompt: 'hello', signal: ctrl.signal, onText: () => {} }, env, fakeFetch, undefined, ['cloudflare','sambanova']));
  assert.equal(sent, 0);
});
