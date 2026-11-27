/**
 * Topic vocabulary guides. Each page: the words with Uzbek meaning and an example sentence, useful phrases, collocations
 * and practice with answers. Word meanings were checked by hand; examples are original sentences.
 */
import type { SeoPage } from './pages';

const D = '2026-11-25';
const HUB = '/english/vocabulary';

export const VOCAB_PAGES: SeoPage[] = [
  {
    path: '/english/vocabulary/family-relationships',
    name: 'Oila va munosabatlar lug‘ati',
    title: 'Family and relationships: oila va munosabatlar lug‘ati | EduLevel',
    description: 'Oila a’zolari, qarindoshlar va munosabatlar haqida inglizcha so‘zlar: tarjima, misol gaplar, foydali iboralar va javobli mashqlar.',
    h1: 'Family and relationships: oila va munosabatlar lug‘ati',
    lead: 'Oila mavzusi A1 dan IELTS Speaking gacha eng ko‘p so‘raladigan mavzulardan biri. Quyida kerakli so‘zlar misollar bilan berilgan.',
    updated: D,
    level: 'A2',
    related: [HUB, '/english/speaking', '/ielts/speaking', '/cefr/a2'],
    sections: [
      {
        heading: 'Oila a’zolari',
        paragraphs: ['Asosiy so‘zlar:'],
        items: [
          'parents — ota-ona: My parents live in Tashkent.',
          'sibling — aka-uka yoki opa-singil: I have two siblings.',
          'grandparents — bobo va buvi: My grandparents tell me old stories.',
          'cousin — amakivachcha, tog‘avachcha: My cousin studies medicine.',
          'uncle / aunt — amaki, tog‘a / xola, amma: My aunt is a teacher.',
          'spouse — turmush o‘rtog‘i: Her spouse works abroad.',
          'in-laws — kelin yoki kuyovning qarindoshlari: I get on well with my in-laws.'
        ]
      },
      {
        heading: 'Munosabatlar haqida iboralar',
        paragraphs: ['Kundalik va Speaking uchun foydali birikmalar: get on well with (kimdir bilan yaxshi chiqishmoq), look up to (hurmat qilmoq), take after (kimgadir o‘xshab ketmoq), bring up (tarbiyalamoq), grow up (o‘smoq), keep in touch (aloqada bo‘lmoq).']
      },
      {
        heading: 'Foydali namunalar',
        paragraphs: ['I come from a large family. I take after my mother: we are both patient. My parents brought me up to value education. We keep in touch by phone every weekend.']
      }
    ],
    exercises: [
      { prompt: 'My uncle’s daughter is my ___.', answer: 'cousin' },
      { prompt: 'I get ___ well with my brother. (yaxshi chiqishmoq)', answer: 'on' },
      { prompt: 'She ___ after her father: they are both tall. (o‘xshab ketmoq)', answer: 'takes' },
      { prompt: 'My parents ___ me up to be honest. (tarbiyalamoq)', answer: 'brought' },
      { prompt: '___ means brothers and sisters.', answer: 'Siblings' }
    ],
    faq: [
      { q: 'Brother va sibling farqi nima?', a: 'Brother — aka yoki uka (faqat erkak). Sibling jinsni ko‘rsatmaydi: aka-uka va opa-singillarning umumiy nomi.' }
    ]
  },
  {
    path: '/english/vocabulary/education',
    name: 'Ta’lim lug‘ati',
    title: 'Education: ta’lim va o‘qish bo‘yicha inglizcha lug‘at | EduLevel',
    description: 'Ta’lim mavzusi lug‘ati: maktab, universitet, imtihon va o‘qish iboralari. Tarjima, misollar va IELTS Writing uchun foydali kollokatsiyalar, mashqlar.',
    h1: 'Education: ta’lim va o‘qish lug‘ati',
    lead: 'Ta’lim — IELTS Writing Task 2 va Speaking da eng ko‘p uchraydigan mavzu. So‘zlarni kollokatsiyalar bilan birga o‘rganing.',
    updated: D,
    level: 'B1',
    related: [HUB, '/ielts/writing', '/english/vocabulary/work-careers', '/cefr/b1'],
    sections: [
      {
        heading: 'Asosiy so‘zlar',
        paragraphs: ['Ko‘p ishlatiladigan so‘zlar:'],
        items: [
          'curriculum — o‘quv dasturi: The curriculum includes science and art.',
          'tuition fees — o‘qish to‘lovi: Tuition fees are rising.',
          'scholarship — stipendiya, grant: She won a scholarship to study abroad.',
          'graduate — bitiruvchi; bitirmoq: He graduated from university in 2022.',
          'assignment — topshiriq: The assignment is due on Friday.',
          'lecture — ma’ruza: I missed the lecture.',
          'degree — akademik daraja: She has a degree in economics.',
          'compulsory — majburiy: Maths is compulsory at school.'
        ]
      },
      {
        heading: 'Kollokatsiyalar',
        paragraphs: ['Birga ishlatiladigan so‘zlar: take an exam (imtihon topshirmoq), pass / fail an exam, do research, attend classes, meet a deadline (muddatga ulgurmoq), gain knowledge, higher education (oliy ta’lim), distance learning (masofaviy o‘qish).']
      },
      {
        heading: 'Insho uchun iboralar',
        paragraphs: ['Education plays a key role in personal development. Access to quality education should be available to everyone. Some argue that practical skills are as important as academic knowledge.']
      }
    ],
    exercises: [
      { prompt: 'She won a ___ to study in London. (grant)', answer: 'scholarship' },
      { prompt: 'Students must ___ the deadline for the assignment. (ulgurmoq)', answer: 'meet' },
      { prompt: 'English is a ___ subject at our school. (majburiy)', answer: 'compulsory' },
      { prompt: 'He ___ from university last year. (bitirdi)', answer: 'graduated' },
      { prompt: 'To get a ___, you must complete three years of study. (daraja)', answer: 'degree' }
    ],
    faq: [
      { q: 'IELTS uchun ta’lim mavzusida qaysi so‘zlar kerak?', a: 'Curriculum, compulsory, tuition fees, higher education, distance learning, practical skills kabi so‘zlar va ularning kollokatsiyalari. So‘zni yakka emas, jumla ichida o‘rganing.' }
    ]
  },
  {
    path: '/english/vocabulary/health',
    name: 'Salomatlik lug‘ati',
    title: 'Health: salomatlik va sog‘lom turmush lug‘ati | EduLevel',
    description: 'Salomatlik mavzusi lug‘ati: kasalliklar, shifokor oldida, sog‘lom turmush tarzi. Tarjima, misollar, foydali iboralar va javobli mashqlar.',
    h1: 'Health: salomatlik va sog‘lom turmush lug‘ati',
    lead: 'Salomatlik mavzusi kundalik suhbatda ham, IELTS Speaking va Writing da ham tez-tez uchraydi.',
    updated: D,
    level: 'B1',
    related: [HUB, '/ielts/speaking', '/english/vocabulary/food-cooking', '/cefr/b1'],
    sections: [
      {
        heading: 'Asosiy so‘zlar',
        paragraphs: ['Kerakli so‘zlar:'],
        items: [
          'symptom — kasallik alomati: A cough is a common symptom.',
          'prescription — retsept: The doctor wrote a prescription.',
          'recover — tuzalmoq: He recovered quickly.',
          'balanced diet — to‘g‘ri ovqatlanish: A balanced diet includes vegetables.',
          'exercise — jismoniy mashq: Regular exercise improves health.',
          'stress — stress: Too much stress affects sleep.',
          'allergy — allergiya: She has an allergy to nuts.',
          'wellbeing — farovonlik, ruhiy-jismoniy holat: Sleep is important for wellbeing.'
        ]
      },
      {
        heading: 'Shifokor oldida',
        paragraphs: ['I have a headache / a sore throat / a fever. I don’t feel well. I would like to make an appointment. How often should I take this medicine? Foydali birikmalar: catch a cold (shamollamoq), come down with (kasal bo‘lib qolmoq), keep fit (sog‘lom bo‘lmoq), lead a healthy lifestyle.']
      },
      {
        heading: 'Muhokama uchun iboralar',
        paragraphs: ['Governments should encourage people to lead healthier lives. Prevention is better than cure. A sedentary lifestyle can lead to health problems.']
      }
    ],
    exercises: [
      { prompt: 'The doctor gave me a ___ for the medicine. (retsept)', answer: 'prescription' },
      { prompt: 'I think I am going to ___ a cold. (shamollamoq)', answer: 'catch' },
      { prompt: 'A ___ diet includes fruit and vegetables.', answer: 'balanced' },
      { prompt: 'She is allergic ___ nuts.', answer: 'to' },
      { prompt: 'He ___ quickly after the operation. (tuzaldi)', answer: 'recovered' }
    ],
    faq: [
      { q: 'Illness va disease farqi nima?', a: 'Disease — aniq tibbiy kasallik (heart disease). Illness — kasal bo‘lish holati yoki umumiy kasallik (She was absent due to illness).' }
    ]
  },
  {
    path: '/english/vocabulary/travel',
    name: 'Sayohat lug‘ati',
    title: 'Travel: sayohat, aeroport va mehmonxona lug‘ati | EduLevel',
    description: 'Sayohat mavzusi lug‘ati: aeroport, mehmonxona, transport va yo‘l so‘rash iboralari. Tarjima, misollar va javobli mashqlar.',
    h1: 'Travel: sayohat lug‘ati',
    lead: 'Sayohat lug‘ati chet elda muloqot qilish va Speaking dagi «travel» mavzusi uchun juda foydali.',
    updated: D,
    level: 'A2',
    related: [HUB, '/english/speaking', '/english/grammar/question-forms', '/cefr/a2'],
    sections: [
      {
        heading: 'Aeroport va transport',
        paragraphs: ['Kerakli so‘zlar:'],
        items: [
          'boarding pass — samolyotga chiqish talon: Show your boarding pass.',
          'luggage / baggage — yuk: My luggage is heavy.',
          'passport control — pasport nazorati: The queue at passport control was long.',
          'departure / arrival — jo‘nab ketish / yetib kelish: The departure is at ten.',
          'delay — kechikish: The flight has a two-hour delay.',
          'single / return ticket — bir tomonga / qaytish bilan chipta: A return ticket, please.',
          'platform — perron: The train leaves from platform 3.'
        ]
      },
      {
        heading: 'Mehmonxona va yo‘l so‘rash',
        paragraphs: ['I have a reservation under the name Karimov. Is breakfast included? Could you tell me how to get to the station? Turn left at the traffic lights. It is next to the bank. Go straight ahead for two blocks.']
      },
      {
        heading: 'Sayohat haqida gapirish',
        paragraphs: ['I went on a trip to Samarkand last summer. We stayed in a small hotel near the centre. What I enjoyed most was the local food. I’d love to go back one day.']
      }
    ],
    exercises: [
      { prompt: 'Please show your ___ at the gate. (chiqish talon)', answer: 'boarding pass' },
      { prompt: 'The flight was ___ by two hours. (kechikdi)', answer: 'delayed' },
      { prompt: 'I’d like a ___ ticket to Bukhara. (borib-qaytish)', answer: 'return' },
      { prompt: 'Could you tell me how ___ get to the station?', answer: 'to' },
      { prompt: 'I have a ___ under the name Karimov. (bron)', answer: 'reservation' }
    ],
    faq: [
      { q: 'Luggage va baggage farqi bormi?', a: 'Ma’no deyarli bir xil: ikkalasi ham yuk. Luggage ko‘proq Britaniya inglizchasida, baggage Amerika inglizchasida. Ikkalasi ham sanalmaydigan ot.' }
    ]
  },
  {
    path: '/english/vocabulary/work-careers',
    name: 'Ish va kasblar lug‘ati',
    title: 'Work and careers: ish va kasblar bo‘yicha lug‘at | EduLevel',
    description: 'Ish va kasb mavzusi lug‘ati: ish topish, suhbat, ish muhiti va martaba. Tarjima, misollar, kollokatsiyalar va javobli mashqlar.',
    h1: 'Work and careers: ish va kasblar lug‘ati',
    lead: 'Ish mavzusi suhbat, rezyume va IELTS Speaking da tez-tez uchraydi. So‘zlar kollokatsiyalar bilan birga berilgan.',
    updated: D,
    level: 'B1',
    related: [HUB, '/english/vocabulary/education', '/ielts/speaking', '/cefr/b1'],
    sections: [
      {
        heading: 'Asosiy so‘zlar',
        paragraphs: ['Ko‘p ishlatiladigan so‘zlar:'],
        items: [
          'employer / employee — ish beruvchi / xodim: The employer pays the employees on time.',
          'salary — oylik maosh: He earns a good salary.',
          'colleague — hamkasb: I get on well with my colleagues.',
          'qualification — malaka, diplom: She has the right qualifications for the job.',
          'deadline — muddat: We must meet the deadline.',
          'promotion — lavozim ko‘tarilishi: She got a promotion.',
          'part-time / full-time — yarim kunlik / to‘liq kunlik: He works part-time.',
          'resign — ishdan ketmoq: She resigned last month.'
        ]
      },
      {
        heading: 'Kollokatsiyalar',
        paragraphs: ['apply for a job (ishga ariza bermoq), have a job interview, make a living (kun ko‘rmoq), work overtime (qo‘shimcha ishlamoq), earn a salary, gain experience, career prospects (martaba istiqbollari), work-life balance.']
      },
      {
        heading: 'Speaking uchun namunalar',
        paragraphs: ['I work as a teacher. What I like about my job is that it is rewarding. I would like to gain more experience before I apply for a better position.']
      }
    ],
    exercises: [
      { prompt: 'She decided to ___ for a job at a bank. (ariza bermoq)', answer: 'apply' },
      { prompt: 'He got a ___ and now manages a team. (lavozim ko‘tarilishi)', answer: 'promotion' },
      { prompt: 'I work ___ — only three days a week. (yarim kunlik)', answer: 'part-time' },
      { prompt: 'He ___ from his job last month. (ishdan ketdi)', answer: 'resigned' },
      { prompt: 'People I work with are called my ___.', answer: 'colleagues' }
    ],
    faq: [
      { q: 'Salary va wage farqi nima?', a: 'Salary — oylik yoki yillik qat’iy maosh. Wage — odatda soatbay yoki haftalik to‘lov.' }
    ]
  },
  {
    path: '/english/vocabulary/environment',
    name: 'Atrof-muhit lug‘ati',
    title: 'Environment: atrof-muhit va ekologiya lug‘ati | EduLevel',
    description: 'Atrof-muhit mavzusi lug‘ati: ifloslanish, iqlim o‘zgarishi, qayta ishlash, energiya. Tarjima, misollar, Writing uchun iboralar va javobli mashqlar.',
    h1: 'Environment: atrof-muhit va ekologiya lug‘ati',
    lead: 'Atrof-muhit IELTS Writing Task 2 da ko‘p uchraydigan mavzu. So‘zlar va iboralarni misol bilan o‘rganing.',
    updated: D,
    level: 'B2',
    related: [HUB, '/ielts/writing', '/english/vocabulary/technology', '/cefr/b2'],
    sections: [
      {
        heading: 'Asosiy so‘zlar',
        paragraphs: ['Kerakli so‘zlar:'],
        items: [
          'pollution — ifloslanish: Air pollution is a serious problem in big cities.',
          'climate change — iqlim o‘zgarishi: Climate change affects farming.',
          'greenhouse gas — issiqxona gazi: Cars produce greenhouse gases.',
          'renewable energy — qayta tiklanadigan energiya: Solar power is renewable energy.',
          'recycling — qayta ishlash: Recycling reduces waste.',
          'endangered species — yo‘qolib borayotgan turlar: Tigers are an endangered species.',
          'deforestation — o‘rmonlarning kesilishi: Deforestation destroys habitats.',
          'sustainable — barqaror, ekologik toza: We need sustainable solutions.'
        ]
      },
      {
        heading: 'Insho uchun iboralar',
        paragraphs: ['Governments should invest in renewable energy. Individuals can reduce their carbon footprint by using public transport. Urgent action is needed to protect the environment. Stricter laws could discourage industries from polluting rivers.']
      },
      {
        heading: 'Kollokatsiyalar',
        paragraphs: ['reduce waste, protect wildlife, cut emissions (chiqindi gazlarini kamaytirish), global warming, natural resources, fossil fuels (qazilma yoqilg‘i), carbon footprint (uglerod izi).']
      }
    ],
    exercises: [
      { prompt: 'Solar and wind power are examples of ___ energy.', answer: 'renewable' },
      { prompt: 'Cutting down forests on a large scale is called ___.', answer: 'deforestation' },
      { prompt: 'Governments should ___ emissions. (kamaytirish)', answer: 'cut / reduce' },
      { prompt: 'Coal, oil and gas are ___ fuels.', answer: 'fossil' },
      { prompt: 'Species at risk of disappearing are ___ species.', answer: 'endangered' }
    ],
    faq: [
      { q: 'Global warming va climate change bir narsami?', a: 'Global warming — Yer haroratining ko‘tarilishi. Climate change kengroq: harorat, yog‘in, ob-havo tuzilmasidagi barcha uzoq muddatli o‘zgarishlar.' }
    ]
  },
  {
    path: '/english/vocabulary/technology',
    name: 'Texnologiya lug‘ati',
    title: 'Technology: texnologiya va internet lug‘ati | EduLevel',
    description: 'Texnologiya mavzusi lug‘ati: internet, ijtimoiy tarmoqlar, sun’iy intellekt, gadjetlar. Tarjima, misollar, insho iboralari va javobli mashqlar.',
    h1: 'Technology: texnologiya va internet lug‘ati',
    lead: 'Texnologiya mavzusi IELTS va CEFR imtihonlarida tez-tez uchraydi. Asosiy so‘zlar va tayyor iboralar quyida.',
    updated: D,
    level: 'B1',
    related: [HUB, '/english/vocabulary/environment', '/ielts/writing', '/edubek-ai'],
    sections: [
      {
        heading: 'Asosiy so‘zlar',
        paragraphs: ['Ko‘p ishlatiladigan so‘zlar:'],
        items: [
          'device — qurilma: Most people own more than one device.',
          'download / upload — yuklab olmoq / yuklamoq: I downloaded the app.',
          'social media — ijtimoiy tarmoqlar: Social media connects people.',
          'artificial intelligence — sun’iy intellekt: Artificial intelligence can help learners practise.',
          'privacy — shaxsiy hayot, maxfiylik: Online privacy is important.',
          'software / hardware — dastur / jihoz: Update the software regularly.',
          'online — onlayn: She studies online.',
          'addiction — qaramlik: Phone addiction is a growing concern.'
        ]
      },
      {
        heading: 'Insho uchun iboralar',
        paragraphs: ['Technology has made communication faster and easier. However, spending too much time on screens can harm health. People should protect their personal data. Teachers can use technology to make lessons more interactive.']
      },
      {
        heading: 'Kollokatsiyalar',
        paragraphs: ['access the internet, keep up with technology (texnologiya bilan hamnafas bo‘lmoq), rely on technology (texnologiyaga tayanmoq), technological advances, cutting-edge technology (eng so‘nggi texnologiya), screen time.']
      }
    ],
    exercises: [
      { prompt: 'I ___ the new app to my phone. (yuklab oldim)', answer: 'downloaded' },
      { prompt: 'Online ___ means keeping your personal data safe.', answer: 'privacy' },
      { prompt: 'Many people ___ on technology in their daily lives. (tayanmoq)', answer: 'rely' },
      { prompt: 'The time you spend looking at a screen is called ___ time.', answer: 'screen' },
      { prompt: 'A phone, tablet or laptop is a ___.', answer: 'device' }
    ],
    faq: [
      { q: 'Software uchun a/an ishlatsa bo‘ladimi?', a: 'Yo‘q. Software sanalmaydigan ot: some software, a piece of software.' }
    ]
  },
  {
    path: '/english/vocabulary/food-cooking',
    name: 'Ovqat va pishirish lug‘ati',
    title: 'Food and cooking: ovqat va pishirish lug‘ati | EduLevel',
    description: 'Ovqat mavzusi lug‘ati: mahsulotlar, pishirish usullari, restoranda buyurtma va ta’m ta’riflari. Tarjima, misollar va javobli mashqlar.',
    h1: 'Food and cooking: ovqat va pishirish lug‘ati',
    lead: 'Ovqat — Speaking dagi eng oson va eng tez-tez so‘raladigan mavzu. Ta’m ta’riflari va pishirish fe’llari bilan javobingizni boyiting.',
    updated: D,
    level: 'A2',
    related: [HUB, '/english/vocabulary/health', '/english/speaking', '/cefr/a2'],
    sections: [
      {
        heading: 'Pishirish fe’llari',
        paragraphs: ['Kerakli fe’llar:'],
        items: [
          'boil — qaynatmoq: Boil the rice for fifteen minutes.',
          'fry — qovurmoq: Fry the onions in oil.',
          'bake — pechda pishirmoq: She bakes bread every weekend.',
          'grill — panjarada pishirmoq: We grilled the meat.',
          'chop — maydalamoq: Chop the vegetables.',
          'stir — aralashtirmoq: Stir the soup slowly.',
          'peel — po‘stini tozalamoq: Peel the potatoes.'
        ]
      },
      {
        heading: 'Ta’m va restoran',
        paragraphs: ['Ta’m sifatlari: sweet (shirin), sour (nordon), bitter (achchiq-taxir), salty (sho‘r), spicy (achchiq, ziravorli), delicious (mazali), bland (ta’msiz). Restoranda: Could I see the menu, please? I’d like the soup as a starter. Could we have the bill, please? Is service included?']
      },
      {
        heading: 'Speaking uchun namuna',
        paragraphs: ['My favourite dish is plov. It is made with rice, carrots and meat, and it is usually cooked for special occasions. I enjoy cooking at the weekend because it helps me relax.']
      }
    ],
    exercises: [
      { prompt: '___ the potatoes before you boil them. (po‘stini tozalamoq)', answer: 'Peel' },
      { prompt: 'This soup is too ___; add some more water or less salt. (sho‘r)', answer: 'salty' },
      { prompt: 'Could we have the ___, please? (hisob)', answer: 'bill' },
      { prompt: 'She ___ bread every weekend. (pechda pishiradi)', answer: 'bakes' },
      { prompt: 'Food with a lot of pepper is ___.', answer: 'spicy' }
    ],
    faq: [
      { q: 'Meal va dish farqi nima?', a: 'Meal — ovqatlanish vaqti (breakfast, lunch, dinner). Dish — aniq taom (plov, soup).' }
    ]
  },
  {
    path: '/english/vocabulary/shopping-money',
    name: 'Xarid va pul lug‘ati',
    title: 'Shopping and money: xarid va pul lug‘ati | EduLevel',
    description: 'Xarid va pul mavzusi lug‘ati: do‘konda, narx, chegirma, to‘lov. Tarjima, misollar, foydali iboralar va javobli mashqlar.',
    h1: 'Shopping and money: xarid va pul lug‘ati',
    lead: 'Do‘konda va onlayn xaridda kerak bo‘ladigan so‘zlar va iboralar, shuningdek pul haqida gapirish uchun lug‘at.',
    updated: D,
    level: 'A2',
    related: [HUB, '/english/grammar/quantifiers', '/english/speaking', '/cefr/a2'],
    sections: [
      {
        heading: 'Do‘konda',
        paragraphs: ['Asosiy so‘zlar:'],
        items: [
          'price / cost — narx, turmoq: How much does it cost?',
          'discount / sale — chegirma / chegirmalar: There is a sale this week.',
          'receipt — chek: Keep the receipt.',
          'refund — pulni qaytarish: I asked for a refund.',
          'cash / credit card — naqd pul / kredit karta: Can I pay by card?',
          'cheap / expensive — arzon / qimmat: This phone is too expensive.',
          'afford — qurbi yetmoq: I can’t afford a new car.',
          'bargain — arzon va yaxshi xarid: The jacket was a bargain.'
        ]
      },
      {
        heading: 'Foydali iboralar',
        paragraphs: ['Could I try this on? Do you have this in a larger size? I’m just looking, thanks. Can I get a discount? Is there a guarantee? Kollokatsiyalar: save money (pul tejamoq), spend money on, waste money (pulni isrof qilmoq), pay in cash, shop online, do the shopping.']
      }
    ],
    exercises: [
      { prompt: 'Could you give me a ___ for this? I want to return it. (chek)', answer: 'receipt' },
      { prompt: 'I can’t ___ a new car. (qurbi yetmoq)', answer: 'afford' },
      { prompt: 'The shop has a big ___ this week. (chegirma)', answer: 'sale' },
      { prompt: 'Try to ___ money every month. (tejamoq)', answer: 'save' },
      { prompt: 'The jacket was cheap and good: a real ___.', answer: 'bargain' }
    ],
    faq: [
      { q: 'Cost, price va fee farqi?', a: 'Price — sotib olish narxi. Cost — nimaga qancha turishi yoki xarajat. Fee — xizmat uchun to‘lov (tuition fee, entrance fee).' }
    ]
  },
  {
    path: '/english/vocabulary/hobbies-free-time',
    name: 'Hobbi va bo‘sh vaqt lug‘ati',
    title: 'Hobbies and free time: hobbi va bo‘sh vaqt lug‘ati | EduLevel',
    description: 'Hobbi va bo‘sh vaqt mavzusi lug‘ati: sport, o‘qish, musiqa, sayr. Tarjima, misollar, Speaking uchun iboralar va javobli mashqlar.',
    h1: 'Hobbies and free time: hobbi va bo‘sh vaqt lug‘ati',
    lead: 'Hobbi mavzusi — Speaking Part 1 ning doimiy mavzusi. Quyidagi so‘zlar va iboralar javobingizni tabiiy qiladi.',
    updated: D,
    level: 'A2',
    related: [HUB, '/ielts/speaking', '/english/speaking', '/cefr/a2'],
    sections: [
      {
        heading: 'Asosiy so‘zlar',
        paragraphs: ['Kerakli so‘zlar:'],
        items: [
          'hobby — hobbi: My hobby is photography.',
          'pastime — vaqt o‘tkazish usuli: Reading is my favourite pastime.',
          'be keen on — juda yoqtirmoq: I’m keen on swimming.',
          'take up — (yangi hobbi) boshlamoq: I took up painting last year.',
          'relax / unwind — dam olmoq: Music helps me unwind.',
          'hang out — do‘stlar bilan vaqt o‘tkazmoq: We hang out at the weekend.',
          'work out — sport bilan shug‘ullanmoq: I work out three times a week.',
          'in my spare time — bo‘sh vaqtimda: In my spare time I read.'
        ]
      },
      {
        heading: 'Speaking uchun namunalar',
        paragraphs: ['In my spare time I enjoy cycling because it keeps me fit and lets me explore the city. I’m not very keen on team sports, but I like swimming. I took up photography two years ago, and I find it very relaxing.']
      },
      {
        heading: 'Tavsiya',
        paragraphs: ['Javobingizda sabab va misol bering: «I like reading» o‘rniga «I like reading, mainly because it helps me learn new words». Bu IELTS Speaking dagi javob rivojlantirishning asosiy usuli.']
      }
    ],
    exercises: [
      { prompt: 'I’m ___ on swimming. (juda yoqtirmoq)', answer: 'keen' },
      { prompt: 'She ___ up painting last year. (boshladi)', answer: 'took' },
      { prompt: 'Music helps me ___ after a long day. (dam olmoq)', answer: 'unwind / relax' },
      { prompt: 'In my ___ time I read books. (bo‘sh)', answer: 'spare / free' },
      { prompt: 'I ___ out three times a week. (sport bilan shug‘ullanaman)', answer: 'work' }
    ],
    faq: [
      { q: 'Hobbi haqidagi savolga qanday uzunroq javob beraman?', a: 'Javob + sabab + misol: «I like cycling, because it keeps me fit, and last weekend I rode to the lake.»' }
    ]
  }
];
