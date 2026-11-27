# Kalit so'z klasterlari va sahifa xaritasi (2026-11-25)

**Muhim:** qidiruv hajmi (volume) va raqobat ko'rsatkichlari bu hujjatda YO'Q. Ular Google Search Console yoki boshqa haqiqiy vosita orqali olinmaguncha, hamma qatorlar gipoteza hisoblanadi. Soxta statistika yozilmagan.

Format: klaster → qidiruv niyati (intent) → maqsad URL → holat (mavjud / draft / yo'q).

| Klaster | Niyat | Asosiy so'zlar (lotin, o'zbek) | Maqsad URL | Holat |
|---|---|---|---|---|
| IELTS tayyorgarlik | Informational / transactional | ielts, ielts tayyorlanish, ielts noldan | `/ielts` | mavjud |
| IELTS Listening | Informational | ielts listening, ielts tinglash | `/ielts/listening` | mavjud |
| IELTS Reading | Informational | ielts reading, ielts o'qish | `/ielts/reading` | mavjud |
| IELTS Writing | Informational | ielts writing, writing task 2 | `/ielts/writing` | mavjud |
| IELTS Speaking | Informational | ielts speaking, speaking savollari | `/ielts/speaking` | mavjud |
| IELTS mock test | Transactional / tool | ielts mock test, ielts sinov | `/ielts/mock-test` | mavjud |
| Band score | Informational | ielts band score, ball hisoblash | `/ielts/band-score` | mavjud |
| CEFR / daraja | Informational | cefr, cefr darajalari, a1 a2 b1 b2 c1 c2 | `/cefr/mock-test`, blog maqola | mavjud |
| Multilevel | Informational | multilevel, milliy sertifikat | `/multilevel` | mavjud |
| Grammatika | Informational | english grammar, ingliz tili grammatikasi | `/english/grammar` | mavjud |
| Lug'at | Informational | inglizcha lug'at, vocabulary | `/english/vocabulary` | mavjud |
| Gapirish | Informational | speaking, inglizcha gapirish | `/english/speaking` | mavjud |
| Daraja aniqlash | Transactional | ingliz tili darajasini aniqlash, level test | `/english/level-test` | mavjud |
| EduBek AI | Brand / tool | edubek, edubek ai, ai english tutor | `/edubek-ai` | mavjud |
| Blog: IELTS | Informational | ielts noldan, ielts 8 hafta | `/blog/ielts-nol-dan-tayyorlanish` | mavjud |
| Blog: writing | Informational | ielts writing task 2 tuzilishi | `/blog/ielts-writing-task-2-tuzilishi` | mavjud |
| Blog: zamonlar | Informational | ingliz tili zamonlari | `/blog/ingliz-tili-zamonlari-qisqacha` | mavjud |
| Blog: mock test | Informational | mock test qanday ishlatiladi | `/blog/mock-test-qanday-ishlatiladi` | mavjud |
| Kitoblar | Transactional | ingliz tili kitoblari, ielts kitoblari, cefr kitoblari | — | YO'Q (qonuniy material va rasmiy manba talab qiladi) |
| Bepul darslar | Transactional | bepul ingliz tili darslari, online kurs | — | YO'Q (kontent ko'rigi kerak) |
| Tarjima / talaffuz | Informational | inglizcha tarjima, inglizcha talaffuz | — | YO'Q |
| Rus va kirill variantlari | Informational | английский язык, ielts курс | — | YO'Q (til qarori egasida) |

## Yangi sahifalar (2026-11-25): 16 ta
| Klaster | Maqsad URL |
|---|---|
| Present Simple / Continuous | `/english/grammar/present-simple`, `/english/grammar/present-continuous` |
| Past Simple / Present Perfect | `/english/grammar/past-simple`, `/english/grammar/present-perfect` |
| Kelasi zamon (will, going to) | `/english/grammar/future-forms` |
| Shart gaplar | `/english/grammar/conditionals` |
| Majhul nisbat | `/english/grammar/passive-voice` |
| Artikllar | `/english/grammar/articles` |
| Modal fe'llar | `/english/grammar/modal-verbs` |
| Predloglar (vaqt va joy) | `/english/grammar/prepositions-time-place` |
| CEFR A1, A2, B1, B2, C1, C2 | `/cefr/a1` … `/cefr/c2` (har daraja alohida niyat: shu darajaning mazmuni va tayyorgarligi) |

Kannibalizatsiyaning oldini olish: har sahifaning sarlavhasi, H1 va tavsifi noyob; bir mavzu faqat bitta sahifada chuqur yoritiladi, qolganlari unga ichki havola beradi. `src/lib/seo/pages.test.ts` bu qoidalarni (noyob sarlavha/H1/tavsif, ingichka matn, sahifalar orasida takror matn yo'qligi) har testda tekshiradi.

## Keyingi qadam
1. Google Search Console'da haqiqiy so'rovlarni olish (egasi ulaydi) → har klaster uchun volume va pozitsiya.
2. Faqat haqiqiy talab topilgan klasterlarga original sahifa yaratish; takroriy yoki sifatsiz sahifalar yaratilmaydi.
3. Yo'q klasterlar `draft` holatida, indekslanmaydi.
