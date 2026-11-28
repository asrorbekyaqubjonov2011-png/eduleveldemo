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
