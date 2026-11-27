/**
 * The owner panel's sections: id and default name. The server checks saved choices against this list, and the
 * panel uses it to draw the switches. Locked sections can never be hidden, so the owner cannot lock themselves out.
 */
export const OWNER_NAV_ITEMS: Array<{ id: string; label: string }> = [
  { id: 'dashboard', label: 'Boshqaruv paneli' },
  { id: 'ai', label: 'AI' },
  { id: 'global_analytics', label: 'Global analitika' },
  { id: 'deposits', label: 'Depozitlar & moliya' },
  { id: 'telegram_bot', label: 'Telegram bot' },
  { id: 'livestream', label: 'Telegram jonli efir' },
  { id: 'students', label: "O'quvchilar & balans" },
  { id: 'shop_manager', label: 'Edu Coin do‘koni' },
  { id: 'courses', label: 'Kurslar & darslar' },
  { id: 'digital_books', label: 'Kutubxona' },
  { id: 'tests', label: 'Mock testlar' },
  { id: 'thematic_packs', label: 'Test paketlari' },
  { id: 'level_tests', label: 'Levelni aniqlash' },
  { id: 'exercises', label: 'Mashqlar' },
  { id: 'results', label: 'Sertifikat natijalari' },
  { id: 'vip', label: 'VIP tariflar' },
  { id: 'news', label: 'Yangiliklar & VIP sovg‘a' },
  { id: 'seo', label: 'SEO sahifalar' },
  { id: 'theme_bg', label: 'Orqa fon temalari' },
  { id: 'teacher_profile', label: 'Ustoz profili' },
  { id: 'settings', label: 'Sozlamalar' },
  { id: 'site_builder', label: 'Sayt konstruktori' },
  { id: 'reviews', label: 'Fikrlar' },
  { id: 'faq', label: 'Savol-javoblar' },
  { id: 'tickets', label: 'Murojaatlar' },
  { id: 'audit', label: 'Audit jurnali' },
  { id: 'security', label: 'Login & parol' }
];

export const OWNER_NAV_LOCKED = ['dashboard', 'settings', 'security'];
