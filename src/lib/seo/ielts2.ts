/** IELTS skill guides, pronunciation and study plans. Original explanations; no claim of official exam material. */
import type { SeoPage } from './pages';

const D = '2026-11-25';

export const IELTS_PAGES_2: SeoPage[] = [
  {
    path: '/ielts/writing/task-1-graphs',
    name: 'IELTS Writing Task 1: grafik tavsifi',
    title: 'IELTS Writing Task 1: grafik va diagrammani tasvirlash | EduLevel',
    description: 'IELTS Academic Writing Task 1 uchun qo‘llanma: grafik tavsifi tuzilishi, trend iboralari, taqqoslash, overview yozish va javobli mashqlar.',
    h1: 'IELTS Writing Task 1: grafik va diagrammani tasvirlash',
    lead: 'Academic Task 1 da siz grafik, jadval yoki diagrammadagi ma’lumotni o‘z so‘zingiz bilan tasvirlaysiz. Fikr bildirmaysiz, faqat ko‘rinayotgan narsani aytasiz.',
    updated: D,
    level: 'B2',
    related: ['/ielts/writing', '/ielts/band-score', '/english/vocabulary/technology', '/cefr/b2'],
    sections: [
      {
        heading: 'To‘rt qismli tuzilma',
        paragraphs: ['Yaxshi javob odatda 4 abzatsdan iborat:'],
        items: [
          'Kirish: topshiriq savolini o‘z so‘zingiz bilan qayta ayting (paraphrase).',
          'Overview: eng muhim umumiy tendensiyalar, raqamsiz. Bu qism baholashda juda muhim.',
          'Asosiy ma’lumot 1: eng ahamiyatli xususiyatlar, raqamlar bilan.',
          'Asosiy ma’lumot 2: qolgan taqqoslashlar.'
        ]
      },
      {
        heading: 'Trend iboralari',
        paragraphs: ['O‘sish: rose, increased, climbed, went up. Pasayish: fell, declined, dropped, decreased. O‘zgarmaslik: remained stable, stayed constant. Cho‘qqi: peaked at. Eng past nuqta: reached a low of. Miqdor: a slight / sharp / dramatic rise. Tezlik: gradually, steadily, rapidly.']
      },
      {
        heading: 'Namunaviy overview',
        paragraphs: ['Overall, car ownership rose in all three countries, while public transport use declined. Country A had the highest figures throughout the period. Bu jumla aniq raqam bermaydi, faqat umumiy rasmni ko‘rsatadi.']
      },
      {
        heading: 'Keng tarqalgan xatolar',
        paragraphs: ['Overview yozmaslik; shaxsiy fikr qo‘shish; har bir raqamni ketma-ket sanab chiqish; o‘tgan zamon o‘rniga hozirgi zamondan foydalanish (grafik o‘tmish davrini ko‘rsatsa); 150 so‘zdan kam yozish.']
      }
    ],
    exercises: [
      { prompt: 'Sales ___ sharply in 2020. (keskin pasaydi)', answer: 'fell / dropped' },
      { prompt: 'Which paragraph gives general trends without numbers?', answer: 'Overview' },
      { prompt: 'The figure ___ at 40% in March. (cho‘qqiga chiqdi)', answer: 'peaked' },
      { prompt: 'Prices ___ stable between May and July. (o‘zgarmay qoldi)', answer: 'remained' },
      { prompt: 'Task 1 da shaxsiy fikr yozish kerakmi? (ha/yo‘q)', answer: 'yo‘q' }
    ],
    faq: [
      { q: 'Task 1 uchun minimal so‘z soni qancha?', a: 'Kamida 150 so‘z talab qilinadi. Kam yozilsa, jarima qo‘llanishi mumkin.' },
      { q: 'General Training da ham grafik bormi?', a: 'Yo‘q. General Training Task 1 da xat yoziladi; grafik tavsifi Academic variantiga xos.' }
    ]
  },
  {
    path: '/ielts/writing/task-2-opinion-essay',
    name: 'IELTS Task 2: fikr bildiruvchi insho',
    title: 'IELTS Writing Task 2 opinion essay: tuzilma va namuna | EduLevel',
    description: 'IELTS Task 2 opinion (agree/disagree) inshosi: tezis yozish, asosiy abzatslar, bog‘lovchilar, namunaviy reja va javobli mashqlar.',
    h1: 'IELTS Task 2: fikr bildiruvchi (opinion) insho',
    lead: 'Opinion inshoda savol «Do you agree or disagree?» yoki «To what extent do you agree?» ko‘rinishida bo‘ladi. Asosiy talab — aniq pozitsiya va uni to‘liq asoslash.',
    updated: D,
    level: 'B2',
    related: ['/ielts/writing', '/blog/ielts-writing-task-2-tuzilishi', '/english/grammar/linking-words', '/ielts/band-score'],
    sections: [
      {
        heading: 'Reja',
        paragraphs: ['Insho 4–5 abzatsdan iborat bo‘lishi mumkin:'],
        items: [
          'Kirish: mavzuni paraphrase qiling va tezis yozing (I strongly agree that ...).',
          '1-asosiy abzats: birinchi sabab, tushuntirish va misol.',
          '2-asosiy abzats: ikkinchi sabab, tushuntirish va misol.',
          'Xulosa: tezisni boshqacha so‘zlar bilan takrorlang, yangi fikr qo‘shmang.'
        ]
      },
      {
        heading: 'Abzats ichida PEEL',
        paragraphs: ['Point (asosiy fikr), Explain (tushuntirish), Example (misol), Link (savolga bog‘lash). Masalan: Online learning saves time. Students do not need to travel, so they can study more. For instance, a student in a village can join a class in the capital. Therefore, online courses make education more accessible.']
      },
      {
        heading: 'Foydali iboralar',
        paragraphs: ['In my opinion; I firmly believe that; one reason for this is; a further point is; for example; as a result; in conclusion. Pozitsiyani butun insho davomida o‘zgartirmang.']
      }
    ],
    exercises: [
      { prompt: 'Xulosada yangi fikr qo‘shish mumkinmi? (ha/yo‘q)', answer: 'yo‘q' },
      { prompt: 'PEEL dagi E harflari nimani anglatadi?', answer: 'Explain va Example' },
      { prompt: 'Misol keltirish uchun ___ ishlating: ___ , a student can study at home.', answer: 'For example' },
      { prompt: 'Tezis kirish qismining qaysi joyida yoziladi?', answer: 'Oxirida' },
      { prompt: 'Task 2 uchun minimal so‘z soni?', answer: '250' }
    ],
    faq: [
      { q: 'Task 2 da minimal so‘z soni qancha?', a: 'Kamida 250 so‘z. Odatda 260–300 so‘z yetarli, ortiqcha uzun yozish xato ehtimolini oshiradi.' }
    ]
  },
  {
    path: '/ielts/speaking/part-1-questions',
    name: 'IELTS Speaking Part 1 savollari',
    title: 'IELTS Speaking Part 1: savol turlari va javob usuli | EduLevel',
    description: 'IELTS Speaking Part 1 qanday o‘tadi: tanish mavzular, javob uzunligi, kengaytirish usuli, namunaviy javoblar va mashqlar.',
    h1: 'IELTS Speaking Part 1: savollar va javob usuli',
    lead: 'Part 1 taxminan 4–5 daqiqa davom etadi. Examiner kundalik mavzularda savol beradi: o‘zingiz, uyingiz, ish yoki o‘qishingiz, hobbi.',
    updated: D,
    level: 'B1',
    related: ['/ielts/speaking', '/english/vocabulary/hobbies-free-time', '/english/vocabulary/family-relationships', '/edubek-ai'],
    sections: [
      {
        heading: 'Javob uzunligi',
        paragraphs: ['Bir so‘zli javob bermang. 2–3 gapdan iborat javob ideal: javob, sabab, qisqa misol. «Do you like cooking?» — «Yes, I do. It helps me relax after work, and at weekends I often try new recipes.»']
      },
      {
        heading: 'Tez-tez uchraydigan mavzular',
        paragraphs: ['Hometown, work or studies, hobbies, family, food, travel, technology, weather, daily routine. Har mavzu uchun 8–10 ta kerakli so‘z va 2 ta shaxsiy misol tayyorlang.']
      },
      {
        heading: 'Pauza va ishonch',
        paragraphs: ['O‘ylash uchun: That’s an interesting question; well, let me think. Savolni tushunmasangiz: Sorry, could you repeat that, please? Bu normal va baholashga salbiy ta’sir qilmaydi.']
      },
      {
        heading: 'Mashq tartibi',
        paragraphs: ['Har kuni 3 ta savolga ovoz chiqarib javob bering, o‘zingizni yozib oling, keyin tinglab xatolarni toping. EduBek bilan ovozli mashq qilsangiz, tezkor fikr olasiz.']
      }
    ],
    exercises: [
      { prompt: 'Part 1 javobi uchun ideal uzunlik?', answer: '2–3 gap' },
      { prompt: 'Savol tushunarsiz bo‘lsa nima deysiz? (iborani yozing)', answer: 'Could you repeat that, please?' },
      { prompt: '«Do you enjoy reading?» savoliga javobga sabab qo‘shing: Yes, because ___', answer: 'o‘z sababingiz (masalan: it helps me learn new words)' },
      { prompt: 'Part 1 taxminan necha daqiqa?', answer: '4–5 daqiqa' },
      { prompt: 'Bir so‘zli javob yaxshimi? (ha/yo‘q)', answer: 'yo‘q' }
    ],
    faq: [
      { q: 'Part 1 savollari har doim bir xilmi?', a: 'Yo‘q, mavzular almashadi, lekin kundalik hayot doirasida qoladi. Shuning uchun alohida javob yodlash emas, so‘z boyligi va ravonlikni mashq qiling.' }
    ]
  },
  {
    path: '/ielts/speaking/part-2-cue-card',
    name: 'IELTS Speaking Part 2: cue card',
    title: 'IELTS Speaking Part 2 cue card: 2 daqiqalik monolog | EduLevel',
    description: 'IELTS Speaking Part 2 da cue card bilan 1–2 daqiqa gapirish: tayyorlanish vaqtidan foydalanish, reja, bog‘lovchilar va mashqlar.',
    h1: 'IELTS Speaking Part 2: cue card bilan monolog',
    lead: 'Part 2 da sizga mavzu kartochkasi beriladi, 1 daqiqa tayyorlanasiz va 1–2 daqiqa to‘xtamay gapirasiz.',
    updated: D,
    level: 'B2',
    related: ['/ielts/speaking', '/ielts/speaking/part-1-questions', '/english/grammar/past-continuous', '/english/speaking'],
    sections: [
      {
        heading: 'Tayyorlanish daqiqasi',
        paragraphs: ['Kartadagi 3–4 savol sizga reja beradi. Har biriga 2–3 ta kalit so‘z yozing, to‘liq gap yozmang. Oxirida «how I felt» yoki «why it was important» kabi bir fikr qo‘shishni rejalashtiring.']
      },
      {
        heading: 'Tuzilma',
        paragraphs: ['Boshlanishi: I’d like to talk about ... Asosiy qism: What it was, when and where, who was there. Tafsilot: one thing I remember clearly is ... Xulosa: Overall, it was a ... experience because ...']
      },
      {
        heading: 'Zamonlar',
        paragraphs: ['O‘tgan voqea haqida Past Simple va Past Continuous ishlating: I was walking home when I saw ... Tajriba haqida Present Perfect: I have visited it twice.']
      },
      {
        heading: 'Agar so‘z topolmasangiz',
        paragraphs: ['Jim qolmang. Boshqacha ifodalang: «a kind of ...», «something that you use to ...», «what I mean is ...». Bu ravonlikni saqlaydi.']
      }
    ],
    exercises: [
      { prompt: 'Tayyorlanish vaqti qancha?', answer: '1 daqiqa' },
      { prompt: 'O‘tgan voqea hikoyasida asosiy zamon?', answer: 'Past Simple' },
      { prompt: 'So‘z topilmasa ishlatiladigan ibora: What I ___ is ...', answer: 'mean' },
      { prompt: 'Kartadagi savollar nima vazifani bajaradi?', answer: 'Javob rejasi' },
      { prompt: 'Part 2 da qancha gapirish kerak?', answer: '1–2 daqiqa' }
    ],
    faq: [
      { q: '2 daqiqadan oldin to‘xtatsam nima bo‘ladi?', a: 'Examiner odatda sizni to‘xtatmaguncha davom ettirishni kutadi. Mumkin qadar 1,5–2 daqiqaga yaqin gapirishga harakat qiling.' }
    ]
  },
  {
    path: '/ielts/speaking/part-3-discussion',
    name: 'IELTS Speaking Part 3: muhokama',
    title: 'IELTS Speaking Part 3: murakkab savollarga javob | EduLevel',
    description: 'IELTS Speaking Part 3 abstrakt savollari: fikr bildirish, sabab-oqibat, taqqoslash va ehtimol iboralari, namunalar va mashqlar.',
    h1: 'IELTS Speaking Part 3: muhokama savollari',
    lead: 'Part 3 da Part 2 mavzusiga bog‘liq umumiyroq va murakkabroq savollar beriladi. Bu yerda fikr, taqqoslash va bashorat qilish talab etiladi.',
    updated: D,
    level: 'B2',
    related: ['/ielts/speaking', '/ielts/speaking/part-2-cue-card', '/english/grammar/conditionals', '/english/grammar/linking-words'],
    sections: [
      {
        heading: 'Javob modeli',
        paragraphs: ['Fikr + sabab + misol + kichik qarama-qarshilik. Masalan: I think technology helps learners, mainly because they can study anywhere. However, some students may get distracted by their phones.']
      },
      {
        heading: 'Foydali iboralar',
        paragraphs: ['Fikr: I’d say that; from my point of view. Taqqoslash: compared with the past; whereas. Ehtimol: it might; it could lead to. Gipoteza: if people spent more time outdoors, they would be healthier.']
      },
      {
        heading: 'Savol turlari',
        paragraphs: ['Taqqoslash (past vs present), sabab-oqibat (why do people ...), bashorat (how will ... change), baho (is it a good idea ...). Har turga 1 ta tayyor shablon yodda saqlang.']
      }
    ],
    exercises: [
      { prompt: 'Gipoteza uchun qaysi shakl: If people ___ more, they would be healthier. (exercise)', answer: 'exercised' },
      { prompt: 'Ehtimolni bildiruvchi modal fe’l?', answer: 'might / could' },
      { prompt: 'Qarama-qarshilik bog‘lovchisi: Technology helps; ___, it can distract.', answer: 'however' },
      { prompt: 'Part 3 javobiga nima qo‘shiladi: fikr + sabab + ___', answer: 'misol' },
      { prompt: '«Compared with the past» nimani bildiradi?', answer: 'Taqqoslash' }
    ],
    faq: [
      { q: 'Part 3 da noto‘g‘ri fikr aytsam ball kamayadimi?', a: 'Yo‘q. Baholanadigan narsa fikrning to‘g‘riligi emas, tilning aniqligi, ravonligi va fikrni rivojlantirish qobiliyati.' }
    ]
  },
  {
    path: '/ielts/reading/true-false-not-given',
    name: 'IELTS Reading: True/False/Not Given',
    title: 'IELTS Reading True/False/Not Given: farqi va strategiya | EduLevel',
    description: 'IELTS Reading dagi True/False/Not Given topshiriqlari: uch javobning farqi, tuzoqlar, qadamma-qadam usul va javobli mashqlar.',
    h1: 'IELTS Reading: True / False / Not Given',
    lead: 'Bu topshiriq turi ko‘pchilikda xato qildiradi. Asosiy qoida: faqat matndagi ma’lumotga tayaning, o‘z bilimingizga emas.',
    updated: D,
    level: 'B2',
    related: ['/ielts/reading', '/ielts/mock-test', '/english/vocabulary/education', '/cefr/b2'],
    sections: [
      {
        heading: 'Uch javobning farqi',
        paragraphs: ['True — matn gapni to‘g‘ridan-to‘g‘ri tasdiqlaydi. False — matn gapga zid. Not Given — matn bu haqda gapirmaydi, tasdiqlamaydi ham, inkor ham qilmaydi.']
      },
      {
        heading: 'Qadamlar',
        paragraphs: ['1) Gapdagi kalit so‘zlarni belgilang. 2) Matnda mos joyni toping (sinonimlarga e’tibor bering). 3) Ma’noni solishtiring. 4) Qarama-qarshi bo‘lsa False, mos kelsa True, topa olmasangiz Not Given.']
      },
      {
        heading: 'Tuzoqlar',
        paragraphs: ['Mutlaq so‘zlar (always, all, only, never) matnda «often, most» bo‘lsa, javob False bo‘lishi mumkin. Matnda mavzu bor, lekin aynan shu detal yo‘q bo‘lsa, javob Not Given. O‘z bilimingiz bilan javob bermang.']
      },
      {
        heading: 'Mini misol',
        paragraphs: ['Matn: Most students in the survey preferred morning classes. Gap: All students preferred morning classes. Javob: False (most ≠ all). Gap: Students preferred morning classes because of lower noise. Javob: Not Given (sabab aytilmagan).']
      }
    ],
    exercises: [
      { prompt: 'Matn: «Most students passed.» Gap: «All students passed.»', answer: 'False' },
      { prompt: 'Matn: «The library opens at 8.» Gap: «The library opens early.»', answer: 'Not Given (early aniqlanmagan) yoki True, agar 8 ni erta deb matn ta’riflasa' },
      { prompt: 'Matn bu haqda umuman gapirmasa javob?', answer: 'Not Given' },
      { prompt: '«Always» so‘zi gapda bo‘lsa nimaga e’tibor berasiz?', answer: 'Matnda mutlaqlik tasdiqlanganmi yoki yo‘q' },
      { prompt: 'Javob uchun asos qayerda bo‘lishi kerak?', answer: 'Matnda' }
    ],
    faq: [
      { q: 'Yes/No/Not Given bilan farqi bormi?', a: 'Tuzilishi bir xil, lekin True/False faktlar uchun, Yes/No yozuvchining fikri yoki da’volari uchun ishlatiladi.' }
    ]
  },
  {
    path: '/ielts/listening/form-and-map-completion',
    name: 'IELTS Listening: forma va xarita',
    title: 'IELTS Listening: forma to‘ldirish va xarita topshiriqlari | EduLevel',
    description: 'IELTS Listening da forma to‘ldirish, xarita va plan topshiriqlari: tinglashdan oldingi tayyorgarlik, imlo, raqamlar va javobli mashqlar.',
    h1: 'IELTS Listening: forma va xarita topshiriqlari',
    lead: 'Part 1 da odatda forma to‘ldirish bo‘ladi: ism, telefon, sana. Xarita topshirig‘i yo‘nalish iboralarini bilishni talab qiladi.',
    updated: D,
    level: 'B1',
    related: ['/ielts/listening', '/english/vocabulary/travel', '/ielts/mock-test', '/cefr/b1'],
    sections: [
      {
        heading: 'Tinglashdan oldin',
        paragraphs: ['Savollarni o‘qib, qanday ma’lumot kerakligini aniqlang: ism, raqam, sana, manzil. Qancha so‘z yozish mumkinligini (ONE WORD AND/OR A NUMBER) tekshiring.']
      },
      {
        heading: 'Imlo va raqamlar',
        paragraphs: ['Ism ko‘pincha harflab aytiladi: K-A-R-I-M-O-V. Alifboni ingliz talaffuzida bilib oling. Telefon raqamlarida double five (55) kabi iboralar bor. Sanalarda 13 va 30, 15 va 50 ni farqlang.']
      },
      {
        heading: 'Xarita va yo‘nalish',
        paragraphs: ['Foydali iboralar: turn left / right, go straight ahead, on your left, opposite, next to, between, at the end of, past the bank. Xaritadagi joylarni avvaldan ko‘rib chiqing va yo‘nalishni barmoq bilan kuzating.']
      },
      {
        heading: 'Xatolar',
        paragraphs: ['Imlo xatosi javobni noto‘g‘ri qiladi. Ko‘plik shakli (s) va katta-kichik harflarga e’tibor bering. So‘z limitini oshirmang.']
      }
    ],
    exercises: [
      { prompt: 'Ism harflab aytilsa nimani yozasiz?', answer: 'Harflardan tuzilgan so‘zni' },
      { prompt: '«Double five» nima?', answer: '55' },
      { prompt: 'Xaritada «opposite the bank» nimani bildiradi?', answer: 'Bankning ro‘parasida' },
      { prompt: '15 va 50 talaffuzda qaysi qismida farq bor? (fifteen / fifty)', answer: 'Urg‘uda: fifTEEN va FIFty' },
      { prompt: 'So‘z limiti ONE WORD bo‘lsa «the library» yozsam to‘g‘rimi?', answer: 'Yo‘q, faqat library' }
    ],
    faq: [
      { q: 'Listening audio faqat bir marta eshittiriladimi?', a: 'Ha, IELTS Listening audiosi bir marta eshittiriladi. Shuning uchun tinglashdan oldingi tayyorgarlik juda muhim.' }
    ]
  },
  {
    path: '/english/pronunciation/word-stress',
    name: 'Inglizcha so‘z urg‘usi',
    title: 'Inglizcha so‘z urg‘usi (word stress): qoidalar va mashq | EduLevel',
    description: 'Inglizcha so‘z urg‘usi qanday ishlaydi: ot va fe’l farqi, qo‘shimchalar, ikki bo‘g‘inli so‘zlar, misollar va talaffuz mashqlari.',
    h1: 'Inglizcha so‘z urg‘usi (word stress)',
    lead: 'Inglizchada ko‘p bo‘g‘inli so‘zlarda bitta bo‘g‘in kuchliroq aytiladi. Urg‘u noto‘g‘ri bo‘lsa, so‘z tushunarsiz bo‘lishi mumkin.',
    updated: D,
    level: 'A2',
    related: ['/english/speaking', '/ielts/speaking', '/edubek-ai', '/english/vocabulary'],
    sections: [
      {
        heading: 'Asosiy fikr',
        paragraphs: ['Urg‘u olgan bo‘g‘in uzunroq, balandroq va aniqroq aytiladi, qolganlari qisqa. Lug‘atda urg‘u belgisi (ˈ) bo‘g‘in oldiga qo‘yiladi: ˈtable, deˈcide.']
      },
      {
        heading: 'Ot va fe’l',
        paragraphs: ['Ba’zi ikki bo‘g‘inli so‘zlarda ot birinchi bo‘g‘inga, fe’l ikkinchisiga urg‘u oladi: a ˈrecord (ot) — to reˈcord (fe’l); a ˈpresent — to preˈsent; an ˈobject — to obˈject.']
      },
      {
        heading: 'Qo‘shimchalar',
        paragraphs: ['-tion, -sion, -ic, -ical dan oldingi bo‘g‘in urg‘u oladi: eduˈcation, ecoˈnomic, graˈmmatical. -ee, -eer, -ese qo‘shimchalarining o‘zi urg‘u oladi: emploˈyee, engiˈneer, JapaˈNESE.']
      },
      {
        heading: 'Mashq usuli',
        paragraphs: ['Yangi so‘zni o‘rganganda lug‘atdagi transkripsiyani tekshiring, ovoz chiqarib ayting va urg‘uli bo‘g‘inni stol ustiga qo‘l bilan ur ko‘rsating. Ovozingizni yozib, lug‘atdagi audio bilan solishtiring.']
      }
    ],
    exercises: [
      { prompt: 'Qaysi bo‘g‘inga urg‘u? education', answer: '3-bo‘g‘in: eduˈca-tion (-tion dan oldingi)' },
      { prompt: 'The ˈrecord (ot) va to reˈcord (fe’l): farq nimada?', answer: 'Urg‘u o‘rni' },
      { prompt: 'engiˈneer so‘zida urg‘u qayerda?', answer: 'Oxirgi bo‘g‘inda (-eer)' },
      { prompt: 'Urg‘u olgan bo‘g‘in qanday aytiladi?', answer: 'Uzunroq, balandroq va aniqroq' },
      { prompt: 'Lug‘atda urg‘u belgisi qayerga qo‘yiladi?', answer: 'Urg‘uli bo‘g‘in oldiga' }
    ],
    faq: [
      { q: 'Urg‘u nega kerak?', a: 'Urg‘u noto‘g‘ri bo‘lsa, tinglovchi so‘zni tanimay qolishi mumkin. Shuningdek, tabiiy ritmning asosi hisoblanadi.' }
    ]
  },
  {
    path: '/english/pronunciation/common-mistakes-uzbek-speakers',
    name: 'O‘zbek tilida so‘zlashuvchilar uchun talaffuz xatolari',
    title: 'Talaffuz xatolari: o‘zbek tilida so‘zlashuvchilar uchun | EduLevel',
    description: 'O‘zbek tilida gapiruvchilar inglizcha talaffuzda qiynaladigan tovushlar: th, w va v, qisqa va uzun unlilar, so‘z oxiri undoshlari, mashqlar.',
    h1: 'Talaffuz: o‘zbek tilida so‘zlashuvchilar uchun keng tarqalgan xatolar',
    lead: 'Ona tilimizdagi tovushlar inglizchaga ta’sir qiladi. Quyida ko‘p uchraydigan holatlar va ularni mashq qilish usullari.',
    updated: D,
    level: 'B1',
    related: ['/english/pronunciation/word-stress', '/english/speaking', '/ielts/speaking', '/edubek-ai'],
    sections: [
      {
        heading: 'Th tovushlari',
        paragraphs: ['O‘zbek tilida th tovushi yo‘q. think, three — tilni tishlar orasiga qo‘yib, ovozsiz havo chiqaring. this, that — shu holatda ovozli tovush chiqaring. Tilni tishlar orasiga qo‘yishni oynada ko‘rib mashq qiling.']
      },
      {
        heading: 'W va V',
        paragraphs: ['v tovushida pastki lab yuqori tishlarga tegadi: very. w tovushida lablar yumaloqlanadi va tishlar tegmaydi: water. Juftliklar: very — wary, vine — wine, vest — west.']
      },
      {
        heading: 'Qisqa va uzun unlilar',
        paragraphs: ['ship — sheep, full — fool, bit — beat. Uzun unli aniq cho‘ziladi. Juftliklarni ovoz chiqarib o‘qing va yozib oling.']
      },
      {
        heading: 'So‘z oxiri undoshlari',
        paragraphs: ['-ed va -s qo‘shimchalarini tushirib qoldirmang: walked, helps, books. Oxirgi tovushlar ma’noni o‘zgartiradi (zamon, ko‘plik).']
      }
    ],
    exercises: [
      { prompt: 'think va this: qaysi birida ovoz bor?', answer: 'this' },
      { prompt: 'very va wary farqi?', answer: 'v da lab tishga tegadi, w da tegmaydi' },
      { prompt: 'ship va sheep: qaysi uzun unli?', answer: 'sheep' },
      { prompt: 'walked so‘zida oxirgi tovush yo‘qolsa nima o‘zgaradi?', answer: 'O‘tgan zamon ma’nosi yo‘qoladi' },
      { prompt: 'th tovushida til qayerda bo‘ladi?', answer: 'Tishlar orasida' }
    ],
    faq: [
      { q: 'Aksent butunlay yo‘qolishi shartmi?', a: 'Yo‘q. Maqsad aksentsiz gapirish emas, tushunarli va aniq gapirish. Asosiy tovushlar va urg‘uni to‘g‘rilash yetarli.' }
    ]
  },
  {
    path: '/study-plan/ielts-8-week',
    name: 'IELTS 8 haftalik tayyorgarlik rejasi',
    title: 'IELTS 8 haftalik tayyorgarlik rejasi: haftalar bo‘yicha | EduLevel',
    description: 'IELTS ga 8 hafta ichida tayyorlanish rejasi: har hafta uchun maqsad, kunlik vaqt taqsimoti, mock test jadvali va xatolar ustida ishlash.',
    h1: 'IELTS 8 haftalik tayyorgarlik rejasi',
    lead: 'Bu reja B1–B2 darajadagi o‘quvchi uchun kuniga 1,5–2 soat vaqt ajrata oladi deb tuzilgan. Natija darajangizga bog‘liq, kafolat yo‘q.',
    updated: D,
    level: 'B2',
    related: ['/ielts', '/ielts/mock-test', '/ielts/band-score', '/blog/ielts-nol-dan-tayyorlanish'],
    sections: [
      {
        heading: '1–2-haftalar: asos',
        paragraphs: ['Test formati bilan tanishing. Diagnostik mock test yeching va zaif ko‘nikmalarni aniqlang. Har kuni 10 ta yangi so‘z, 1 ta grammatika mavzusi. Listening va Reading ni har kuni 30 daqiqa mashq qiling.']
      },
      {
        heading: '3–4-haftalar: ko‘nikma texnikasi',
        paragraphs: ['Reading savol turlari (True/False/Not Given, matching headings). Listening forma va xarita topshiriqlari. Task 1 tuzilmasi va Speaking Part 1 javoblari. Haftada 1 ta Writing yozib, tekshirtiring.']
      },
      {
        heading: '5–6-haftalar: vaqt va aniqlik',
        paragraphs: ['Vaqt bilan to‘liq bo‘limlar yeching. Task 2 inshoni haftada 2 marta yozing. Speaking Part 2 monologlarni yozib oling. Xatolar daftarini yuriting.']
      },
      {
        heading: '7–8-haftalar: to‘liq mock',
        paragraphs: ['Haftada 2 ta to‘liq mock test. Xatolarni tahlil qilib, qaytariladigan xatolarga e’tibor bering. Oxirgi haftada yangi material emas, takrorlash va dam olishga ahamiyat bering.']
      }
    ],
    exercises: [
      { prompt: 'Rejaning birinchi qadami nima?', answer: 'Diagnostik mock test' },
      { prompt: 'Task 2 inshoni 5–6-haftalarda haftada necha marta yozish tavsiya etiladi?', answer: '2 marta' },
      { prompt: 'Oxirgi haftada nimaga e’tibor beriladi?', answer: 'Takrorlash va dam olish' },
      { prompt: 'Xatolar daftari nima uchun kerak?', answer: 'Qaytariladigan xatolarni aniqlash uchun' },
      { prompt: 'Kuniga qancha vaqt rejalashtirilgan?', answer: '1,5–2 soat' }
    ],
    faq: [
      { q: '8 hafta yetarlimi?', a: 'Bu boshlang‘ich darajangizga bog‘liq. B2 ga yaqin o‘quvchi uchun real, A2–B1 uchun odatda ko‘proq vaqt kerak. Diagnostik testdan so‘ng aniqroq baho beriladi.' }
    ]
  },
  {
    path: '/study-plan/english-30-days',
    name: '30 kunlik ingliz tili mashq rejasi',
    title: '30 kunlik ingliz tili mashq rejasi: kunlik odatlar | EduLevel',
    description: '30 kunlik ingliz tili mashq rejasi: har kuni 40–60 daqiqa, so‘z, tinglash, gapirish va yozish bo‘yicha haftalik maqsadlar va kuzatish usuli.',
    h1: '30 kunlik ingliz tili mashq rejasi',
    lead: 'Barqaror odat — tez natijadan muhimroq. Reja har kuni 40–60 daqiqa vaqt ajratish uchun mo‘ljallangan.',
    updated: D,
    level: 'A2',
    related: ['/ingliz-tili-darslari', '/english/vocabulary', '/english/speaking', '/english/level-test'],
    sections: [
      {
        heading: 'Kunlik tuzilma',
        paragraphs: ['Har kun 4 qismdan iborat:'],
        items: [
          '10 daqiqa: 5 ta yangi so‘z va kechagi so‘zlarni takrorlash.',
          '15 daqiqa: tinglash (podcast, video) va qisqa yozib olish.',
          '15 daqiqa: bitta grammatika mavzusi va mashq.',
          '10 daqiqa: gapirish yoki yozish (3–5 gap).'
        ]
      },
      {
        heading: 'Haftalik maqsadlar',
        paragraphs: ['1-hafta: o‘zingiz haqingizda 10 gap. 2-hafta: kundalik tartib va o‘tgan hafta voqeasi. 3-hafta: fikr bildirish (I think, because). 4-hafta: 1 daqiqalik monolog va 100 so‘zli matn.']
      },
      {
        heading: 'Kuzatish',
        paragraphs: ['Har kuni jadvalga belgi qo‘ying. Hafta oxirida yangi so‘zlar sonini va ovoz yozuvlarini solishtiring. Bitta kun o‘tkazib yuborsangiz, ertasi kuni davom eting.']
      }
    ],
    exercises: [
      { prompt: 'Kunlik 4 qismdan iborat nima?', answer: 'So‘z, tinglash, grammatika, gapirish yoki yozish' },
      { prompt: '4-hafta maqsadi?', answer: '1 daqiqalik monolog va 100 so‘zli matn' },
      { prompt: 'Kun o‘tkazib yuborilsa nima qilinadi?', answer: 'Ertasi kuni davom etiladi' },
      { prompt: 'Kuniga nechta yangi so‘z tavsiya etilgan?', answer: '5 ta' },
      { prompt: 'Rejaning umumiy kunlik vaqti?', answer: '40–60 daqiqa' }
    ],
    faq: [
      { q: '30 kunda ingliz tilini bilib olamanmi?', a: 'Yo‘q, bu muddat til o‘rganishni boshlash va odat shakllantirish uchun. Sezilarli o‘sish uchun bir necha oy muntazam mashq kerak.' }
    ]
  }
];
