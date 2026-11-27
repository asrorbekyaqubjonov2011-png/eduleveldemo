# Test hisoboti (2026-11-25)

| Tekshiruv | Buyruq | Natija |
|---|---|---|
| TypeScript | `npx tsc --noEmit -p .` | 0 xato |
| ESLint | `npx eslint app src --quiet` | exit 0 |
| Unit | `bun test src` | 97 pass, 0 fail |
| Production build | `npx next build` | exit 0 (2 marta: 1 va rate limit o'zgarishidan keyin) |
| Xavfsizlik (lokal) | `BASE_URL=http://localhost:3100 OWNER_SECRET=… node scripts/security-test.mjs` | 74 pass, 0 fail |
| Owner matritsa | `/tmp/claude-0/scratch/owner-matrix.mjs` | yuqoridagi jadval |
| Mobil UI | `/tmp/claude-0/scratch/ui-check.cjs` (Playwright) | overflow 0, console error 0 |
| Guest rate limit | 125 ta `POST /api/exams/start` | 120 ta o'tdi, 5 ta 429 |

Eslatma: `eslint-config-next` 16.0.8 va `next` 15.5.29 nomuvofiq. 15.5.29 ga o'rnatishga urinildi, lekin ESLint patch xatosi chiqdi; qaytarildi. Lint hozir ishlaydi.
Eslatma: `scripts/security-test.mjs` faqat 74 ta check ishladi (student login berilmagan, shuning uchun student checklari o'tkazib yuborilgan).

## Lab performans (production, 2026-11-25, simulated 4G 1.6 Mbps / 150 ms, CPU 4x, 390px)
Bu lab o'lchovi, haqiqiy foydalanuvchi (RUM) ma'lumoti emas.

| Sahifa | TTFB | LCP | CLS | Yuklash (KB) |
|---|---|---|---|---|
| `/` (landing), oldin | 712 ms | 6692 ms | 0 | 635 |
| `/` (landing), `c92074b` dan keyin | 620 ms | 6904 ms | 0 | 607 |
| `/ielts/listening` | 938 ms | 1580 ms | 0 | 212 |

Xulosa: LCP maqsadi (≤ 2.5 s) landingda bajarilmayapti. LCP elementi — hero'dagi o'qituvchi rasmi. Rasm hajmi kamaytirildi (ImageKit `tr`), lekin LCP o'zgarmadi. Sabab taxmini: hero rasmi client-side App (`ssr: false`) hydrate bo'lgandan keyin so'raladi. Keyingi qadam: rasm URL'ini server tomonda (ISR bilan) o'qib `<link rel="preload">` qo'shish. Bu landing ma'lumot yo'lini o'zgartiradi, shuning uchun productionda alohida tekshirish kerak.

## Landing LCP — preload (production, 2026-11-25, 3 lab ishga tushirish)
Preload `5906bb0` dan keyin: TTFB 385–520 ms. LCP: 1516 ms, 2484 ms, 6428 ms. Ishga tushirishlar orasida katta farq bor, shuning uchun LCP ≤ 2.5 s maqsadi **barqaror bajarilgan deb bo'lmaydi**. Ko'proq o'lchov yoki RUM kerak. 1-o'lchovda LCP elementi hero yorlig'i (matn) bo'lgan, rasm emas.

## 2026-11-25 — ikkinchi o'tish
- `tsc --noEmit`: 0. `eslint app src --quiet`: 0. `bun test src`: 101 pass.
- `next build`: 0 (dependency patch'dan keyin ham).
- Lokal owner panel, "Provayderlar" tabi: real counter bloki render bo'ldi (`So‘rovlar (shu server)`), 0 page error. Hozircha 0 chunki lokal kalitlar yo'q.
- Production warm TTFB/total (5 ta o'lchov): `/` ~0.41 s, `/ielts/listening` ~0.42 s, `/api/auth/me` 0.38–0.61 s (1 ta 1.32 s). Cold start o'lchanmadi (idle kerak).
- Production'da webhook/cron/CORS: yuqoridagi SECURITY_AUDIT.md bo'limida.
