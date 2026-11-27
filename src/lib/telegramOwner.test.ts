import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { checkOwner } from './telegramOwner';

describe('checkOwner', () => {
  test('first use: the right username is the owner and its id gets saved', () => {
    assert.deepEqual(checkOwner({ ownerUsername: '@Jasur', senderUsername: 'jasur', senderId: '111' }), { isOwner: true, bindId: '111' });
  });
  test('after the id is saved, a different account with the same username is not the owner', () => {
    assert.deepEqual(checkOwner({ ownerUsername: 'jasur', senderUsername: 'jasur', senderId: '222', savedId: '111' }), { isOwner: false });
    assert.deepEqual(checkOwner({ ownerUsername: 'jasur', senderUsername: 'jasur', senderId: '111', savedId: '111' }), { isOwner: true });
  });
  test('the owner may rename their username: the saved id still wins only with the owner username set, so a rename needs the setting updated', () => {
    assert.equal(checkOwner({ ownerUsername: 'jasur', senderUsername: 'newname', senderId: '111', savedId: '111' }).isOwner, false);
  });
  test('TELEGRAM_OWNER_ID decides on its own', () => {
    assert.equal(checkOwner({ ownerUsername: '', senderUsername: 'x', senderId: '999', envId: '999' }).isOwner, true);
    assert.equal(checkOwner({ ownerUsername: 'jasur', senderUsername: 'jasur', senderId: '111', envId: '999', savedId: '111' }).isOwner, false);
  });
  test('wrong username, empty settings and missing id are never the owner', () => {
    assert.equal(checkOwner({ ownerUsername: 'jasur', senderUsername: 'other', senderId: '1' }).isOwner, false);
    assert.equal(checkOwner({ ownerUsername: '', senderUsername: 'other', senderId: '1' }).isOwner, false);
    assert.equal(checkOwner({ ownerUsername: 'jasur', senderUsername: 'jasur', senderId: '' }).isOwner, false);
  });
});
