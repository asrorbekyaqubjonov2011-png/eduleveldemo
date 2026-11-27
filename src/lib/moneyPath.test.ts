import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { MONEY_PATH } from './dbStore';

describe('MONEY_PATH', () => {
  test('purchases, deposits, balance edits and promo changes are serialized', () => {
    for (const p of ['/api/student/economy', '/api/deposits/request', '/api/owner/deposits/approve/abc', '/api/owner/students/update', '/api/users/update-vip', '/api/owner/vip-gift', '/api/owner/promo-codes']) {
      assert.equal(MONEY_PATH.test(p), true, p);
    }
  });
  test('ordinary reads and content writes are not', () => {
    for (const p of ['/api/db/all', '/api/lessons/progress', '/api/ai/chat-tutor', '/api/levels/tests', '/api/news/subscribe']) {
      assert.equal(MONEY_PATH.test(p), false, p);
    }
  });
});
