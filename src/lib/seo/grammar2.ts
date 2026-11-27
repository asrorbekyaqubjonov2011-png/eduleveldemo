/**
 * Grammar guides, second batch. Same standards as grammar.ts: original Uzbek text, rules and forms, typical mistakes,
 * practice with answers shown on the page, real learner questions. Every example and answer was checked by hand.
 */
import type { SeoPage } from './pages';

const D = '2026-11-25';
const HUB = '/english/grammar';

export const GRAMMAR_PAGES_2: SeoPage[] = [
  {
    path: '/english/grammar/comparatives-superlatives',
    name: 'Comparatives va superlatives',
    title: 'Comparatives va superlatives: qiyoslash darajalari | EduLevel',
    description: 'Sifatning qiyosiy va orttirma darajasi: -er/-est, more/most, noto‘g‘ri shakllar (good–better–best), as…as va than, mashqlar.',
    h1: 'Comparatives va superlatives: narsalarni qiyoslash',
    lead: 'Ikki narsani qiyoslash uchun comparative, ko‘pchilik ichida eng yuqori darajani ko‘rsatish uchun superlative ishlatiladi.',
    updated: D,
    level: 'A2',
    related: [HUB, '/english/grammar/articles', '/english/vocabulary', '/cefr/a2'],
    sections: [
      {
        heading: 'Qisqa sifatlar: -er va -est',
        paragraphs: ['Bir bo‘g‘inli sifatlarga -er va -est qo‘shiladi: tall → taller → the tallest. E bilan tugasa faqat -r/-st: large → larger → the largest. Qisqa unli + undosh bo‘lsa undosh ikkilanadi: big → bigger → the biggest. Undosh + y bo‘lsa y o‘rniga -ier/-iest: happy → happier → the happiest.']
      },
      {
        heading: 'Uzun sifatlar: more va most',
        paragraphs: ['Ikki va undan ortiq bo‘g‘inli ko‘pchilik sifatlar bilan more va most ishlatiladi: expensive → more expensive → the most expensive. Qiyoslashda than keladi: This book is more interesting than that one.']
      },
      {
        heading: 'Noto‘g‘ri shakllar va as … as',
        paragraphs: ['Ularni yodlash kerak: good → better → the best, bad → worse → the worst, far → farther yoki further → the farthest yoki the furthest. Tenglik uchun as … as: She is as tall as her brother. Tengsizlik inkorda: not as … as.']
      },
      {
        heading: 'Ko‘p uchraydigan xatolar',
        paragraphs: ['«More taller» emas, taller (qo‘sh qiyoslash yo‘q). «The most best» emas, the best. Superlative bilan odatda the ishlatiladi: the cheapest hotel.']
      }
    ],
    exercises: [
      { prompt: 'My house is ___ than yours. (big)', answer: 'bigger', explanation: 'Qisqa unli + undosh: undosh ikkilanadi.' },
      { prompt: 'This is the ___ film I have ever seen. (interesting)', answer: 'most interesting' },
      { prompt: 'She is ___ student in the class. (good)', answer: 'the best' },
      { prompt: 'Today is ___ than yesterday. (bad)', answer: 'worse' },
      { prompt: 'He runs as ___ as his brother. (fast)', answer: 'fast', explanation: 'as … as orasida sifatning asosiy shakli.' },
      { prompt: 'Qaysi biri to‘g‘ri?', options: ['She is more taller than me', 'She is taller than me'], answer: 'B) She is taller than me', explanation: 'Qisqa sifat: -er, more kerak emas.' }
    ],
    faq: [
      { q: 'Qaysi sifat bilan -er, qaysi biri bilan more ishlatiladi?', a: 'Bir bo‘g‘inli sifatlar -er/-est oladi; ikki va undan ko‘p bo‘g‘inli ko‘pchilik sifatlar more/most bilan keladi. Undosh + y bilan tugaydigan ikki bo‘g‘inli sifatlar (happy, easy) ko‘pincha -ier/-iest oladi.' },
      { q: 'Than va then farqi nima?', a: 'Than qiyoslashda ishlatiladi (taller than me), then esa «keyin» yoki «u holda» ma’nosida.' }
    ]
  },
  {
    path: '/english/grammar/past-continuous',
    name: 'Past Continuous',
    title: 'Past Continuous: was/were + -ing, qoidalar va mashqlar | EduLevel',
    description: 'Past Continuous zamoni: o‘tmishda davom etgan ish, bo‘lingan harakat (when va while), Past Simple bilan farqi va javobli mashqlar.',
    h1: 'Past Continuous: o‘tmishda davom etgan ish',
    lead: 'Past Continuous o‘tmishdagi aniq paytda davom etayotgan ishni yoki boshqa ish uni bo‘lib qo‘yganini ifodalaydi.',
    updated: D,
    level: 'A2',
    related: [HUB, '/english/grammar/past-simple', '/english/grammar/past-perfect', '/blog/ingliz-tili-zamonlari-qisqacha'],
    sections: [
      {
        heading: 'Shakllanishi',
        paragraphs: ['was / were + fe’l-ing: I was reading, they were reading. Inkor: wasn’t / weren’t reading. So‘roq: Was she reading? What were you doing?']
      },
      {
        heading: 'Qachon ishlatiladi',
        paragraphs: ['Asosiy holatlar:'],
        items: [
          'O‘tmishdagi aniq paytda davom etayotgan ish: At eight o’clock yesterday I was studying.',
          'Boshqa ish bo‘lib qo‘ygan davomiy ish: I was walking home when it started to rain. (Davomiy ish — Past Continuous, bo‘lib qo‘ygan qisqa ish — Past Simple.)',
          'Bir vaqtda davom etgan ikki ish: While she was cooking, he was watching TV.'
        ]
      },
      {
        heading: 'When va while',
        paragraphs: ['While odatda davomiy ish bilan keladi: While I was sleeping, the phone rang. When ko‘pincha qisqa ish bilan: The phone rang when I was sleeping. Holat fe’llari (know, like, want) Past Continuous da ishlatilmaydi.']
      }
    ],
    exercises: [
      { prompt: 'At nine o’clock last night I ___ (watch) a film.', answer: 'was watching' },
      { prompt: 'She ___ (cook) when the phone rang.', answer: 'was cooking' },
      { prompt: 'While they ___ (play) football, it started to rain.', answer: 'were playing' },
      { prompt: 'What ___ you ___ (do) at 6 p.m. yesterday?', answer: 'were / doing' },
      { prompt: 'Qaysi biri to‘g‘ri? «I ___ TV when you called.»', options: ['watched', 'was watching'], answer: 'B) was watching', explanation: 'Qo‘ng‘iroq paytida davom etayotgan ish.' }
    ],
    faq: [
      { q: 'Past Simple va Past Continuous farqi nima?', a: 'Past Simple tugagan ishni, Past Continuous o‘tmishdagi paytda davom etayotgan ishni bildiradi. Ikkalasi bir gapda kelsa, davomiy ish fon, qisqa ish esa uni bo‘lgan hodisa bo‘ladi.' }
    ]
  },
  {
    path: '/english/grammar/past-perfect',
    name: 'Past Perfect',
    title: 'Past Perfect: had + V3, qoidalar va mashqlar | EduLevel',
    description: 'Past Perfect zamoni: o‘tmishdagi boshqa ishdan oldin tugagan ish. had + V3, already, before, by the time, mashqlar.',
    h1: 'Past Perfect: o‘tmishdagi ishdan oldingi ish',
    lead: 'Past Perfect o‘tmishda yuz bergan boshqa ishdan ham oldin tugagan ishni bildiradi. «O‘tmishning o‘tmishi» deb ham eslab qolish mumkin.',
    updated: D,
    level: 'B1',
    related: [HUB, '/english/grammar/past-simple', '/english/grammar/conditionals', '/english/grammar/reported-speech'],
    sections: [
      {
        heading: 'Shakllanishi',
        paragraphs: ['had + fe’lning uchinchi shakli (V3), barcha shaxslar uchun bir xil: I had finished, she had finished. Inkor: hadn’t + V3. So‘roq: Had you finished?']
      },
      {
        heading: 'Qachon ishlatiladi',
        paragraphs: ['Ikki o‘tmish ishning tartibi muhim bo‘lganda: avval sodir bo‘lgani Past Perfect, keyingisi Past Simple bo‘ladi. When I arrived, the film had already started. (Avval film boshlandi, keyin men keldim.)', 'Uchinchi shart gapda (If she had studied, she would have passed) va bavosita nutqda (She said she had finished) ham ishlatiladi.']
      },
      {
        heading: 'Signal so‘zlar',
        paragraphs: ['already, just, never, before, after, by the time, until, as soon as. After she had left, I went to bed. By the time we got to the station, the train had left.']
      }
    ],
    exercises: [
      { prompt: 'When I arrived, the film ___ (already / start).', answer: 'had already started' },
      { prompt: 'She ___ (not / finish) her homework before the lesson.', answer: 'hadn’t finished (had not finished)' },
      { prompt: 'After they ___ (eat), they went for a walk.', answer: 'had eaten' },
      { prompt: 'By the time we got there, the shop ___ (close).', answer: 'had closed' },
      { prompt: 'Qaysi biri avval bo‘lgan? «He had left before I called.»', answer: 'U ketgan (avval); men qo‘ng‘iroq qildim (keyin).' }
    ],
    faq: [
      { q: 'Past Perfect ni har safar o‘tmish ikki ish bo‘lsa ishlatish kerakmi?', a: 'Yo‘q. Ishlar ketma-ketligi so‘z tartibi yoki after/before kabi so‘zlardan aniq bo‘lsa, Past Simple ham yetadi. Past Perfect tartibni aniq ko‘rsatish kerak bo‘lganda ishlatiladi.' }
    ]
  },
  {
    path: '/english/grammar/reported-speech',
    name: 'Reported speech',
    title: 'Reported speech: bavosita nutq qoidalari va mashqlar | EduLevel',
    description: 'Reported speech (bavosita nutq): zamonlarning o‘zgarishi, say va tell farqi, bavosita savollar, buyruqlar va vaqt so‘zlarining o‘zgarishi, mashqlar.',
    h1: 'Reported speech: boshqa odamning gapini ko‘chirish',
    lead: 'Reported speech da boshqa kishining gapi o‘z so‘zlari bilan qayta aytiladi. Odatda zamon bir pog‘ona o‘tmishga siljiydi.',
    updated: D,
    level: 'B1',
    related: [HUB, '/english/grammar/past-perfect', '/english/grammar/question-forms', '/cefr/b1'],
    sections: [
      {
        heading: 'Zamonlarning o‘zgarishi',
        paragraphs: ['Reporting fe’li o‘tgan zamonda (said, told) bo‘lsa, gap zamoni bir pog‘ona orqaga suriladi:'],
        items: [
          'Present Simple → Past Simple: «I like tea» → She said she liked tea.',
          'Present Continuous → Past Continuous: «I am working» → He said he was working.',
          'Present Perfect va Past Simple → Past Perfect: «I have finished» → She said she had finished.',
          'will → would, can → could: «I will help» → He said he would help.'
        ]
      },
      {
        heading: 'Olmosh va vaqt so‘zlari',
        paragraphs: ['Olmoshlar ma’noga qarab o‘zgaradi (I → he/she). Vaqt va joy so‘zlari ham: today → that day, tomorrow → the next day, yesterday → the day before, here → there, now → then.']
      },
      {
        heading: 'Say va tell, savollar va buyruqlar',
        paragraphs: ['Say dan keyin tinglovchi aytilmaydi: She said (that) she was tired. Tell dan keyin tinglovchi keladi: She told me (that) she was tired.', 'Bavosita savolda so‘roq tartibi bo‘lmaydi, if yoki whether ishlatiladi: «Do you like tea?» → She asked if I liked tea. Buyruq: «Close the door» → He told me to close the door.']
      }
    ],
    exercises: [
      { prompt: '«I am tired,» she said. → She said she ___ tired.', answer: 'was' },
      { prompt: '«I will call you,» he said. → He said he ___ call me.', answer: 'would' },
      { prompt: '«I have finished,» they said. → They said they ___ finished.', answer: 'had' },
      { prompt: '«Do you like coffee?» he asked me. → He asked me ___ I liked coffee.', answer: 'if / whether' },
      { prompt: '«Open the window,» the teacher said. → The teacher told us ___ the window.', answer: 'to open' },
      { prompt: 'Qaysi biri to‘g‘ri?', options: ['She said me that she was ill', 'She told me that she was ill'], answer: 'B) She told me that she was ill', explanation: 'Tell dan keyin tinglovchi, say dan keyin yo‘q.' }
    ],
    faq: [
      { q: 'Reporting fe’li hozirgi zamonda bo‘lsa zamon o‘zgaradimi?', a: 'Yo‘q. «She says she is tired» da zamon siljimaydi. Siljish asosan said, told kabi o‘tgan zamondagi fe’llardan keyin bo‘ladi.' },
      { q: 'Haqiqat o‘zgarmasa ham zamonni siljitish kerakmi?', a: 'Gap hozir ham to‘g‘ri bo‘lsa, zamonni saqlash mumkin: She said the Earth goes round the Sun. Imtihon mashqlarida odatda qoida bo‘yicha siljitish kutiladi.' }
    ]
  },
  {
    path: '/english/grammar/relative-clauses',
    name: 'Relative clauses',
    title: 'Relative clauses: who, which, that, whose | EduLevel',
    description: 'Aniqlovchi ergash gaplar: who, which, that, whose, where, when. Defining va non-defining farqi, olmoshni tushirish va javobli mashqlar.',
    h1: 'Relative clauses: who, which, that va whose',
    lead: 'Relative clause otni aniqlaydi yoki qo‘shimcha ma’lumot beradi. Uni who, which, that, whose, where va when so‘zlari boshlaydi.',
    updated: D,
    level: 'B1',
    related: [HUB, '/english/grammar/passive-voice', '/english/grammar/conditionals', '/cefr/b2'],
    sections: [
      {
        heading: 'Asosiy so‘zlar',
        paragraphs: ['Qaysi so‘z qaysi otga mos:'],
        items: [
          'who — odamlar: The woman who lives next door is a doctor.',
          'which — narsalar: The book which I bought is interesting.',
          'that — odamlar va narsalar uchun (faqat defining gapda): The man that I met was kind.',
          'whose — egalik: The girl whose bag was stolen called the police.',
          'where / when — joy va vaqt: This is the town where I was born.'
        ]
      },
      {
        heading: 'Defining va non-defining',
        paragraphs: ['Defining gap otni aniqlaydi va uni olib tashlab bo‘lmaydi; vergul qo‘yilmaydi: The student who won the prize is my cousin. Non-defining gap qo‘shimcha ma’lumot beradi, vergul bilan ajratiladi va that ishlatilmaydi: My cousin, who lives in Samarkand, is a teacher.']
      },
      {
        heading: 'Olmoshni tushirish',
        paragraphs: ['Relative olmosh gapda to‘ldiruvchi bo‘lsa, defining gapda tushirib qoldirish mumkin: The film (that) we watched was long. Ega bo‘lsa tushirib bo‘lmaydi: The man who called you is here.']
      }
    ],
    exercises: [
      { prompt: 'The woman ___ lives next door is a doctor.', answer: 'who (yoki that)' },
      { prompt: 'The book ___ I bought yesterday is interesting.', answer: 'which / that (yoki olmosh tushiriladi)' },
      { prompt: 'The girl ___ bag was stolen called the police.', answer: 'whose' },
      { prompt: 'This is the town ___ I was born.', answer: 'where' },
      { prompt: 'My cousin, ___ lives in Samarkand, is a teacher. (that mumkin emas)', answer: 'who', explanation: 'Non-defining gapda that ishlatilmaydi.' }
    ],
    faq: [
      { q: 'Who va whom qaysi biri to‘g‘ri?', a: 'Who ega o‘rnida keladi (The man who called). Whom to‘ldiruvchi o‘rnida, rasmiy uslubda (The man whom I met); kundalik nutqda o‘rniga who yoki olmosh tushiriladi.' },
      { q: 'That va which farqi?', a: 'Defining gapda ko‘pincha ikkalasi ham mumkin, that kundalik tilda tez-tez uchraydi. Vergulli non-defining gapda faqat which ishlatiladi.' }
    ]
  },
  {
    path: '/english/grammar/gerunds-infinitives',
    name: 'Gerund va infinitive',
    title: 'Gerund va infinitive: enjoy doing yoki want to do | EduLevel',
    description: 'Fe’ldan keyin gerund (-ing) yoki infinitive (to + fe’l): qaysi fe’l qaysi shaklni oladi, stop va remember farqi, predloglardan keyin gerund, mashqlar.',
    h1: 'Gerund va infinitive: enjoy doing, want to do',
    lead: 'Ba’zi fe’llardan keyin fe’l -ing shaklida (gerund), ba’zilaridan keyin to bilan (infinitive) keladi. Qaysi biri kerakligini fe’lning o‘zi belgilaydi.',
    updated: D,
    level: 'B1',
    related: [HUB, '/english/grammar/modal-verbs', '/english/grammar/prepositions-time-place', '/cefr/b1'],
    sections: [
      {
        heading: 'Gerund (-ing) oladigan fe’llar',
        paragraphs: ['enjoy, avoid, finish, mind, suggest, keep, practise, consider, admit: I enjoy reading. She avoided answering. We finished working at six.']
      },
      {
        heading: 'To-infinitive oladigan fe’llar',
        paragraphs: ['want, decide, hope, plan, promise, manage, refuse, learn, afford: I want to learn English. They decided to leave early. He promised to help.']
      },
      {
        heading: 'Ikkalasini ham oladigan fe’llar',
        paragraphs: ['like, love, hate, prefer, start, begin ma’noni deyarli o‘zgartirmasdan ikkalasini ham oladi: I like swimming / I like to swim. Lekin ba’zilarida ma’no o‘zgaradi: stop doing (to‘xtatmoq) va stop to do (to‘xtab nimadir qilmoq); remember to do (qilishni unutmaslik) va remember doing (qilganini eslash).']
      },
      {
        heading: 'Predloglardan keyin',
        paragraphs: ['Predlogdan keyin har doim gerund: interested in learning, good at speaking, thank you for helping. Modal fe’llardan keyin to siz asosiy shakl: She can swim.']
      }
    ],
    exercises: [
      { prompt: 'I enjoy ___ (read) in the evening.', answer: 'reading' },
      { prompt: 'They decided ___ (leave) early.', answer: 'to leave' },
      { prompt: 'She is good at ___ (draw).', answer: 'drawing', explanation: 'Predlogdan keyin gerund.' },
      { prompt: 'He stopped ___ (smoke) last year. (chekishni tashladi)', answer: 'smoking' },
      { prompt: 'Remember ___ (lock) the door when you leave. (unutmang)', answer: 'to lock' },
      { prompt: 'Qaysi biri to‘g‘ri?', options: ['I want learning English', 'I want to learn English'], answer: 'B) I want to learn English' }
    ],
    faq: [
      { q: 'Qaysi fe’ldan keyin qaysi shakl kelishini qanday bilaman?', a: 'Buni fe’llar guruhlari bo‘yicha yodlash kerak. Ro‘yxatni gap ichida mashq qiling va xatolar jurnali yuriting: ko‘p fe’l ikkala shaklni olmaydi.' },
      { q: 'Nega «look forward to seeing» deb aytiladi, «to see» emas?', a: 'Bu yerda to — predlog, shuning uchun uning ortidan gerund keladi: look forward to seeing you.' }
    ]
  },
  {
    path: '/english/grammar/quantifiers',
    name: 'Much, many, few, little',
    title: 'Much, many, few, little, some, any: miqdor so‘zlari | EduLevel',
    description: 'Miqdor so‘zlari: much va many, few va little, a few va a little, some va any, enough va too. Sanaladigan va sanalmaydigan otlar bilan ishlatilishi, mashqlar.',
    h1: 'Much, many, few, little: miqdor so‘zlari',
    lead: 'Miqdor so‘zi tanlash ot sanaladimi yoki sanalmaydimi, shunga bog‘liq. Bu ingliz tilida eng ko‘p xato qilinadigan mavzulardan biri.',
    updated: D,
    level: 'A2',
    related: [HUB, '/english/grammar/articles', '/english/vocabulary', '/cefr/a2'],
    sections: [
      {
        heading: 'Sanaladigan va sanalmaydigan otlar',
        paragraphs: ['Sanaladigan ot birlik va ko‘plikda keladi: one book, two books. Sanalmaydigan otlar ko‘plik shaklga ega emas: water, money, advice, information, homework. Ularni a/an yoki son bilan ishlatib bo‘lmaydi: two pieces of advice.']
      },
      {
        heading: 'Many, much, a lot of',
        paragraphs: ['Many — sanaladigan ko‘plik ot bilan: many books. Much — sanalmaydigan ot bilan, asosan inkor va so‘roqda: There isn’t much time. How much money? A lot of ikkalasi bilan ham ishlaydi, ijobiy gapda tabiiyroq: She has a lot of friends.']
      },
      {
        heading: 'Few, a few, little, a little',
        paragraphs: ['A few (sanaladigan) va a little (sanalmaydigan) — «bir oz bor» ma’nosida, ijobiy: I have a few friends. We have a little time. Few va little — «deyarli yo‘q», salbiy ma’no: Few people came. There is little hope.']
      },
      {
        heading: 'Some, any, enough, too',
        paragraphs: ['Some ijobiy gapda, any inkor va so‘roqda: I have some money. I don’t have any money. Enough — yetarli (enough time), too — ortiqcha va salbiy (too much noise).']
      }
    ],
    exercises: [
      { prompt: 'How ___ money do you have? (money — sanalmaydigan)', answer: 'much' },
      { prompt: 'There are too ___ cars in the city. (cars — sanaladigan)', answer: 'many' },
      { prompt: 'I have ___ friends in this city, so I am not lonely. (bir nechta)', answer: 'a few' },
      { prompt: 'There is ___ milk left; we need to buy more. (deyarli yo‘q)', answer: 'little' },
      { prompt: 'I don’t have ___ time. (inkor)', answer: 'any' },
      { prompt: 'Qaysi biri to‘g‘ri?', options: ['Can you give me some advices?', 'Can you give me some advice?'], answer: 'B) Can you give me some advice?', explanation: 'Advice sanalmaydigan ot, ko‘plik shakli yo‘q.' }
    ],
    faq: [
      { q: 'Information va advice nega ko‘plikda emas?', a: 'Ular sanalmaydigan otlar. Ko‘plik uchun «pieces of» ishlatiladi: two pieces of information.' },
      { q: 'A few va few farqi nima?', a: 'A few — «bir nechta bor» (ijobiy). Few — «deyarli yo‘q» (salbiy). Ma’no a harfi bilan o‘zgaradi.' }
    ]
  },
  {
    path: '/english/grammar/question-forms',
    name: 'Question forms',
    title: 'Question forms: savol tuzish, wh- savollar | EduLevel',
    description: 'Ingliz tilida savol tuzish: yes/no savollar, wh- savollar, ega haqidagi savollar, bavosita savollar va savol tegi. Qoidalar va javobli mashqlar.',
    h1: 'Question forms: ingliz tilida savol tuzish',
    lead: 'Ingliz tilida savolda yordamchi fe’l ega oldiga o‘tadi. Bu tartibni bilish Speaking va Writing da xatolarni kamaytiradi.',
    updated: D,
    level: 'A2',
    related: [HUB, '/english/grammar/present-simple', '/english/grammar/past-simple', '/english/grammar/reported-speech'],
    sections: [
      {
        heading: 'Yes/no savollar',
        paragraphs: ['Yordamchi fe’l + ega + asosiy fe’l: Do you like tea? Does she work here? Did they come? Is he sleeping? Have you finished? Can you help me? To be bilan: Are you ready? Yordamchi fe’l bor joyda asosiy fe’l o‘zgarmaydi.']
      },
      {
        heading: 'Wh- savollar',
        paragraphs: ['Savol so‘zi + yordamchi fe’l + ega + asosiy fe’l: What do you study? Where does he live? When did you arrive? Why are you late? How many books do you have? How long does it take?']
      },
      {
        heading: 'Ega haqidagi savollar',
        paragraphs: ['Savol so‘zi o‘zi ega bo‘lsa, do/does/did ishlatilmaydi: Who called you? (kim qo‘ng‘iroq qildi) va Who did you call? (kimga qo‘ng‘iroq qildingiz). What happened? Which team won?']
      },
      {
        heading: 'Bavosita savollar va savol tegi',
        paragraphs: ['Muloyim, bavosita savolda tartib oddiy gapdagidek: Could you tell me where the station is? («where is the station» emas.) Savol tegi tasdiqni so‘rash uchun: You are a student, aren’t you? She doesn’t smoke, does she?']
      }
    ],
    exercises: [
      { prompt: '___ you like coffee?', answer: 'Do' },
      { prompt: 'Where ___ she live?', answer: 'does' },
      { prompt: '___ called you yesterday? (kim)', answer: 'Who', explanation: 'Ega haqidagi savolda did kerak emas.' },
      { prompt: 'Could you tell me where ___? (the station / is)', answer: 'the station is' },
      { prompt: 'She doesn’t smoke, ___ she?', answer: 'does' },
      { prompt: 'Qaysi biri to‘g‘ri?', options: ['Where you are going?', 'Where are you going?'], answer: 'B) Where are you going?' }
    ],
    faq: [
      { q: 'Nega «Does he goes?» deyish xato?', a: 'Does bor joyda ega haqidagi gap kabi -s qo‘shilmaydi: Does he go? Zamon va shaxs yordamchi fe’lda ko‘rinadi.' },
      { q: 'Qaysi savolda do ishlatilmaydi?', a: 'To be, modal fe’llar (can, should) va have/has (Present Perfect) bilan do ishlatilmaydi; shuningdek savol so‘zi ega bo‘lgan savollarda.' }
    ]
  },
  {
    path: '/english/grammar/phrasal-verbs',
    name: 'Phrasal verbs',
    title: 'Phrasal verbs: eng ko‘p ishlatiladigan fe’l birikmalari | EduLevel',
    description: 'Phrasal verbs: fe’l + yuklama birikmalari, ajraladigan va ajralmaydigan turlari, eng ko‘p ishlatiladiganlari (get up, look for, give up), misol va mashqlar.',
    h1: 'Phrasal verbs: fe’l + yuklama birikmalari',
    lead: 'Phrasal verb — fe’l va yuklamadan (up, off, out, in …) tashkil topgan va ko‘pincha alohida so‘zlardan farqli ma’no beradigan birikma.',
    updated: D,
    level: 'B1',
    related: [HUB, '/english/vocabulary', '/english/grammar/gerunds-infinitives', '/cefr/b1'],
    sections: [
      {
        heading: 'Eng ko‘p ishlatiladiganlari',
        paragraphs: ['Quyidagilarni gap ichida yodlang:'],
        items: [
          'get up — o‘rnidan turmoq: I get up at seven.',
          'look for — qidirmoq: I am looking for my keys.',
          'give up — taslim bo‘lmoq, tashlamoq: Don’t give up!',
          'find out — bilib olmoq: I found out the answer.',
          'turn on / turn off — yoqmoq / o‘chirmoq: Turn off the light.',
          'put on — kiymoq: Put on your coat.',
          'take off — yechmoq; (samolyot) uchmoq: The plane took off.',
          'run out of — tugab qolmoq: We ran out of milk.',
          'carry on — davom ettirmoq: Carry on reading.'
        ]
      },
      {
        heading: 'Ajraladigan va ajralmaydigan',
        paragraphs: ['Ba’zi phrasal verblarda to‘ldiruvchi fe’l va yuklama orasiga qo‘yilishi mumkin: turn the light off yoki turn off the light. To‘ldiruvchi olmosh bo‘lsa, majburan o‘rtaga qo‘yiladi: turn it off («turn off it» emas). Ajralmaydiganlarda to‘ldiruvchi doim oxirda: look after the children, look for it.']
      }
    ],
    exercises: [
      { prompt: 'I ___ at seven every morning. (o‘rnidan turaman)', answer: 'get up' },
      { prompt: 'I am ___ my keys. (qidirmoqdaman)', answer: 'looking for' },
      { prompt: 'Please ___ the TV. It is too loud. (o‘chiring)', answer: 'turn off (turn … off)' },
      { prompt: 'We ___ milk, so we went to the shop. (tugab qoldi)', answer: 'ran out of' },
      { prompt: 'Qaysi biri to‘g‘ri? «The light is on. Please ___.»', options: ['turn off it', 'turn it off'], answer: 'B) turn it off', explanation: 'Olmosh phrasal verb o‘rtasiga qo‘yiladi.' }
    ],
    faq: [
      { q: 'Phrasal verblarni qanday tez o‘rganaman?', a: 'Ro‘yxat emas, mavzu bo‘yicha va gap ichida: kundalik hayot, sayohat, ish. Kuniga 3–5 tasini o‘z hayotingizdan misol bilan yozing.' },
      { q: 'Bir phrasal verb bir nechta ma’no bera oladimi?', a: 'Ha. Masalan take off — yechmoq va samolyot uchishi. Ma’noni kontekstdan aniqlang va lug‘atda tekshiring.' }
    ]
  },
  {
    path: '/english/grammar/linking-words',
    name: 'Linking words',
    title: 'Linking words: however, although, because, therefore | EduLevel',
    description: 'Bog‘lovchi so‘zlar: qo‘shish, qarama-qarshilik, sabab, natija, ketma-ketlik va misol keltirish. however, although, despite, therefore. Qoidalar va mashqlar.',
    h1: 'Linking words: fikrlarni mantiqiy bog‘lash',
    lead: 'Bog‘lovchi so‘zlar gaplar orasidagi mantiqiy aloqani ko‘rsatadi. Ular IELTS Writing dagi «Coherence and Cohesion» mezoni uchun ham muhim.',
    updated: D,
    level: 'B1',
    related: [HUB, '/ielts/writing', '/english/speaking', '/cefr/b1'],
    sections: [
      {
        heading: 'Guruhlar bo‘yicha',
        paragraphs: ['Ma’no bo‘yicha asosiy bog‘lovchilar:'],
        items: [
          'Qo‘shish: and, also, in addition, moreover, besides.',
          'Qarama-qarshilik: but, however, although, even though, whereas, on the other hand.',
          'Sabab: because, since, as, because of (+ ot), due to (+ ot).',
          'Natija: so, therefore, as a result, consequently.',
          'Ketma-ketlik: first, then, after that, finally.',
          'Misol: for example, for instance, such as.'
        ]
      },
      {
        heading: 'Grammatik qoidalar',
        paragraphs: ['Although + to‘liq gap: Although it was cold, we went out. Despite / in spite of + ot yoki gerund: Despite the cold, we went out. However gap boshida yoki o‘rtasida keladi va vergul bilan ajratiladi: It was cold. However, we went out. Because + gap, because of + ot: We stayed home because it rained / because of the rain.']
      },
      {
        heading: 'Ko‘p uchraydigan xatolar',
        paragraphs: ['«Although … but …» bir gapda birga kelmaydi: Although it was cold, we went out (but kerak emas). Vergul bilan ikki mustaqil gapni to‘g‘ridan-to‘g‘ri bog‘lamang («It was cold, we went out» — xato); ; yoki bog‘lovchi ishlating.']
      }
    ],
    exercises: [
      { prompt: '___ it was raining, we went for a walk.', options: ['Despite', 'Although'], answer: 'B) Although', explanation: 'Keyin to‘liq gap keladi.' },
      { prompt: '___ the rain, we went for a walk.', options: ['Despite', 'Although'], answer: 'A) Despite', explanation: 'Keyin ot (the rain) keladi.' },
      { prompt: 'He was ill. ___, he went to work.', answer: 'However', explanation: 'Qarama-qarshilik; vergul bilan.' },
      { prompt: 'We stayed home ___ the rain. (sabab + ot)', answer: 'because of' },
      { prompt: 'She studied hard. ___, she passed the exam. (natija)', answer: 'As a result / Therefore' }
    ],
    faq: [
      { q: 'IELTS Writing da bog‘lovchilarni ko‘p ishlatsam ball oshadimi?', a: 'Yo‘q. Ko‘p va noo‘rin ishlatish ball kamaytirishi mumkin. Mezon — ularni tabiiy va to‘g‘ri ishlatish va fikrni mantiqiy tartibda berish.' },
      { q: 'However va but farqi?', a: 'But gap ichida ikki qismni bog‘laydi (It was cold, but we went out). However odatda yangi gap boshida keladi va vergul bilan ajratiladi.' }
    ]
  }
];
