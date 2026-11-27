/**
 * CEFR level guides A1–C2. The level descriptions paraphrase the public CEFR global scale (Council of Europe). The IELTS
 * band ranges are the commonly published approximate correspondences, marked as approximate: institutions set their own
 * requirements. Study advice is general; nothing here promises a result.
 */
import type { SeoPage } from './pages';

const D = '2026-11-25';
const HUB = '/blog/cefr-darajalari-tushuntirish';
const COMMON_RELATED = ['/english/level-test', '/cefr/mock-test', '/multilevel'];

export const LEVEL_PAGES: SeoPage[] = [
  {
    path: '/cefr/a1',
    name: 'CEFR A1',
    title: 'CEFR A1 daraja: nimalarni bilish kerak va qanday o‘rganish | EduLevel',
    description: 'CEFR A1 (boshlang‘ich) daraja nimani anglatadi: nimalarni qila olasiz, nimani o‘rganish kerak, qanday mashq qilish va keyingi A2 darajaga yo‘l.',
    h1: 'CEFR A1 daraja: ingliz tilini noldan boshlash',
    lead: 'A1 — CEFR shkalasining eng quyi darajasi. Bu daraja tanish kundalik iboralarni tushunish va juda sodda gaplar bilan o‘zingiz haqingizda gapirishni bildiradi.',
    updated: D,
    level: 'A1',
    related: ['/cefr/a2', HUB, ...COMMON_RELATED],
    sections: [
      {
        heading: 'A1 nimani anglatadi',
        paragraphs: ['A1 darajadagi o‘quvchi tanish kundalik iboralarni va aniq ehtiyojni qondiradigan juda sodda gaplarni tushunadi va ishlata oladi. U o‘zini va boshqalarni tanishtira oladi, shaxsiy savollarga (qayerda yashaysiz, kimlarni bilasiz) javob bera oladi. Suhbatdosh sekin, aniq gapirsa va yordam bersa, oddiy muloqot qiladi.']
      },
      {
        heading: 'A1 da odatda nimalarni qila olasiz',
        paragraphs: ['Quyidagilar A1 uchun tipik vazifalardir:'],
        items: ['O‘zingiz, oilangiz va kundalik hayotingiz haqida bir-ikki jumla aytish.', 'Salomlashish, xayrlashish, minnatdorchilik va kechirim so‘rash.', 'Raqamlar, kunlar, vaqt va narxlarni tushunish.', 'Eng sodda formalarni to‘ldirish (ism, millat, manzil).']
      },
      {
        heading: 'Nimani o‘rganish kerak',
        paragraphs: ['Alifbo va talaffuz, to be fe’li, Present Simple asoslari, egalik olmoshlari (my, your), there is / there are, eng ko‘p ishlatiladigan fe’llar va kundalik mavzular: oila, uy, ovqat, vaqt, kasblar. Har kuni 15–20 daqiqa muntazam mashq uzoq, lekin kamdan-kam darsdan yaxshiroq natija beradi.']
      },
      {
        heading: 'EduLevel da qanday mashq qilish',
        paragraphs: ['Avval «Levelni aniqlash» bo‘limida darajangizni tekshiring. Keyin darslar va Mashqlar bo‘limida Reading va Listening vazifalarini bajaring. EduBek AI dan savolingizni ingliz tilida sodda qilib so‘rang: u ingliz tilini o‘rganishga oid savollarga javob beradi va xatolaringizni izohlaydi. AI javoblari xato bo‘lishi mumkinligini eslang.']
      },
      {
        heading: 'Keyingi qadam',
        paragraphs: ['A1 dan A2 ga o‘tish uchun o‘tgan zamon (Past Simple), Present Continuous va kundalik mavzular bo‘yicha lug‘atni kengaytirish kerak. Boshqa daraja va darajalar o‘rtasidagi farq haqida umumiy sahifada o‘qing.']
      }
    ],
    faq: [
      { q: 'A1 darajaga yetish uchun qancha vaqt kerak?', a: 'Bu o‘quvchining boshlang‘ich holatiga, mashq sifatiga va kunlik vaqtiga bog‘liq. Aniq muddat va’da qilib bo‘lmaydi; darajangizni vaqti-vaqti bilan test qilib, o‘z natijangizni kuzatish ishonchliroq.' },
      { q: 'A1 uchun IELTS kerakmi?', a: 'Odatda yo‘q. Standart IELTS (Academic va General Training) asosan B1 va undan yuqori darajalar uchun mo‘ljallangan. A1 va A2 uchun darajani aniqlash testi mos keladi.' }
    ]
  },
  {
    path: '/cefr/a2',
    name: 'CEFR A2',
    title: 'CEFR A2 daraja: nimalarni qila olasiz va qanday tayyorlanish | EduLevel',
    description: 'CEFR A2 (elementar) daraja: kundalik mavzularda sodda muloqot, nimani o‘rganish kerak, Present Perfect gacha yo‘l va B1 ga tayyorgarlik.',
    h1: 'CEFR A2 daraja: kundalik muloqot uchun elementar daraja',
    lead: 'A2 darajada o‘quvchi o‘ziga yaqin mavzularda — oila, xarid, ish, yashash joyi — tez-tez ishlatiladigan iboralar va gaplarni tushunadi.',
    updated: D,
    level: 'A2',
    related: ['/cefr/a1', '/cefr/b1', '/english/grammar/past-simple', HUB, ...COMMON_RELATED],
    sections: [
      {
        heading: 'A2 nimani anglatadi',
        paragraphs: ['A2 daraja sodda va tanish vazifalarda oddiy axborot almashishni bildiradi. O‘quvchi o‘zining kelib chiqishi, atrofi va zarur ehtiyojlarini sodda so‘zlar bilan tasvirlay oladi. Ma’lumot tanish mavzu bo‘lsa, qisqa va aniq matnlarni tushunadi.']
      },
      {
        heading: 'A2 da odatda nimalarni qila olasiz',
        paragraphs: ['Tipik vazifalar:'],
        items: ['Do‘konda, kafe va transportda oddiy savol-javob qilish.', 'Kundalik rejalaringiz va o‘tgan dam olish kunlaringiz haqida gapirish.', 'Qisqa shaxsiy xat yoki xabar yozish.', 'E’lon, jadval va sodda ko‘rsatmalarni tushunish.']
      },
      {
        heading: 'Nimani o‘rganish kerak',
        paragraphs: ['Past Simple (to‘g‘ri va noto‘g‘ri fe’llar), Present Continuous, kelasi zamon shakllari (will va going to), qiyoslash va orttirma darajalar, can / must / should, sanaladigan va sanalmaydigan otlar, a/an/the artikllari. Lug‘atni mavzular bo‘yicha o‘rganing: sayohat, sog‘liq, ish, xarid.']
      },
      {
        heading: 'Qanday mashq qilish',
        paragraphs: ['Har hafta bitta grammatika mavzusini oling, qoidani o‘qing va 10–15 ta mashq bajaring. Mavzu bo‘yicha saytdagi grammatika sahifalaridan foydalanishingiz mumkin. Haftada bir marta qisqa test topshirib, xatolar jurnalini yuriting: bir xil xatolar nimada takrorlanayotganini ko‘rasiz.']
      },
      {
        heading: 'Keyingi qadam',
        paragraphs: ['B1 ga o‘tish uchun Present Perfect, shart gaplar (first conditional) va matnni bog‘lovchi so‘zlar bilan yozish ko‘nikmasini rivojlantiring.']
      }
    ],
    faq: [
      { q: 'A2 dan B1 ga qanday o‘tiladi?', a: 'Grammatikani chuqurlashtirish (Present Perfect, conditionals), lug‘atni kengaytirish va muntazam Speaking hamda Writing mashqlari. Haqiqiy test orqali holatingizni vaqti-vaqti bilan tekshiring.' },
      { q: 'A2 uchun maxsus imtihon bormi?', a: 'Ha, turli tashkilotlar A2 sertifikatini beradi. Qaysi sertifikat kerakligi o‘qish yoki ish joyining talabiga bog‘liq, shuning uchun talabni avval tashkilotdan aniqlang.' }
    ]
  },
  {
    path: '/cefr/b1',
    name: 'CEFR B1',
    title: 'CEFR B1 daraja: mustaqil foydalanuvchi, IELTS 4.0–5.0 | EduLevel',
    description: 'CEFR B1 (o‘rta) daraja: nimalarni qila olasiz, tayyorgarlik rejasi, IELTS bilan taxminiy moslik va B2 ga o‘tish uchun maslahatlar.',
    h1: 'CEFR B1 daraja: ingliz tilida mustaqil muloqot',
    lead: 'B1 darajadan o‘quvchi mustaqil foydalanuvchi hisoblanadi: ish, o‘qish va dam olishda tanish mavzulardagi aniq nutqning asosiy fikrini tushunadi.',
    updated: D,
    level: 'B1',
    related: ['/cefr/a2', '/cefr/b2', '/english/grammar/present-perfect', '/english/grammar/conditionals', HUB, ...COMMON_RELATED],
    sections: [
      {
        heading: 'B1 nimani anglatadi',
        paragraphs: ['B1 o‘quvchi sayohatda uchraydigan ko‘p vaziyatlarni hal qila oladi, tanish yoki shaxsiy qiziqish mavzularida sodda bog‘langan matn yoza oladi, tajriba va voqealarni tasvirlaydi, orzu va rejalarini aytadi, fikriga qisqa sabab va tushuntirish keltiradi.']
      },
      {
        heading: 'IELTS bilan taxminiy moslik',
        paragraphs: ['Umumiy qabul qilingan taqqoslash bo‘yicha IELTS 4.0–5.0 ballari taxminan B1 ga to‘g‘ri keladi. Bu rasmiy tenglik emas: har bir universitet va tashkilot o‘z talabini belgilaydi, shuning uchun aniq minimal ballni qabul qiluvchi tashkilotdan tekshiring.']
      },
      {
        heading: 'Nimani o‘rganish kerak',
        paragraphs: ['Present Perfect va Past Simple farqi, shart gaplar, majhul nisbatga kirish, bog‘lovchilar (however, although, because of), kundalik va ish mavzularidagi lug‘at. Writing da 120–150 so‘zli xat va qisqa insho yozishni mashq qiling, Speaking da bir mavzuda 1 daqiqa to‘xtamay gapirishga harakat qiling.']
      },
      {
        heading: 'Qanday mashq qilish',
        paragraphs: ['Haftada kamida bitta Listening va bitta Reading vazifasini vaqtga qarab bajaring. Xatolaringizni turlarga ajrating (grammatika, lug‘at, e’tiborsizlik). EduBek AI ga yozgan matningizni yuboring va nima uchun xato ekanini so‘rang: bu faqat yordamchi, yakuniy baho emas.']
      },
      {
        heading: 'Keyingi qadam',
        paragraphs: ['B2 ga yetish uchun murakkab gaplar, mavhum mavzular lug‘ati va fikrni dalil bilan asoslash kerak.']
      }
    ],
    faq: [
      { q: 'B1 darajada IELTS topshirsa bo‘ladimi?', a: 'Ha, lekin ball past bo‘lishi mumkin. Maqsad B2 yoki undan yuqori bo‘lsa, avval tayyorgarlik kerak. Darajangizni sinov testi bilan aniqlang.' },
      { q: 'B1 va B2 asosiy farqi nimada?', a: 'B1 tanish mavzularda asosiy fikrni tushunadi va sodda gapiradi. B2 murakkabroq va mavhum mavzularda ravon, tabiiy suhbat yuritadi va fikrini batafsil asoslaydi.' }
    ]
  },
  {
    path: '/cefr/b2',
    name: 'CEFR B2',
    title: 'CEFR B2 daraja: IELTS 5.5–6.5 va tayyorgarlik rejasi | EduLevel',
    description: 'CEFR B2 (yuqori o‘rta) daraja: nimalarni qila olasiz, IELTS 5.5–6.5 bilan taxminiy moslik, tayyorgarlik yo‘nalishlari va C1 ga yo‘l.',
    h1: 'CEFR B2 daraja: ravon va aniq muloqot',
    lead: 'B2 darajada o‘quvchi murakkab matnlarning asosiy g‘oyalarini, shu jumladan o‘z sohasidagi texnik muhokamalarni ham tushunadi va tabiiy suhbat yurita oladi.',
    updated: D,
    level: 'B2',
    related: ['/cefr/b1', '/cefr/c1', '/ielts/band-score', '/ielts', HUB, ...COMMON_RELATED],
    sections: [
      {
        heading: 'B2 nimani anglatadi',
        paragraphs: ['B2 o‘quvchi suhbatdosh uchun ham, o‘zi uchun ham zo‘riqishsiz, ravon va spontan gapira oladi. Keng mavzularda aniq, batafsil matn yozadi, fikrini tushuntiradi va turli variantlarning afzallik hamda kamchiliklarini ko‘rsatadi.']
      },
      {
        heading: 'IELTS bilan taxminiy moslik',
        paragraphs: ['Umumiy qabul qilingan taqqoslashda IELTS 5.5–6.5 taxminan B2 ga to‘g‘ri keladi. Ko‘p universitetlar B2 ni yoki IELTS 6.0–6.5 ni talab qiladi, ammo aniq shart har joyda har xil. Talabni qabul qiluvchi tashkilotdan tekshiring.']
      },
      {
        heading: 'Nimani o‘rganish kerak',
        paragraphs: ['Murakkab gap tuzilmalari (relative clauses, inversion), passiv va shart gaplarning barcha turlari, akademik va mavhum mavzular lug‘ati, kollokatsiyalar, argumentni to‘g‘ri tuzish. Reading da tezlik va skimming/scanning, Listening da bir martalik eshitishda asosiy fikr va tafsilotni ajratish.']
      },
      {
        heading: 'Qanday mashq qilish',
        paragraphs: ['Mock testlarni haqiqiy vaqt bilan bajaring va har bir xatoning sababini yozing. Writing da bitta mavzuga rejali va 250 so‘zli insho yozing, so‘ng yozganingizni tahlil qiling. Speaking da o‘z ovozingizni yozib, takrorlar va to‘xtashlarni eshiting.']
      },
      {
        heading: 'Keyingi qadam',
        paragraphs: ['C1 ga yetish uchun fikrni nozik ottenkalar bilan ifodalash, akademik registr va murakkab matnlarni tez va chuqur tushunish ustida ishlash kerak.']
      }
    ],
    faq: [
      { q: 'B2 uchun qaysi sertifikat mos?', a: 'IELTS, CEFR bo‘yicha milliy sertifikat va boshqa imtihonlar B2 ni tasdiqlashi mumkin. Qaysi biri qabul qilinishini talab qiluvchi tashkilotdan aniqlang.' },
      { q: 'B2 darajaga mustaqil yetsa bo‘ladimi?', a: 'Ko‘pchilik mustaqil tayyorlanadi, lekin natija uchun reja, muntazamlik va mashqlarning haqiqiy imtihon formatiga mosligi muhim. Aniq muddat va’da qilib bo‘lmaydi.' }
    ]
  },
  {
    path: '/cefr/c1',
    name: 'CEFR C1',
    title: 'CEFR C1 daraja: IELTS 7.0–8.0, nimalarni qila olasiz | EduLevel',
    description: 'CEFR C1 (ilg‘or) daraja: nimalarni qila olasiz, IELTS 7.0–8.0 bilan taxminiy moslik, tayyorgarlik yo‘nalishlari va C2 ga yo‘l.',
    h1: 'CEFR C1 daraja: erkin va moslashuvchan foydalanuvchi',
    lead: 'C1 darajada o‘quvchi uzun va murakkab matnlarni tushunadi, yashirin ma’noni sezadi va fikrini iboralarni uzoq qidirmasdan ravon bildiradi.',
    updated: D,
    level: 'C1',
    related: ['/cefr/b2', '/cefr/c2', '/cefr/c1-yol-xaritasi', '/ielts/band-score', HUB, ...COMMON_RELATED],
    sections: [
      {
        heading: 'C1 nimani anglatadi',
        paragraphs: ['C1 o‘quvchi keng, talabchan matnlarni tushunadi va yashirin ma’noni taniydi. U ijtimoiy, akademik va kasbiy maqsadlar uchun tilni moslashuvchan va samarali ishlatadi, murakkab mavzularda aniq, yaxshi tuzilgan va batafsil matn yozadi, tuzilma va bog‘lovchilarni nazorat qiladi.']
      },
      {
        heading: 'IELTS bilan taxminiy moslik',
        paragraphs: ['Umumiy qabul qilingan taqqoslashda IELTS 7.0–8.0 taxminan C1 ga to‘g‘ri keladi. Bu taxminiy moslik, rasmiy tenglik emas; aniq talabni qabul qiluvchi tashkilotdan tekshiring.']
      },
      {
        heading: 'Nimani o‘rganish kerak',
        paragraphs: ['Uslub va registrni mavzuga moslash, ibora va idiomalar, nozik ma’no farqlari (nuance), murakkab argument va qarshi dalillarni boshqarish, passiv va rasmiy uslub, tez matnni o‘qib uslub va muallif pozitsiyasini aniqlash. Listening da turli aksent va tezlikdagi nutqqa o‘rganish.']
      },
      {
        heading: 'Qanday mashq qilish',
        paragraphs: ['Akademik maqolalar, uzun podkastlar va munozaralarni muntazam kuzating. Yozganingizni tahrirlash odatini shakllantiring: birinchi qoralama, so‘ng aniqlik va uslub bo‘yicha qayta ishlash. C1 uchun alohida yo‘l xaritasi sahifamiz ham bor.']
      },
      {
        heading: 'Keyingi qadam',
        paragraphs: ['C2 — deyarli ona tilidagi aniqlik va moslashuvchanlik; ko‘pchilik maqsad uchun C1 yetarli, shuning uchun C2 haqiqiy ehtiyojga qarab tanlanadi.']
      }
    ],
    faq: [
      { q: 'C1 kimlar uchun kerak?', a: 'Chet elda o‘qish, ilmiy faoliyat va yuqori malakali kasbiy ish uchun ba’zi tashkilotlar C1 yoki unga mos ballni talab qiladi. Talabni har bir tashkilotdan tekshiring.' },
      { q: 'B2 dan C1 ga qancha vaqtda o‘tiladi?', a: 'Aniq muddat berib bo‘lmaydi: u mashq hajmi va sifati, muhit va boshlang‘ich holatga bog‘liq. Odatda bu B1 dan B2 ga o‘tishdan ancha sekin boradi, shuning uchun muntazam va maqsadli mashq kerak.' }
    ]
  },
  {
    path: '/cefr/c2',
    name: 'CEFR C2',
    title: 'CEFR C2 daraja: mukammal daraja nimani anglatadi | EduLevel',
    description: 'CEFR C2 (mukammal) daraja: nimani anglatadi, qachon kerak bo‘ladi, IELTS 8.5–9.0 bilan taxminiy moslik va uni qanday rivojlantirish.',
    h1: 'CEFR C2 daraja: tilni mukammal bilish',
    lead: 'C2 — CEFR shkalasining eng yuqori darajasi. U har qanday eshitilgan yoki o‘qilgan matnni oson tushunishni va fikrni juda aniq ifodalashni bildiradi.',
    updated: D,
    level: 'C2',
    related: ['/cefr/c1', '/cefr/c1-yol-xaritasi', '/ielts/band-score', HUB, ...COMMON_RELATED],
    sections: [
      {
        heading: 'C2 nimani anglatadi',
        paragraphs: ['C2 o‘quvchi eshitgan yoki o‘qigan deyarli hamma narsani osongina tushunadi, turli yozma va og‘zaki manbalardan ma’lumotni jamlab, dalillarni izchil tarzda qayta bayon qiladi. Murakkab vaziyatlarda ham o‘zini spontan, juda ravon va aniq ifodalaydi, ma’nodagi nozik farqlarni ajratadi.']
      },
      {
        heading: 'IELTS bilan taxminiy moslik',
        paragraphs: ['Umumiy qabul qilingan taqqoslashda IELTS 8.5–9.0 taxminan C2 ga to‘g‘ri keladi. Bu taxminiy moslik: rasmiy tenglik emas.']
      },
      {
        heading: 'Qachon kerak bo‘ladi',
        paragraphs: ['Ko‘pchilik o‘qish va ish maqsadlari uchun C1 yetarli. C2 asosan tarjimonlik, til o‘qituvchiligi, ilmiy yozuv va juda yuqori talabli kasbiy muhitlarda kerak bo‘ladi. Haqiqiy ehtiyoj bo‘lmasa, C2 ga intilish o‘rniga C1 da barqaror ishlashga vaqt sarflash samaraliroq.']
      },
      {
        heading: 'Qanday rivojlantirish',
        paragraphs: ['Original manbalarni (ilmiy maqolalar, adabiyot, uzun intervyular) muntazam iste’mol qiling, ko‘p yozing va tahrir qiling, ona tilida so‘zlovchilar bilan muloqotga kiring. Asosiy ish — aniqlik, uslub va madaniy kontekstni his qilishni mukammallashtirish.']
      }
    ],
    faq: [
      { q: 'C2 va ona tilida so‘zlashuvchi bir xilmi?', a: 'Yo‘q. C2 ona tilida so‘zlashuvchining darajasi degani emas; u tilni juda yuqori, aniq va moslashuvchan ishlatishni bildiradi.' },
      { q: 'C2 sertifikat qayerda olinadi?', a: 'Turli xalqaro tashkilotlar C2 darajasini tasdiqlaydigan imtihonlar o‘tkazadi. Qaysi biri qabul qilinishini talab qiluvchi tashkilotdan aniqlang.' }
    ]
  }
];
