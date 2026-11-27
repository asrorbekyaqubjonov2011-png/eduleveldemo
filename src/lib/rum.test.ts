import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanRum, rate, recordRum, resetRum, rumSummary } from './rum';

describe('rum', () => {
  test('only sane numbers are accepted, labels default safely, empty input is dropped', () => {
    assert.equal(cleanRum({ lcp: 'x', cls: -1 }), null);
    assert.equal(cleanRum(null), null);
    assert.deepEqual(cleanRum({ lcp: 1800.6, cls: 0.0456, inp: 120, ttfb: 400, page: 'home', device: 'mobile', url: '/secret' }), { lcp: 1801, inp: 120, cls: 0.046, ttfb: 400, page: 'home', device: 'mobile' });
    assert.equal(cleanRum({ lcp: 9_999_999 }), null);
    assert.equal(cleanRum({ lcp: 100, page: 'weird', device: 'tv' })?.page, 'content');
  });
  test('ratings follow the Core Web Vitals thresholds', () => {
    assert.equal(rate('lcp', 2500), 'good');
    assert.equal(rate('lcp', 3000), 'needs-improvement');
    assert.equal(rate('lcp', 4500), 'poor');
    assert.equal(rate('cls', 0.05), 'good');
    assert.equal(rate('inp', 600), 'poor');
  });
  test('the summary reports the 75th percentile per metric, per device and per page type', () => {
    resetRum();
    for (const lcp of [1000, 1200, 1500, 3000, 9000]) recordRum({ lcp, inp: null, cls: null, ttfb: 300, page: 'home', device: lcp > 2000 ? 'mobile' : 'desktop' });
    const s = rumSummary();
    assert.equal(s.views, 5);
    assert.equal(s.all.metrics.lcp.p75, 3000);
    assert.equal(s.all.metrics.lcp.rating, 'needs-improvement');
    assert.equal(s.all.metrics.inp.p75, null);
    assert.equal(s.mobile.views, 2);
    assert.equal(s.content.views, 0);
    resetRum();
  });
});
