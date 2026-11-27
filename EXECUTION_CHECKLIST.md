# EXECUTION_CHECKLIST (holat: 2026-11-25, commit keyingi: SEO batch 3)
Statuslar: VERIFIED / IMPLEMENTED_TEST_PENDING / EXTERNAL_BLOCKER / NOT_APPLICABLE. Foiz yozilmaydi.

| Soha | Element | Status | Dalil |
|---|---|---|---|
| P0 | Pul yo'llarida race (advisory lock) | VERIFIED | scripts/race-test.mjs (N dan 1 muvaffaqiyat), lokal |
| P0 | IDOR / access control | VERIFIED (lokal) | scripts/idor-test.mjs, SECURITY_AUDIT.md |
| P0 | Injection / NUL bayt | VERIFIED (lokal) | scripts/injection-test.mjs |
| P0 | Guest rate limit, deposit guard | VERIFIED (lokal) | 429 testlari |
| P0 | Production owner endpointlari anonim | VERIFIED | 401 (production) |
| P0 | Production owner login | EXTERNAL_BLOCKER | EXTERNAL_BLOCKERS.md |
| P1 | Faqat 5 provayder (Gemini, Groq, DeepSeek, Mistral, OpenRouter) | VERIFIED | eed1722 |
| P1 | Task routing, byudjet, concurrency, cache, benchmark | IMPLEMENTED_TEST_PENDING | unit testlar; real kalitlar Render'da, owner "Sinash" bosadi |
| P1 | Haqiqiy provayder chaqiruvi | EXTERNAL_BLOCKER | kalitlar faqat Render'da |
| P1 | EduBek ovoz kechikishi o'lchovi | IMPLEMENTED_TEST_PENDING | real qurilmada o'lchov kerak |
| P2 | Owner panel 26 menyu (1280 va 390px) | VERIFIED (lokal) | OWNER_PANEL_AUDIT.md |
| P2 | SEO Content Manager | VERIFIED (lokal) | scripts/seo-manager-test.mjs |
| P3 | SEO sahifalar (sitemap 99) | VERIFIED | production 200, lokal mobil tekshiruv |
| P3 | 100+ sifatli sahifa | IMPLEMENTED_TEST_PENDING | 99 URL sitemapda (ularning bir qismi hub, qonuniy va blog); 100 ga yetmagan, davom etmoqda |
| P3 | Search Console | EXTERNAL_BLOCKER | OAuth owner tomonidan |
| P4 | RUM (LCP/INP/CLS/TTFB) intake | VERIFIED (lokal) | real foydalanuvchi ma'lumoti hali yo'q |
| P5 | Telegram bot oqimlari (soxta API) | VERIFIED (lokal) | scripts/telegram-bot-test.mjs |
| P5 | Telegram quiz polls (sendPoll, limitlar 300/100/200, natija kuzatuvi) | VERIFIED (kod-audit + soxta API testi) | src/lib/telegramGrowth.ts |
| P5 | Telegram Mini App (/miniapp + /app buyrug'i, web_app tugma, alohida CSP) | IMPLEMENTED_TEST_PENDING | build o'tdi, CSP lokal tekshirildi; real botda ochish owner tomonidan sinaladi |
| P0 | Bosh sahifadagi 503 | VERIFIED (sabab: lokal Postgres o'chiq; production toza) | EXTERNAL_BLOCKERS.md |
| P0 | Production owner login | EXTERNAL_BLOCKER | sabab ehtimoli: bazadagi hash; OWNER_RESET_PASSWORD yo'li hujjatlangan |
| P5 | Bunny Stream yuklash/ijro | EXTERNAL_BLOCKER | BUNNY_API_KEY nomi/real yuklash owner tasdig'i |
| P5 | Firebase / Telegram MCP | EXTERNAL_BLOCKER | MCP ulanmadi |
| P6 | Unit testlar | VERIFIED | bun test src |
| P6 | Render deploy a473df9 | VERIFIED | ikkala servis live |
| P2 | Video uchun VIP tarif tanlovi (owner, plan ro'yxatidan) | VERIFIED (unit) | src/lib/videoAccess.test.ts; CoursesManager plan tugmalari; YouTube funksiyalari saqlangan |
| P1 | AI test generator: validatsiya, dublikat (similarity), javob balansi, owner tasdig'i | VERIFIED (unit) | src/lib/aiQuestions.test.ts; ThematicPacksManager review qadami |
| P1 | AI testlarning real provayder bilan yaratilishi | EXTERNAL_BLOCKER | kalitlar Render'da; owner sinaydi |
| P2 | Supabase production sxema/RLS | VERIFIED (avval) | migratsiya 0003; bu sessiyada qayta tekshirilmadi |
| P2 | Firebase integratsiyasi | EXTERNAL_BLOCKER | Firebase MCP ulanmadi; kod env nomlari tekshirildi |
| ZERO-COST | Free Only Mode (kodda doimiy): OpenRouter faqat verified :free (prompt va completion narxi 0), narxi noma'lum model chaqirilmaydi | VERIFIED (unit) | src/lib/aiFreeOnly.ts + test |
| ZERO-COST | Groq/Mistral: faqat provayder ro'yxatidagi chat modellari (404 yo'qoladi), env override ham ro'yxatga tekshiriladi | VERIFIED (mock) | aiFreeOnly.test.ts; real Groq chaqiruvi owner "Sinash" bilan PENDING |
| ZERO-COST | 402 → 24 soatga marshrutdan chiqarish, integratsiya saqlanadi, panelda belgilanadi | VERIFIED (mock) | aiFreeOnly.test.ts |
| ZERO-COST | Persistent (DB) usage counters, oylik limit, provayder qolgan kvotasi | NOT_IMPLEMENTED | hisoblagichlar xotirada; keyingi qadam |
| ZERO-COST | EduBek Voice: Kokoro/HeadTTS/WebGPU tadqiqoti | NOT_IMPLEMENTED | real Android o'lchovi kerak |
| V6-P0 | Benchmark va chaqiruv bitta bepul-model resolver'dan foydalanadi; 404 → keyingi tasdiqlangan bepul model | LOCAL_TEST_PASSED (mock) | aiRouter.ts resolveCandidates; aiFreeOnly.test.ts; commit c7285f4 |
| V6-P0 | Gemini benchmarkka qo'shildi | IMPLEMENTED_TEST_PENDING | universalAi.ts benchmarkGemini; real natija owner "Benchmark" |
| V6-P1 | Model katalogi (provayder ro'yxatlari, noma'lum=null, qidiruv/filtr) | LOCAL_TEST_PASSED (mock) | aiModelCatalog.ts, OwnerAiModelCatalog.tsx; commit 0707c36 |
| V6-P1 | Kunlik provayder hisoblagichlari restartdan keyin tiklanadi (1 qator, 30 s da bir marta yoziladi) | LOCAL_TEST_PASSED (unit) | aiUsagePersist.ts; real DB yozuvi production'da tekshirilmagan |
| V6-P1 | Voice/quick_qa boshlang'ich timeout 6 s / 8 s | IMPLEMENTED_TEST_PENDING | aiRouting.ts defaultTimeoutMs; real o'lchovga moslashtiriladi |
| V6-P1 | EduBek ovoz: gap-gap TTS, prefetch, to'xtatish mavjud; real latency | IMPLEMENTED_TEST_PENDING | Android o'lchovi yo'q |
| V6-P1 | Kokoro/HeadTTS/WebGPU | NOT_STARTED | zaif Android'da majburiy emas; tadqiq qilinmadi |
| V6-P1 | Oylik limit, provayder qolgan kvotasi, kesh hit rate paneli | NOT_STARTED | |
| V6-P2 | Mini App: initData server tekshiruvi, /app uchun avtomatik test | NOT_STARTED | hozir shaxsiy funksiya yo'q (faqat havolalar) |
| V6-P3 | SEO 100+ (haqiqiy ta'lim sahifalari ~85) | IN_PROGRESS | SEO_ROADMAP.md |
| V7-AI | Reasoning modellar bo'sh javob bermaydi (effort low, token zaxirasi, retry, keyingi model) | LOCAL_TEST_PASSED (mock) | aiRouter.ts, aiFreeOnly.test.ts; real PENDING |
| V7-AI | Gemini 429: kvota turiga qarab cooldown, lite modellar birinchi, benchmark keyingi modelga o'tadi | LOCAL_TEST_PASSED (unit) | geminiQuota.test.ts |
| V7-AI | EduBek oqimi Gemini 429 bo'lsa boshqa bepul provayderga o'tadi | IMPLEMENTED_TEST_PENDING | universalAi.ts streamTutorAnswer; production'da tekshirilmagan |
| V7-UI | Daraja testi: to'liq ekran, 5 s Tushundim, oq dizayn, shikoyat, belgilash | IMPLEMENTED_TEST_PENDING | LevelTestsView.tsx; Chrome/Edge'da real tekshirilmagan (lokal DB yo'q) |
| V9-UI | Daraja testi: desktop layout (sarlavha, asosiy qism, yon panel navigator), mobil drawer, ko'k aksent, server soatiga bog'langan taymer, shikoyat sabablari, yakun xulosasi, natija sahifasi | LOCAL_TEST_PASSED (real Chromium, 15 tekshiruv) | scripts/level-exam-browser-test.cjs, docs/screenshots/level-exam-*.png; commit 53dc8cf |
| V9-UI | To'liq ekran Boshlash bosilganda real Chromium'da yoqiladi, chiqilganda markaziy ogohlantirish, Tushundim 5 s dan keyin, qayta kirish | LOCAL_TEST_PASSED (Chromium); Chrome/Edge/Android OWNER_PENDING | headless Chromium real brauzer emas |
| V9-AI | EduBek chat: birinchi so'z (35 s) va jimlik (25 s) watchdog, server 45 s deadline, tarmoq/bo'sh javob xabarlari, "Qayta urinish" | LOCAL_TEST_PASSED (Chromium, AI kalitsiz holat) | scripts/edubek-chat-browser-test.cjs; commit c6c4b09; real AI javobi PRODUCTION_PENDING |
| V9-UI | Landing EduBek dock: o'qiladigan panel, matn kiritish (sayt ma'lumotidan javob, noma'lum savol AI chatga yo'naltiriladi), klaviatura holati, tashqariga bosish, scroll'da yo'qolmaydi | LOCAL_TEST_PASSED (Chromium 10 tekshiruv) | scripts/edubek-dock-browser-test.cjs; commit 9172373 |
| V9-ENV | Lokal Postgres tiklandi (port 5433, socket /tmp/pgsock): UI/E2E testlar lokal bazada ishlaydi | VERIFIED | PROGRESS.md |
