import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { markModelFailed, usableModels } from './universalAi';

describe('model cooldown', () => {
  test('a retired model (404) is skipped; a healthy one stays', () => {
    markModelFailed('gemini-old-test', 'This model is no longer available (404)');
    assert.deepEqual(usableModels(['gemini-old-test', 'gemini-ok-test']), ['gemini-ok-test']);
  });
  test('quota (429) and overload (503) mark a model for a while; a clean error does not', () => {
    markModelFailed('gemini-quota-test', '429 RESOURCE_EXHAUSTED');
    markModelFailed('gemini-busy-test', '503 high demand');
    markModelFailed('gemini-fine-test', 'AI so‘rovi 25 soniyada javob bermadi');
    assert.deepEqual(usableModels(['gemini-quota-test', 'gemini-busy-test', 'gemini-fine-test']), ['gemini-fine-test']);
  });
});
