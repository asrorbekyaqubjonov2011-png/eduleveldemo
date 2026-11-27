import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { matchDockTopic } from './edubekDockMatch';

describe('public EduBek helper topic matching', () => {
  test('common visitor questions map to a site topic', () => {
    assert.equal(matchDockTopic('VIP tarif narxi qancha?'), 'vip');
    assert.equal(matchDockTopic('Mening darajam qaysi?'), 'level');
    assert.equal(matchDockTopic('Ustoz kim?'), 'teacher');
    assert.equal(matchDockTopic('Qanday ro‘yxatdan o‘taman'), 'start');
    assert.equal(matchDockTopic('IELTS ga tayyorlaysizlarmi'), 'ielts');
    assert.equal(matchDockTopic('elektron kitoblar bormi'), 'books');
  });
  test('unknown or empty questions are not guessed', () => {
    assert.equal(matchDockTopic('the weather is nice'), null);
    assert.equal(matchDockTopic(''), null);
    assert.equal(matchDockTopic('a'), null);
  });
});
