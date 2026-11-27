import { describe, test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { providerDayTotals, providerOverBudget, resetProviderCooldowns, seedProviderDay } from './aiRouter';

beforeEach(() => resetProviderCooldowns());

describe('persistent daily provider totals', () => {
  test('today\'s saved totals are restored after a restart and enforce the owner\'s cap', () => {
    const day = providerDayTotals().day;
    seedProviderDay(day, { groq: { calls: 900, tokens: 50_000 } });
    assert.equal(providerDayTotals().providers.groq.calls, 900);
    assert.equal(providerOverBudget('groq', { dailyRequests: 900 }), true);
    assert.equal(providerOverBudget('groq', { dailyRequests: 1000 }), false);
  });
  test('totals saved for another day are ignored', () => {
    seedProviderDay('2000-01-01', { groq: { calls: 5, tokens: 5 } });
    assert.equal(providerDayTotals().providers.groq.calls, 0);
  });
});
