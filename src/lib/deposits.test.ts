import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { DepositTransaction, User } from '../types';
import { reviewDeposit } from './deposits';

function fixture() {
  const user: User = {
    id: 'student-1', name: 'Fixture', surname: 'Student', phone: '+998 90 000 00 00',
    role: 'student', vipTier: 'free', registeredAt: '2026-01-01', completedLessons: [], balance: 500, xp: 10,
  };
  const transaction: DepositTransaction = {
    id: 'deposit-1', userId: user.id, userName: 'Fixture Student', userPhone: user.phone, amount: 3000,
    status: 'pending', method: 'card', paymentCode: 'fixture', createdAt: '2026-01-01',
  };
  return { user, transaction, db: { users: [user], depositTransactions: [transaction] } };
}

test('deposit approval credits a signed-in account once even with a shared phone number', () => {
  const { user, transaction, db } = fixture();
  const other = { ...user, id: 'student-2' };
  db.users.push(other);
  assert.equal(reviewDeposit(db, transaction.id, 'approve').ok, true);
  assert.equal(reviewDeposit(db, transaction.id, 'approve').ok, false);
  assert.equal(reviewDeposit(db, transaction.id, 'reject').ok, false);
  assert.equal(transaction.status, 'completed');
  assert.equal(user.balance, 3500);
  assert.equal(user.xp, 13);
  assert.equal(other.balance, 500);
});

test('legacy deposits stay pending until exactly one account matches the receipt phone', () => {
  const { user, transaction, db } = fixture();
  transaction.userId = 'old-id';
  transaction.userPhone = '998900000000';
  db.users.push({ ...user, id: 'student-2' });
  assert.equal(reviewDeposit(db, transaction.id, 'approve').ok, false);
  assert.equal(transaction.status, 'pending');
  assert.equal(user.balance, 500);

  db.users.pop();
  assert.equal(reviewDeposit(db, transaction.id, 'approve').ok, true);
  assert.equal(transaction.userId, user.id);
  assert.equal(user.balance, 3500);
});
