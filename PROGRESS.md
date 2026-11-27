# Progress checkpoint (secretsiz)

Oxirgi yangilanish: 2026-11-23 (UTC 17:4x)

## Bajarilgan
- 4b05823 — VIP: noma'lum tarif fail-closed (src/lib/vipAccess.ts). Typecheck o'tdi.
- Supabase production: migratsiya 0003_rls_indexes qo'llangan. RLS o'chiq kritik ogohlantirish yo'qolgan. Qolgan INFO: RLS yoqilgan, policy yo'q (30 jadval) — server DB egasi roli bilan ishlaydi, buni smoke bilan tasdiqlash kerak.
- A4 (deploy): DEPLOY.md, render.yaml, package.json skriptlari (worktree-agent-a0254144e33d531f3). Hali merge qilinmagan.
- A10 (review): 112 ta xato ro'yxati (high 11). Worktree agent-a1b1d994090ca7f36, fayllar scratchpad/agents/A10.

## Davom etmoqda / to'xtatilgan
- A1, A2, A3, A5, A6, A7, A8, A9: 5 soatlik limitdan keyin resume qilindi, keyin to'xtatildi. Qayta davom ettiriladi.

## Keyingi qadam
1. Production smoke: 0003 dan keyin login, student dashboard, owner panel (API orqali).
2. P0 IDOR/authorization audit.
3. Agentlar natijalarini merge qilish.

## 2026-11-25 — avtonom sessiya
- `c3770c7`: BlogPosting JSON-LD, AI gateway (keyin olib tashlangan adapterlar), `AI_PROVIDER_SETUP.md`. Render deploy `live`.
- `eed1722`: Cerebras, SambaNova, Qwen adapterlari olib tashlandi (egasi talabi). Typecheck 0, lint 0, 97 test pass.
- Guest `exams/start`, `test-attempts` va `thematic-packs/grade` uchun IP limit qo'shildi (lokal test: 429 ishlaydi).
- Authorization matritsasi, anonim `db/all` tekshiruvi, mobil overflow tekshiruvi bajarildi (lokal).
- Keyingi: secret audit, owner panel UI kliklari (lokal), AI API Manager, SEO kontent.

## 2026-11-25 (kech) — davom nuqtasi: a473df9
- Production build (lokal, `next build`) muvaffaqiyatli. Sitemap 66 URL: lokal desktop+mobil tekshiruv, 0 gorizontal overflow (bosh sahifadagi 503 faqat lokal tashqi resurs).
- Render: ikkala servis (Edu-Level, EduLevel) `ccr-9d9be064-f56xo5` branchini kuzatadi (autoDeploy). a473df9 ikkalasida `live`. EduLevel (ohio) servisida c6309ee build_failed bo'lgan, keyingi commit bilan tuzalgan.
- Production: yangi grammar/vocabulary sahifalari 200, sitemap 66 ta `<loc>`.
- SEO: 20 yangi qo'llanma (grammar2.ts, vocab.ts). Jami SEO sahifalar: sitemapda 66.
- Keyingi: IELTS skill/Task1/Task2/Speaking, pronunciation, study plan sahifalari (100+ gacha); Telegram Mini App kod-audit; Bunny real yuklash (owner BUNNY_API_KEY nomini tasdiqlaydi); EXECUTION_CHECKLIST.md ni har batchdan so'ng yangilash.

