import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { availableFallbacks, callFallbackProvider, resetProviderCooldowns, runFallbackChain } from './aiRouter';
import { beforeEach } from 'node:test';
import { OWNER_CONFIRMED_TEST_ONLY } from './aiTestFixtures';
beforeEach(() => resetProviderCooldowns());

const okResponse = (text: string) =>
  new Response(JSON.stringify({ choices: [{ message: { content: text } }] }), { status: 200, headers: { 'content-type': 'application/json' } });

describe('availableFallbacks', () => {
  test('only providers with a key are used, in the default order', () => {
    const env = { AI_CONFIRMED_FREE: OWNER_CONFIRMED_TEST_ONLY, GROQ_API_KEY: 'g', MISTRAL_API_KEY: 'm' };
    assert.deepEqual(availableFallbacks(env).map((p) => p.id), ['groq', 'mistral']);
  });
  test('AI_FALLBACK_ORDER changes the order and ignores unknown names', () => {
    const env = { AI_CONFIRMED_FREE: OWNER_CONFIRMED_TEST_ONLY, GROQ_API_KEY: 'g', DEEPSEEK_API_KEY: 'd', AI_FALLBACK_ORDER: 'deepseek, nonsense, groq, deepseek' };
    assert.deepEqual(availableFallbacks(env).map((p) => p.id), ['deepseek', 'groq']);
  });
  test('no keys means no fallbacks', () => {
    assert.deepEqual(availableFallbacks({}), []);
  });
  test('model can be overridden by env', () => {
    const env = { AI_CONFIRMED_FREE: OWNER_CONFIRMED_TEST_ONLY, DEEPSEEK_API_KEY: 'd', DEEPSEEK_MODEL: 'deepseek-reasoner' };
    assert.equal(availableFallbacks(env)[0].model, 'deepseek-reasoner');
  });
});

describe('callFallbackProvider', () => {
  test('sends the right endpoint, auth header and body, returns the text', async () => {
    let seen: { url: string; init: RequestInit } | null = null;
    const fakeFetch = (async (url: string, init: RequestInit) => {
      seen = { url, init };
      return okResponse('salom');
    }) as typeof fetch;
    const r = await callFallbackProvider('groq', { system: 'sys', prompt: 'hi', jsonMode: true }, { AI_CONFIRMED_FREE: OWNER_CONFIRMED_TEST_ONLY, GROQ_API_KEY: 'gsk_test' }, fakeFetch);
    assert.equal(r.text, 'salom');
    assert.equal(r.provider, 'groq');
    assert.equal(seen!.url, 'https://api.groq.com/openai/v1/chat/completions');
    assert.equal((seen!.init.headers as Record<string, string>).Authorization, 'Bearer gsk_test');
    const body = JSON.parse(String(seen!.init.body));
    assert.equal(body.messages[0].role, 'system');
    assert.deepEqual(body.response_format, { type: 'json_object' });
  });

  test('error message holds the status only, not the provider body', async () => {
    const fakeFetch = (async () => new Response('secret echo of request', { status: 429 })) as typeof fetch;
    await assert.rejects(
      callFallbackProvider('deepseek', { prompt: 'x' }, { AI_CONFIRMED_FREE: OWNER_CONFIRMED_TEST_ONLY, DEEPSEEK_API_KEY: 'd' }, fakeFetch),
      (e: Error) => e.message.startsWith('deepseek HTTP 429: so‘rov limiti') && !e.message.includes('secret')
    );
  });

  test('missing key is refused without a network call', async () => {
    let called = false;
    const fakeFetch = (async () => { called = true; return okResponse('x'); }) as typeof fetch;
    await assert.rejects(callFallbackProvider('mistral', { prompt: 'x' }, {}, fakeFetch), /MISTRAL_API_KEY/);
    assert.equal(called, false);
  });
});

