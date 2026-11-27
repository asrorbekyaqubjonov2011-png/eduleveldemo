/**
 * Deeper content for the core pages: extra sections, practice questions with answers and real FAQ. Merged into the base
 * pages by path (see pages.ts). The public structure of IELTS (parts, timing, band scale, marking criteria) is the
 * published one; where a rule belongs to an exam body (Multilevel, university requirements) the text sends the reader
 * to that body instead of guessing. Practice passages and scripts are original.
 */
import type { EduExercise, EduFaq, EduSection } from '@/src/components/seo/EduPage';

export interface Enrichment {
  sections?: EduSection[];
  faq?: EduFaq[];
  exercises?: EduExercise[];
  relatedAdd?: string[];
  level?: string;
}

export const UPDATED = '2026-11-25';

export const ENRICHMENTS: Record<string, Enrichment> = {
  '/ielts': {
    sections: [
      {
        heading: 'Tayyorgarlik bosqichlari',
        paragraphs: ['Ko‘p o‘quvchilar to‘g‘ridan-to‘g‘ri test yechishdan boshlaydi, ammo reja bilan ishlash tezroq natija beradi.'],
        items: [
          'Darajangizni aniqlang: qisqa daraja testi sizga qaysi moduldan boshlash kerakligini ko‘rsatadi.',
          'Eng zaif modulni toping va unga ko‘proq vaqt ajrating.',
          'Haftalik reja tuzing: har modulga kamida bir marta va grammatika hamda lug‘atga kunlik qisqa mashq.',
          'Haqiqiy vaqt bilan mock test yeching va natijani taxminiy deb qabul qiling.',
          'Xatolarni turlarga ajrating: bilimsizlik, e’tiborsizlik, vaqt yetmasligi.'
        ]
      },
      {
        heading: 'Academic va General Training',
        paragraphs: ['IELTS ning ikki turi bor. Listening va Speaking ikkalasida bir xil. Reading va Writing farq qiladi: Academic da matnlar akademik mavzuda va Writing Task 1 grafik yoki diagramma tavsifi; General Training da matnlar kundalik va ish mavzularida va Task 1 xat yozish. Qaysi tur kerakligini universitet yoki qabul qiluvchi tashkilot belgilaydi, shuning uchun ro‘yxatdan o‘tishdan oldin ularning talabini tekshiring.']
      }
    ],
    faq: [
      { q: 'IELTS necha ballgacha baholanadi?', a: 'Har modul 0 dan 9 gacha, yarim ball (0,5) aniqligida baholanadi. Umumiy ball to‘rt modul o‘rtachasiga asoslanadi.' },
      { q: 'IELTS natijasi qancha vaqt amal qiladi?', a: 'Odatda 2 yil deb hisoblanadi, ammo aniq muddatni natijani qabul qiluvchi tashkilotdan tekshiring.' },
      { q: 'Kompyuterda va qog‘ozda topshirishning farqi bormi?', a: 'Test mazmuni va baholash mezonlari bir xil, faqat topshirish usuli farq qiladi. Qaysi format mavjudligi test markaziga bog‘liq.' },
      { q: 'IELTS ga tayyorlanish qancha vaqt oladi?', a: 'Bu boshlang‘ich darajangiz va maqsad ballga bog‘liq. Aniq muddat va’da qilib bo‘lmaydi; darajangizni test qilib, haftalik rejani natijaga qarab moslang.' }
    ],
    relatedAdd: ['/study-plan/ielts-8-week', '/cefr/b2', '/ielts/band-score']
  },
  '/ielts/listening': {
    sections: [
      {
        heading: 'Eshitishdagi tuzoqlar',
        paragraphs: ['IELTS Listening da to‘g‘ri javob ko‘pincha dastlab aytilgan variant emas. Gapiruvchi fikrini o‘zgartirishi yoki o‘zini tuzatishi mumkin. Eng ko‘p uchraydigan tuzoqlar:'],
        items: ['Gapiruvchi o‘zini tuzatadi: «six, no sorry, half past seven».', 'O‘xshash raqamlar: thirteen va thirty, fifteen va fifty.', 'Ismlar va manzillar harfma-harf aytiladi: imloga e’tibor bering.', 'Savolda bir so‘z, audioda sinonim ishlatiladi.']
      },
      {
        heading: 'Mashq usullari',
        paragraphs: ['Audio boshlanmasdan oldin savollarni o‘qib, kalit so‘zlarni belgilang. Dictation (eshitib yozish) va shadowing (diktor ortidan takrorlash) eshitish diqqatini oshiradi. Xatolarni transkript bilan solishtirib, qaysi tovush yoki so‘zni eshitmaganingizni aniqlang.']
      }
    ],
    exercises: [
      { prompt: 'Transkript: «We were going to meet at six, but the train is late, so let’s make it half past seven.» Ular soat nechada uchrashadi?', options: ['6:00', '6:30', '7:30'], answer: 'C) 7:30', explanation: 'Gapiruvchi rejani o‘zgartirdi: oxirgi variant to‘g‘ri.' },
      { prompt: 'Transkript: «The ticket costs thirty pounds, not thirteen as it says on the website.» Chipta narxi qancha?', options: ['£13', '£30', '£3'], answer: 'B) £30', explanation: 'Thirty va thirteen: urg‘u va oxirgi tuzatishga e’tibor bering.' },
      { prompt: 'Transkript: «My surname is Karimov — that’s K-A-R-I-M-O-V.» Familiyaning to‘g‘ri yozilishi qaysi?', options: ['Karimof', 'Karimov', 'Karimow'], answer: 'B) Karimov', explanation: 'Harflar aytilganda javobni aynan shunday yozing.' }
    ],
    faq: [
      { q: 'Listening audio necha marta eshittiriladi?', a: 'Har bir audio faqat bir marta eshittiriladi, shuning uchun savollarni oldindan o‘qish muhim.' },
      { q: 'Imlo xatosi ball kamaytiradimi?', a: 'Ha, javobning imlosi to‘g‘ri bo‘lishi kerak. Birlik va ko‘plik shaklini ham tekshiring.' },
      { q: 'Test qancha davom etadi?', a: 'Listening modulida 4 qism va 40 ta savol bor; audio taxminan 30 daqiqa davom etadi, qog‘ozdagi testda javoblarni ko‘chirish uchun qo‘shimcha vaqt beriladi.' }
    ],
    relatedAdd: ['/ielts/listening/form-and-map-completion']
  },
  '/ielts/reading': {
    sections: [
      {
        heading: 'Savol turlari va vaqt',
        paragraphs: ['Reading moduli 60 daqiqa, 3 matn va 40 ta savoldan iborat. Taxminan har matnga 20 daqiqa ajrating. Savol turlari: True / False / Not Given, sarlavhalarni moslashtirish, ko‘p variantli savol, gapni to‘ldirish va ma’lumotni moslashtirish.']
      },
      {
        heading: 'True, False va Not Given qoidasi',
        paragraphs: ['True — matn gapni tasdiqlaydi. False — matn gapning aksini aytadi. Not Given — matnda bu haqda hech narsa yo‘q: ma’lumotni o‘zingizning bilimingizga tayanib to‘ldirmang.', 'Mini mashq uchun matn: «The city library opens at 9 a.m. on weekdays and closes at 6 p.m. On Saturdays it is open only in the morning. Members can borrow up to five books at a time, for three weeks. Children under twelve must be accompanied by an adult.»']
      }
    ],
    exercises: [
      { prompt: 'Kutubxona shanba kuni kun bo‘yi ochiq. (True / False / Not Given)', answer: 'False', explanation: 'Shanba kuni faqat ertalab ochiq.' },
      { prompt: 'A’zo bir vaqtda oltita kitob olishi mumkin.', answer: 'False', explanation: 'Eng ko‘pi bilan beshta.' },
      { prompt: 'Kutubxonada kafe bor.', answer: 'Not Given', explanation: 'Matnda kafe haqida hech narsa yo‘q.' },
      { prompt: 'O‘n yoshli bola kutubxonaga yolg‘iz kira oladi.', answer: 'False', explanation: 'O‘n ikki yoshgacha bolalar kattalar bilan bo‘lishi kerak.' },
      { prompt: 'Kitoblar uch haftaga beriladi.', answer: 'True' }
    ],
    faq: [
      { q: 'Reading da vaqt yetmasa nima qilish kerak?', a: 'Har savolga qaytib kelish mumkin: qiyin savolni belgilab, keyingisiga o‘ting. Barcha savolga javob yozing, bo‘sh qoldirmang.' },
      { q: 'Academic va General Training Reading farqi?', a: 'Academic da matnlar akademik mavzuda, General Training da kundalik va ish mavzularida. Savol turlari o‘xshash.' }
    ],
    relatedAdd: ['/ielts/reading/true-false-not-given']
  },
  '/ielts/writing': {
    sections: [
      {
        heading: 'To‘rt baholash mezoni',
        paragraphs: ['Writing javobi to‘rt mezon bo‘yicha baholanadi: topshiriqqa javob (Task Achievement yoki Task Response), izchillik va bog‘lanish (Coherence and Cohesion), lug‘at boyligi (Lexical Resource) hamda grammatik xilma-xillik va aniqlik (Grammatical Range and Accuracy). Task 2 bahosi umumiy Writing bahosida Task 1 ga qaraganda ko‘proq hisobga olinadi.']
      },
      {
        heading: 'Task 2 inshosining tuzilishi',
        items: ['Kirish: savolni o‘z so‘zingiz bilan qayta ifodalang va fikringizni (thesis) ayting.', 'Asosiy qism 1: bitta aniq g‘oya, uning tushuntirishi va misol.', 'Asosiy qism 2: ikkinchi g‘oya yoki qarama-qarshi nuqtai nazar.', 'Xulosa: fikringizni qisqa takrorlang, yangi g‘oya qo‘shmang.'],
        paragraphs: ['Kamida 250 so‘z yozing; juda uzun matn ham xato ehtimolini oshiradi.']
      }
    ],
    exercises: [
      { prompt: 'Savol: «Some people think children should start school early. Others think they should start later. Discuss both views and give your opinion.» Bu qaysi tur?', answer: 'Discussion essay (ikkala fikrni muhokama qilib, o‘z fikrini bildirish).' },
      { prompt: 'Savol: «To what extent do you agree or disagree that technology makes people less social?» Bu qaysi tur?', answer: 'Opinion essay (roziman / rozi emasman, qay darajada).' },
      { prompt: 'Savol: «Many cities have traffic problems. What are the causes and what can be done?» Bu qaysi tur?', answer: 'Problem–solution essay (sabablar va yechimlar).' },
      { prompt: 'Qaysi kirish yaxshiroq? A) «Today I will write about education.» B) «Opinions differ on whether children benefit from beginning school at an early age.»', answer: 'B', explanation: 'B savolni o‘z so‘zi bilan qayta ifodalaydi, A esa umumiy va bo‘sh.' }
    ],
    faq: [
      { q: 'Task 1 va Task 2 uchun nechta so‘z kerak?', a: 'Task 1 uchun kamida 150, Task 2 uchun kamida 250 so‘z. Writing moduli jami 60 daqiqa davom etadi.' },
      { q: 'Tayyor shablonni yodlab ishlatish mumkinmi?', a: 'Tuzilma shablonidan foydalanish mumkin, ammo mavzuga bog‘liq bo‘lmagan yodlangan jumlalar ball kamayishiga olib kelishi mumkin. Har insho savolga aynan javob berishi kerak.' }
    ],
    relatedAdd: ['/ielts/writing/task-1-graphs', '/ielts/writing/task-2-opinion-essay']
  },
  '/ielts/speaking': {
    sections: [
      {
        heading: 'Uch qism',
        paragraphs: ['Speaking moduli taxminan 11–14 daqiqa davom etadi va yozib olinadi. 1-qism: tanishuv va kundalik mavzularda qisqa savollar (4–5 daqiqa). 2-qism: kartochkadagi mavzu bo‘yicha bir daqiqa tayyorlanib, 1–2 daqiqa gapirish. 3-qism: shu mavzu bo‘yicha chuqurroq muhokama (4–5 daqiqa).']
      },
      {
        heading: 'Javobni rivojlantirish',
        paragraphs: ['Qisqa «ha» yoki «yo‘q» yetarli emas. Tabiiy javob uch qismdan iborat: javob, sabab va misol. Masalan, «Do you enjoy cooking?» savoliga: «Yes, quite a lot, mainly because it helps me relax after studying, and I like trying new recipes.»']
      }
    ],
    exercises: [
      { prompt: '«Do you enjoy cooking?» Qaysi javob yaxshiroq rivojlangan? A) «Yes.» B) «Yes, quite a lot, mainly because it helps me relax after studying.»', answer: 'B', explanation: 'B javob, sabab va tafsilot beradi.' },
      { prompt: 'Kartochkada: «Describe a book you enjoyed reading.» Bu Speaking ning qaysi qismi?', answer: '2-qism (uzoq javob)' },
      { prompt: '«Why do you think people read less today than before?» Bu qaysi qism savoli?', answer: '3-qism (mavhum muhokama)' }
    ],
    faq: [
      { q: 'Speaking kim bilan topshiriladi?', a: 'Imtihonchi bilan yuzma-yuz (yoki video orqali) suhbat; barcha suhbat yozib olinadi.' },
      { q: 'To‘xtab qolsam nima qilish kerak?', a: 'Bir necha soniya o‘ylash normal. «That’s an interesting question» yoki «Let me think» kabi iboralar bilan vaqt oling va fikringizni davom ettiring.' }
    ],
    relatedAdd: ['/ielts/speaking/part-1-questions', '/ielts/speaking/part-2-cue-card', '/ielts/speaking/part-3-discussion']
  },
  '/ielts/mock-test': {
    sections: [
      {
        heading: 'Mock testni to‘g‘ri ishlatish',
        paragraphs: ['Mock testning foydasi uni qanday yechishingizga bog‘liq.'],
        items: ['Bir o‘tirishda va haqiqiy vaqt chegarasi bilan yeching.', 'Telefon va lug‘atdan foydalanmang.', 'Natijani taxminiy ko‘rsatkich deb qabul qiling: haqiqiy imtihon ballidan farq qilishi mumkin.', 'Har bir xatoni turiga qarab yozing va keyingi mashqni shunga moslang.']
      }
    ],
    faq: [
      { q: 'Mock test natijasi haqiqiy balli bilan bir xil bo‘ladimi?', a: 'Yo‘q. Mock test taxminiy ko‘rsatkich beradi. Real ball imtihon sharoiti, vazifalar va baholovchilarga bog‘liq.' },
      { q: 'Writing va Speaking ni AI qanday baholaydi?', a: 'AI bahosi mezonlarga asoslangan taxminiy fikr-mulohaza, rasmiy imtihon bahosi emas. Yakuniy qarorni imtihonchi chiqaradi.' }
    ]
  },
  '/ielts/band-score': {
    sections: [
      {
        heading: 'Umumiy ball qanday hisoblanadi',
        paragraphs: ['Umumiy ball to‘rt modul ballarining o‘rtachasi. O‘rtacha .25 ga teng bo‘lsa yarim ballga, .75 ga teng bo‘lsa butun ballga yuqoriga yaxlitlanadi. Masalan, o‘rtacha 6,25 bo‘lsa 6,5 ga, 6,75 bo‘lsa 7,0 ga aylanadi; 6,125 esa 6,0 ga tushadi.']
      }
    ],
    exercises: [
      { prompt: 'Listening 7,0; Reading 6,5; Writing 6,0; Speaking 6,5. Umumiy ball?', answer: '6,5', explanation: '(7,0 + 6,5 + 6,0 + 6,5) / 4 = 6,5.' },
      { prompt: 'Listening 6,5; Reading 6,5; Writing 6,0; Speaking 6,0. Umumiy ball?', answer: '6,5', explanation: 'O‘rtacha 6,25: yarim ballga yuqoriga yaxlitlanadi.' },
      { prompt: 'Listening 5,5; Reading 6,0; Writing 6,0; Speaking 6,0. Umumiy ball?', answer: '6,0', explanation: 'O‘rtacha 5,875: butun ballga yaxlitlanadi.' },
      { prompt: 'Listening 7,0; Reading 7,0; Writing 6,0; Speaking 6,5. Umumiy ball?', answer: '6,5', explanation: 'O‘rtacha 6,625: .25 va .75 oralig‘ida yarim ballga.' }
    ],
    faq: [
      { q: 'Modullardan birining bahosi past bo‘lsa nima bo‘ladi?', a: 'Umumiy ball o‘rtacha bo‘lgani uchun bitta modul boshqalarini qoplashi mumkin. Lekin ayrim tashkilotlar har moduldan minimal ball talab qiladi: talabni tekshiring.' },
      { q: 'Band ballni CEFR bilan solishtirish mumkinmi?', a: 'Umumiy qabul qilingan taqqoslash bor (masalan IELTS 5,5–6,5 taxminan B2), lekin rasmiy tenglik emas. Aniq talabni qabul qiluvchi tashkilotdan tekshiring.' }
    ],
    relatedAdd: ['/cefr/b1', '/cefr/b2', '/cefr/c1']
  },
  '/cefr/mock-test': {
    sections: [
      {
        heading: 'Natijani qanday o‘qish kerak',
        paragraphs: ['Mock test natijasi darajangizning taxminiy ko‘rsatkichi. Agar ball ikki daraja chegarasida bo‘lsa, past darajadagi mavzularni mustahkamlang. Natijani vaqti-vaqti bilan takrorlab, o‘sishni kuzating, bitta natijaga qarab xulosa chiqarmang.']
      }
    ],
    faq: [
      { q: 'CEFR mock test haqiqiy imtihon o‘rnini bosadimi?', a: 'Yo‘q. U tayyorgarlik uchun taxminiy baho beradi; rasmiy sertifikatni faqat vakolatli tashkilot beradi.' },
      { q: 'Qaysi darajadan boshlashim kerak?', a: 'Avval daraja aniqlash testidan o‘ting, so‘ng natijangizga mos darajadagi mashqlardan boshlang.' }
    ],
    relatedAdd: ['/cefr/a1', '/cefr/a2', '/cefr/b1', '/cefr/b2', '/cefr/c1', '/cefr/c2']
  },
  '/multilevel': {
    sections: [
      {
        heading: 'Tayyorlanishdan oldin nimani tekshirish kerak',
        paragraphs: ['Multilevel — ingliz tili darajasini aniqlaydigan imtihon. Uning rasmiy tuzilmasi, modullar, ballar jadvali va natija amal qilish muddati imtihon tashkilotining e’lonlarida belgilanadi va o‘zgarishi mumkin. Shuning uchun tayyorlanishni boshlashdan oldin tashkilotning joriy rasmiy ma’lumotlarini tekshiring va EduLevel dagi mashqlarni umumiy ko‘nikmalarni mustahkamlash uchun ishlating.']
      }
    ],
    faq: [
      { q: 'EduLevel Multilevel sertifikatini beradimi?', a: 'Yo‘q. EduLevel tayyorgarlik materiallari va mashq beradi; rasmiy sertifikatni vakolatli tashkilot beradi.' },
      { q: 'Multilevel ga qanday tayyorlanish kerak?', a: 'Avval darajangizni aniqlang, so‘ng to‘rt ko‘nikma (Listening, Reading, Writing, Speaking) bo‘yicha muntazam mashq qiling va rasmiy namunalar bilan tanishing.' }
    ],
    relatedAdd: ['/multilevel/tayyorgarlik-rejasi', '/multilevel/speaking-javoblari', '/milliy-sertifikat/tayyorgarlik', '/cefr/b1', '/cefr/b2', '/cefr/c1']
  },
  '/english/grammar': {
    sections: [
      {
        heading: 'Qaysi tartibda o‘rganish kerak',
        paragraphs: ['Zamonlarni tartib bilan o‘rganing: Present Simple, Present Continuous, Past Simple, kelasi zamon shakllari, Present Perfect. Modal fe’llar, artikllar va predloglar bilan parallel ishlang. Shart gaplar va majhul nisbatni zamonlarni bilganingizdan keyin boshlang. Har mavzudan keyin mashqlar bajaring va xatolaringizni yozib boring.']
      }
    ],
    faq: [
      { q: 'Grammatikani qoidalarni yodlab o‘rgansam bo‘ladimi?', a: 'Qoida kerak, lekin faqat qoida yetarli emas. Har qoidani misol va mashq bilan mustahkamlang va gap tuzib ko‘ring.' },
      { q: 'Qaysi mavzudan boshlash kerak?', a: 'Darajangizni aniqlang. Boshlang‘ich bo‘lsangiz Present Simple dan, A2–B1 bo‘lsangiz Past Simple va Present Perfect dan boshlang.' }
    ],
    relatedAdd: ['/english/grammar/adjectives-adverbs', '/english/grammar/subject-verb-agreement', '/english/grammar/present-perfect-continuous', '/english/grammar/second-third-conditional', '/english/grammar/countable-uncountable-nouns', 
      '/english/grammar/present-simple', '/english/grammar/present-continuous', '/english/grammar/past-simple', '/english/grammar/present-perfect',
      '/english/grammar/future-forms', '/english/grammar/conditionals', '/english/grammar/passive-voice', '/english/grammar/articles',
      '/english/grammar/modal-verbs', '/english/grammar/prepositions-time-place',
      '/english/grammar/comparatives-superlatives', '/english/grammar/past-continuous', '/english/grammar/past-perfect', '/english/grammar/reported-speech',
      '/english/grammar/relative-clauses', '/english/grammar/gerunds-infinitives', '/english/grammar/quantifiers', '/english/grammar/question-forms',
      '/english/grammar/phrasal-verbs', '/english/grammar/linking-words'
    ]
  },
  '/english/vocabulary': {
    sections: [
      {
        heading: 'So‘zlarni yodlash usullari',
        paragraphs: ['Ro‘yxatni yodlash kam samara beradi. Samaraliroq usullar:'],
        items: ['So‘zni gap ichida o‘rganing, yakka emas.', 'Kollokatsiyalarni birga yodlang: make a decision, take a photo.', 'So‘z oilasini o‘rganing: decide, decision, decisive.', 'Oraliqli takrorlash: bir kundan, bir haftadan va bir oydan keyin qaytaring.']
      }
    ],
    exercises: [
      { prompt: 'To‘g‘ri kollokatsiyani tanlang: a ___ mistake', options: ['do', 'make', 'take'], answer: 'B) make', explanation: 'make a mistake — qat’iy birikma.' },
      { prompt: 'To‘g‘ri kollokatsiyani tanlang: ___ homework', options: ['do', 'make', 'have'], answer: 'A) do', explanation: 'do homework.' },
      { prompt: 'To‘g‘ri kollokatsiyani tanlang: ___ a photo', options: ['do', 'take', 'make'], answer: 'B) take', explanation: 'take a photo.' },
      { prompt: 'To‘g‘ri kollokatsiyani tanlang: ___ a cold', options: ['catch', 'do', 'take'], answer: 'A) catch', explanation: 'catch a cold.' },
      { prompt: 'So‘z oilasi: decide (fe’l) — ___ (ot)', answer: 'decision' }
    ],
    faq: [
      { q: 'Kuniga nechta so‘z yodlash kerak?', a: 'Soni emas, takrorlash sifati muhim. Kuniga 5–10 ta so‘zni gap ichida o‘rganib, avvalgilarini takrorlash ko‘pchilik uchun real va barqaror.' },
      { q: 'So‘zni qanday yaxshi eslab qolaman?', a: 'O‘zingiz haqingizda gap tuzing, kollokatsiya bilan yozing va oraliqli takrorlang.' }
    ],
    relatedAdd: ['/english/vocabulary/everyday-collocations', '/english/vocabulary/city-housing', '/english/vocabulary/weather-seasons', '/english/vocabulary/emotions-personality', '/english/vocabulary/media-news', '/english/vocabulary/academic-word-list', 
      '/english/vocabulary/family-relationships', '/english/vocabulary/education', '/english/vocabulary/health', '/english/vocabulary/travel',
      '/english/vocabulary/work-careers', '/english/vocabulary/environment', '/english/vocabulary/technology', '/english/vocabulary/food-cooking',
      '/english/vocabulary/shopping-money', '/english/vocabulary/hobbies-free-time'
    ]
  },
  '/english/speaking': {
    sections: [
      {
        heading: 'Ravonlik uchun bog‘lovchilar',
        paragraphs: ['Fikrni mantiqiy bog‘lash ravonlikni oshiradi: because (chunki), so (shuning uchun), however (biroq), although (garchi), for example (masalan), on the other hand (boshqa tomondan). Ularni har kuni 1–2 daqiqalik monologda ishlatib ko‘ring.']
      }
    ],
    exercises: [
      { prompt: 'I like cooking, ___ I don’t have much time.', options: ['because', 'but', 'so'], answer: 'B) but', explanation: 'Qarama-qarshilik: but.' },
      { prompt: 'It was raining, ___ we stayed at home.', options: ['so', 'although', 'but'], answer: 'A) so', explanation: 'Natija: so.' },
      { prompt: '___ it was cold, we went for a walk.', options: ['Because', 'Although', 'So'], answer: 'B) Although', explanation: 'Garchi: although.' }
    ],
    faq: [
      { q: 'Yolg‘iz qanday gapirishni mashq qilsam bo‘ladi?', a: 'Kunlik mavzu tanlab, 1–2 daqiqa to‘xtamasdan gapiring, ovozingizni yozing va eshiting. EduBek AI bilan ham suhbat mashqi qilishingiz mumkin.' },
      { q: 'Talaffuzim yomon bo‘lsa nima qilish kerak?', a: 'Diktor ortidan takrorlash (shadowing) va o‘z ovozingizni yozib solishtirish yordam beradi. Mukammal aksent emas, tushunarlilik muhim.' }
    ]
  },
  '/english/level-test': {
    sections: [
      {
        heading: 'Test natijasi nimani anglatadi',
        paragraphs: ['Daraja testi umumiy tasavvur beradi, aniq sertifikat emas. Natija ikki daraja chegarasida bo‘lsa, pastroq darajaning mavzularini mustahkamlang. Testni 1–2 oyda bir marta qaytarib, o‘sishni kuzating.']
      },
      {
        heading: 'Levelni aniqlash bo‘limi',
        paragraphs: ['EduLevel dagi «Levelni aniqlash» bo‘limida ustoz e’lon qilgan testlar bor. Ba’zi testlar kod bilan ochiladi va vaqti cheklangan; test to‘liq ekranda o‘tadi. Sahifani tark etish yoki to‘liq ekrandan chiqish qoidabuzarlik hisoblanadi va belgilangan chegaradan keyin urinish bloklanadi; bloklangan o‘quvchiga ustoz yangi kod berishi mumkin.']
      }
    ],
    faq: [
      { q: 'Daraja testi qancha vaqt oladi?', a: 'Har testning vaqti ustoz tomonidan belgilanadi va test boshida ko‘rsatiladi.' },
      { q: 'Test paytida boshqa oynaga o‘tsam nima bo‘ladi?', a: 'Bu ogohlantirish beradi. Qoidabuzarliklar chegaradan oshsa, urinish bloklanadi va davom ettirish uchun ustozning kodi kerak bo‘ladi.' }
    ],
    relatedAdd: ['/cefr/a1', '/cefr/a2', '/cefr/b1', '/cefr/b2', '/cefr/c1', '/cefr/c2']
  },
  '/edubek-ai': {
    sections: [
      {
        heading: 'EduBek nimalarga yordam beradi',
        paragraphs: ['EduBek — EduLevel dagi AI yordamchi. U ingliz tilini o‘rganishga oid savollarga javob beradi: grammatikani tushuntiradi, so‘zlarning ma’nosini izohlaydi, yozgan matningizdagi xatolarni ko‘rsatadi va suhbat mashqini o‘tkazadi.']
      },
      {
        heading: 'Cheklovlar va xavfsizlik',
        paragraphs: ['AI javoblari xato bo‘lishi mumkin: muhim ma’lumotni darslik yoki ustoz bilan tekshiring. EduBek ingliz tilini o‘rganishga oid mavzularda javob beradi. Suhbatda sizga ism bilan murojaat qilish uchun ismingiz (familiyasiz) so‘rovga qo‘shiladi; telefon raqamingiz va e-mailingiz AI ga yuborilmaydi. Batafsil ma’lumot maxfiylik siyosatida.']
      }
    ],
    faq: [
      { q: 'EduBek ingliz tilidan boshqa savollarga javob beradimi?', a: 'EduBek ingliz tilini o‘rganishga oid savollarga yo‘naltirilgan. Boshqa mavzularda javob berishdan bosh tortishi mumkin.' },
      { q: 'EduBek baholagan Writing bahosi rasmiymi?', a: 'Yo‘q. Bu mezonlarga asoslangan taxminiy fikr-mulohaza. Rasmiy bahoni imtihon beradi.' },
      { q: 'EduBek bilan gaplashish mumkinmi?', a: 'Ha, ovozli suhbat rejimi mavjud. U mikrofon ruxsatini talab qiladi; ruxsatni brauzer sozlamalarida boshqarasiz.' }
    ]
  },
  '/about': {
    sections: [
      {
        heading: 'Platforma nimalarni taklif qiladi',
        paragraphs: ['EduLevel da o‘quvchi quyidagi imkoniyatlardan foydalanadi:'],
        items: [
          'Video va matnli darslar, vazifalar va dars bo‘yicha progress kuzatuvi.',
          'Reading, Listening, Speaking va Writing bo‘yicha Mashqlar bo‘limi.',
          'IELTS va CEFR formatidagi mock testlar hamda daraja aniqlash testlari.',
          'EduBek AI: ingliz tilini o‘rganishga oid savollarga javob beradigan yordamchi.',
          'Elektron kitoblar kutubxonasi va Telegram bot orqali yangiliklar.'
        ]
      },
      {
        heading: 'Kontent qanday tayyorlanadi',
        paragraphs: ['Darslar va testlar ustoz tomonidan tayyorlanadi yoki tasdiqlanadi. AI yordamida yozilgan savollar ustoz ko‘rib chiqib tasdiqlagandan keyingina o‘quvchilarga chiqadi. AI baholari esa taxminiy fikr-mulohaza bo‘lib, rasmiy imtihon natijasi emas.']
      }
    ],
    faq: [
      { q: 'EduLevel kimlar uchun?', a: 'Ingliz tilini noldan o‘rganmoqchi bo‘lganlar, IELTS va CEFR ga tayyorlanayotganlar hamda darajasini bilmoqchi bo‘lganlar uchun.' },
      { q: 'EduLevel rasmiy sertifikat beradimi?', a: 'Yo‘q. EduLevel tayyorgarlik uchun darslar va mashqlar beradi. IELTS yoki CEFR sertifikatini vakolatli imtihon tashkilotlari beradi.' }
    ]
  },
  '/editorial-policy': {
    sections: [
      {
        heading: 'Tekshiruv va yangilash',
        paragraphs: ['Sahifalardagi misollar va javoblar nashrdan oldin tekshiriladi. Imtihon tuzilmasi bilan bog‘liq ma’lumotlar rasmiy e’lonlarga mos bo‘lishi kerak; farq aniqlansa, matn yangilanadi. Har sahifada oxirgi yangilanish sanasi ko‘rsatiladi.']
      },
      {
        heading: 'Xato topsangiz',
        paragraphs: ['Matnda yoki mashq javobida xato topsangiz, aloqa sahifasi orqali yozing. To‘g‘rilash ustoz tomonidan ko‘rib chiqiladi.']
      }
    ]
  },
};
