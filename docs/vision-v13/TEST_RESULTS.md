# Test natijalari

| Suite | Qamrov | Natija |
|---|---|---|
| `bun run verify` | 1106f68 build qilgan dastur kodi | tsc, ESLint 0 xato va 93 ogohlantirish, 202 unit test, Next.js build o‘tdi |
| Browser smoke | 1106f68, Chromium va HTTPS | 48 o‘tdi |
| EduBek Dock | c2dd060, Chromium | 10 o‘tdi |
| Placement browser | c2dd060, Chromium | 15 o‘tdi |
| Placement API | c2dd060 dasturi va yangilangan skript, lokal Postgres | 34 o‘tdi |
| Telegram fake transport | c2dd060 | 18 o‘tdi |
| Ovoz, Mini App, Owner navigatsiyasi | 1106f68, Chromium | 3 ssenariy o‘tdi. STT/AI/TTS va Telegram SDK fixture |
| Kutubxona va Mock | 1106f68, HTTPS va lokal Postgres | 2 ssenariy o‘tdi |
| Chromium viewport | c2dd060 | 9 width va 3 route, 27 holat o‘tdi |
| WebKit | 9 width va 3 route sinovi | 25/27 birinchi urinishda. Landing 320 va 360 alohida qayta sinovda o‘tdi |
| Firefox | Playwright headless | Runner 180 soniyada browserga ulanolmadi |
| Aralash yuklama | 1106f68, lokal HTTPS | 4/12/24 mijoz, 280 so‘rov. 25 ta 503, 40 ta kutilgan 401. Recovery 200 |
| GitHub Actions | 1106f68 | Verification o‘tdi. Integration workflow ishlamoqda |

[Verification](https://github.com/asrorbekyaqubjonov2011-png/eduleveldemo/actions/runs/46127620988) · [Integration](https://github.com/asrorbekyaqubjonov2011-png/eduleveldemo/actions/runs/46127620989)

## 9a64002 dastur kodi

Locked install, TypeScript, 204 unit test va Next production build o‘tdi. ESLint 0 error va 88 warning ko‘rsatdi. 48 smoke, 10 Dock, 15 Placement browser, 34 Placement API, 18 Telegram simulyatsiya va 2 education API ssenariysi o‘tdi. Yangi EduBek testida qo‘lda Tinglash, auto voice o‘chiq holati va ovozli suhbatga o‘tganda bekor qilish tasdiqlandi. Audio vositalari browser fixture bilan almashtirilgan.

[Yuklama va dependency](OVERLOAD_AND_DEPENDENCIES.md)

- `524c192` commitida ikkala GitHub Actions workflow muvaffaqiyatli yakunlandi.
- Kengaytirilgan lokal sinovda IELTS, CEFR va General English Reading bo‘yicha yaratish, o‘z yo‘nalishida kirish, javob kalitini berkitish va server grading o‘tdi. Bir o‘quvchining parallel Edu Coin mukofot so‘rovlarida ledgerga bir marta yozildi.
- Owner Forms 19, DB 12, mashqlar 20, darslar 15, yangiliklar 24 va ikki ketma-ket promo sinovining har biri 15 ta tekshiruvdan o‘tdi.
- Mobil va desktopda reduced-motion parametrini sahifani qayta yuklamasdan almashtirish counter animatsiyasini to‘xtatdi va qiymatni ko‘rsatdi. TypeScript, 204 unit test va build o‘tdi. ESLint 85 ogohlantirish va 0 xato qaytardi.

[Verification](https://github.com/asrorbekyaqubjonov2011-png/eduleveldemo/actions/runs/46137497928) · [Integration](https://github.com/asrorbekyaqubjonov2011-png/eduleveldemo/actions/runs/46137497905)

- `3c4bf53` commitida ikkala GitHub Actions workflow o‘tdi. Lokal yangi brauzer sinovida chatdan chiqish davom etayotgan AI so‘rovini bekor qildi.
- Firebase server token tekshiruvi uchun Bitta unit test qo‘shildi va suite jami 205 ta testdan iborat bo‘ldi. Sintetik imzolovchi bilan parallel Google login Firebase X.509 sertifikatlari uchun bitta fetch ishlatishi, keyingi tekshiruv keshni ishlatishi va noto‘g‘ri loyiha auditi tarmoq chaqiruvisiz qaytishi tekshirildi. Public Google sertifikat endpointi HTTP 200 qaytardi. Jonli Google user login ochiq.
- 100 public sahifa hamda 27 Owner va 13 Student tab 3 o‘lchamda ochildi. 420 ta full-page tasvir va alohida interaktiv holatlar mavjud.

[Verification](https://github.com/asrorbekyaqubjonov2011-png/eduleveldemo/actions/runs/46138393778) · [Integration](https://github.com/asrorbekyaqubjonov2011-png/eduleveldemo/actions/runs/46138393792)


## Placement va GitHub handoff

- `0b0ad7d` kodida ikkala GitHub Actions run muvaffaqiyatli. Owner brauzer testi standart barcha urinishlar eksportini, saralangan Excelni va 390 px mobil o‘lchamini tekshirdi. Kengaytirilgan API suite 39 ta tekshiruvdan o‘tdi.
- XLSX va DOCX saralash hisob IDsi bo‘yicha ishlaydi. Hisob IDsi yo‘q yoki balli tasdiqlanmagan yozuvlar tekshirish uchun saqlanadi. Cheklangan Git pattern tekshiruvida private key, GitHub token, OpenAI token yoki Google API key formatlariga mos tracked kod topilmadi.
- Test boshlanganidan keyin qo‘shilgan savol mavjud urinish bahosiga kirmasligi va resume avvalgi javobni saqlashi tekshirildi.

[Verification](https://github.com/asrorbekyaqubjonov2011-png/eduleveldemo/actions/runs/46157471210) · [Integration va screenshot artifact](https://github.com/asrorbekyaqubjonov2011-png/eduleveldemo/actions/runs/46157471220)

Lokal Placement brauzer sinovi 17 ta tekshiruvdan o‘tdi. Ikki yangi tekshiruv uzilgan javob yuborilishini qurilmada saqlash va retry orqali haqiqiy fixture APIga yozishni qamrab oldi. Grading validatsiyasining yangi unit testi bilan jami 208 test o‘tdi.

Firefox qayta sinovda 9 viewport bo‘yicha landing, IELTS va Mini App uchun 27/27 HTTP 200 va overflow tekshiruvidan o‘tdi. Bu desktop runner emulyatsiyasi.

Izolyatsiyalangan IELTS va CEFR Listening fixturelari transcriptni sessiyagacha berkitish, track ruxsati, autosave, resume va server bahosini tekshirdi. Writing/Speaking fixtureda provayder konfiguratsiyasi yo‘q holatda aniq xato qaytdi va submission tarixi o‘zgarmadi. Jonli model bahosi va real audio qamrovi ochiq.

Oxirgi muddati tugagan urinish ochilganda baho tranzaksiyada saqlanadi. Keyingi start 409 qaytaradi. Test faqat loopback fixture bazasidagi sintetik urinish vaqtini o‘zgartiradi. Placement API 44 ta tekshiruvdan o‘tdi. Yangilangan kodda TypeScript, Next.js build va 208 unit test o‘tdi. ESLint 0 xato va 85 ogohlantirish. Dependency auditda 5 moderate advisory qaytdi.

`e417e98` commitida [Verification](https://github.com/asrorbekyaqubjonov2011-png/eduleveldemo/actions/runs/46158214111) va [Integration](https://github.com/asrorbekyaqubjonov2011-png/eduleveldemo/actions/runs/46158214095) o‘tdi.