describe('runFallbackChain', () => {
  test('moves to the next provider when one fails and reports the failure', async () => {
    const failures: string[] = [];
    const fakeFetch = (async (url: string) => (url.includes('groq') ? new Response('', { status: 503 }) : okResponse('ok from deepseek'))) as typeof fetch;
    const r = await runFallbackChain(
      { prompt: 'x' },
      { AI_CONFIRMED_FREE: OWNER_CONFIRMED_TEST_ONLY, GROQ_API_KEY: 'g', DEEPSEEK_API_KEY: 'd' },
      fakeFetch,
      (id, msg) => failures.push(`${id}:${msg}`)
    );
    assert.equal(r.provider, 'deepseek');
    assert.equal(failures.length, 1);
    assert.ok(failures[0].startsWith('groq:groq HTTP 503: '));
  });

  test('throws when every configured provider fails', async () => {
    const fakeFetch = (async () => new Response('', { status: 500 })) as typeof fetch;
    await assert.rejects(runFallbackChain({ prompt: 'x' }, { AI_CONFIRMED_FREE: OWNER_CONFIRMED_TEST_ONLY, GROQ_API_KEY: 'g', MISTRAL_API_KEY: 'm' }, fakeFetch));
  });

  test('throws a clear error when no fallback key exists', async () => {
    await assert.rejects(runFallbackChain({ prompt: 'x' }, {}), /sozlanmagan/);
  });
});

describe('describeHttpError', () => {
  test('explains the status in Uzbek and never shows a key', async () => {
    const { describeHttpError } = await import('./aiRouter');
    const msg = describeHttpError('groq', 401, 'Invalid API Key gsk_abcdef123456789 provided');
    assert.match(msg, /groq HTTP 401: kalit noto‘g‘ri/);
    assert.doesNotMatch(msg, /gsk_abcdef/);
    assert.match(describeHttpError('openrouter', 404, ''), /model topilmadi/);
    assert.match(describeHttpError('mistral', 429, ''), /limiti tugagan/);
  });
});

