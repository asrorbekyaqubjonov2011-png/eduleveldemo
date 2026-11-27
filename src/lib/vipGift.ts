import type { AppDatabase, VipGift } from '../types';
import { VIP_TIER_RANK } from './vipAccess';

const rank = (tier?: string) => VIP_TIER_RANK[tier || 'free'] ?? 1;

/** A gift is live between its start and end time while the owner has not stopped it. */
export function isGiftActive(gift?: VipGift | null, now = Date.now()): boolean {
  return !!gift && gift.active && Date.parse(gift.endsAt) > now && Date.parse(gift.startsAt) <= now;
}

/**
 * Applies or ends the owner's limited-time VIP gift for every student.
 *
 * While the gift is live, each student below the gift tier is raised to it until the gift ends; what
 * each student had before is remembered in db.vipGiftApplied. When the gift ends (time or owner), a
 * student who still holds exactly the gifted tier and end date gets the previous plan back. A student
 * who bought a plan meanwhile keeps it. Safe to call on every request.
 */
export function syncVipGift(db: AppDatabase, now = Date.now()): void {
  const gift = db.vipGift;
  const applied = (db.vipGiftApplied = db.vipGiftApplied || {});

  if (gift && isGiftActive(gift, now)) {
    for (const u of db.users) {
      if (u.role !== 'student' || applied[u.id]) continue;
      if (rank(u.vipTier) >= rank(gift.tier)) continue;
      applied[u.id] = { tier: u.vipTier || 'free', expiresAt: u.vipExpiresAt };
      u.vipTier = gift.tier as any;
      u.vipExpiresAt = gift.endsAt;
    }
    return;
  }

  for (const [id, prev] of Object.entries(applied)) {
    const u = db.users.find((x) => x.id === id);
    if (u && gift && u.vipTier === gift.tier && u.vipExpiresAt === gift.endsAt) {
      u.vipTier = prev.tier as any;
      if (prev.expiresAt) u.vipExpiresAt = prev.expiresAt;
      else delete u.vipExpiresAt;
    }
    delete applied[id];
  }
}
