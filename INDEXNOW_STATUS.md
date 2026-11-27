# INDEXNOW_STATUS (2026-11-26)
Holat: IMPLEMENTED (build va unit testlar o'tdi). Production'da tekshirilmagan. Bepul: api.indexnow.org, to'lov yo'q.
- Kalit: bazada bir marta yaratiladi (site_settings 'indexnow'), `/api/indexnow/key` da matn sifatida beriladi.
- Faqat kanonik host (edulevel.uz), https, dedup, o'zgargan URL (lastmod bo'yicha). Deploy o'zi yubormaydi.
- Owner SEO sahifasini nashr/o'chirganda 1 URL yuboriladi (fon rejimida, xato save'ni buzmaydi). Minimal oralig'i 1 daqiqa; xato URL'lar retry ro'yxatida.
- Qabul qilinish indekslash kafolati emas.
- Owner paneli: SEO Content Manager ichida "IndexNow (Bing, Yandex)" bloki.
- Testlar: src/lib/indexnow.test.ts (3 mock test). Real yuborish: PENDING (owner "Yangilarini yuborish" tugmasi).
- Lokal Postgres ishlamasa key endpoint 503 qaytaradi (kutilgan).
