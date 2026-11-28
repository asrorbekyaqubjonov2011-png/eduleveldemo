# Master V13 davom etmoqda

| № | Band | Holat | Dalil | Qolgan qabul mezoni |
|---|---|---|---|---|
| 01 | Bosh sahifa premium redesign | IMPLEMENTED | Yangi optik hero, CTA, SSR va Chromium ekranlari | Site Builder tahrirlash oqimi va oldin/keyin vizual qabul |
| 02 | Apple-inspired Liquid Glass | IMPLEMENTED | Light/dark glass tokenlari, header, avatar va Mini App materiallari | Kontrast va barcha ichki komponentlar auditi |
| 03 | Scrolling animatsiyalar | IMPLEMENTED | CSS scroll timeline, native fallback, reduced motion, sahifa almashuvi | Touch qurilmada kadr va scroll o‘lchovi |
| 04 | Mobil va desktop | IMPLEMENTED | Chromium, WebKit, Firefox va Linux Microsoft Edge’da 27 tadan public holat | Haqiqiy Android va qolgan interaktiv holatlar |
| 05 | EduBek avatar | LOCAL_VERIFIED | SVG visor, tana va EduLevel identifikatsiyasi. Voice PNG | — |
| 06 | EduBek mimika/lip-sync | IMPLEMENTED | Bosh, blink, playback va browser word-boundary | Haqiqiy mikrofon va fonema bo‘yicha sinov |
| 07 | AI real streaming | IMPLEMENTED | Stream unit testlari va brauzer bekor qilish tekshiruvi | Jonli tasdiqlangan bepul provayderda matn oqimi |
| 08 | AI bo‘sh/error javob | IMPLEMENTED | Empty/reasoning-only unit va no-key 503 regression | Jonli limit xatti-harakati va barcha retry holatlari |
| 09 | AI tezligi | BLOCKED | Gemini model katalogiga qisqa cold discovery budjeti | Tasdiqlangan bepul hisoblar va jonli TTFT p50/p95 |
| 10 | 8 AI provider benchmark | BLOCKED | Sakkiz adapter sintetik kontrakt sinovidan o‘tdi | Hisob va model bo‘yicha bepul limit dalili |
| 11 | Free-only mode | IMPLEMENTED | Gemini katalogi va Jev OpenRouter fail-closed | Hisob eligibility va barcha entry point auditi |
| 12 | Ovozli suhbat | IMPLEMENTED | Bekor qilish, barge-in, bosqichli timing va chatdan chiqishda mikrofon cleanup fixture sinovi | Qurilma mikrofon va real TTS bilan sinov |
| 13 | IELTS | INVENTORIED | IELTS Reading va Listening grading fixture, Writing/Speaking no-provider | Jonli Writing/Speaking bahosi hamda audio ijrosi |
| 14 | CEFR | INVENTORIED | CEFR Reading va Listening grading fixture | A1–B2 bo‘yicha yakuniy mashq, audio va natijalar |
| 15 | General English | INVENTORIED | Reading grading, mashq API va General English Placement fixture | Grammatika va lug‘at bo‘yicha to‘liq ssenariylar |
| 16 | Placement Test | LOCAL_VERIFIED | 44 lokal API, 17 brauzer, XLSX/DOCX, autosave retry va oxirgi urinish expiry | Production smoke release bilan bog‘liq |
| 17 | Mock Test | IMPLEMENTED | Draft, sessiya, grading va storage cheklangan mehmon identifikatori unit sinovi | Brauzer, expiry va ochiq/cheklangan testlar |
| 18 | Kutubxona | IMPLEMENTED | Tarifni joyida yangilash va serverda kontentni cheklash | Tarixiy tashqi public PDF URL va to‘liq brauzer oqimi |
| 19 | Video darslar | INVENTORIED | 15 lesson API tekshiruvi | Haqiqiy YouTube va video playback |
| 20 | VIP tizimi | IMPLEMENTED | Parallel VIP xaridi, Edu Coin mukofoti, depozit qarori va manual balansdagi stale update sinovlari | Barcha tarif va moliya amallari bo‘yicha yakuniy qamrov |
| 21 | Profil tizimi | IMPLEMENTED | HTTPS profil, session va owner logout | Google OAuth, Telegram account link va barcha profil amallari |
| 22 | Owner Panel | IMPLEMENTED | Owner qidiruvi, logout va barcha tablarning viewport tasvirlari | Barcha boshqaruv amallari |
| 23 | Telegram bot | BLOCKED | 20 Telegram fake API tekshiruvi, jumladan sayt bilan parallel depozit tasdiqlash | BotFather, haqiqiy opt-in chat va webhook |
| 24 | Telegram Mini App | IMPLEMENTED | Mini App HMAC route va oltita browser shortcut | Haqiqiy Telegram ilovasi hamda link oqimi |
| 25 | Supabase | INVENTORIED | 6 migration lokal, production read-only agregat | Production backup/restore va DB connection target |
| 26 | Firebase | BLOCKED | Firebase token verifikatsiyasi kodda | Firebase Console va Google OAuth |
| 27 | Server optimizatsiyasi | IMPLEMENTED | `db/all` snapshot proyeksiyasi, lokal RSS, CPU va latency bo‘yicha oldin/keyin o‘lchov | Renderda uzluksiz ishlash profili |
| 28 | DB pooling | IMPLEMENTED | DB pool local/TLS host tanlash aniqlashtirildi | Pooling metrikalari, tranzaksiya va deadline auditi |
| 29 | Load test | IMPLEMENTED | 2240 so‘rov, 0 HTTP 503, health 200 va Next RSS o‘lchovi | RSS cho‘qqisi, Render profil va production sig‘imi |
| 30 | SEO | IMPLEMENTED | Canonical sitemap, robots va lokal preview IndexNow cheklovi unit testi | CI SEO manager, Search Console va production indeks dalili |
| 31 | Har bir tugma/funksiya | INVENTORIED | 100 public route va 40 role/tab ssenariysi | Har bir tugma, role va mutatsiya |
| 32 | Regression tests | LOCAL_VERIFIED | Baseline regressiya suite va yangi fixture testlari | Release oldidan to‘liq qamrov va CI |
| 33 | Production build | CI_VERIFIED | TypeScript, ESLint, unit va Next.js build | Production release SHA uchun qayta tekshiruv |
| 34 | Screenshotlar | IMPLEMENTED | Public va protected desktop/tablet/mobile PNG | Qolgan modallar, to‘liq bir xil before/after va real qurilmalar |
| 35 | GitHub source-code handoff | CI_VERIFIED | 3fe5c79 ikki CI tekshiruvi, lokal detached checkout build, lockfile, konfiguratsiya, migratsiya va assetlar | Yakuniy release SHA uchun qayta tekshirish |
| 36 | Render production deploy | BLOCKED | www CNAME va production sitemap fingerprint edu-level.onrender.com bilan mos | Render production service ID, branch, deploy SHA, backup va ruxsat |

Jadvaldagi status tegishli dalil darajasini bildiradi. Hozirgi checkout va CI dalillari yakuniy release SHA uchun qayta tekshiriladi. Production tasdiqlangan bandlar 0/36.