describe('model candidates and provider cooldown', () => {
  test('an unknown model (404) moves to the next candidate of the same provider', async () => {
    const tried: string[] = [];
    const fakeFetch = (async (_url: string, init: RequestInit) => {
      const model = JSON.parse(String(init.body)).model;
      tried.push(model);
      return model === 'llama-3.1-8b-instant' ? okResponse('ok') : new Response('{"error":{"message":"model not found"}}', { status: 404 });
    }) as typeof fetch;
    const r = await callFallbackProvider('groq', { prompt: 'x' }, { AI_CONFIRMED_FREE: OWNER_CONFIRMED_TEST_ONLY, GROQ_API_KEY: 'g' }, fakeFetch);
    assert.equal(r.model, 'llama-3.1-8b-instant');
    assert.deepEqual(tried, ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant']);
  });

  test('a provider that answers 402 is skipped by the chain for a while', async () => {
    const calls: string[] = [];
    const fakeFetch = (async (url: string) => {
      calls.push(url);
      return url.includes('deepseek') ? new Response('{"error":{"message":"Insufficient Balance"}}', { status: 402 }) : okResponse('from mistral');
    }) as typeof fetch;
    const env = { AI_CONFIRMED_FREE: OWNER_CONFIRMED_TEST_ONLY, DEEPSEEK_API_KEY: 'd', MISTRAL_API_KEY: 'm' };
    const first = await runFallbackChain({ prompt: 'x' }, env, fakeFetch);
    assert.equal(first.provider, 'mistral');
    calls.length = 0;
    await runFallbackChain({ prompt: 'x' }, env, fakeFetch);
    assert.equal(calls.some((u) => u.includes('deepseek')), false, 'deepseek is cooling down');
  });
});

describe('provider counters (real calls only)', () => {
  test('a success, a 429 and a timeout are counted per provider', async () => {
    resetProviderCooldowns();
    const { providerStatsSnapshot } = await import('./aiRouter');
    const fakeFetch = (async (url: string) => {
      if (url.includes('deepseek')) return new Response('{"error":{"message":"rate"}}', { status: 429 });
      return okResponse('ok');
    }) as typeof fetch;
    await callFallbackProvider('groq', { prompt: 'x' }, { AI_CONFIRMED_FREE: OWNER_CONFIRMED_TEST_ONLY, GROQ_API_KEY: 'g' }, fakeFetch);
    await assert.rejects(callFallbackProvider('deepseek', { prompt: 'x' }, { AI_CONFIRMED_FREE: OWNER_CONFIRMED_TEST_ONLY, DEEPSEEK_API_KEY: 'd' }, fakeFetch));
    const timeoutFetch = (async () => { throw Object.assign(new Error('aborted'), { name: 'AbortError' }); }) as typeof fetch;
    await assert.rejects(callFallbackProvider('mistral', { prompt: 'x' }, { AI_CONFIRMED_FREE: OWNER_CONFIRMED_TEST_ONLY, MISTRAL_API_KEY: 'm' }, timeoutFetch), /javob vaqti tugadi/);
    const snap = providerStatsSnapshot();
    assert.equal(snap.groq.ok, 1);
    assert.equal(snap.groq.failed, 0);
    assert.equal(snap.deepseek.rateLimited, 1);
    assert.equal(snap.deepseek.cooling, true);
    assert.equal(snap.mistral.failed, 1);
    assert.equal(snap.mistral.ok, 0);
    assert.ok(snap.groq.lastLatencyMs !== null);
  });
});

describe('benchmarkProvider', () => {
  test('measures time to first chunk and counts characters from a streamed answer', async () => {
    const { benchmarkProvider } = await import('./aiRouter');
    const enc = new TextEncoder();
    const makeStream = () => new ReadableStream({
      start(c) {
        c.enqueue(enc.encode('data: {"choices":[{"delta":{"content":"1, "}}]}\n\n'));
        c.enqueue(enc.encode('data: {"choices":[{"delta":{"content":"2, 3"}}]}\n\ndata: [DONE]\n\n'));
        c.close();
      }
    });
    // The first call is the model listing (not JSON here, so the built-in names are used); the second is the stream.
    const fakeFetch = (async () => new Response(makeStream(), { status: 200 })) as typeof fetch;
    const r = await benchmarkProvider('groq', { AI_CONFIRMED_FREE: OWNER_CONFIRMED_TEST_ONLY, GROQ_API_KEY: 'g' }, fakeFetch);
    assert.equal(r.ok, true);
    assert.equal(r.chars, 7);
    assert.ok(r.ttftMs !== null && r.totalMs !== null && r.totalMs >= r.ttftMs);
  });
  test('a missing key is reported without a network call, an error status is classified', async () => {
    const { benchmarkProvider } = await import('./aiRouter');
    const none = await benchmarkProvider('mistral', {}, (async () => { throw new Error('must not call'); }) as typeof fetch);
    assert.equal(none.ok, false);
    assert.match(none.message || '', /MISTRAL_API_KEY/);
    const bad = await benchmarkProvider('deepseek', { AI_CONFIRMED_FREE: OWNER_CONFIRMED_TEST_ONLY, DEEPSEEK_API_KEY: 'd' }, (async () => new Response('{"error":{"message":"Insufficient Balance"}}', { status: 402 })) as typeof fetch);
    assert.equal(bad.ok, false);
    assert.match(bad.message || '', /HTTP 402/);
  });
});

describe('concurrency limit', () => {
  test('no more than AI_MAX_CONCURRENCY calls run at once; the rest wait their turn', async () => {
    const { callFallbackProvider, resetProviderCooldowns, providerQueue } = await import('./aiRouter');
    resetProviderCooldowns();
    let running = 0;
    let peak = 0;
    const fake = (async () => {
      running++;
      peak = Math.max(peak, running);
      await new Promise((r) => setTimeout(r, 25));
      running--;
      return okResponse('ok');
    }) as typeof fetch;
    const env = { AI_CONFIRMED_FREE: OWNER_CONFIRMED_TEST_ONLY, GROQ_API_KEY: 'g', AI_MAX_CONCURRENCY: '2' };
    const results = await Promise.all(Array.from({ length: 6 }, () => callFallbackProvider('groq', { prompt: 'x' }, env, fake)));
    assert.equal(results.length, 6);
    assert.equal(peak, 2);
    assert.deepEqual(providerQueue('groq'), { active: 0, queued: 0 });
  });
});
