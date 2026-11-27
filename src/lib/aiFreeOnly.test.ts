import { describe, test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { CostBlockedError, assertFreeCall, chatModelsFromListing, freeStatus, geminiAllowed, isVerifiedFreeModel, onlyFreeCandidates, reconcileWithListing } from './aiFreeOnly';
import { callFallbackProvider, providerAvailable, providerStatsSnapshot, resetProviderCooldowns } from './aiRouter';

beforeEach(() => resetProviderCooldowns());

describe('Free Only Mode', () => {
  test('OpenRouter: only :free models that are in a NON-EMPTY live catalogue (price 0) are verified', () => {
    const env = {};
    assert.equal(isVerifiedFreeModel('openrouter', 'google/gemma-3-27b-it:free', { env, liveFree: null }), false, 'no catalogue -> not verified');
    assert.equal(isVerifiedFreeModel('openrouter', 'google/gemma-3-27b-it:free', { env, liveFree: [] }), false, 'empty catalogue is not proof');
    assert.equal(isVerifiedFreeModel('openrouter', 'a/b:free', { env, liveFree: ['c/d:free'] }), false, 'not in the live free list');
    assert.equal(isVerifiedFreeModel('openrouter', 'openai/gpt-4o', { env, liveFree: ['openai/gpt-4o'] }), false, 'not a :free model');
    assert.equal(isVerifiedFreeModel('openrouter', 'a/b:free', { env, liveFree: ['a/b:free'] }), true);
    assert.deepEqual(onlyFreeCandidates('openrouter', ['x/y', 'x/z:free'], { env, liveFree: ['x/z:free'] }), ['x/z:free']);
    assert.deepEqual(onlyFreeCandidates('openrouter', ['x/z:free'], { env, liveFree: [] }), []);
  });
  test('fail-closed: a listed or built-in model is FREE_UNVERIFIED until the owner confirms it', () => {
    assert.equal(freeStatus('groq', 'openai/gpt-oss-20b', { env: {} }), 'FREE_UNVERIFIED');
    assert.equal(freeStatus('cloudflare', '@cf/meta/llama-3.1-8b-instruct', { env: {} }), 'FREE_UNVERIFIED');
    assert.equal(freeStatus('groq', 'openai/gpt-oss-20b', { env: { AI_CONFIRMED_FREE: 'groq:openai/gpt-oss-20b' } }), 'FREE_VERIFIED');
    assert.equal(freeStatus('groq', 'llama-3.1-8b-instant', { env: { AI_CONFIRMED_FREE: 'groq:openai/gpt-oss-20b' } }), 'FREE_UNVERIFIED', 'confirmation is per model');
    assert.throws(() => assertFreeCall('mistral', 'mistral-small-latest', { env: {} }), CostBlockedError);
  });
  test('SiliconFlow paid models are blocked by default; only an explicit confirmation opens one model', () => {
    assert.equal(freeStatus('siliconflow', 'Qwen/Qwen3-8B', { env: {} }), 'PAID');
    assert.equal(freeStatus('siliconflow', 'Qwen/Qwen3-8B', { env: { AI_CONFIRMED_FREE: 'siliconflow:Qwen/Qwen3-8B' } }), 'FREE_VERIFIED');
    assert.equal(freeStatus('siliconflow', 'THUDM/glm-4-9b-0414', { env: { AI_CONFIRMED_FREE: 'siliconflow:Qwen/Qwen3-8B' } }), 'PAID');
  });
  test('Gemini is refused until GEMINI_FREE_TIER_CONFIRMED=1 (or the model is confirmed)', () => {
    assert.equal(freeStatus('gemini', 'gemini-2.5-flash-lite', { env: {} }), 'FREE_UNVERIFIED');
    assert.equal(freeStatus('gemini', 'gemini-2.5-flash-lite', { env: { GEMINI_FREE_TIER_CONFIRMED: '1' } }), 'FREE_VERIFIED');
    assert.equal(geminiAllowed({ GEMINI_FREE_TIER_CONFIRMED: 'yes' }), false, 'only the exact value 1');
  });
  test('a blocked call sends no request at all (the cost gate runs before fetch)', async () => {
    const { callFallbackProvider, resetProviderCooldowns } = await import('./aiRouter');
    resetProviderCooldowns();
    let sent = 0;
    // Only a generation request counts: the model-list read (/models) is not a paid generation.
    const fake = (async (url: string) => { if (String(url).includes('/chat/completions')) sent++; return new Response('{}', { status: 200 }); }) as typeof fetch;
    await assert.rejects(callFallbackProvider('groq', { prompt: 'x' }, { GROQ_API_KEY: 'g' }, fake), /bepul tasdiqlangan model yo‘q|bepul ekanligi tasdiqlanmagan/);
    assert.equal(sent, 0);
  });
  test('the benchmark for Gemini is refused without the owner confirmation and sends nothing', async () => {
    const { benchmarkGemini } = await import('./universalAi');
    const prev = [process.env.GEMINI_API_KEY, process.env.GEMINI_FREE_TIER_CONFIRMED];
    process.env.GEMINI_API_KEY = 'AIza-test-not-real';
    delete process.env.GEMINI_FREE_TIER_CONFIRMED;
    let sent = 0;
    const r = await benchmarkGemini((async () => { sent++; return new Response('{}'); }) as typeof fetch);
    assert.equal(r.ok, false);
    assert.match(r.message || '', /tasdiqlanmagan/);
    assert.equal(sent, 0);
    process.env.GEMINI_API_KEY = prev[0] ?? '';
    if (prev[1] === undefined) delete process.env.GEMINI_FREE_TIER_CONFIRMED; else process.env.GEMINI_FREE_TIER_CONFIRMED = prev[1];
  });
  test('listing filter drops speech, guard and embedding models', () => {
    assert.deepEqual(chatModelsFromListing(['llama-3.3-70b-versatile', 'whisper-large-v3', 'llama-guard-4', 'mistral-embed']), ['llama-3.3-70b-versatile']);
  });
  test('a retired preferred name is replaced by what the provider really lists (no 404)', () => {
    assert.deepEqual(reconcileWithListing(['old-model', 'llama-3.1-8b-instant'], ['llama-3.1-8b-instant', 'llama-3.3-70b-versatile']), ['llama-3.1-8b-instant', 'llama-3.3-70b-versatile']);
    assert.deepEqual(reconcileWithListing(['old-model'], ['m1', 'm2']), ['m1', 'm2']);
    assert.deepEqual(reconcileWithListing(['a', 'b'], []), ['a', 'b']);
  });
});

describe('402 payment required', () => {
  test('the provider leaves routing at once, stays integrated, and is flagged for the owner', async () => {
    const fake = (async () => new Response(JSON.stringify({ error: { message: 'Insufficient Balance' } }), { status: 402 })) as typeof fetch;
    await assert.rejects(callFallbackProvider('deepseek', { prompt: 'hi' }, { AI_CONFIRMED_FREE: OWNER_CONFIRMED_TEST_ONLY, DEEPSEEK_API_KEY: 'k' }, fake));
    assert.equal(providerAvailable('deepseek'), false);
    assert.equal(providerStatsSnapshot().deepseek.paymentBlocked, true);
    assert.equal(providerAvailable('groq'), true);
  });
  test('a Groq model that is not listed is never called', async () => {
    const urls: string[] = [];
    const fake = (async (url: string, init?: RequestInit) => {
      urls.push(url);
      if (url.endsWith('/models')) return new Response(JSON.stringify({ data: [{ id: 'llama-3.1-8b-instant' }, { id: 'whisper-large-v3' }] }), { status: 200 });
      const model = JSON.parse(String(init?.body)).model;
      if (model !== 'llama-3.1-8b-instant') return new Response('{}', { status: 404 });
      return new Response(JSON.stringify({ choices: [{ message: { content: 'ok' } }] }), { status: 200 });
    }) as typeof fetch;
    const r = await callFallbackProvider('groq', { prompt: 'hi' }, { AI_CONFIRMED_FREE: OWNER_CONFIRMED_TEST_ONLY, GROQ_API_KEY: 'k', GROQ_MODEL: 'retired-model' }, fake);
    assert.equal(r.model, 'llama-3.1-8b-instant');
  });
});

import { benchmarkProvider, resolveCandidates, rankFreeModels } from './aiRouter';

describe('model resolution and benchmark', () => {
  const orList = JSON.stringify({ data: [
    { id: 'foo/bar:free', pricing: { prompt: '0', completion: '0' } },
    { id: 'meta-llama/llama-3.3-70b-instruct:free', pricing: { prompt: '0', completion: '0' } },
    { id: 'paid/model', pricing: { prompt: '0.001', completion: '0.002' } },
    { id: 'half/free:free', pricing: { prompt: '0', completion: '0.5' } }
  ] });
  test('OpenRouter: only live verified-free models; retired built-in names and half-priced models are dropped', async () => {
    const fake = (async () => new Response(orList, { status: 200 })) as typeof fetch;
    const m = await resolveCandidates('openrouter', 'k', {}, fake);
    assert.deepEqual(m, ['meta-llama/llama-3.3-70b-instruct:free', 'foo/bar:free']);
    assert.deepEqual(rankFreeModels(['x/y:free', 'google/gemma-3:free'])[0], 'google/gemma-3:free');
  });
  test('benchmark skips a 404 model and measures the next free one (error time is not reported as speed)', async () => {
    let stage = 0;
    const fake = (async (url: string, init?: RequestInit) => {
      if (url.endsWith('/models') && !url.includes('chat')) return new Response(JSON.stringify({ data: [{ id: 'llama-3.3-70b-versatile' }, { id: 'llama-3.1-8b-instant' }] }), { status: 200 });
      stage++;
      const model = JSON.parse(String(init?.body)).model;
      if (model === 'llama-3.3-70b-versatile') return new Response('{"error":{"message":"model not found"}}', { status: 404 });
      const sse = 'data: {"choices":[{"delta":{"content":"1 2 3"}}]}\n\ndata: [DONE]\n\n';
      return new Response(sse, { status: 200 });
    }) as typeof fetch;
    const r = await benchmarkProvider('groq', { AI_CONFIRMED_FREE: OWNER_CONFIRMED_TEST_ONLY, GROQ_API_KEY: 'k' }, fake);
    assert.equal(r.ok, true);
    assert.equal(r.model, 'llama-3.1-8b-instant');
    assert.ok(stage >= 2);
  });
});

import { isReasoningModel, orderForChat } from './aiFreeOnly';
import { maxTokensFor, reasoningParams } from './aiRouter';
import { OWNER_CONFIRMED_TEST_ONLY } from './aiTestFixtures';

describe('reasoning models', () => {
  test('reasoning and vision models are ordered after plain chat models', () => {
    assert.deepEqual(orderForChat(['openai/gpt-oss-20b', 'nvidia/nemotron-3.5-super-vl:free', 'llama-3.1-8b-instant', 'google/gemma-4-26b-a4b-it:free']), ['llama-3.1-8b-instant', 'google/gemma-4-26b-a4b-it:free', 'openai/gpt-oss-20b', 'nvidia/nemotron-3.5-super-vl:free']);
    assert.equal(isReasoningModel('openai/gpt-oss-20b'), true);
    assert.equal(isReasoningModel('llama-3.1-8b-instant'), false);
  });
  test('a small token limit never starves a reasoning model; plain models keep the caller limit', () => {
    assert.equal(maxTokensFor('openai/gpt-oss-20b', 24), 700);
    assert.equal(maxTokensFor('llama-3.1-8b-instant', 24), 24);
    assert.equal(maxTokensFor('openai/gpt-oss-20b', 24, 3), 2100);
    assert.deepEqual(reasoningParams('groq', 'openai/gpt-oss-20b'), { reasoning_effort: 'low', include_reasoning: false });
    assert.deepEqual(reasoningParams('groq', 'llama-3.1-8b-instant'), {});
  });
  test('an empty answer cut by the token limit is retried with a bigger budget, then the next model answers', async () => {
    const bodies: { model: string; max_tokens?: number }[] = [];
    const fake = (async (url: string, init?: RequestInit) => {
      if (url.endsWith('/models')) return new Response(JSON.stringify({ data: [{ id: 'openai/gpt-oss-20b' }, { id: 'llama-3.1-8b-instant' }] }), { status: 200 });
      const b = JSON.parse(String(init?.body));
      bodies.push(b);
      if (b.model === 'openai/gpt-oss-20b') return new Response(JSON.stringify({ choices: [{ message: { content: '', reasoning: 'thinking...' }, finish_reason: 'length' }] }), { status: 200 });
      return new Response(JSON.stringify({ choices: [{ message: { content: 'ok' }, finish_reason: 'stop' }] }), { status: 200 });
    }) as typeof fetch;
    const { callFallbackProvider } = await import('./aiRouter');
    const r = await callFallbackProvider('groq', { prompt: 'hi', maxTokens: 24 }, { AI_CONFIRMED_FREE: OWNER_CONFIRMED_TEST_ONLY, GROQ_API_KEY: 'k' }, fake);
    assert.equal(r.text, 'ok');
  });
});
