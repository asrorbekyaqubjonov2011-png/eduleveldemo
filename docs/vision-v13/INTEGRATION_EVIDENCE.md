# Integratsiya dalillari

- Supabase loyiha holati ACTIVE_HEALTHY. Olti migratsiya mavjud. O‘qish so‘rovi Placement bo‘yicha 91 ta urinish va balli 88 ta urinishni ko‘rsatdi. Public sxemada 33 ta jadvalning barchasida RLS yoqilgan. [Supabase loyiha](https://supabase.com/dashboard/project/qavdumqcxmauvgllplik)
- Security advisor 33 ta jadvalni RLS yoqilgan va client policy mavjud bo‘lmagan INFO sifatida qayd etdi. Ilova Postgres server ulanishi orqali ishlaydi. [Supabase RLS advisor](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)
- Performance advisorda 17 ta ishlatilishi qayd qilinmagan indeks INFO sifatida belgilandi. Health advisory topilmadi. Indekslar bo‘yicha ishlab turgan workload tarixini tekshirish ochiq. [Supabase indeks advisori](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index)
- Render connector yagona workspace qaytardi. Undagi `eduleveldemo` uchun `srv-dc4k2anf3r2c73bm1350` va `main` ko‘rindi. Public `www.edulevel.uz` CNAME yo‘nalishi `edu-level.onrender.com`. Production servis ID, repo, branch va rollback yozuvi Render ruxsatiga bog‘liq.
- OpenRouter public katalogida 476 ta model, ulardan 10 ta nol narxli `:free` variant qaytdi. Jonli generatsiya uchun hisob ruxsati va kvota alohida kerak. [OpenRouter katalogi](https://openrouter.ai/api/v1/models)
- Chromium va WebKit’da 320 dan 1920 pikselgacha bo‘lgan 9 viewport bo‘yicha landing, IELTS va Mini App sahifalari ochildi. Har engine uchun 27 holatda HTTP 200 va gorizontal overflow yo‘qligi qayd etildi.

## Web va navigatsiya

- Sitemapdagi 99 ta sahifada HTTP 200, bittadan H1 va `edulevel.uz` canonical domeni bor. [HTTP hisobot](evidence/seo-http.json)
- Brauzer crawler 100 sahifadagi 9 622 ta ichki havolani o‘qidi. Audit FAQ bo‘limi bo‘sh bo‘lganda menyudagi nishonsiz savollar tugmasini aniqladi. Menyu endi ko‘rinadigan FAQ mavjud bo‘lganda ushbu tugmani ko‘rsatadi. Browser regression bo‘sh fixture bilan o‘tdi. [Tuzatishdan oldingi audit](evidence/link-audit-before-faq-fix.json)
