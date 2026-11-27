# Tashqi to'siqlar (2026-11-25)

Bu to'siqlar kod yozishga to'sqinlik qilmaydi; ular faqat tasdiqlash va ba'zi tekshiruvlarga tegishli. Qolgan vazifalar to'xtatilmagan.

| # | To'siq | Nimani bloklaydi | Hozirgi holat | Kim hal qiladi |
|---|---|---|---|---|
| 1 | Production owner paroli: `.env.local` dagi qiymat productionda rad etiladi ("hisob topilmadi"). Chatda yuborilgan parol ishlatilmaydi | Productionda owner panelning funksional tekshiruvi (Provayderlar "Sinash", Benchmark, Sozlama tekshiruvi, Bunny, VIP/Depozit ekranlari) | Lokal production build va lokal DB da to'liq tekshirildi; production PENDING | Egasi: Render → `OWNER_PASSWORD` ni yangilab, o'zi owner panelga kiradi va "Sozlama tekshiruvi", "Marshrutlash" tablarini ochadi |
| 2 | Render env qiymatlarini men o'qiy olmayman (Render MCP qiymat bermaydi) | AI kalitlari, Bunny, Supabase kaliti, Telegram token haqiqatan ishlashini men to'g'ridan-to'g'ri sinay olmayman | Kod tekshiruvi va owner uchun `Sozlama tekshiruvi` (nomlar, format, DB ping, Telegram webhook ma'lumoti) va `Benchmark` tayyor; ular egasi tomonidan ishga tushiriladi | Egasi (owner panelda tugmani bosadi) |
| 3 | Search Console connector yo'q | Haqiqiy so'rovlar, pozitsiya va indekslash ma'lumoti; Change of Address | SEO kod ishlari davom etdi (46 URL) | Egasi (Search Console) |
| 4 | Telegram va Firebase MCP serverlari ulanmaydi | MCP orqali bot va Firebase konsoli tekshiruvi | Webhook/cron autentifikatsiyasi productionda anonim so'rov bilan tekshirildi (403); qolgan bot oqimlari kod ko'rigi va mock bilan | Egasi (Telegram'da sinash) |
| 5 | Android qurilma yo'q | EduBek ovoz kechikishini haqiqiy telefonda o'lchash; haqiqiy INP/RUM | Emulyatsiya (390px) va lab o'lchovlari alohida belgilangan | Egasi (telefonda sinash) |
| 6 | Kalit va parol rotatsiyasi (chatda ochilgan) | Eski qiymatlar xavfsiz emas deb hisoblanadi | Kodda hech qanday kalit yo'q (git tarixi, bundle tekshirildi) | Egasi: Render va provayder panellarida kalitlarni almashtiradi |
| 7 | Pulli xizmatlar (yangi provayder, Bunny kodlash/DRM, billing) | — | Yoqilmagan, siz aytganingizdek | Egasi qaror qiladi |
| 8 | Eski Render servisi | O'chirish yoki Change of Address | Tegilmagan; `edulevel-hdk8.onrender.com` → 301 → `edulevel.uz` | Egasi qaror qiladi |
| 9 | Huquqiy matn | `/privacy` va `/terms` ni advokat ko'rigi | Egasi tasdiqladi, matn kod ichidagi haqiqiy ma'lumot oqimlariga mos; saqlash muddati va aloqa ma'lumotlari aniq yozilmagan | Egasi (agar kerak bo'lsa advokat) |

## 2026-11-25 — P0 diagnostika natijalari (qiymatlarsiz)
- **Bosh sahifadagi 2 ta 503**: sabab topildi — lokal test serverida Postgres (port 5433) ishlamayotgan edi, shuning uchun `/api/auth/me` va `/api/db/all` 503 qaytargan. Production'da `edulevel.uz` bosh sahifasi brauzer tekshiruvida 4xx/5xx resurssiz yuklandi. Kod xatosi emas.
- **Production owner login**: kod bo'yicha `OWNER_PASSWORD` faqat birinchi ishga tushirishda bazaga hash qilib yoziladi (`src/lib/auth/guards.ts`, `src/lib/db/bootstrap.ts`). Keyin Render'da `OWNER_PASSWORD` ni o'zgartirish login'ni o'zgartirmaydi: bazadagi hash ishlatiladi. Owner login nomi bazadagi `ownerUsername` yoki `OWNER_USERNAME`, standart `jasurbek`. Tiklash yo'li (owner harakati): Render env'da vaqtincha `OWNER_RESET_PASSWORD` qo'yish, deploy qilish, kirish, keyin bu o'zgaruvchini o'chirish va panelda parolni almashtirish. Men buni o'zim bajarmayman (parolni men bilmayman va bypass qilmayman).
- **Bunny env nomlari kod bilan mos**: BUNNY_STREAM_ENABLED (=1), BUNNY_LIBRARY_ID, BUNNY_TOKEN_KEY, BUNNY_API_KEY (yoki BUNNY_STREAM_API_KEY). Render'da aynan shu nomlar borligini owner panelning "Sozlama tekshiruvi" tabi (faqat nom/holat) ko'rsatadi.
- **Kodda ishlatiladigan env nomlari**: GEMINI_API_KEY, GROQ_API_KEY, DEEPSEEK_API_KEY, MISTRAL_API_KEY, OPENROUTER_API_KEY, DATABASE_URL, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET, TELEGRAM_CRON_SECRET, TELEGRAM_OWNER_ID, NEXT_PUBLIC_FIREBASE_*, FIREBASE_PROJECT_ID, OWNER_USERNAME, OWNER_PASSWORD, OWNER_RESET_PASSWORD, AI_MAX_CONCURRENCY.
