import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { signInitData, verifyInitData } from './telegramInitData';

const BOT = '123456:TEST_TOKEN_NOT_REAL';
const NOW = 1_800_000_000;

function make(fields: Record<string, string>, bot = BOT) {
  const p = new URLSearchParams(fields);
  const hash = signInitData(p, bot);
  p.set('hash', hash);
  return p.toString();
}
const user = JSON.stringify({ id: 42, first_name: 'Ali', username: 'ali_test' });

describe('Telegram initData verification', () => {
  test('a correctly signed, fresh string identifies the user', () => {
    const raw = make({ auth_date: String(NOW - 60), query_id: 'AAE', user });
    const r = verifyInitData(raw, BOT, NOW);
    assert.equal(r.ok, true);
    if (r.ok) assert.deepEqual(r.data, { userId: '42', username: 'ali_test', firstName: 'Ali', authDate: NOW - 60 });
  });
  test('a changed field breaks the signature (client cannot change its own id)', () => {
    const raw = make({ auth_date: String(NOW - 60), user }).replace('42', '43');
    assert.deepEqual(verifyInitData(raw, BOT, NOW), { ok: false, reason: 'bad-signature' });
  });
  test('a string signed with another bot token is refused', () => {
    const raw = make({ auth_date: String(NOW - 60), user }, 'other:token');
    assert.equal(verifyInitData(raw, BOT, NOW).ok, false);
  });
  test('expired strings (older than 24 h) are refused', () => {
    const raw = make({ auth_date: String(NOW - 25 * 3600), user });
    assert.deepEqual(verifyInitData(raw, BOT, NOW), { ok: false, reason: 'expired' });
  });
  test('missing token, missing hash and empty input are refused without throwing', () => {
    assert.equal(verifyInitData('', BOT, NOW).ok, false);
    assert.deepEqual(verifyInitData('auth_date=1&user=x', BOT, NOW), { ok: false, reason: 'malformed' });
    assert.deepEqual(verifyInitData(make({ auth_date: String(NOW), user }), '', NOW), { ok: false, reason: 'no-bot-token' });
  });
});
