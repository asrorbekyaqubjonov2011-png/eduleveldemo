import { ShopItem } from '../types';

/** Default Edu Coin shop catalog (used when the owner has not configured db.shopItems).
 *  Shared by the student shop UI and the server, which validates prices. */
export const DEFAULT_SHOP_ITEMS: ShopItem[] = [
  // FRAMES
  {
    id: 'frame-neon-cyan',
    title: 'Neon Cyber Cyan Ramka',
    category: 'frame',
    pricePoints: 150,
    description: 'Ismingiz va suratingiz atrofida porlab turuvchi kiber cyan nur ramkasi.',
    icon: '🖼️',
    colorClass: 'border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.8)]',
    styleValue: 'neon_cyan',
    isAvailable: true
  },
  {
    id: 'frame-gold-flame',
    title: 'Gold Flame Champion Ramka',
    category: 'frame',
    pricePoints: 300,
    description: 'Oltin nurlar va alangali chempion ramkasi.',
    icon: '👑',
    colorClass: 'border-amber-400 shadow-[0_0_18px_rgba(245,158,11,0.9)]',
    styleValue: 'gold_flame',
    isAvailable: true
  },
  {
    id: 'frame-royal-violet',
    title: 'Royal Violet Aura Ramka',
    category: 'frame',
    pricePoints: 500,
    description: 'Aksariyat top o‘quvchilar tanlovi bo‘lgan qirollik binafsha nuri.',
    icon: '🔮',
    colorClass: 'border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.9)]',
    styleValue: 'royal_violet',
    isAvailable: true
  },
  {
    id: 'frame-diamond-aurora',
    title: 'Diamond Aurora Prism Ramka',
    category: 'frame',
    pricePoints: 800,
    description: 'Afsonaviy zumrad va olmosdek charaqlovchi oliy darajali ramka.',
    icon: '💎',
    colorClass: 'border-teal-300 shadow-[0_0_22px_rgba(45,212,191,1)]',
    styleValue: 'diamond_aurora',
    isAvailable: true
  },

  // NAME COLORS
  {
    id: 'color-gold-gradient',
    title: 'Zarhalli Oltin Ism Rangi',
    category: 'color',
    pricePoints: 200,
    description: 'Chat va reytingda ismingiz zarhalli oltin rangda porlaydi.',
    icon: '🎨',
    colorClass: 'text-amber-400 font-extrabold drop-shadow-[0_0_8px_rgba(245,158,11,0.8)]',
    styleValue: 'gold',
    isAvailable: true
  },
  {
    id: 'color-cyan-glow',
    title: 'Neon Cyan Ism Rangi',
    category: 'color',
    pricePoints: 250,
    description: 'Chatda ismingiz moviy neon nuri bilan ko‘rinadi.',
    icon: '⚡',
    colorClass: 'text-cyan-400 font-extrabold drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]',
    styleValue: 'cyan',
    isAvailable: true
  },
  {
    id: 'color-ruby-red',
    title: 'Yoqut Qizil Ism Rangi',
    category: 'color',
    pricePoints: 350,
    description: 'Liderlar va chempionlar uchun olovli yoqut qizil rangi.',
    icon: '🔥',
    colorClass: 'text-rose-500 font-extrabold drop-shadow-[0_0_8px_rgba(244,63,94,0.8)]',
    styleValue: 'ruby',
    isAvailable: true
  },

  // CUSTOM BADGES / TITLES
  {
    id: 'badge-grammar-master',
    title: "Unvon: 'Grammar Master ⚡'",
    category: 'badge',
    pricePoints: 250,
    description: 'Profilingiz va chat xabaringiz yonida ushbu unvon ko‘rinadi.',
    icon: '🏅',
    styleValue: 'Grammar Master ⚡',
    isAvailable: true
  },
  {
    id: 'badge-ielts-legend',
    title: "Unvon: 'IELTS Band 8.5 Legend 👑'",
    category: 'badge',
    pricePoints: 450,
    description: 'Oliy akademik darajangizni anglatuvchi afsonaviy unvon.',
    icon: '🎓',
    styleValue: 'IELTS Band 8.5 Legend 👑',
    isAvailable: true
  },

  // BOOKS & MANUALS
  {
    id: 'book-ielts-w2-band9',
    title: 'IELTS Writing Task 2 Band 9 Secrets (PDF)',
    category: 'book',
    pricePoints: 300,
    description: 'Band 9 formulalar, akademik insho andozalari va namuna insholar to‘plami.',
    icon: '📚',
    fileUrl: 'https://edu-level.uz/pdf/ielts-writing-band9-handbook.pdf',
    isAvailable: true
  },
  {
    id: 'book-1200-collocations',
    title: '1200 Academic Collocations & Prepositions Handbook',
    category: 'book',
    pricePoints: 250,
    description: 'IELTS va CEFR uchun eng ko‘p tushadigan turg‘un birikmalar.',
    icon: '📖',
    fileUrl: 'https://edu-level.uz/pdf/1200-academic-collocations.pdf',
    isAvailable: true
  },
  {
    id: 'book-cefr-c1-bible',
    title: 'CEFR C1 Grammar & Vocabulary Master Bible',
    category: 'book',
    pricePoints: 400,
    description: 'Milliy sertifikat C1 imtihoni uchun to‘liq qo‘llanma.',
    icon: '📙',
    fileUrl: 'https://edu-level.uz/pdf/cefr-c1-grammar-bible.pdf',
    isAvailable: true
  },

  // BOOSTERS
  {
    id: 'booster-streak-freeze',
    title: '1 Kunlik Streak Muzlatish Himoyasi',
    category: 'booster',
    pricePoints: 100,
    description: 'Bir kun darsga kira olmasangiz ham, alangangiz o‘chmaydi!',
    icon: '🧊',
    isAvailable: true
  },
  {
    id: 'booster-xp-2x',
    title: '24 Soatlik 2x XP Kuchaytirgich (Booster)',
    category: 'booster',
    pricePoints: 200,
    description: '24 soat davomida har bir yechilgan test uchun 2 baravar ko‘p XP oling!',
    icon: '🚀',
    isAvailable: true
  }
];

/** Rewards for thematic quiz packs (server grants them once per pack per student). */
export const QUIZ_PACK_REWARDS: Record<string, { xp: number; points: number }> = {
  'pack-grammar-c1': { xp: 150, points: 100 },
  'pack-vocab-ielts': { xp: 140, points: 80 },
  'pack-phrasal-c1': { xp: 120, points: 70 },
  'pack-prepositions': { xp: 100, points: 60 }
};

/** Daily quest reward, claimable once per calendar day. */
export const DAILY_QUEST_REWARD = { xp: 150, points: 150, coins: 35 };