## Davom nuqtasi (SEO batch 3)
- dcc8679: IELTS skill/Task1/Task2/Speaking 1-3/Reading T-F-NG/Listening, pronunciation (2), study plan (2) — 11 sahifa.
- Keyingi commit: more.ts (12 sahifa: lug'at, grammatika, CEFR format, kitob qo'llanma). Sitemap 87 URL, lokal build va mobil tekshiruv o'tdi.
- Qolgan: 100+ ga yetish uchun ~15 ta sifatli sahifa (Multilevel, Milliy sertifikat, blog, grammatika/lug'at), Telegram Mini App audit, Bunny real yuklash (owner), EXECUTION_CHECKLIST yangilash.

## Davom nuqtasi (5598f03+)
- P0 diagnostika yozildi (EXTERNAL_BLOCKERS.md). Telegram polls kod-audit o'tdi; Mini App yo'q (NOT_IMPLEMENTED).
- Qolgan: Mini App (owner qarori), SEO 100+ (87 URL), AI Test Generator sifat tekshiruvlari, EduBek real qurilma o'lchovi, Bunny real yuklash, owner panel production tekshiruvi (login to'sig'i).

## Davom nuqtasi (SEO 99 URL + Mini App)
- 47a1c5a: Telegram Mini App (/miniapp, /app buyrug'i, alohida CSP). Real botda ochish — owner tomonidan sinaladi.
- more2.ts: 12 sahifa (Multilevel 2, Milliy sertifikat 1, blog 6, grammatika 2, lug'at 1). Sitemap 99 URL, build va mobil tekshiruv o'tdi.
- Qolgan: AI Manager UI qoldiqlari, Bunny real yuklash/VIP tanlov sinovi, EduBek real qurilma o'lchovi, owner panel production tekshiruvi (login tiklangach).

## Davom nuqtasi (ZERO-COST)
- aiFreeOnly.ts + aiRouter: Free Only, Groq jonli model ro'yxati, 402 avto-o'chirish, panel bannerlari. 162 unit test o'tdi, build o'tdi.
- Qolgan: DB'da doimiy hisoblagichlar va oylik limit, Gemini bepul model discovery benchmarkka, EduBek bepul ovoz (Kokoro/HeadTTS) o'lchovi, Bunny majburiy emasligini hujjatlash.

## Davom nuqtasi (V7 real natijalar, 2b6cda8)
- 1a19294: AI tuzatishlari (reasoning bo'sh javob, Gemini 429, EduBek stream fallback, 402 qo'lda yoqiladi, Providerlar tabida haqiqiy effective model).
- 2b6cda8: Daraja testi: to'liq ekran Boshlash bosilishida, markazda ogohlantirish (Tushundim 5 soniyadan keyin), oq premium animatsiyali dizayn, savol belgilash, ishlanmagan savollar ro'yxati, shikoyat, klaviatura.
- Qolgan: EduBek dock kamchiliklari (ro'yxat kerak), Voice real o'lchov, Groq STT (whisper) bepul huquq tekshiruvi, model-level routing, oylik hisoblagich, Mini App initData ulash, E2E (lokal Postgres).

## V9 davom nuqtasi (9172373)
- Lokal Postgres tiklash: `rm -f /tmp/pgedu-new/postmaster.pid; runuser -u postgres -- pg_ctl -D /tmp/pgedu-new -o "-p 5433 -k /tmp/pgsock" start`; ilova: DATABASE_URL=postgres://postgres@localhost:5433/edulevel. Test fixture: level_tests 'v9-test' (8 savol) lokal bazada.
- Bajarildi: daraja testi qayta dizayni (53dc8cf), EduBek chat ishonchliligi (c6c4b09, 1a19294), landing dock (9172373).
- Keyingi: EduBek Voice real o'lchov va bepul STT/TTS, model-level routing, oylik hisoblagichlar, Mini App initData ulash, AI Test Generator, SEO 100+, owner panel audit (lokal bazada Playwright bilan).
- OWNER_PENDING.md yaratildi.

## V9 checkpoint (64ecc38, production marker verified)
- Production (edulevel.uz) serves 64ecc38: /api/ai-tts returns TTS_OFF 503, /, /ielts-tayyorgarlik, /sitemap.xml, /api/indexnow/key, /miniapp = 200; /api/ai-stream and /api/levels/tests = 401 anonymous.
- Zero-cost voice: device voice default; Gemini TTS needs ALLOW_GEMINI_TTS=1.
- Not done yet: model-level routing UI, monthly counters, voice latency real device numbers, AI Test Generator pass, Mini App initData wiring, SEO 100+, owner panel Playwright audit on local DB.

## V10 checkpoint (d5c0bd5)
- 8 providers added (Cloudflare, SambaNova, SiliconFlow strict free built-ins); placement exam redesigned; EduBek chat/dock fixed; 357 real screenshots; ZIP EDULEVEL_MASTER_V10_FINAL.zip (sha256 8a120bf8...a451ca) delivered.
- Found/fixed: Murojaatlar 28 000 px overflow, mobile prev/next accessible names. Real unit-test count is 177 (34 files); earlier 170-190 included duplicate copies under .claude/worktrees.
- Next: home hero server render (LCP ~5.1 s lab), model-level routing, monthly counters, section audits (IELTS/CEFR/General English/video/library/VIP/Edu Coin), Mini App initData wiring, Supabase/Firebase audit, 100 pages.
