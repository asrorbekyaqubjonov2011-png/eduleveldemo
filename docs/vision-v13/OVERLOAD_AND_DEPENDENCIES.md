# Izolyatsiyalangan yuklama va dependency xavfsizligi

Bazaviy commit `2cff976`. Oldingi 24 parallel mijoz sinovi 168 so‘rovdan 23 ta 503 qaytargan. Joriy muhitdagi qayta sinovda 24 mijoz bosqichida 7 ta 503 kuzatildi. Barchasidan `SERVER_BUSY` qaytdi. Admission beshta snapshot ishlayotganida yangi so‘rovni ulanish navbatiga yetmasdan rad etgan. [Bazaviy sinov](evidence/load-baseline.json)

Snapshotning faol limiti 5. Pool sig‘imi 8. Navbat qisqa parallel burstdan 24 tagacha so‘rovni 1.8 soniyagacha ushlab turadi. U javob kutish tartibini saqlaydi va bekor qilingan so‘rovni chiqaradi. Navbat sig‘imi yoki deadline tugaganda `Retry-After` bilan 503 saqlanadi. Telegram webhook tashqi retry mexanizmi va alohida ikki faol so‘rov limitidan foydalanadi. Keshdagi snapshot alohida klonlanadi. Keshdagi o‘qish uchun fingerprint qayta hisoblanmaydi.

Lokal harness queue, pool, query, cache, handler va persist bosqichlarini o‘lchaydi. Isolated serverda `EDULEVEL_FIXTURE_TIMING=1` bilan HTTP timing yoqildi. RSS va CPU namunalari Next jarayoni uchun olinadi. Aralash yukda public HTML, sitemap, snapshot API, auth session, Placement ro‘yxati va kutilgan Mini App 401 ishlatiladi. Production ish yukining sig‘imi alohida tasdiq talab qiladi.

Yuqori ogohlantirishlar PostCSS va Firestore gRPC yo‘llaridan kelgan. Next deklaratsiyasidagi PostCSS versiyasi lockfile override orqali 8.5.32 ga o‘tdi. Amaldagi Firebase App 0.16.4 va Auth 1.13.8 versiyalari bevosita dependency qilib olindi. Ilova Firebase Auth orqali Google login ishlatadi. Uning Firebase Firestore importi bo‘lmagan. Firebase CLI saqlandi. Auditda yuqori va kritik daraja 0, o‘rtacha daraja 5. Google OAuth production domenida alohida sinov talab qiladi. [Yangi audit](evidence/dependency-audit.json)

## O‘lchangan natija

| 24 mijoz | So‘rovlar | HTTP 503 | p95 | Navbat p95 | Pool p95 | Next CPU | Kuzatilgan RSS cho‘qqisi |
|---|---:|---:|---:|---:|---:|---:|---:|
| Baza | 168 | 7 | 344 ms | — | — | — | 203 984 KiB |
| Takror 1 | 168 | 0 | 160 ms | 35 ms | 1 ms | 740 ms | 257 852 KiB |
| Takror 2 | 168 | 0 | 203 ms | 66 ms | 1 ms | 900 ms | 337 012 KiB |
| Takror 3 | 168 | 0 | 194 ms | 53 ms | 1 ms | 700 ms | 347 460 KiB |
| Ro‘yxatdan o‘tish bilan aralash | 192 | 0 | 495 ms | 357 ms | 1 ms | 1890 ms | 386 232 KiB |

O‘qish bosqichlarida kutilgan 24 ta Mini App 401 javobi bor. Har bir yugurishdan keyin sog‘liq tekshiruvi 200. Ro‘yxatdan o‘tish bilan aralash bosqichda query p95 65 ms, persist p95 97 ms. Qisqa sinovlar RSS yuqori chegarasini yoki production trafik sig‘imini aniqlamaydi. Pool acquire p95 sovuq ulanishda 107 ms gacha va iliq 24 mijozli bosqichlarda 1 ms bo‘ldi. Alohida uzun yuklama va Render monitoringi ochiq.
