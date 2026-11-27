import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultRoute, resolveRoute, sanitizeRouting, emptyRouting, routeConfig } from './aiRouting';

const allKeys = { GEMINI_API_KEY: 'g', GROQ_API_KEY: 'q', DEEPSEEK_API_KEY: 'd', OPENROUTER_API_KEY: 'o', MISTRAL_API_KEY: 'm' };

describe('ai routing', () => {
  test('defaults: quick tasks start on Groq, quality tasks on Gemini', () => {
    assert.equal(defaultRoute('quick_qa').primary, 'groq');
    assert.equal(defaultRoute('voice').primary, 'groq');
    assert.equal(defaultRoute('writing_grade').primary, 'gemini');
  });
  test('only providers with a key are in the route', () => {
    assert.deepEqual(resolveRoute('quick_qa', { env: { GROQ_API_KEY: 'q' }, hasGeminiKey: false, cfg: emptyRouting() }), ['groq']);
    assert.deepEqual(resolveRoute('writing_grade', { env: {}, hasGeminiKey: false, cfg: emptyRouting() }), []);
  });
  test('owner primary and fallbacks are honoured, the rest follow as a last resort', () => {
    const cfg = sanitizeRouting({ tasks: { writing_grade: { primary: 'deepseek', fallbacks: ['gemini'] } } });
    const route = resolveRoute('writing_grade', { env: allKeys, hasGeminiKey: true, cfg });
    assert.deepEqual(route.slice(0, 2), ['deepseek', 'gemini']);
    assert.equal(new Set(route).size, route.length);
    assert.equal(route.length, 5);
  });
  test('a switched-off provider is never used', () => {
    const cfg = sanitizeRouting({ tasks: {}, disabled: ['groq', 'gemini'] });
    const route = resolveRoute('quick_qa', { env: allKeys, hasGeminiKey: true, cfg });
    assert.ok(!route.includes('groq') && !route.includes('gemini'));
  });
  test('sanitize drops unknown tasks, providers and bad timeouts', () => {
    const cfg = sanitizeRouting({
      tasks: { nonsense: { primary: 'groq' }, quick_qa: { primary: 'cerebras' }, grammar: { primary: 'mistral', fallbacks: ['mistral', 'qwen', 'groq'], timeoutMs: 100 }, translation: { primary: 'groq', timeoutMs: 15000 } },
      disabled: ['cerebras', 'deepseek', 'qwen']
    });
    assert.deepEqual(Object.keys(cfg.tasks).sort(), ['grammar', 'translation']);
    assert.deepEqual(cfg.tasks.grammar, { primary: 'mistral', fallbacks: ['groq'] });
    assert.equal(cfg.tasks.translation?.timeoutMs, 15000);
    assert.deepEqual(cfg.disabled, ['deepseek']);
  });
  test('routeConfig reports whether a task uses the default', () => {
    assert.equal(routeConfig('grammar', emptyRouting()).isDefault, true);
    assert.equal(routeConfig('grammar', sanitizeRouting({ tasks: { grammar: { primary: 'groq' } } })).isDefault, false);
  });
});

describe('provider budgets', () => {
  test('budgets are validated and unknown providers or silly numbers are dropped', async () => {
    const cfg = sanitizeRouting({ budgets: { groq: { dailyTokens: 50000, dailyRequests: 200 }, gemini: { dailyTokens: 5 }, mistral: { dailyTokens: -4, dailyRequests: 'x' }, deepseek: { dailyTokens: 5e12 } } });
    assert.deepEqual(cfg.budgets, { groq: { dailyTokens: 50000, dailyRequests: 200 } });
  });
  test('a provider that reached its daily cap is left out of the route until the next day', async () => {
    const { callFallbackProvider, resetProviderCooldowns } = await import('./aiRouter');
    resetProviderCooldowns();
    const fake = (async () => new Response(JSON.stringify({ choices: [{ message: { content: 'ok' } }], usage: { prompt_tokens: 60, completion_tokens: 40 } }), { status: 200 })) as typeof fetch;
    const env = { AI_CONFIRMED_FREE: OWNER_CONFIRMED_TEST_ONLY, GEMINI_API_KEY: 'g', GROQ_API_KEY: 'q', DEEPSEEK_API_KEY: 'd' };
    const cfg = sanitizeRouting({ budgets: { groq: { dailyTokens: 100 } } });
    assert.ok(resolveRoute('quick_qa', { env, hasGeminiKey: true, cfg }).includes('groq'));
    const r = await callFallbackProvider('groq', { prompt: 'x' }, env, fake);
    assert.equal(r.inTok, 60);
    assert.equal(r.outTok, 40);
    assert.ok(!resolveRoute('quick_qa', { env, hasGeminiKey: true, cfg }).includes('groq'), 'groq is at its 100-token cap');
    assert.ok(resolveRoute('quick_qa', { env, hasGeminiKey: true, cfg }).includes('deepseek'));
    resetProviderCooldowns();
  });
  test('RPM and TPM count the last minute only', async () => {
    const { callFallbackProvider, providerUsage, resetProviderCooldowns } = await import('./aiRouter');
    resetProviderCooldowns();
    const fake = (async () => new Response(JSON.stringify({ choices: [{ message: { content: 'ok' } }], usage: { prompt_tokens: 10, completion_tokens: 5 } }), { status: 200 })) as typeof fetch;
    await callFallbackProvider('mistral', { prompt: 'x' }, { MISTRAL_API_KEY: 'm', AI_CONFIRMED_FREE: OWNER_CONFIRMED_TEST_ONLY }, fake);
    await callFallbackProvider('mistral', { prompt: 'x' }, { MISTRAL_API_KEY: 'm', AI_CONFIRMED_FREE: OWNER_CONFIRMED_TEST_ONLY }, fake);
    const now = Date.now();
    assert.deepEqual(providerUsage('mistral', now), { rpm: 2, tpm: 30, dayRequests: 2, dayTokens: 30 });
    const later = providerUsage('mistral', now + 61_000);
    assert.equal(later.rpm, 0);
    assert.equal(later.tpm, 0);
    assert.equal(later.dayRequests, 2);
    resetProviderCooldowns();
  });
});

import { defaultTimeoutMs } from './aiRouting';
import { OWNER_CONFIRMED_TEST_ONLY } from './aiTestFixtures';
describe('default timeouts', () => {
  test('spoken and quick tasks give up on a slow provider sooner; others keep 12 s', () => {
    assert.equal(defaultTimeoutMs('voice'), 6000);
    assert.equal(defaultTimeoutMs('quick_qa'), 8000);
    assert.equal(defaultTimeoutMs('writing_grade'), 12000);
  });
});
