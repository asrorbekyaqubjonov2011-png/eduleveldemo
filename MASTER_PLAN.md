# EduLevel — Master plan (secretsiz, repo ichida)

## Qarorlar (egasi tomonidan, 2026-11-23)
- Hosting: hozircha Render Free. Railway'ga ko'chirilmaydi.
- Canonical domen: https://edulevel.uz (BillurCOM orqali, DNS va SSL ishlayapti).
- Render manzillari: Singapore https://edu-level.onrender.com (asosiy), eski Ohio https://edulevel-hdk8.onrender.com (o'chirilmaydi, to'xtatilgan).
- Eski servis o'chirilmaydi; avval barcha bog'liqliklar va redirectlar tekshiriladi.
- Yangi pullik xizmat (Gemini billing, ElevenLabs, VoiceLab) sotib olinmaydi. Bepul/mavjud API bilan ishlanadi.
- Production ma'lumotlari o'chirilmaydi. Pullik xizmat ruxsatsiz yoqilmaydi. Xavfli migratsiya avtomatik bajarilmaydi.
- Bunny Stream: integratsiya tayyorlanadi, API kalitlari kodga yozilmaydi (faqat env nomlari).

## Bosqichlar
### P0 — Xavfsizlik va ma'lumot
- [x] VIP: noma'lum tarif fail-closed (commit 4b05823)
- [x] Supabase: 0003_rls_indexes production'da qo'llangan (list_migrations tasdiqlagan)
- [ ] Production ilovasi 0003 dan keyin ishlashini tekshirish (smoke)
- [ ] IDOR/authorization audit (har endpoint)
- [ ] Owner panel brute-force himoyasi
- [ ] API rate limiting, input validation (bigint raqam xatosi)
- [ ] Secret audit (git tracked, bundle, loglar); rotation checklist (egasi tasdiqlagandan keyin)
- [ ] Firebase token verification, SQL/XSS/CSRF tekshiruvi
- [ ] Regressiya testlari (security-test 139+, smoke-db)

### P1 — SEO, UX, tezlik
- [ ] Domen: canonical/metadata/OG/sitemap/robots/JSON-LD/CORS/webhook — hammasi edulevel.uz ga
- [ ] Eski hostlar uchun 301 redirect (GET/HEAD, path va query saqlanadi), host allowlist, loop testi
- [ ] Bosh sahifa SSR/SSG (hozir app/page.tsx client-only): public HTML'da H1 va asosiy matn
- [ ] Public SEO sahifalar sifatli, original (keyword stuffing yo'q)
- [ ] Core Web Vitals: LCP <= 2.5s, INP <= 200ms, CLS <= 0.1 (lab natija alohida belgilanadi)
- [ ] Render Free cold start o'lchovi

### P2 — Video, AI, operatsion
- [ ] Bunny Stream integratsiyasi (kalitsiz): URL parse, signed token, VIP allowlist, expiry
- [ ] Owner panel: video ko'rish tariflarini tanlash (5 VIP tarif, multi-select)
- [ ] EduBek ovoz: VAD, streaming STT/LLM/TTS, birinchi jumla tez, barge-in; bepul/mavjud API
- [ ] AI quota, timeout, fallback, cost jadvali
- [ ] Analytics (minimal PII), error monitoring, health endpoint

## Tashqi (egasi) ishlari — bloklangan
- Firebase Authorized domains: edulevel.uz qo'shilganini tekshirish
- Telegram webhook: getWebhookInfo (secretsiz hisobot)
- Search Console: sitemap va indekslash (processing)
- cron-job.org keep-alive: yoqilganini tasdiqlash
- Gemini billing kaliti (AI sifati va limiti uchun)
- Bunny library ID va kalitlar (env nomlari: BUNNY_LIBRARY_ID, BUNNY_STREAM_API_KEY, BUNNY_TOKEN_KEY — qiymatlar chatga yozilmaydi)
- Render: tarif (free/starter) va to'xtatilgan dublikat servis qarori

## Yangilanish — 2026-11-25 (avtonom sessiya)
Holat belgilash qoidasi: `Implemented` = kod yozilgan; `Tested` = lokal test o'tgan; `Production verified` = productionda tekshirilgan.

| Vazifa | Holat | Dalil |
|---|---|---|
| Guest exam/thematic endpointlariga IP limit | Implemented, Tested | `app/api/[...path]/route.ts`; lokal: 120 ta ruxsat, keyin 429 |
| Owner write/read authorization (matritsa) | Tested (lokal) | `OWNER_PANEL_AUDIT.md`; `scripts/security-test.mjs` 74/74 |
| Anonim `db/all` sanitizer | Tested (kod + lokal) | maxfiy kalitlar yo'q; lokal DB bo'sh, PII qismi kod ko'rigi bilan |
| Owner login brute-force limit | Tested | security-test "login rate limit kicks in" |
| Firebase ID token tekshiruvi | Implemented (kod ko'rigi) | `src/lib/auth/firebaseToken.ts` imzo, aud, iss, exp |
| AI gateway: 4 zaxira provayder + Gemini | Implemented, Tested | `aiRouter.test.ts`; Cerebras/SambaNova/Qwen olib tashlandi (`eed1722`) |
| BlogPosting JSON-LD | Implemented, Production verified | `edulevel.uz/blog/...` da `BlogPosting` bor |
| Mobil overflow (landing, SEO sahifa) | Tested (lokal 390px) | `ui-check`: overflow 0, console error 0 |
| Owner panel mobil UI | NOT verified | SPA owner menyusi kliklanmagan |
| Owner panel productionda | NOT verified | owner paroli chatda berilmagan; ruxsat yo'q |
| Eski Render servis redirect | Blocked (egasi qarori) | o'chirilmaydi |
| Secret audit (git, bundle, loglar) | NOT done | keyingi qadam |
| SEO kontent (100+ sahifa), keyword cluster | NOT done | katta tahririy ish |
| AI API Manager (RPM/TPM, latency dashboard) | NOT done | |
| EduBek ovoz latency o'lchovi | NOT done | Android + real kalit kerak |
| Legal /privacy /terms | Draft, indekslanmaydi | egasi tasdiqlashi kerak |
