# Owner panel audit (2026-11-25)

Muhit: lokal `next start` (production build), lokal Postgres 16 (migratsiya 0002–0006). Owner sessiyasi lokal `.env.local` dagi OWNER_PASSWORD bilan olindi; parol hech qayerga yozilmadi.

## API matritsasi (lokal)
| Endpoint | Anonim | Owner |
|---|---|---|
| `ai/stats` | 403 | 200 |
| `owner/ai-providers` | 401 | 200 (8 provayder ro'yxati, kalit ko'rsatilmaydi) |
| `auth/me` | 200 (authenticated: false) | 200 |
| `levels/tests` | 401 | 200 |
| POST `owner/news`, `owner/promo-codes`, `users/update-vip`, `users/toggle-block`, `owner/bot-settings` | 401 | — |

`owner/ai-providers` POST `cerebras` (kalit yo'q): 502, "CEREBRAS_API_KEY sozlanmagan" — endi bu provayder olib tashlangan.

## Brauzer (lokal, 390px)
- Landing: overflow 0px, console error 0, H1 bor.
- SEO sahifa `/ielts/listening`: overflow 0px, console error 0.
- Owner sessiyasi bilan `/`: SPA owner menyusiga o'tmadi, shuning uchun owner ekrani vizual tekshirilmadi.

## Qamrab olinmagan
- Owner menyularining har birini klik qilish va formalarni sinash.
- Productionda owner login (parol egasida, chatda emas).
- Telegram boshqaruvi, video darslar, VIP tahrir formalari — funksional test yo'q.

## Production (2026-11-25)
- Owner login productionda bajarilmadi: `POST /api/auth/login` (`jasurbek` + lokal `.env.local` dagi parol) "hisob topilmadi" qaytardi (HTTP 404, JSON). Lokal server bilan bir xil so'rov muvaffaqiyatli bo'lgan. Demak productiondagi `OWNER_PASSWORD` lokal qiymatdan boshqa. Bu bir urinish edi; takroran urinilmadi.
- Production owner panel navigatsiya va mobil testi bajarilmadi. Owner paroli egasi tomonidan Render'da tasdiqlanishi kerak.
- Chatda yuborilgan parol productionda ishlatilmadi.
