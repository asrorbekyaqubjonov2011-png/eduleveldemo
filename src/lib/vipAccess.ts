import { VIPTier } from '../types';

export const VIP_TIER_RANK: Record<string, number> = {
  none: 0,
  free: 1,
  start: 2,
  plus: 3,
  pro: 4,
  gold: 5,
  platinum: 6,
  premium: 7,
  legend: 8,
  individual: 9
};

/**
 * Check if the user's current VIP tier meets or exceeds the required VIP tier.
 * If required is 'none' or 'free' or undefined, everyone has access.
 */
export function hasVipAccess(userTier?: VIPTier | string, requiredTier?: VIPTier | string): boolean {
  if (!requiredTier || requiredTier === 'none' || requiredTier === 'free') {
    return true;
  }
  const userRank = VIP_TIER_RANK[userTier || 'free'] ?? 0;
  // An unknown tier in the requirement is a configuration error: deny instead of opening the content.
  const reqRank = VIP_TIER_RANK[requiredTier];
  if (reqRank === undefined) return false;
  return userRank >= reqRank;
}

/**
 * Returns formatted label and badge color for VIP tier requirements
 */
export function getVipBadgeInfo(tier?: VIPTier | string) {
  if (!tier || tier === 'none' || tier === 'free') {
    return {
      label: 'BEPUL',
      bgClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
      isFree: true
    };
  }
  return {
    label: `👑 VIP ${tier.toUpperCase()}`,
    bgClass: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
    isFree: false
  };
}
