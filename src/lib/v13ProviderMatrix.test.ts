import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';
import { benchmarkProvider, endpointOf, FALLBACK_PROVIDERS, resetProviderCooldowns, type FallbackProviderId } from './aiRouter';
import { benchmarkGemini } from './universalAi';

beforeEach(resetProviderCooldowns);

for (const id of Object.keys(FALLBACK_PROVIDERS) as FallbackProviderId[]) {
  test(`${id} benchmark uses the expected mock endpoint and model`, async () => {
    const provider = FALLBACK_PROVIDERS[id];
    const model = provider.models[0];
    const env = {
      [provider.envKey]: 'fixture-only',
      CLOUDFLARE_ACCOUNT_ID: 'fixture-account',
      AI_CONFIRMED_FREE: `${id}:${model}`,
    };
    let generations = 0;
    const fake = (async (url, init) => {
      if (init?.method !== 'POST') {
        return Response.json({ data: [{ id: model, pricing: { prompt: '0', completion: '0' } }] });
      }
      generations++;
      assert.equal(String(url), endpointOf(id, env));
      assert.equal(JSON.parse(String(init.body)).model, model);
      return new Response('data: {"choices":[{"delta":{"content":"One two three"}}]}\n\ndata: [DONE]\n\n');
    }) as typeof fetch;
    const result = await benchmarkProvider(id, env, fake);
    assert.equal(generations, 1);
    assert.equal(result.ok, true, result.message);
    assert.ok(result.ttftMs !== null && result.totalMs !== null && result.ttftMs <= result.totalMs);
  });
}

test('Gemini benchmark uses the verified catalogue and sends no generation when discovery fails', async () => {
  const previousKey = process.env.GEMINI_API_KEY;
  const previousConfirmation = process.env.GEMINI_FREE_TIER_CONFIRMED;
  process.env.GEMINI_FREE_TIER_CONFIRMED = '1';
  try {
    process.env.GEMINI_API_KEY = 'fixture-with-missing-catalogue';
    const missing = (async (_url, init) => {
      assert.notEqual(init?.method, 'POST');
      return new Response(null, { status: 503 });
    }) as typeof fetch;
    assert.equal((await benchmarkGemini(missing)).ok, false);
    process.env.GEMINI_API_KEY = 'fixture-with-verified-catalogue';
    let generations = 0;
    const valid = (async (url, init) => {
      if (init?.method !== 'POST') {
        return Response.json({ models: [{ name: 'models/gemini-2.5-flash-lite', supportedGenerationMethods: ['generateContent'] }] });
      }
      generations++;
      assert.match(String(url), /gemini-2\.5-flash-lite:streamGenerateContent/);
      return new Response('data: {"candidates":[{"content":{"parts":[{"text":"One two three"}]}}]}\n\n');
    }) as typeof fetch;
    const result = await benchmarkGemini(valid);
    assert.equal(result.ok, true, result.message);
    assert.equal(generations, 1);
  } finally {
    if (previousKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = previousKey;
    if (previousConfirmation === undefined) delete process.env.GEMINI_FREE_TIER_CONFIRMED;
    else process.env.GEMINI_FREE_TIER_CONFIRMED = previousConfirmation;
  }
});
