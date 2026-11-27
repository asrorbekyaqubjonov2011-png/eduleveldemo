/**
 * Grammar guides: one page per topic, written for Uzbek-speaking learners. Each page has the rule, the forms, typical
 * mistakes, practice questions with answers (shown on the page) and a few real questions learners ask.
 * Every example sentence and answer was checked by hand. No claims about results or statistics.
 */
import type { SeoPage } from './pages';

const D = '2026-11-25';
const HUB = '/english/grammar';

export const GRAMMAR_PAGES: SeoPage[] = [
  {
    path: '/english/grammar/present-simple',
    name: 'Present Simple',
    title: 'Present Simple: qoidalar, misollar va mashqlar | EduLevel',
    description: 'Present Simple zamoni: qachon ishlatiladi, -s/-es qoidasi, inkor va so‘roq gaplar, ko‘p uchraydigan xatolar va javobli mashqlar.',
    h1: 'Present Simple: qoidalar, misollar va mashqlar',
    lead: 'Present Simple — ingliz tilidagi eng ko‘p ishlatiladigan zamon. U odatlar, doimiy haqiqatlar va jadvallar haqida gapirganda ishlatiladi.',
    updated: D,
    level: 'A1',
    related: [HUB, '/english/grammar/present-continuous', '/english/grammar/past-simple', '/blog/ingliz-tili-zamonlari-qisqacha', '/english/level-test'],
    sections: [
      {
        heading: 'Qachon ishlatiladi',
        paragraphs: ['Present Simple uch asosiy holatda kerak bo‘ladi.'],
        items: [
          'Odat va takrorlanadigan ishlar: I walk to school every day. (Men har kuni maktabga piyoda boraman.)',
          'Doimiy haqiqatlar: Water boils at 100 degrees Celsius. (Suv 100 gradusda qaynaydi.)',
          'Jadval va reja bo‘yicha ishlar: The train leaves at 9:15. (Poyezd 9:15 da jo‘naydi.)'
        ]
      },
      {
        heading: 'Shakllanishi',
        paragraphs: ['I, you, we, they bilan fe’l o‘zgarmaydi: I work, they work. He, she, it bilan fe’lga -s yoki -es qo‘shiladi: she works, he watches.', 'Inkor gap: do not (don’t) yoki does not (doesn’t) + fe’lning asosiy shakli: I don’t like tea. She doesn’t like tea. So‘roq gap: Do/Does + ega + fe’l: Do you like tea? Does she like tea?']
      },
      {
        heading: '-s / -es qo‘shish qoidalari',
        paragraphs: ['Ko‘pchilik fe’llarga -s qo‘shiladi: work → works. -s, -sh, -ch, -x, -o bilan tugaydigan fe’llarga -es: watch → watches, go → goes. Undosh + y bilan tugasa y o‘rniga -ies: study → studies. Unli + y bo‘lsa faqat -s: play → plays.']
      },
      {
        heading: 'Ko‘p uchraydigan xatolar',
        paragraphs: ['«She don’t like» emas, She doesn’t like. «Does he goes?» emas, Does he go? — does bor joyda asosiy fe’lga -s qo‘shilmaydi. Shuningdek, signal so‘zlarni eslab qoling: always, usually, often, sometimes, never, every day, on Mondays.']
      }
    ],
    exercises: [
      { prompt: 'She ___ (work) in a bank.', answer: 'works', explanation: 'She bilan fe’lga -s qo‘shiladi.' },
      { prompt: 'They ___ (not / like) coffee.', answer: 'don’t like (do not like)', explanation: 'They bilan do not + asosiy fe’l.' },
      { prompt: '___ he ___ (play) football on Sundays?', answer: 'Does / play', explanation: 'So‘roq gapda does bor, asosiy fe’l -s siz.' },
      { prompt: 'The sun ___ (rise) in the east.', answer: 'rises', explanation: 'Doimiy haqiqat, the sun = it.' },
      { prompt: 'My brother ___ (study) English every evening.', answer: 'studies', explanation: 'Undosh + y: y → ies.' },
      { prompt: 'Qaysi biri to‘g‘ri?', options: ['He don’t know', 'He doesn’t know', 'He not know'], answer: 'B) He doesn’t know', explanation: 'He bilan doesn’t + asosiy fe’l.' }
    ],
    faq: [
      { q: 'Present Simple da he/she/it bilan nega -s qo‘shiladi?', a: 'Bu ingliz tilidagi yagona qolgan shaxs qo‘shimchasi: uchinchi shaxs birlikda fe’lga -s/-es qo‘shiladi. Boshqa shaxslarda fe’l o‘zgarmaydi.' },
      { q: 'Does va do ni qachon ishlataman?', a: 'Does — he, she, it (va birlikdagi ega) bilan; do — I, you, we, they (va ko‘plikdagi ega) bilan.' },
      { q: 'Present Simple faqat hozirgi vaqt haqidami?', a: 'Yo‘q. U odat, doimiy haqiqat va jadval haqida; shuning uchun «hozir yuz berayotgan ish» uchun Present Continuous ishlatiladi.' }
    ]
  },
  {
    path: '/english/grammar/present-continuous',
    name: 'Present Continuous',
    title: 'Present Continuous: qoidalar va mashqlar | EduLevel',
    description: 'Present Continuous: hozir davom etayotgan ish, vaqtinchalik holat va rejalashtirilgan kelajak. Shakllanishi, holat fe’llari va javobli mashqlar.',
    h1: 'Present Continuous: hozir davom etayotgan ishlar',
    lead: 'Present Continuous gapirayotgan paytda davom etayotgan ishni, vaqtinchalik holatni va oldindan kelishilgan rejani ifodalaydi.',
    updated: D,
    level: 'A1',
    related: [HUB, '/english/grammar/present-simple', '/english/grammar/future-forms', '/blog/ingliz-tili-zamonlari-qisqacha'],
    sections: [
      {
        heading: 'Shakllanishi',
        paragraphs: ['am / is / are + fe’l-ing: I am reading, she is reading, they are reading.', 'Inkor: I am not reading, she isn’t reading. So‘roq: Are you reading? What is she reading?', '-ing yozilishi: make → making (oxirgi e tushadi), run → running (undosh ikkilanadi), lie → lying.']
      },
      {
        heading: 'Qachon ishlatiladi',
        paragraphs: ['Uch holat bor.'],
        items: [
          'Hozir davom etayotgan ish: Look! It is raining.',
          'Hozirgi davrdagi vaqtinchalik holat: She is staying with her aunt this week.',
          'Aniq kelishilgan reja: We are meeting the teacher at six tomorrow.'
        ]
      },
      {
        heading: 'Davomiy shaklda ishlatilmaydigan fe’llar',
        paragraphs: ['Holat bildiruvchi fe’llar odatda Continuous bo‘lmaydi: know, like, love, want, need, believe, understand, belong. «I am knowing» emas, I know. Ba’zi fe’llar ma’nosiga qarab ikkala shaklda ham keladi: I think it is good (fikr, Simple) va I am thinking about the exam (jarayon, Continuous).']
      }
    ],
    exercises: [
      { prompt: 'Look! It ___ (rain).', answer: 'is raining' },
      { prompt: 'I ___ (not / watch) TV now.', answer: 'am not watching' },
      { prompt: 'What ___ you ___ (do)?', answer: 'are / doing' },
      { prompt: 'She ___ (stay) with her aunt this week.', answer: 'is staying', explanation: 'Vaqtinchalik holat.' },
      { prompt: 'Qaysi biri to‘g‘ri?', options: ['I am knowing the answer', 'I know the answer'], answer: 'B) I know the answer', explanation: 'Know — holat fe’li, odatda Continuous bo‘lmaydi.' },
      { prompt: 'They ___ (meet) us at six tomorrow. (kelishilgan reja)', answer: 'are meeting' }
    ],
    faq: [
      { q: 'Present Simple va Present Continuous farqi nimada?', a: 'Present Simple odat va doimiy haqiqat uchun (I walk to school), Continuous esa hozir yoki shu davrda davom etayotgan ish uchun (I am walking now).' },
      { q: 'Continuous kelajak haqida ham gapira oladimi?', a: 'Ha, agar reja aniq kelishilgan bo‘lsa va vaqti ma’lum bo‘lsa: We are flying to Dubai on Friday.' }
    ]
  },
  {
    path: '/english/grammar/past-simple',
    name: 'Past Simple',
    title: 'Past Simple: to‘g‘ri va noto‘g‘ri fe’llar, mashqlar | EduLevel',
    description: 'Past Simple zamoni: -ed qo‘shimchasi, noto‘g‘ri fe’llar ro‘yxati, did bilan inkor va so‘roq gaplar, vaqt so‘zlari va javobli mashqlar.',
    h1: 'Past Simple: o‘tgan zamondagi tugagan ishlar',
    lead: 'Past Simple o‘tmishda aniq vaqtda boshlanib tugagan ishni bildiradi: yesterday, last week, in 2019, two days ago.',
    updated: D,
    level: 'A2',
    related: [HUB, '/english/grammar/present-perfect', '/english/grammar/present-simple', '/blog/ingliz-tili-zamonlari-qisqacha'],
    sections: [
      {
        heading: 'To‘g‘ri fe’llar',
        paragraphs: ['Fe’lga -ed qo‘shiladi: visit → visited, work → worked. E bilan tugasa faqat -d: live → lived. Undosh + y bo‘lsa -ied: study → studied. Qisqa fe’llarda undosh ikkilanadi: stop → stopped.']
      },
      {
        heading: 'Noto‘g‘ri fe’llar',
        paragraphs: ['Ularning o‘tgan shakli yodlanadi. Eng ko‘p uchraydiganlari:'],
        items: ['go – went', 'see – saw', 'have – had', 'buy – bought', 'take – took', 'write – wrote', 'come – came', 'eat – ate', 'make – made', 'know – knew']
      },
      {
        heading: 'Inkor va so‘roq',
        paragraphs: ['Inkor: did not (didn’t) + asosiy fe’l: He didn’t go. So‘roq: Did + ega + asosiy fe’l: Did you see the film? Did bor joyda fe’l o‘tgan shaklda emas, asosiy shaklda turadi.', 'Vaqt so‘zlari: yesterday, last night, last year, in 2018, two weeks ago, when I was a child.']
      }
    ],
    exercises: [
      { prompt: 'We ___ (visit) Samarkand last year.', answer: 'visited' },
      { prompt: 'He ___ (not / go) to school yesterday.', answer: 'didn’t go (did not go)' },
      { prompt: '___ you ___ (see) the film?', answer: 'Did / see' },
      { prompt: 'She ___ (buy) a new phone two days ago.', answer: 'bought', explanation: 'Buy noto‘g‘ri fe’l: bought.' },
      { prompt: 'I ___ (write) a letter last night.', answer: 'wrote' },
      { prompt: 'Qaysi biri to‘g‘ri?', options: ['Did she went?', 'Did she go?'], answer: 'B) Did she go?', explanation: 'Did dan keyin asosiy shakl.' }
    ],
    faq: [
      { q: 'Past Simple va Present Perfect ni qanday ajrataman?', a: 'Vaqt aniq va tugagan bo‘lsa (yesterday, in 2019) Past Simple. Vaqt ko‘rsatilmasa yoki davr hozirgacha davom etsa Present Perfect ishlatiladi.' },
      { q: 'Noto‘g‘ri fe’llarni qanday tez yod olish mumkin?', a: 'Kuniga 5–8 tadan, gap ichida yodlang va har kuni oldingilarni takrorlang. Ro‘yxatni mashqlar bilan birga ishlatish yaxshi samara beradi.' }
    ]
  },
  {
    path: '/english/grammar/present-perfect',
    name: 'Present Perfect',
    title: 'Present Perfect: have/has + V3, for va since | EduLevel',
    description: 'Present Perfect zamoni: tajriba, natija va hozirgacha davom etgan davr. Have/has + V3, for va since, been va gone farqi, javobli mashqlar.',
    h1: 'Present Perfect: tajriba, natija va hozirgacha davom etgan davr',
    lead: 'Present Perfect o‘tmishdagi ishni hozirgi vaqt bilan bog‘laydi: ish qachon bo‘lgani emas, hozirgi natijasi yoki tajribasi muhim.',
    updated: D,
    level: 'B1',
    related: [HUB, '/english/grammar/past-simple', '/english/grammar/present-continuous', '/blog/ingliz-tili-zamonlari-qisqacha'],
    sections: [
      {
        heading: 'Shakllanishi',
        paragraphs: ['have / has + fe’lning uchinchi shakli (V3): I have finished, she has finished. Inkor: haven’t / hasn’t + V3. So‘roq: Have you finished? V3 to‘g‘ri fe’llarda -ed (worked), noto‘g‘rilarda alohida (seen, gone, written).']
      },
      {
        heading: 'Qachon ishlatiladi',
        paragraphs: ['Asosiy holatlar:'],
        items: [
          'Hayotiy tajriba: Have you ever visited London? I have never eaten sushi.',
          'Hozirga ta’sir qiladigan natija: I have lost my keys. (Hozir ular yo‘q.)',
          'Yangi tugagan ish: She has just left. They have already finished. Hali tugamagan ish: He hasn’t called yet.',
          'Hozirgacha davom etgan davr: I have lived here for five years. (for = davomiylik, since = boshlanish nuqtasi)'
        ]
      },
      {
        heading: 'Ko‘p uchraydigan xatolar',
        paragraphs: ['Tugagan aniq vaqt bilan Present Perfect ishlatilmaydi: «I have seen him yesterday» emas, I saw him yesterday. For va since farqi: for two hours, for a year; since Monday, since 2020. Been va gone: She has been to Paris (borgan va qaytgan), She has gone to Paris (hozir u yerda yoki yo‘lda).']
      }
    ],
    exercises: [
      { prompt: 'I ___ (live) here since 2020.', answer: 'have lived' },
      { prompt: 'She ___ (already / finish) her homework.', answer: 'has already finished' },
      { prompt: '___ you ever ___ (visit) London?', answer: 'Have / visited' },
      { prompt: 'They ___ (not / see) that movie yet.', answer: 'haven’t seen (have not seen)' },
      { prompt: 'Qaysi biri to‘g‘ri?', options: ['I have seen him yesterday', 'I saw him yesterday'], answer: 'B) I saw him yesterday', explanation: 'Yesterday — tugagan aniq vaqt, shuning uchun Past Simple.' },
      { prompt: 'for yoki since? «two hours», «Monday»', answer: 'two hours → for; Monday → since' }
    ],
    faq: [
      { q: 'Present Perfect da «yesterday» ishlatsam bo‘ladimi?', a: 'Yo‘q. Aniq tugagan vaqt (yesterday, last week, in 2019) bilan Past Simple ishlatiladi.' },
      { q: 'Ever va never qaysi gapda keladi?', a: 'Ever so‘roqda tajriba haqida: Have you ever…? Never inkor ma’noda: I have never been to Japan. Never bilan fe’l inkor shaklda emas, ijobiy shaklda turadi.' }
    ]
  },
  {
    path: '/english/grammar/future-forms',
    name: 'Kelasi zamon shakllari',
    title: 'Will, going to va Present Continuous: kelasi zamon | EduLevel',
    description: 'Ingliz tilida kelajakni ifodalash: will, be going to, Present Continuous va Present Simple. Qachon qaysi biri ishlatilishi va javobli mashqlar.',
    h1: 'Kelajak haqida gapirish: will, going to va boshqalar',
    lead: 'Ingliz tilida kelajak uchun bitta shakl yo‘q. Tanlov gapiruvchining niyatiga, rejasiga va dalilga bog‘liq.',
    updated: D,
    level: 'A2',
    related: [HUB, '/english/grammar/present-continuous', '/english/grammar/conditionals', '/blog/ingliz-tili-zamonlari-qisqacha'],
    sections: [
      {
        heading: 'Will',
        paragraphs: ['Gap paytida qabul qilingan qaror, taxmin va va’da uchun: The phone is ringing. I’ll answer it. I think she will pass the exam. I will help you. Shakli: will + asosiy fe’l (will to emas).']
      },
      {
        heading: 'Be going to',
        paragraphs: ['Oldindan rejalashtirilgan niyat yoki hozirgi dalilga asoslangan taxmin: I’m going to learn French next year. Look at those clouds! It is going to rain.']
      },
      {
        heading: 'Present Continuous va Present Simple',
        paragraphs: ['Present Continuous vaqti va joyi kelishilgan reja uchun: We are meeting at five tomorrow. Present Simple jadval va dastur uchun: The train leaves at 9:15. The lesson starts at ten.']
      }
    ],
    exercises: [
      { prompt: 'The phone is ringing. I ___ (answer) it.', answer: 'will answer / ’ll answer', explanation: 'Gap paytidagi qaror.' },
      { prompt: 'Look at those clouds! It ___ (rain).', answer: 'is going to rain', explanation: 'Hozirgi dalilga asoslangan taxmin.' },
      { prompt: 'We ___ (meet) the teacher at five tomorrow. (kelishilgan)', answer: 'are meeting' },
      { prompt: 'The train ___ (leave) at 9:15. (jadval)', answer: 'leaves' },
      { prompt: 'I think she ___ (pass) the exam.', answer: 'will pass' },
      { prompt: 'Qaysi biri to‘g‘ri?', options: ['I will to call you', 'I will call you'], answer: 'B) I will call you', explanation: 'Will dan keyin to ishlatilmaydi.' }
    ],
    faq: [
      { q: 'Will va going to orasida katta farq bormi?', a: 'Ko‘p holda ikkalasi ham mumkin, lekin gap paytida qabul qilingan qaror uchun will, oldindan rejalashtirilgan ish yoki hozirgi dalil uchun going to tabiiyroq eshitiladi.' },
      { q: 'Nega «I will go» o‘rniga «I go» deyish xato bo‘lishi mumkin?', a: 'Present Simple faqat jadval va dastur uchun ishlaydi. Shaxsiy reja yoki qaror uchun will, going to yoki Present Continuous kerak.' }
    ]
  },
  {
    path: '/english/grammar/conditionals',
    name: 'Conditionals',
    title: 'Conditionals: zero, first, second va third | EduLevel',
    description: 'Shart gaplar: zero, first, second va third conditional, if va unless, were ishlatilishi. Qoidalar, misollar va javobli mashqlar.',
    h1: 'Conditionals: shart gaplarning to‘rt turi',
    lead: 'Shart gap «agar … bo‘lsa, … bo‘ladi» ma’nosini beradi. Ingliz tilida to‘rt asosiy tur bor va ular real yoki xayoliy vaziyatga qarab tanlanadi.',
    updated: D,
    level: 'B1',
    related: [HUB, '/english/grammar/future-forms', '/english/grammar/modal-verbs', '/blog/ingliz-tili-zamonlari-qisqacha'],
    sections: [
      {
        heading: 'To‘rt tur',
        paragraphs: ['Har bir turning shakli va ma’nosi:'],
        items: [
          'Zero: if + Present Simple, Present Simple — umumiy haqiqat. If you heat ice, it melts.',
          'First: if + Present Simple, will + asosiy fe’l — real kelajak. If it rains tomorrow, we will stay at home.',
          'Second: if + Past Simple, would + asosiy fe’l — hozirgi xayoliy yoki real bo‘lmagan holat. If I won the lottery, I would buy a house.',
          'Third: if + Past Perfect, would have + V3 — o‘tmishdagi o‘zgartirib bo‘lmaydigan holat. If she had studied, she would have passed.'
        ]
      },
      {
        heading: 'Muhim eslatmalar',
        paragraphs: ['Second conditional da «to be» ko‘pincha barcha shaxslar uchun were bo‘ladi: If I were you, I would study more. If bilan boshlangan shart qismida will odatda ishlatilmaydi: «If it will rain» emas, If it rains.', 'Unless = if … not: Unless you hurry, you will be late = If you don’t hurry, you will be late.']
      }
    ],
    exercises: [
      { prompt: 'If you heat ice, it ___ (melt).', answer: 'melts', explanation: 'Zero conditional.' },
      { prompt: 'If it rains tomorrow, we ___ (stay) at home.', answer: 'will stay', explanation: 'First conditional.' },
      { prompt: 'If I ___ (be) you, I would study more.', answer: 'were', explanation: 'Second conditional da were ishlatiladi.' },
      { prompt: 'If she had studied, she ___ (pass) the exam.', answer: 'would have passed', explanation: 'Third conditional.' },
      { prompt: 'If I won the lottery, I ___ (buy) a house.', answer: 'would buy', explanation: 'Second conditional.' },
      { prompt: 'Qaysi biri to‘g‘ri?', options: ['If it will rain, we will stay', 'If it rains, we will stay'], answer: 'B) If it rains, we will stay', explanation: 'Shart qismida will ishlatilmaydi.' }
    ],
    faq: [
      { q: 'Second va third conditional farqi nimada?', a: 'Second hozirgi yoki kelajakdagi xayoliy vaziyat haqida (If I had money, I would travel). Third o‘tmishda bo‘lib o‘tgan va o‘zgartirib bo‘lmaydigan vaziyat haqida (If I had had money, I would have travelled).' },
      { q: 'Unless ni qachon ishlataman?', a: 'If … not o‘rniga. Unless dan keyin fe’l ijobiy shaklda keladi: Unless you study, you won’t pass.' }
    ]
  },
  {
    path: '/english/grammar/passive-voice',
    name: 'Passive Voice',
    title: 'Passive Voice: majhul nisbat, qoidalar va mashqlar | EduLevel',
    description: 'Passive Voice (majhul nisbat): be + V3, qachon ishlatiladi, zamonlardagi shakllari, by bilan ijrochi va javobli mashqlar.',
    h1: 'Passive Voice: ish bajaruvchi emas, ish muhim bo‘lganda',
    lead: 'Passive Voice da gapning diqqat markazida ish yoki natija turadi. Ijrochi noma’lum, ahamiyatsiz yoki aytish shart bo‘lmaganda ishlatiladi.',
    updated: D,
    level: 'B1',
    related: [HUB, '/english/grammar/past-simple', '/english/grammar/present-perfect', '/english/grammar/modal-verbs'],
    sections: [
      {
        heading: 'Shakllanishi',
        paragraphs: ['be + fe’lning uchinchi shakli (V3). Zamon be fe’li orqali ko‘rsatiladi:'],
        items: [
          'Present Simple: The house is built. English is spoken in many countries.',
          'Past Simple: The bridge was built in 1990. My bike was stolen.',
          'Present Perfect: The letters have been sent.',
          'Future: The report will be finished by Friday.'
        ]
      },
      {
        heading: 'Faol gapni majhul gapga aylantirish',
        paragraphs: ['Faol gapdagi to‘ldiruvchi majhul gapda ega bo‘ladi: They build the house → The house is built. Kerak bo‘lsa ijrochi by bilan qo‘shiladi: The window was broken by the boy. Ijrochi noma’lum yoki ahamiyatsiz bo‘lsa by ishlatilmaydi.']
      },
      {
        heading: 'Qachon ishlatiladi',
        paragraphs: ['Rasmiy va ilmiy yozuvda (The experiment was repeated twice), yangiliklarda (Two people were injured), ijrochi noma’lum bo‘lganda (My wallet was stolen) va natijani ta’kidlashda.']
      }
    ],
    exercises: [
      { prompt: 'They build the house. → The house ___.', answer: 'is built' },
      { prompt: 'Someone stole my bike. → My bike ___.', answer: 'was stolen' },
      { prompt: 'The report ___ (finish) by Friday. (kelasi zamon)', answer: 'will be finished' },
      { prompt: 'English ___ (speak) in many countries.', answer: 'is spoken' },
      { prompt: 'The letters ___ (already / send).', answer: 'have already been sent' },
      { prompt: 'Qaysi biri to‘g‘ri?', options: ['The window broke by the boy', 'The window was broken by the boy'], answer: 'B) The window was broken by the boy', explanation: 'Majhul nisbat: was + V3.' }
    ],
    faq: [
      { q: 'Passive Voice ni nega o‘rganish kerak?', a: 'Ilmiy matn, yangilik va IELTS Writing Task 1 jarayon tavsiflarida tez-tez uchraydi. Reading va Listening matnlarida ham ko‘p ishlatiladi.' },
      { q: 'Hamma fe’lni majhul nisbatga o‘tkazish mumkinmi?', a: 'Yo‘q. To‘ldiruvchisi bo‘lmagan (o‘timsiz) fe’llar, masalan arrive, sleep, majhul nisbatda ishlatilmaydi.' }
    ]
  },
  {
    path: '/english/grammar/articles',
    name: 'Articles: a, an, the',
    title: 'Articles: a, an, the va artiklsiz holat | EduLevel',
    description: 'Ingliz tilidagi artikllar: a, an, the qachon ishlatiladi, nolinchi artikl, ko‘p uchraydigan xatolar va javobli mashqlar.',
    h1: 'Articles: a, an, the va artikl ishlatilmaydigan holatlar',
    lead: 'O‘zbek tilida artikl yo‘q, shuning uchun ularni to‘g‘ri ishlatish alohida mashq talab qiladi. Asosiy savol: gapda gap aniq, ma’lum narsa haqidami yoki umuman olingan narsa haqidami?',
    updated: D,
    level: 'A2',
    related: [HUB, '/english/grammar/prepositions-time-place', '/english/vocabulary'],
    sections: [
      {
        heading: 'A va an',
        paragraphs: ['Birlik, sanaladigan ot, birinchi marta tilga olinayotganda: I saw a dog. A undosh tovush oldidan, an unli tovush oldidan ishlatiladi. Muhimi — yozuv emas, tovush: a university (/j/ tovushi), an hour (h aytilmaydi), an umbrella.']
      },
      {
        heading: 'The',
        paragraphs: ['Tinglovchi qaysi narsa haqida gap ketayotganini biladigan holatlarda: bir martadan keyin takror tilga olinganda (I saw a dog. The dog was big), yagona narsalarda (the sun, the moon), orttirma darajada (the best player) va the same, the first, the only bilan.']
      },
      {
        heading: 'Artikl ishlatilmaydi',
        paragraphs: ['Umumiy ma’noda ko‘plik va sanalmaydigan otlar bilan: I like music. Dogs are friendly. Ovqat nomlari (have dinner), tillar (speak English), ko‘pchilik davlat va shahar nomlari (Uzbekistan, Tashkent) bilan. Istisnolar: the USA, the UK, the Netherlands.']
      }
    ],
    exercises: [
      { prompt: 'I saw ___ elephant at the zoo.', answer: 'an', explanation: 'Unli tovush oldida an.' },
      { prompt: '___ sun rises in the east.', answer: 'The', explanation: 'Yagona narsa.' },
      { prompt: 'She is ___ university student.', answer: 'a', explanation: 'University /juː/ bilan boshlanadi, shuning uchun a.' },
      { prompt: 'I like ___ music. (umuman)', answer: 'artikl kerak emas' },
      { prompt: 'He is ___ best player in the team.', answer: 'the', explanation: 'Orttirma daraja bilan the.' },
      { prompt: 'We had ___ dinner at eight.', answer: 'artikl kerak emas', explanation: 'Ovqat nomlari odatda artiklsiz.' }
    ],
    faq: [
      { q: 'Nima uchun «an hour», lekin «a university»?', a: 'Artikl yozilishga emas, aytilishga qarab tanlanadi. Hour dagi h aytilmaydi, shuning uchun unli tovush bilan boshlanadi (an). University /j/ tovushi bilan boshlanadi (a).' },
      { q: 'The ni qachon qo‘ymayman?', a: 'Umumiy ma’noda ko‘plik va sanalmaydigan otlar, tillar, ovqat nomlari va ko‘pchilik davlat nomlari bilan artikl ishlatilmaydi.' }
    ]
  },
  {
    path: '/english/grammar/modal-verbs',
    name: 'Modal verbs',
    title: 'Modal verbs: can, must, should, may, might | EduLevel',
    description: 'Modal fe’llar: can, could, must, have to, should, may, might. Qobiliyat, majburiyat, maslahat va ehtimol; mustn’t va don’t have to farqi, mashqlar.',
    h1: 'Modal verbs: can, must, should, may va might',
    lead: 'Modal fe’llar gapga imkoniyat, majburiyat, maslahat yoki ehtimol ma’nosini qo‘shadi. Ulardan keyin fe’lning asosiy shakli keladi, -s va to qo‘shilmaydi.',
    updated: D,
    level: 'A2',
    related: [HUB, '/english/grammar/conditionals', '/english/grammar/passive-voice'],
    sections: [
      {
        heading: 'Asosiy ma’nolar',
        paragraphs: ['Modal fe’llar va ularning odatiy ishlatilishi:'],
        items: [
          'can / could — qobiliyat va ruxsat: She can speak three languages. Could I open the window?',
          'must / have to — majburiyat: You must wear a seatbelt. I have to get up early on weekdays.',
          'should / ought to — maslahat: You should see a doctor.',
          'may / might — ehtimol: It might rain later. She may be at home.',
          'must — kuchli taxmin: He must be tired after such a long trip.'
        ]
      },
      {
        heading: 'Mustn’t va don’t have to',
        paragraphs: ['Bu ikkisi turlicha ma’no beradi. You mustn’t smoke here — taqiqlangan. You don’t have to come early — shart emas, xohlasangiz kelishingiz mumkin.']
      },
      {
        heading: 'Shakl qoidasi',
        paragraphs: ['Modaldan keyin asosiy fe’l: She can sing (can sings emas). Inkor modalga qo‘shiladi: can’t, shouldn’t. So‘roqda modal ega oldiga o‘tadi: Can you help me? Do yordamchi fe’li kerak emas.']
      }
    ],
    exercises: [
      { prompt: 'She ___ speak three languages. (qobiliyat)', answer: 'can' },
      { prompt: 'You ___ smoke here. (taqiqlangan)', answer: 'mustn’t' },
      { prompt: 'You ___ come early; the class starts at ten. (shart emas)', answer: 'don’t have to' },
      { prompt: 'You ___ see a doctor. (maslahat)', answer: 'should' },
      { prompt: 'Take an umbrella. It ___ rain later. (ehtimol)', answer: 'might / may' },
      { prompt: 'Qaysi biri to‘g‘ri?', options: ['She can sings', 'She can sing'], answer: 'B) She can sing', explanation: 'Modaldan keyin asosiy fe’l, -s siz.' }
    ],
    faq: [
      { q: 'Must va have to bir xilmi?', a: 'Ko‘p holda ha, lekin must ko‘pincha gapiruvchining o‘z fikri, have to esa tashqi qoida yoki zaruriyat. Inkorda ma’nolari butunlay farq qiladi: mustn’t — mumkin emas, don’t have to — shart emas.' },
      { q: 'Could va can orasidagi farq?', a: 'Can hozirgi qobiliyat va ruxsat; could o‘tgan zamondagi qobiliyat yoki muloyimroq so‘rov: Could you help me?' }
    ]
  },
  {
    path: '/english/grammar/prepositions-time-place',
    name: 'Prepositions of time and place',
    title: 'Prepositions: at, in, on (vaqt va joy) | EduLevel',
    description: 'Vaqt va joy predloglari at, in, on: qoidalar, misollar, ko‘p uchraydigan xatolar va javobli mashqlar.',
    h1: 'Prepositions of time and place: at, in, on',
    lead: 'At, in va on — ingliz tilidagi eng ko‘p ishlatiladigan predloglar. Ularni «nuqta — ichki — yuza» tamoyili bo‘yicha eslab qolish qulay.',
    updated: D,
    level: 'A2',
    related: [HUB, '/english/grammar/articles', '/english/vocabulary'],
    sections: [
      {
        heading: 'Vaqt uchun',
        paragraphs: ['Uchala predlog vaqtni ham ifodalaydi:'],
        items: [
          'at — aniq vaqt: at 9 o’clock, at noon, at night, at the weekend.',
          'on — kunlar va sanalar: on Monday, on 5 May, on my birthday.',
          'in — oy, yil, fasl, kunning qismi: in March, in 2024, in winter, in the morning.'
        ]
      },
      {
        heading: 'Joy uchun',
        paragraphs: ['at — nuqta: at the bus stop, at school, at the door. in — ichkarida yoki shahar, mamlakat: in the room, in Tashkent, in Uzbekistan. on — yuzada yoki qavatda: on the table, on the wall, on the second floor.']
      },
      {
        heading: 'Xatolardan saqlaning',
        paragraphs: ['«On the morning» emas, in the morning, lekin on Monday morning. «In Monday» emas, on Monday. Yodlash uchun tayyor birikmalarni o‘rganing: at home, at work, in bed, on time (vaqtida), in time (ulgurib).']
      }
    ],
    exercises: [
      { prompt: 'The lesson starts ___ 9 o’clock.', answer: 'at' },
      { prompt: 'My birthday is ___ March.', answer: 'in' },
      { prompt: 'We meet ___ Friday.', answer: 'on' },
      { prompt: 'She lives ___ Tashkent.', answer: 'in' },
      { prompt: 'The book is ___ the table.', answer: 'on' },
      { prompt: 'He studies ___ the morning, but ___ Monday morning he works.', answer: 'in / on' }
    ],
    faq: [
      { q: 'Nega «at night», lekin «in the morning»?', a: 'Bu o‘rnashgan birikmalar. Ularni qoidasiz, tayyor ibora sifatida yodlash kerak: at night, at noon, in the morning, in the afternoon, in the evening.' },
      { q: 'On time va in time farqi nima?', a: 'On time — aniq belgilangan vaqtda (poyezd kech qolmadi). In time — kech qolmasdan, ulgurib (uyga yomg‘ir boshlanishidan oldin yetib keldim).' }
    ]
  }
];
