import { Language } from '../types';

export interface TranslationDictionary {
  [key: string]: {
    uz: string;
    uz_cyrl: string;
    en: string;
    ru?: string;
  };
}

export const translations: TranslationDictionary = {
  // Brand & Slogans
  brand_name: {
    uz: 'Edu Level',
    uz_cyrl: 'Эду Левел',
    en: 'Edu Level'
  },
  brand_tagline: {
    uz: 'IELTS, CEFR va General English LMS Platformasi',
    uz_cyrl: 'IELTS, CEFR ва General English LMS Платформаси',
    en: 'IELTS, CEFR & General English LMS Platform'
  },

  // Navigation Links
  nav_home: {
    uz: 'Bosh Sahifa',
    uz_cyrl: 'Бош Саҳифа',
    en: 'Home'
  },
  nav_dashboard: {
    uz: 'Dashboard',
    uz_cyrl: 'Дашборд',
    en: 'Dashboard'
  },
  nav_courses: {
    uz: 'Kurslar',
    uz_cyrl: 'Курслар',
    en: 'Courses'
  },
  nav_books: {
    uz: 'Bepul Kitoblar',
    uz_cyrl: 'Бепул Китоблар',
    en: 'Free Books'
  },
  nav_mock: {
    uz: 'Mock Test',
    uz_cyrl: 'Мок Тест',
    en: 'Mock Exam'
  },
  nav_results: {
    uz: 'Natijalar (8.5 & C1)',
    uz_cyrl: 'Натижалар (8.5 & C1)',
    en: 'Results (8.5 & C1)'
  },
  nav_olympiad: {
    uz: 'Turnir',
    uz_cyrl: 'Турнир',
    en: 'Tournament'
  },
  nav_leaderboard: {
    uz: 'Reyting',
    uz_cyrl: 'Рейтинг',
    en: 'Leaderboard'
  },
  nav_vip: {
    uz: 'VIP Tariflar',
    uz_cyrl: 'VIP Тарифлар',
    en: 'VIP Plans'
  },
  nav_diagnostic: {
    uz: "Yo'nalishni Aniqlash",
    uz_cyrl: 'Йўналишни Аниқлаш',
    en: 'Placement Quiz'
  },

  // Auth Buttons & Modals
  btn_login: {
    uz: 'Kirish',
    uz_cyrl: 'Кириш',
    en: 'Sign In'
  },
  btn_register: {
    uz: "Ro'yxatdan o'tish",
    uz_cyrl: 'Рўйхатдан ўтиш',
    en: 'Register'
  },
  btn_cabinet: {
    uz: 'Kabinet',
    uz_cyrl: 'Кабинет',
    en: 'Portal'
  },
  btn_owner_panel: {
    uz: 'Owner Paneli',
    uz_cyrl: 'Овнер Панели',
    en: 'Owner Panel'
  },
  btn_logout: {
    uz: 'Chiqish',
    uz_cyrl: 'Чиқиш',
    en: 'Log Out'
  },
  btn_back_home: {
    uz: 'Bosh sahifaga qaytish',
    uz_cyrl: 'Бош саҳифага қайтиш',
    en: 'Back to Home'
  },

  // Hero Section
  hero_badge: {
    uz: 'UZBEKISTON #1 PREMIUM IELTS & CEFR PLATFORMASI',
    uz_cyrl: 'ЎЗБЕКИСТОН #1 ПРЕМИУМ IELTS & CEFR ПЛАТФОРМАСИ',
    en: 'UZBEKISTAN #1 PREMIUM IELTS & CEFR PLATFORM'
  },
  hero_title_1: {
    uz: 'Ingliz Tilini',
    uz_cyrl: 'Инглиз Тилини',
    en: 'Master English with'
  },
  hero_title_highlight: {
    uz: 'Band 8.5 va C1 Darajada',
    uz_cyrl: 'Band 8.5 ва C1 Даражада',
    en: 'Band 8.5 & C1 Fluency'
  },
  hero_title_2: {
    uz: 'Mukammal O‘rganing',
    uz_cyrl: 'Мукаммал Ўрганинг',
    en: 'Online & Interactive'
  },
  hero_subtitle: {
    uz: 'Real Cambridge uslubidagi mock simulyatorlar, 4-ko‘nikmali AI Writing/Speaking imtihonchisi va muntazam mashg‘ulotlar!',
    uz_cyrl: 'Реал Cambridge услубидаги мок симуляторлар, 4-кўникмали AI Writing/Speaking имтиҳончиси ва мунтазам машғулотлар!',
    en: 'Real Cambridge-style mock simulators, 4-skill AI Writing & Speaking examiners, and structured weekly practice!'
  },
  hero_cta_start: {
    uz: 'Bepul Boshlash',
    uz_cyrl: 'Бепул Бошлаш',
    en: 'Start Free'
  },
  hero_cta_diagnostic: {
    uz: 'Darajangizni Aniqlang (2 daqiqa)',
    uz_cyrl: 'Даражангизни Аниқланг (2 дақиқа)',
    en: 'Test Your Level (2 mins)'
  },
  hero_feature_simulators: {
    uz: 'Split-Screen Reading & Listening Simulyatori',
    uz_cyrl: 'Split-Screen Reading & Listening Симулятори',
    en: 'Split-Screen Reading & Listening Simulator'
  },
  hero_feature_ai: {
    uz: 'Edubek AI Virtual Ustoz & Speaking Avatari',
    uz_cyrl: 'Эдубек AI Виртуал Устоз & Speaking Аватари',
    en: 'Edubek AI Virtual Tutor & Speaking Avatar'
  },
  hero_feature_clans: {
    uz: '4 ko‘nikmali mashq maydoni',
    uz_cyrl: '4 кўникмали машқ майдони',
    en: '4-skill practice arena'
  },

  // Student Dashboard
  dash_welcome: {
    uz: 'Xush kelibsiz',
    uz_cyrl: 'Хуш келибсиз',
    en: 'Welcome back'
  },
  dash_streak: {
    uz: 'Kunlik Seriya',
    uz_cyrl: 'Кунлик Серия',
    en: 'Day Streak'
  },
  dash_current_vip: {
    uz: 'Joriy VIP Tarif',
    uz_cyrl: 'Жорий VIP Тариф',
    en: 'Current VIP Tier'
  },
  dash_upgrade_vip: {
    uz: 'VIP Faollashtirish',
    uz_cyrl: 'VIP Фаоллаштириш',
    en: 'Activate VIP'
  },
  dash_arena_title: {
    uz: 'IELTS & CEFR 4-Ko‘nikma Arenasi',
    uz_cyrl: 'IELTS & CEFR 4-Кўникма Аренаси',
    en: 'IELTS & CEFR 4-Skill Arena'
  },
  dash_quick_nav: {
    uz: 'Tezkor o‘tish tugmalari',
    uz_cyrl: 'Тезкор ўтиш тугмалари',
    en: 'Quick Access Links'
  },
  dash_coins: {
    uz: 'Edu Coin',
    uz_cyrl: 'Эду Коин',
    en: 'Edu Coins'
  },
  dash_balance: {
    uz: 'Hamyon Balansi',
    uz_cyrl: 'Ҳамён Баланси',
    en: 'Wallet Balance'
  },
  dash_collapse_sidebar: {
    uz: 'Menyuni yopish',
    uz_cyrl: 'Менюни ёпиш',
    en: 'Collapse menu'
  },
  dash_expand_sidebar: {
    uz: 'Menyuni ochish',
    uz_cyrl: 'Менюни очиш',
    en: 'Expand menu'
  },

  // Languages Labels
  lang_uz_latin: {
    uz: "O'zbekcha (Lotin)",
    uz_cyrl: "Ўзбекча (Лотин)",
    en: 'Uzbek (Latin)'
  },
  lang_uz_cyrillic: {
    uz: 'Ўзбекча (Кирилл)',
    uz_cyrl: 'Ўзбекча (Кирилл)',
    en: 'Uzbek (Cyrillic)'
  },
  lang_en: {
    uz: 'English',
    uz_cyrl: 'English',
    en: 'English'
  }
};

