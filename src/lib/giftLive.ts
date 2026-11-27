import type { VipGift } from '../types';

/** Browser-side check: is the owner's gift on right now? (The server decides what it applies.) */
export function isGiftLive(gift?: VipGift | null, now = Date.now()): boolean {
  return !!gift && gift.active && Date.parse(gift.endsAt) > now && Date.parse(gift.startsAt) <= now;
}
