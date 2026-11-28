# Release mezonlari

- Target. PR #1 va routing fingerprint mavjud. Production Render boshqaruv panelida service ID, branch va commit kerak.
- Kod. Lokal build o‘tdi. Joriy branch workflow natijalari test hisobotida.
- Funksiya. Mavjud lokal oqimlar o‘tdi. Haqiqiy integratsiyalar, WebKit va o‘quv bo‘limlarining to‘liq ssenariylari ochiq.
- Data. Production data va schema ga yozish bajarilmadi. Supabase backup va restore rehearsal dalili kerak. Kutubxonaning oldingi tashqi URLlari saqlandi.
- Barqarorlik. Lokal 24 parallel mijozli testlarda 503 kuzatilmadi. Aralash yukda p95 495 ms, yakuniy health 200. Uzun muddatli va production profil alohida ochiq.
- Production. Merge va deploy bosqichi ochiq. Target tasdiqlangach avvalgi sog‘lom deploy SHA va backup qaydi olinadi. Tasdiqlangan builddan so‘ng cheklangan smoke ishlaydi. Kritik muammoda Render avvalgi sog‘lom deployga qaytariladi va health qayta tekshiriladi.
