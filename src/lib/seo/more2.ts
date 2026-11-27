/** Multilevel, national-certificate preparation, study articles and two more grammar/vocabulary guides. Exam rules are not stated as facts: the pages point to the official source. */
import type { SeoPage } from './pages';

const D = '2026-11-25';

export const MORE_PAGES_2: SeoPage[] = [
  {
    path: '/multilevel/tayyorgarlik-rejasi',
    name: 'Multilevel tayyorgarlik rejasi',
    title: 'Multilevel imtihoniga tayyorgarlik rejasi: haftama-hafta | EduLevel',
    description: 'Multilevel (CEFR asosidagi) imtihoniga tayyorlanish rejasi: bo‘limlar bo‘yicha mashq jadvali, xatolar tahlili va vaqt taqsimoti. Rasmiy shartlar manbadan tekshiriladi.',
    h1: 'Multilevel imtihoniga tayyorgarlik rejasi',
    lead: 'Reja darajangizni aniqlashdan boshlanadi va har hafta bitta asosiy maqsadga qaratiladi. Imtihon shartlarini doim rasmiy manbadan tekshiring.',
    updated: D,
    level: 'B2',
    related: ['/multilevel', '/cefr/mock-test', '/cefr/exam-format-overview', '/english/level-test'],
    sections: [
      { heading: 'Boshlash', paragraphs: ['Birinchi hafta: daraja testi va to‘rt ko‘nikma bo‘yicha qisqa sinov. Natijaga qarab eng zaif ko‘nikmani belgilang va unga haftada eng ko‘p vaqt ajrating.'] },
      { heading: 'Haftalik tuzilma', paragraphs: ['Dushanba: Reading. Seshanba: Listening. Chorshanba: Writing va xatolarni tuzatish. Payshanba: Speaking monologlari. Juma: grammatika va so‘z takrori. Shanba: vaqt bilan mock bo‘lim. Yakshanba: dam yoki yengil takrorlash.'] },
      { heading: 'Xatolar daftari', paragraphs: ['Har mock testdan keyin xatolarni sabab bo‘yicha yozing: so‘z bilmaslik, e’tiborsizlik, vaqt yetmasligi. Keyingi haftada aynan shu sabablarga qarshi mashq tanlang.'] }
    ],
    exercises: [
      { prompt: 'Rejaning birinchi haftasida nima qilinadi?', answer: 'Daraja testi va to‘rt ko‘nikma bo‘yicha sinov' },
      { prompt: 'Xatolar qanday guruhlanadi?', answer: 'Sabab bo‘yicha: so‘z, e’tibor, vaqt' },
      { prompt: 'Imtihon shartlari qayerdan tekshiriladi?', answer: 'Rasmiy manbadan' }
    ],
    faq: [{ q: 'Reja hammaga mosmi?', a: 'Yo‘q, bu umumiy namuna. Boshlang‘ich darajangiz va imtihongacha qolgan vaqtga qarab o‘zgartiring.' }]
  },
  {
    path: '/multilevel/speaking-javoblari',
    name: 'Multilevel Speaking uchun javob tuzilishi',
    title: 'Multilevel Speaking: javobni qanday tuzish kerak | EduLevel',
    description: 'Multilevel Speaking bo‘limiga tayyorgarlik: javob tuzilishi, fikrni rivojlantirish, bog‘lovchilar, xatolarni kamaytirish va uy mashqlari.',
    h1: 'Multilevel Speaking: javob tuzilishi va mashq',
    lead: 'Speaking da baho faqat to‘g‘ri gap uchun emas: ravonlik, so‘z boyligi, grammatika va talaffuz birga baholanadi.',
    updated: D,
    level: 'B2',
    related: ['/multilevel', '/english/speaking', '/ielts/speaking/part-3-discussion', '/edubek-ai'],
    sections: [
      { heading: 'Javob qolipi', paragraphs: ['Fikringizni ayting, sabab keltiring, misol bering, qisqa xulosa qiling. Masalan: I prefer studying in the morning. My mind is fresh then. Last week I finished a chapter before lunch. So morning works best for me.'] },
      { heading: 'Ravonlik', paragraphs: ['Jim qolmaslik uchun to‘ldiruvchi iboralar: well, to be honest, let me think. Ularni me’yorida ishlating; har gapda emas.'] },
      { heading: 'Uyda mashq', paragraphs: ['Telefon bilan 1 daqiqalik javobni yozib oling. Tinglab, uzoq pauzalar va takrorlarni belgilang. Keyingi urinishda faqat bitta kamchilikni tuzating.'] }
    ],
    exercises: [
      { prompt: 'Javob qolipining to‘rt qismi?', answer: 'Fikr, sabab, misol, xulosa' },
      { prompt: 'To‘ldiruvchi iboraga misol?', answer: 'Well / let me think' },
      { prompt: 'Yozib olingan javobda nimani qidirasiz?', answer: 'Uzoq pauza va takrorlar' }
    ],
    faq: [{ q: 'Har safar bir xil javob yodlasam bo‘ladimi?', a: 'Yodlangan javob tabiiy eshitilmaydi va baholovchiga ma’lum bo‘ladi. Qolipni o‘rganing, mazmunni o‘zingiz to‘ldiring.' }]
  },
  {
    path: '/milliy-sertifikat/tayyorgarlik',
    name: 'Milliy sertifikatga tayyorgarlik',
    title: 'Ingliz tili milliy sertifikatiga tayyorgarlik: qo‘llanma | EduLevel',
    description: 'Milliy sertifikat imtihoniga tayyorgarlik uchun umumiy qo‘llanma: bosqichlar, mashq turlari va rasmiy talablarni tekshirish. Aniq shartlar rasmiy manbada.',
    h1: 'Milliy sertifikatga tayyorgarlik: umumiy qo‘llanma',
    lead: 'Milliy sertifikat shartlari (bo‘limlar, ball, muddat) davlat tashkilotlari tomonidan belgilanadi va o‘zgarishi mumkin. Bu sahifa faqat tayyorgarlik usulini beradi.',
    updated: D,
    level: 'B1',
    related: ['/multilevel', '/cefr-tayyorgarlik', '/cefr/mock-test', '/english/level-test'],
    sections: [
      { heading: 'Avval rasmiy talabni aniqlang', paragraphs: ['Qaysi daraja kerakligi, imtihon tuzilishi va natijaning amal qilish muddati uchun faqat rasmiy e’lon va yo‘riqnomalarga tayaning. EduLevel bu ma’lumotni kafolatlamaydi.'] },
      { heading: 'Tayyorgarlik bosqichlari', paragraphs: ['Darajani aniqlash, kerakli darajagacha bo‘shliqni baholash, ko‘nikmalar bo‘yicha reja, vaqt bilan mock mashqlar, xatolar tahlili. Har bosqich uchun alohida maqsad belgilang.'] },
      { heading: 'Mashq vositalari', paragraphs: ['Daraja testi, tematik mashqlar, mock testlar va EduBek AI bilan suhbat mashqlari. AI bahosi taxminiy ko‘rsatkich, rasmiy ball emas.'] }
    ],
    exercises: [
      { prompt: 'Imtihon shartlari qayerdan tekshiriladi?', answer: 'Rasmiy e’lon va yo‘riqnomalardan' },
      { prompt: 'AI bahosi rasmiy ballmi?', answer: 'Yo‘q, taxminiy ko‘rsatkich' },
      { prompt: 'Birinchi bosqich?', answer: 'Darajani aniqlash' }
    ],
    faq: [{ q: 'Sertifikat berasizlarmi?', a: 'Yo‘q. EduLevel tayyorgarlik platformasi; rasmiy sertifikatni imtihon o‘tkazuvchi tashkilot beradi.' }]
  },
  {
    path: '/blog/ingliz-tilini-nol-dan-boshlash',
    name: 'Ingliz tilini noldan boshlash',
    title: 'Ingliz tilini noldan boshlash: birinchi 30 kun uchun yo‘l | EduLevel',
    description: 'Ingliz tilini noldan boshlayotganlar uchun: nimadan boshlash, kuniga qancha mashq qilish, qanday xatolardan qochish va birinchi oy rejasi.',
    h1: 'Ingliz tilini noldan boshlash: birinchi oy',
    lead: 'Noldan boshlash qiyin ko‘rinadi, lekin birinchi oyda kichik va doimiy qadamlar yetarli. Bu maqola amaliy yo‘nalish beradi.',
    updated: D,
    level: 'A1',
    related: ['/study-plan/english-30-days', '/cefr/a1', '/english/vocabulary/family-relationships', '/english/level-test'],
    sections: [
      { heading: '1. Alifbo va tovushlar', paragraphs: ['Alifboni ingliz talaffuzida o‘rganing: ismni harflab ayta olish kerak bo‘ladi. Dastlabki hafta 100 ta eng ko‘p uchraydigan so‘zni o‘rganing.'] },
      { heading: '2. Birinchi gaplar', paragraphs: ['Tanishish, oila, kun tartibi haqida 10–15 ta tayyor gap tuzing. I am Aziz. I live in Tashkent. I study every day. Ularni ovoz chiqarib ayting.'] },
      { heading: '3. Tinglash', paragraphs: ['Kuniga 10 daqiqa sekin va aniq nutq tinglang. Hammasini tushunishga urinmang; tanish so‘zlarni ushlang.'] },
      { heading: 'Qochish kerak bo‘lgan xatolar', paragraphs: ['Faqat qoida yodlash, mashqsiz o‘qish, bir kunda uch soat va keyin bir hafta tanaffus. Kuniga 30–40 daqiqa, lekin har kun, ancha samaraliroq.'] }
    ],
    exercises: [
      { prompt: 'Birinchi haftada nechta so‘z tavsiya etiladi?', answer: 'Taxminan 100 ta' },
      { prompt: 'Qaysi odat afzal: kuniga 3 soat bir marta yoki har kuni 30 daqiqa?', answer: 'Har kuni 30 daqiqa' },
      { prompt: 'Tinglashda nimaga urinmaslik kerak?', answer: 'Hammasini tushunishga' }
    ],
    faq: [{ q: 'Repetitorsiz o‘rgansam bo‘ladimi?', a: 'Bo‘ladi, lekin tuzatuvchi fikr juda foydali. Xatolaringizni ko‘rsatadigan ustoz, kurs yoki AI yordamchi bilan mashq qilish yaxshi.' }]
  },
  {
    path: '/blog/speaking-ravonligini-oshirish',
    name: 'Speaking ravonligini oshirish',
    title: 'Ingliz tilida ravon gapirish: 7 ta amaliy usul | EduLevel',
    description: 'Ingliz tilida gapirish ravonligini oshirish usullari: soya texnikasi, o‘zini yozib olish, kunlik monolog, to‘ldiruvchi iboralar va xatolarga munosabat.',
    h1: 'Ingliz tilida ravon gapirish: amaliy usullar',
    lead: 'Ravonlik — xatosiz gapirish emas, to‘xtamasdan fikr aytish. Quyidagi usullarni har kuni 10–15 daqiqa qo‘llang.',
    updated: D,
    level: 'B1',
    related: ['/english/speaking', '/ielts/speaking/part-1-questions', '/edubek-ai', '/english/pronunciation/word-stress'],
    sections: [
      { heading: 'Soya texnikasi', paragraphs: ['Audioni tinglab, 1–2 so‘z ortidan xuddi shu gapni ovoz chiqarib takrorlang. Bu ritm va intonatsiyani o‘zlashtirishga yordam beradi.'] },
      { heading: 'Kunlik monolog', paragraphs: ['Bitta mavzu tanlang va 1 daqiqa to‘xtamasdan gapiring. Ertasi kuni xuddi shu mavzuni qayta ayting: ikkinchi urinishda odatda ravonroq bo‘ladi.'] },
      { heading: 'Xatoga munosabat', paragraphs: ['Gap o‘rtasida o‘zingizni tuzatib to‘xtamang. Avval fikrni oxirigacha ayting, xatoni yozuvdan keyin toping.'] },
      { heading: 'Suhbatdosh', paragraphs: ['Do‘st yoki EduBek AI bilan ovozli suhbat qiling. Real vaqtdagi javob tez fikrlashga o‘rgatadi.'] }
    ],
    exercises: [
      { prompt: 'Soya texnikasida nima qilinadi?', answer: 'Audioni tinglab ortidan takrorlanadi' },
      { prompt: 'Ravonlik uchun xatoni qachon tuzatish tavsiya etiladi?', answer: 'Gapirib bo‘lgandan keyin' },
      { prompt: 'Monologni qayta aytsangiz nima bo‘ladi?', answer: 'Odatda ravonroq chiqadi' }
    ],
    faq: [{ q: 'Aksentim ravonlikka xalaqit beradimi?', a: 'Tushunarli bo‘lsa, yo‘q. Ravonlik uchun tezlik va to‘xtovsizlik muhimroq.' }]
  },
  {
    path: '/blog/listening-yaxshilash-usullari',
    name: 'Listening yaxshilash usullari',
    title: 'Listening ni yaxshilash: faol tinglash va diktant | EduLevel',
    description: 'Ingliz tilida tinglab tushunishni yaxshilash: faol va passiv tinglash, qisman diktant, transkript bilan ishlash va keng tarqalgan xatolar.',
    h1: 'Listening ni yaxshilash: ishlaydigan usullar',
    lead: 'Tinglab tushunish tez rivojlanadi, agar tinglashni tahlil bilan birga olib borsangiz.',
    updated: D,
    level: 'B1',
    related: ['/ielts/listening', '/ielts/listening/form-and-map-completion', '/english/pronunciation/common-mistakes-uzbek-speakers', '/cefr/b1'],
    sections: [
      { heading: 'Faol tinglash', paragraphs: ['Qisqa audio (1–2 daqiqa) tanlang. Birinchi marta umumiy ma’noni tushuning, ikkinchi marta tafsilotlarni yozing, uchinchi marta transkript bilan solishtiring.'] },
      { heading: 'Diktant', paragraphs: ['Audioning 3–4 gapini to‘xtatib-to‘xtatib yozing. Yozolmagan joylar — tushunmagan so‘z yoki bog‘langan talaffuz. Bu aynan tuzatish kerak bo‘lgan joy.'] },
      { heading: 'Bog‘langan nutq', paragraphs: ['Tabiiy nutqda so‘zlar qo‘shilib ketadi: want to — wanna, going to — gonna. Bunday shakllarni tanib olishga o‘rganing.'] },
      { heading: 'Passiv tinglash', paragraphs: ['Yo‘lda yoki ishda fon sifatida tinglash lug‘atni va intonatsiyani o‘rganishga yordam beradi, lekin faol mashqning o‘rnini bosmaydi.'] }
    ],
    exercises: [
      { prompt: 'Faol tinglashning uch bosqichi?', answer: 'Umumiy ma’no, tafsilot, transkript bilan solishtirish' },
      { prompt: 'Diktantda yozolmagan joy nimani bildiradi?', answer: 'Tushunmagan so‘z yoki bog‘langan talaffuz' },
      { prompt: '“Going to” so‘zlashuvda qanday eshitiladi?', answer: 'Gonna' }
    ],
    faq: [{ q: 'Subtitr bilan tinglash foydalimi?', a: 'Boshida ha, lekin keyinchalik subtitrsiz tinglashga o‘ting, aks holda quloq emas, ko‘z ishlaydi.' }]
  },
  {
    path: '/blog/reading-tezligini-oshirish',
    name: 'Reading tezligini oshirish',
    title: 'Ingliz tilida tez va to‘g‘ri o‘qish: skim va scan | EduLevel',
    description: 'Ingliz tilidagi matnlarni tezroq o‘qish: skimming, scanning, kontekstdan ma’no topish va vaqt bilan mashq. Imtihon Reading bo‘limi uchun foydali.',
    h1: 'Reading tezligini oshirish: skimming va scanning',
    lead: 'Imtihon Reading bo‘limida vaqt yetishmasligi eng keng tarqalgan muammo. Ikki asosiy ko‘nikma — skimming va scanning — bunga yordam beradi.',
    updated: D,
    level: 'B2',
    related: ['/ielts/reading', '/ielts/reading/true-false-not-given', '/english/vocabulary/academic-word-list', '/cefr/b2'],
    sections: [
      { heading: 'Skimming', paragraphs: ['Matnni umumiy fikr uchun tez ko‘zdan kechirish: sarlavha, birinchi va oxirgi gaplar, abzatslarning boshi. Maqsad — matn nima haqida va qanday tuzilganini bilish.'] },
      { heading: 'Scanning', paragraphs: ['Aniq ma’lumotni qidirish: ism, raqam, sana, noyob so‘z. Butun matnni o‘qimay, kerakli joyni toping va faqat o‘shanda o‘qing.'] },
      { heading: 'Noma’lum so‘z', paragraphs: ['Har so‘zni lug‘atdan qidirmang. Atrofdagi so‘zlar, qo‘shimcha (un-, -less) va gap tuzilishidan ma’noni taxmin qiling.'] },
      { heading: 'Vaqt bilan mashq', paragraphs: ['Har matn uchun 18–20 daqiqa chegara qo‘ying va o‘zingizni sinang. Tugatolmagan savollar sababini yozib boring.'] }
    ],
    exercises: [
      { prompt: 'Raqam yoki ismni qidirish nima deyiladi?', answer: 'Scanning' },
      { prompt: 'Matn umumiy mavzusini bilish uchun nima qilinadi?', answer: 'Skimming' },
      { prompt: 'Noma’lum so‘zni nima asosida taxmin qilasiz?', answer: 'Kontekst va qo‘shimchalar' }
    ],
    faq: [{ q: 'Matnni boshidan oxirigacha o‘qimaslik xatomi?', a: 'Imtihon sharoitida yo‘q, ko‘pincha kerak. Avval savollarga qarang, so‘ng javob joyini toping va o‘sha qismni diqqat bilan o‘qing.' }]
  },
  {
    path: '/blog/lugat-yodlash-usullari',
    name: 'Lug‘at yodlash usullari',
    title: 'Inglizcha so‘zlarni yodlash: oraliqli takrorlash va kontekst | EduLevel',
    description: 'Inglizcha so‘zlarni uzoq muddatga eslab qolish: oraliqli takrorlash, gap ichida o‘rganish, kartochkalar va faol ishlatish usullari.',
    h1: 'Inglizcha so‘zlarni uzoq eslab qolish',
    lead: 'So‘z ro‘yxatini bir marta o‘qish yetmaydi. Xotira takrorlash va ishlatish orqali mustahkamlanadi.',
    updated: D,
    level: 'A2',
    related: ['/english/vocabulary', '/english/vocabulary/academic-word-list', '/study-plan/english-30-days', '/english/vocabulary/education'],
    sections: [
      { heading: 'Oraliqli takrorlash', paragraphs: ['So‘zni o‘rgangandan 1 kun, 3 kun, 1 hafta va 1 oy keyin takrorlang. Eslay olgan so‘zlarning oralig‘i uzayadi, eslay olmaganlari yana yaqin muddatga qaytadi.'] },
      { heading: 'Kontekst', paragraphs: ['So‘zni tarjimasi bilan emas, gap ichida yozing: I made a mistake. Birga keladigan so‘zlar (make a mistake) ham o‘rganiladi.'] },
      { heading: 'Faol ishlatish', paragraphs: ['Har yangi so‘z bilan o‘zingiz haqingizda bitta gap tuzing. Shaxsiy ma’noli gaplar yaxshiroq eslab qolinadi.'] },
      { heading: 'Kartochkalar', paragraphs: ['Bir tomonda inglizcha so‘z, ikkinchi tomonda misol gap. Kuniga 10–15 ta kartochkadan oshirmang.'] }
    ],
    exercises: [
      { prompt: 'Birinchi takrorlash qachon?', answer: '1 kundan keyin' },
      { prompt: 'So‘zni nima bilan birga yozish yaxshi?', answer: 'Misol gap va birga keladigan so‘zlar bilan' },
      { prompt: 'Kuniga nechta kartochka tavsiya etiladi?', answer: '10–15 ta' }
    ],
    faq: [{ q: 'Qancha so‘z kerak?', a: 'Kundalik muloqot uchun bir necha ming so‘z kerak, lekin avval eng ko‘p uchraydigan 1000–2000 so‘zni yaxshi o‘zlashtirish eng katta natija beradi.' }]
  },
  {
    path: '/blog/writing-xatolari-va-tuzatish',
    name: 'Writing xatolari va tuzatish',
    title: 'Ingliz tilida yozishda keng tarqalgan xatolar va tuzatish | EduLevel',
    description: 'O‘zbek tilida so‘zlashuvchilar yozuvda ko‘p qiladigan xatolar: artikl, zamon, so‘z tartibi, tinish belgilari. Tuzatish usullari va mashqlar.',
    h1: 'Writing da keng tarqalgan xatolar va ularni tuzatish',
    lead: 'Xatolarning ko‘pi bir necha toifaga to‘g‘ri keladi. Ularni bilsangiz, o‘zingizni tekshirish osonlashadi.',
    updated: D,
    level: 'B1',
    related: ['/ielts/writing', '/english/grammar/articles', '/english/grammar/present-perfect', '/english/grammar/linking-words'],
    sections: [
      { heading: 'Artikllar', paragraphs: ['O‘zbek tilida artikl yo‘q, shuning uchun a/the tushib qoladi. I have car noto‘g‘ri; I have a car to‘g‘ri.'] },
      { heading: 'Zamon va moslashuv', paragraphs: ['He go to school emas, he goes. Voqea o‘tmishda bo‘lsa, butun hikoya davomida zamonni bir xil saqlang.'] },
      { heading: 'So‘z tartibi', paragraphs: ['Ingliz gapida ega + fe’l + to‘ldiruvchi tartibi. Savolda yordamchi fe’l oldinga chiqadi: Where do you live?'] },
      { heading: 'O‘zini tekshirish', paragraphs: ['Yozganingizni ovoz chiqarib o‘qing va ro‘yxat bo‘yicha tekshiring: artikl, zamon, ega-fe’l moslashuvi, ko‘plik, tinish belgilari.'] }
    ],
    exercises: [
      { prompt: 'To‘g‘rilang: I have car.', answer: 'I have a car.' },
      { prompt: 'To‘g‘rilang: He go to school.', answer: 'He goes to school.' },
      { prompt: 'To‘g‘rilang: Where you live?', answer: 'Where do you live?' }
    ],
    faq: [{ q: 'AI tekshiruvi yetarlimi?', a: 'U yaxshi yordamchi, lekin har xatoni topa olmasligi mumkin. O‘z tekshiruv ro‘yxatingiz bilan birga ishlating.' }]
  },
  {
    path: '/english/grammar/adjectives-adverbs',
    name: 'Sifat va ravish',
    title: 'Adjectives va adverbs: sifat va ravishni farqlash | EduLevel',
    description: 'Inglizcha sifat va ravish: vazifasi, -ly qo‘shimchasi, istisnolar (fast, hard, well), so‘z tartibi, misollar va javobli mashqlar.',
    h1: 'Sifat (adjective) va ravish (adverb)',
    lead: 'Sifat otni tasvirlaydi, ravish esa fe’l, sifat yoki boshqa ravishni. Bu farq ko‘p xatoning oldini oladi.',
    updated: D,
    level: 'A2',
    related: ['/english/grammar', '/english/grammar/comparatives-superlatives', '/english/grammar/question-forms', '/cefr/a2'],
    sections: [
      { heading: 'Asosiy farq', paragraphs: ['She is a careful driver (sifat, driver ni tasvirlaydi). She drives carefully (ravish, drives ni tasvirlaydi). Ravish ko‘pincha sifatga -ly qo‘shib yasaladi.'] },
      { heading: 'Istisnolar', paragraphs: ['fast — fast (ham sifat, ham ravish), hard — hard, late — late. Good ning ravishi well: He plays well. Hardly va lately boshqa ma’no beradi (deyarli emas; yaqinda).'] },
      { heading: 'Joylashuvi', paragraphs: ['Sifat otdan oldin yoki be dan keyin keladi. Ravish odatda fe’ldan keyin yoki gap oxirida, takrorlanish ravishlari (always, never) esa asosiy fe’ldan oldin keladi.'] }
    ],
    exercises: [
      { prompt: 'She sings ___ (beautiful).', answer: 'beautifully' },
      { prompt: 'He is a ___ (good) player. He plays ___.', answer: 'good / well' },
      { prompt: 'They work ___ (hard).', answer: 'hard' },
      { prompt: 'I ___ (always) drink tea. So‘zni to‘g‘ri joylang.', answer: 'I always drink tea.' }
    ],
    faq: [{ q: 'Har ravish -ly bilan tugaydimi?', a: 'Yo‘q. fast, hard, late, well kabi ravishlarda -ly yo‘q; ba’zi -ly so‘zlar (friendly) sifatdir.' }]
  },
  {
    path: '/english/grammar/subject-verb-agreement',
    name: 'Ega va fe’l moslashuvi',
    title: 'Subject-verb agreement: ega va fe’l moslashuvi qoidalari | EduLevel',
    description: 'Ega va fe’l moslashuvi: birlik va ko‘plik, yig‘ma otlar, either/neither, there is/are, misollar va javobli mashqlar.',
    h1: 'Subject-verb agreement: ega va fe’l moslashuvi',
    lead: 'Fe’l egaga shaxs va sonda mos bo‘lishi kerak. Bu Writing da eng ko‘p uchraydigan xatolardan biri.',
    updated: D,
    level: 'B1',
    related: ['/english/grammar', '/english/grammar/present-simple', '/blog/writing-xatolari-va-tuzatish', '/cefr/b1'],
    sections: [
      { heading: 'Asosiy qoida', paragraphs: ['Birlik ega + -s li fe’l: The student works. Ko‘plik ega + oddiy fe’l: The students work. Present Simple da he/she/it bilan fe’lga -s qo‘shiladi.'] },
      { heading: 'Qiyin holatlar', paragraphs: ['Gap oraliq so‘zlar bilan uzaysa ham asosiy ega bo‘yicha moslang: The list of items is long. Everyone, somebody, each birlik hisoblanadi. Either … or / neither … nor da yaqin turgan ega bo‘yicha moslashadi.'] },
      { heading: 'There is / there are', paragraphs: ['There is a book, there are two books. Ro‘yxatda birinchi ot bo‘yicha: There is a pen and two books.'] }
    ],
    exercises: [
      { prompt: 'The list of items ___ long. (is/are)', answer: 'is' },
      { prompt: 'Everyone ___ here. (is/are)', answer: 'is' },
      { prompt: 'There ___ two books on the table. (is/are)', answer: 'are' },
      { prompt: 'The students ___ (work) hard.', answer: 'work' }
    ],
    faq: [{ q: 'Police va people qaysi son?', a: 'Ikkalasi ko‘plik fe’l bilan ishlatiladi: The police are here, people are waiting.' }]
  },
  {
    path: '/english/vocabulary/everyday-collocations',
    name: 'Kundalik kollokatsiyalar',
    title: 'Kundalik inglizcha kollokatsiyalar: make, do, take, have | EduLevel',
    description: 'Make, do, take, have, get fe’llari bilan keng tarqalgan inglizcha kollokatsiyalar: tarjima, misollar va javobli mashqlar.',
    h1: 'Kundalik kollokatsiyalar: make, do, take, have, get',
    lead: 'Kollokatsiya — birga keladigan so‘zlar. Ularni bilish tabiiy gapirishning asosi.',
    updated: D,
    level: 'B1',
    related: ['/english/vocabulary', '/blog/lugat-yodlash-usullari', '/english/speaking', '/cefr/b1'],
    sections: [
      { heading: 'Make va do', paragraphs: ['make: a decision, a mistake, progress, money, a phone call. do: homework, the dishes, research, business, your best. Natijada yangi narsa paydo bo‘lsa odatda make, faoliyat yoki vazifa uchun do.'] },
      { heading: 'Take va have', paragraphs: ['take: a photo, a break, a chance, an exam, medicine. have: lunch, a shower, a look, fun, a conversation.'] },
      { heading: 'Get', paragraphs: ['get: a job, better, tired, a message, home. Bu fe’l ma’nosi kontekstga qarab o‘zgaradi (olmoq, bo‘lmoq, yetib bormoq).'] }
    ],
    exercises: [
      { prompt: 'Please ___ a decision. (make/do)', answer: 'make' },
      { prompt: 'I ___ my homework after school. (make/do)', answer: 'do' },
      { prompt: 'Let’s ___ a break. (take/have)', answer: 'take' },
      { prompt: 'We ___ lunch at one. (take/have)', answer: 'have' },
      { prompt: 'He ___ tired after work. (gets/takes)', answer: 'gets' }
    ],
    faq: [{ q: 'Kollokatsiyalarni qanday topaman?', a: 'Yaxshi lug‘at va o‘qigan matnlaringizdan. Yangi so‘zni o‘rganganda u bilan birga keladigan fe’lni ham yozing.' }]
  }
];
