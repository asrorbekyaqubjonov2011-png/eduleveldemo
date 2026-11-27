import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { markModelFailed, modelCoolingDown, quotaCooldownMs, usableModels } from './universalAi';

describe('Gemini 429 handling', () => {
  test('a per-day quota rests for an hour; a retry delay from Google is honoured within limits', () => {
    assert.equal(quotaCooldownMs('429 RESOURCE_EXHAUSTED GenerateRequestsPerDayPerProjectPerModel-FreeTier'), 3_600_000);
    assert.equal(quotaCooldownMs('quota exceeded. Please retry in 34.5s'), 37_000);
    assert.equal(quotaCooldownMs('"retryDelay":"5s"'), 20_000);
    assert.equal(quotaCooldownMs('quota exceeded, retry in 9999s'), 15 * 60_000);
    assert.equal(quotaCooldownMs('429 quota'), 5 * 60_000);
  });
  test('a model that answered 429 is skipped by usableModels until its cooldown ends', () => {
    markModelFailed('gemini-test-429', '429 RESOURCE_EXHAUSTED retry in 30s');
    assert.equal(modelCoolingDown('gemini-test-429'), true);
    assert.deepEqual(usableModels(['gemini-test-429', 'gemini-ok']), ['gemini-ok']);
  });
});
