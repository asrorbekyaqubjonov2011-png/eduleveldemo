/**
 * The starter deck for Blitz, used only while the owner has not added ranked XP cards. Each card
 * asks for the C1 synonym of a common word; the answer is typed and checked by Jev.
 */
export interface BlitzCard {
  id: string;
  word: string;
  meaningUz: string;
  synonym: string;
  xpReward: number;
}

export const BLITZ_STARTER_DECK: BlitzCard[] = [
  { id: 'starter-1', word: 'big', meaningUz: 'katta', synonym: 'substantial', xpReward: 30 },
  { id: 'starter-2', word: 'hard', meaningUz: 'qiyin', synonym: 'demanding', xpReward: 30 },
  { id: 'starter-3', word: 'happy', meaningUz: 'xursand', synonym: 'elated', xpReward: 30 },
  { id: 'starter-4', word: 'show', meaningUz: 'ko‘rsatmoq', synonym: 'demonstrate', xpReward: 35 },
  { id: 'starter-5', word: 'try', meaningUz: 'urinib ko‘rmoq', synonym: 'endeavour', xpReward: 35 },
  { id: 'starter-6', word: 'begin', meaningUz: 'boshlamoq', synonym: 'commence', xpReward: 30 },
  { id: 'starter-7', word: 'end', meaningUz: 'tugatmoq', synonym: 'conclude', xpReward: 30 },
  { id: 'starter-8', word: 'help', meaningUz: 'yordam bermoq', synonym: 'facilitate', xpReward: 35 },
  { id: 'starter-9', word: 'clear', meaningUz: 'aniq, ravshan', synonym: 'lucid', xpReward: 35 },
  { id: 'starter-10', word: 'often', meaningUz: 'tez-tez', synonym: 'frequently', xpReward: 30 },
  { id: 'starter-11', word: 'enough', meaningUz: 'yetarli', synonym: 'sufficient', xpReward: 30 },
  { id: 'starter-12', word: 'trust', meaningUz: 'ishonch', synonym: 'confidence', xpReward: 35 }
];
