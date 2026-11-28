import type { AppDatabase, DepositTransaction, User } from '../types';

type DepositReview =
  | { ok: true; transaction: DepositTransaction; user?: User }
  | { ok: false; status: 400 | 404 | 409; message: string; code?: 'USER_NOT_FOUND' };

export function findDepositUser(db: Pick<AppDatabase, 'users'>, userId: unknown, userPhone: unknown): User | undefined {
  const user = db.users.find(account => account.id === userId);
  if (user) return user;
  const phone = typeof userPhone === 'string' ? userPhone.replace(/\D/g, '') : '';
  if (!phone) return undefined;
  const matches = db.users.filter(account => account.phone?.replace(/\D/g, '') === phone);
  if (matches.length === 1) return matches[0];
}

export function reviewDeposit(db: Pick<AppDatabase, 'users' | 'depositTransactions'>, id: string, action: 'approve' | 'reject'): DepositReview {
  const transaction = db.depositTransactions.find(deposit => deposit.id === id);
  if (!transaction) return { ok: false, status: 404, message: 'Tranzaksiya topilmadi' };
  if (transaction.status !== 'pending') {
    return { ok: false, status: 400, message: 'Bu tranzaksiya allaqachon ko‘rib chiqilgan' };
  }
  if (action === 'reject') {
    transaction.status = 'rejected';
    return { ok: true, transaction };
  }

  const user = findDepositUser(db, transaction.userId, transaction.userPhone);
  if (!user) {
    return { ok: false, status: 409, code: 'USER_NOT_FOUND', message: 'Bu depozitning o‘quvchisi aniq topilmadi. Depozit tasdiqlanmadi.' };
  }

  transaction.userId = user.id;
  transaction.status = 'completed';
  transaction.approvedAt = new Date().toISOString();
  user.balance = (user.balance || 0) + transaction.amount;
  user.xp = (user.xp || 0) + Math.round(transaction.amount / 1000);
  return { ok: true, transaction, user };
}