/**
 * High-precision Uzbek Latin to Uzbek Cyrillic phonetic transliterator
 * Supports soft vowels, diphthongs, sh, ch, ng, g', o', and capital preservation
 */
export function uzLatinToCyrillic(text: string): string {
  if (!text) return '';

  const mapping: [RegExp, string][] = [
    // Two-character pairs (case sensitive)
    [/Yo‘/g, 'Йў'],
    [/Yo'/g, 'Йў'],
    [/yo‘/g, 'йў'],
    [/yo'/g, 'йў'],
    [/Sh/g, 'Ш'],
    [/sh/g, 'ш'],
    [/Ch/g, 'Ч'],
    [/ch/g, 'ч'],
    [/O‘/g, 'Ў'],
    [/O'/g, 'Ў'],
    [/o‘/g, 'ў'],
    [/o'/g, 'ў'],
    [/G‘/g, 'Ғ'],
    [/G'/g, 'Ғ'],
    [/g‘/g, 'ғ'],
    [/g'/g, 'ғ'],
    [/Ye/g, 'Е'],
    [/ye/g, 'е'],
    [/Yu/g, 'Ю'],
    [/yu/g, 'ю'],
    [/Ya/g, 'Я'],
    [/ya/g, 'я'],
    [/Yo/g, 'Ё'],
    [/yo/g, 'ё'],

    // Single character Latin to Cyrillic
    [/A/g, 'А'], [/a/g, 'а'],
    [/B/g, 'Б'], [/b/g, 'б'],
    [/D/g, 'Д'], [/d/g, 'д'],
    [/E/g, 'Э'], [/e/g, 'э'],
    [/F/g, 'Ф'], [/f/g, 'ф'],
    [/G/g, 'Г'], [/g/g, 'г'],
    [/H/g, 'Ҳ'], [/h/g, 'ҳ'],
    [/I/g, 'И'], [/i/g, 'и'],
    [/J/g, 'Ж'], [/j/g, 'ж'],
    [/K/g, 'К'], [/k/g, 'к'],
    [/L/g, 'Л'], [/l/g, 'л'],
    [/M/g, 'М'], [/m/g, 'м'],
    [/N/g, 'Н'], [/n/g, 'н'],
    [/O/g, 'О'], [/o/g, 'о'],
    [/P/g, 'П'], [/p/g, 'п'],
    [/Q/g, 'Қ'], [/q/g, 'қ'],
    [/R/g, 'Р'], [/r/g, 'р'],
    [/S/g, 'С'], [/s/g, 'с'],
    [/T/g, 'Т'], [/t/g, 'т'],
    [/U/g, 'У'], [/u/g, 'у'],
    [/V/g, 'В'], [/v/g, 'в'],
    [/X/g, 'Х'], [/x/g, 'х'],
    [/Y/g, 'Й'], [/y/g, 'й'],
    [/Z/g, 'З'], [/z/g, 'з']
  ];

  let result = text;
  for (const [pattern, replacement] of mapping) {
    result = result.replace(pattern, replacement);
  }
  return result;
}
