import { describe, test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { FALLBACK_PROVIDERS, availableFallbacks, callFallbackProvider, endpointOf, providerConfigured, resetProviderCooldowns, resolveCandidates } from './aiRouter';
import { resolveRoute, isConfigured } from './aiRouting';
import { OWNER_CONFIRMED_TEST_ONLY } from './aiTestFixtures';

beforeEach(() => resetProviderCooldowns());

describe('Cloudflare Workers AI, SambaNova and SiliconFlow adapters', () => {
  test('Cloudflare needs both the token and the account id; its URL carries the account id', () => {
    assert.equal(providerConfigured('cloudflare', { CLOUDFLARE_API_TOKEN: 't' }), false);
    assert.equal(providerConfigured('cloudflare', { CLOUDFLARE_ACCOUNT_ID: 'abc' }), false);
    const env = { CLOUDFLARE_API_TOKEN: 't', CLOUDFLARE_ACCOUNT_ID: 'acc123' };
    assert.equal(providerConfigured('cloudflare', env), true);
    assert.equal(endpointOf('cloudflare', env), 'https://api.cloudflare.com/client/v4/accounts/acc123/ai/v1/chat/completions');
  });
  test('without keys none of the three is configured or routed (nothing is ever called)', () => {
    assert.deepEqual(availableFallbacks({}), []);
    assert.equal(isConfigured('sambanova', {}), false);
    assert.deepEqual(resolveRoute('edubek_chat', { env: {}, hasGeminiKey: false }), []);
  });
  test('only built-in model names are candidates (their live lists do not prove free)', async () => {
    const fake = (async () => { throw new Error('must not call the list'); }) as typeof fetch;
    // Fail-closed: without the owner's confirmation nothing is a candidate (SiliconFlow is PAID by default).
    assert.deepEqual(await resolveCandidates('siliconflow', 'k', {}, fake), []);
    const m = await resolveCandidates('siliconflow', 'k', { AI_CONFIRMED_FREE: OWNER_CONFIRMED_TEST_ONLY }, fake);
    assert.deepEqual(m, FALLBACK_PROVIDERS.siliconflow.models);
    assert.ok(!(await resolveCandidates('sambanova', 'k', { AI_CONFIRMED_FREE: OWNER_CONFIRMED_TEST_ONLY }, fake)).some((x) => /405B|Maverick/.test(x)));
  });
  test('SambaNova call: right URL, bearer key, streamed=false body, text returned', async () => {
    let seen: { url: string; body: any; auth: string } | null = null;
    const fake = (async (url: string, init: RequestInit) => {
      seen = { url, body: JSON.parse(String(init.body)), auth: (init.headers as Record<string, string>).Authorization };
      return new Response(JSON.stringify({ choices: [{ message: { content: 'salom' }, finish_reason: 'stop' }], usage: { prompt_tokens: 3, completion_tokens: 2 } }), { status: 200 });
    }) as typeof fetch;
    const r = await callFallbackProvider('sambanova', { prompt: 'hi', maxTokens: 50 }, { AI_CONFIRMED_FREE: OWNER_CONFIRMED_TEST_ONLY, SAMBANOVA_API_KEY: 'sk-test' }, fake);
    assert.equal(r.text, 'salom');
    assert.equal(r.provider, 'sambanova');
    assert.equal(seen!.url, 'https://api.sambanova.ai/v1/chat/completions');
    assert.equal(seen!.auth, 'Bearer sk-test');
    assert.equal(seen!.body.model, 'Meta-Llama-3.3-70B-Instruct');
  });
  test('Cloudflare call goes to the account URL and a 404 model moves to the next built-in model', async () => {
    const calls: string[] = [];
    const cfEnv = { CLOUDFLARE_API_TOKEN: 't', CLOUDFLARE_ACCOUNT_ID: 'acc9', AI_CONFIRMED_FREE: OWNER_CONFIRMED_TEST_ONLY };
    const fake = (async (url: string, init: RequestInit) => {
      const model = JSON.parse(String(init.body)).model;
      calls.push(`${url.includes('/accounts/acc9/') ? 'acc' : 'bad'}:${model}`);
      if (model === '@cf/meta/llama-3.1-8b-instruct') return new Response('{}', { status: 404 });
      return new Response(JSON.stringify({ choices: [{ message: { content: 'ok' }, finish_reason: 'stop' }] }), { status: 200 });
    }) as typeof fetch;
    const r = await callFallbackProvider('cloudflare', { prompt: 'hi' }, cfEnv, fake);
    assert.equal(r.text, 'ok');
    assert.deepEqual(calls, ['acc:@cf/meta/llama-3.1-8b-instruct', 'acc:@cf/meta/llama-3.3-70b-instruct-fp8-fast']);
  });
});
