# Xavfsizlik audit (2026-11-25)

Usul: kod ko'rigi (`app/api/[...path]/route.ts`, `src/lib/auth/guards.ts`, `app/api/levels/*`, `src/lib/auth/firebaseToken.ts`) + lokal runtime sinov (`next start`, lokal Postgres). Productionga sinov yuborilmadi.

## Tekshirilgan va to'g'ri ishlaydigan
- **Yozuv himoyasi:** `authorize()` — cookie sessiyali barcha POST/PUT/DELETE faqat owner uchun, istisnolar `PUBLIC_POST` va `SIGNED_IN_POST` ro'yxatida. Lokal: anonim POST `owner/news`, `users/update-vip`, `users/toggle-block`, `owner/bot-settings` → 401.
- **CSRF:** `crossSiteRequest()` (Sec-Fetch-Site va Origin) yozuvlarda.
- **Owner GET:** `ai/stats` anonim → 403; `owner/ai-providers` anonim → 401.
- **Anonim `db/all`:** `sanitizeDatabase()` — `ownerPasswordHash`, `botToken`, `adminChatId`, `customApiKey`, `examSessions`, `correctAnswer`, `explanation` yo'q (lokal javobda tekshirildi). Izoh: lokal DB bo'sh, shuning uchun foydalanuvchi PII qismi (`stripOtherUser`: password, email, phone, balance) faqat kod ko'rigi bilan tasdiqlangan.
- **Login:** hisob bo'yicha 8 ta xato urinish, IP bo'yicha 60 ta, 15 daqiqa.
- **Google kirish:** Firebase ID token RS256 imzosi Google sertifikatlari bilan tekshiriladi, `aud`, `iss`, `exp`, `iat` va `email_verified` tekshiriladi.
- **Level testlar:** `attempts/[id]` `ownAttempt(id, userId)` bilan faqat egasiga ochiq; owner routelari `requireOwner`.
- **Fayllar:** shaxsiy `uploads` faqat owner yoki yuklovchi.

## Topilgan va tuzatilgan
- Guest `exams/start`, `test-attempts` va `thematic-packs/grade` IP limitsiz edi (DB o'sishi, spam). Endi: 120 ta yangi sessiya / 15 daqiqa, 240 ta grading / 15 daqiqa, IP bo'yicha. Lokal: 121-chi so'rov 429.

## Ochiq (keyingi qadam)
- Anonim `support-tickets` va `news/subscribe` limiti bor; lekin kontent uzunligi va spam filtri tekshirilmagan.
- Secret audit (git tarixi, client bundle, loglar) qilinmagan. Egasi chatda bergan kalitlar rotatsiya qilinishi kerak (egasi qarori).
- Supabase advisor: 33 jadval RLS yoqilgan, policy yo'q (INFO). Brauzer Supabase'ga to'g'ridan-to'g'ri ulanmaydi, shuning uchun qasddan.
- Production'da runtime sinov yo'q (owner paroli berilmagan).

## 2026-11-25 — ikkinchi o'tish (production tekshiruvi, anonim so'rovlar)
- `POST /api/telegram/webhook` (secret yo'q): 403.
- `POST /api/telegram/cron` (noto'g'ri secret): 403. Hech qanday ish bajarilmadi.
- CORS: `Origin: https://evil.example` bilan `/api/db/all` — `Access-Control-Allow-Origin` yo'q, o'qish brauzerda bloklanadi.
- Security sarlavhalar productionda mavjud: CSP, HSTS (1 yil, includeSubDomains), X-Frame-Options SAMEORIGIN, X-Content-Type-Options nosniff, Referrer-Policy, Permissions-Policy (mikrofon faqat o'zi uchun).
- Supabase advisor (security): 33 ta INFO — RLS yoqilgan, policy yo'q. Brauzer Supabase'ga to'g'ridan-to'g'ri ulanmaydi, server service-role bilan ishlaydi. Qasddan. WARN/ERROR yo'q.
- Dependency (`bun audit`): 18 → 11 (`bun audit fix`, faqat semver ichida: hono, @hono/node-server). Qolgan 11 ta: `next` ichidagi postcss (build vaqtida CSS parse; ochiq kirish yo'q), `@grpc/grpc-js` (firebase-tools/genai dev zanjiri), `minimatch`, `uuid`. Major yangilash talab qiladi — tasdiqsiz qilinmadi.
- Ochiq: `eslint.ignoreDuringBuilds: true` — build lintni o'tkazmaydi; lint faqat `npx eslint` bilan.
