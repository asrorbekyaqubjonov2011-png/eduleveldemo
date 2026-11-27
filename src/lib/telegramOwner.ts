/**
 * Who is the owner in the Telegram bot. A Telegram username can be changed or released and then claimed by someone
 * else, so the username alone is not enough: the first time the owner's username writes to the bot, the numeric
 * Telegram id of that account is saved, and from then on both must match. The owner can also fix the id in Render
 * (TELEGRAM_OWNER_ID), which takes priority over the saved one.
 */
export interface OwnerCheckInput {
  /** Owner's username from the bot settings (without @, any case). */
  ownerUsername: string;
  /** Username of the sender (without @). */
  senderUsername: string;
  /** Numeric id of the sender. */
  senderId: string;
  /** Id saved in the settings, if any. */
  savedId?: string;
  /** Id from TELEGRAM_OWNER_ID, if set. */
  envId?: string;
}

export interface OwnerCheck {
  isOwner: boolean;
  /** Set when this message should save the sender's id as the owner's id (first use). */
  bindId?: string;
}

export function checkOwner(i: OwnerCheckInput): OwnerCheck {
  const want = i.ownerUsername.replace(/^@/, '').trim().toLowerCase();
  const have = i.senderUsername.replace(/^@/, '').trim().toLowerCase();
  const id = String(i.senderId || '').trim();
  const fixed = (i.envId || '').trim();
  const saved = (i.savedId || '').trim();
  if (fixed) return { isOwner: !!id && id === fixed };
  if (!want || want !== have || !id) return { isOwner: false };
  if (saved) return { isOwner: saved === id };
  return { isOwner: true, bindId: id };
}
