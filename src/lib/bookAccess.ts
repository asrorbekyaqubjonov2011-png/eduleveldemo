import type { DigitalBook, User } from '../types';
import { hasVipAccess } from './vipAccess';

type Reader = Pick<User, 'vipTier' | 'vipExpiresAt' | 'role'>;

export function readerTier(user?: Reader | null): string {
  if (user?.vipExpiresAt && !(Date.parse(user.vipExpiresAt) > Date.now())) return 'none';
  return user?.vipTier || 'none';
}

/** The catalogue position is measured before a search or category filter. */
export function canReadBook(book: DigitalBook, index: number, user?: Reader | null): boolean {
  if (user?.role === 'owner') return true;
  const tier = readerTier(user);
  if (!hasVipAccess(tier, book.requiredVIP)) return false;
  if (user && (book.requiredVIP === 'free' || book.isFreeRegistered || hasVipAccess(tier, 'start'))) return true;
  if (book.isFreeGuest) return true;
  return index >= 0 && index < (user ? 6 : 4);
}
