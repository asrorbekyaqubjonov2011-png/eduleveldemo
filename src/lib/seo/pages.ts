/**
 * Public SEO pages. Each page is original, server-rendered (see app/[...seoPath]) and states only facts that are true:
 * the public structure of IELTS and CEFR, and what EduLevel really offers. No invented statistics, reviews or results.
 */
import type { EduExercise, EduFaq, EduSection } from '@/src/components/seo/EduPage';
import { ENRICHMENTS, UPDATED } from './enrich';
import { GRAMMAR_PAGES } from './grammar';
import { GRAMMAR_PAGES_2 } from './grammar2';
import { VOCAB_PAGES } from './vocab';
import { IELTS_PAGES_2 } from './ielts2';
import { MORE_PAGES } from './more';
import { MORE_PAGES_2 } from './more2';
import { LEVEL_PAGES } from './levels';

export interface SeoPage {
  path: string;
  name: string;
  title: string;
  description: string;
  h1: string;
  lead: string;
  sections: EduSection[];
  /** Paths of closely related pages (linked on the page). */
  related?: string[];
  /** Pages marked draft are published for search only after the owner confirms the text (legal pages). */
  draft?: boolean;
  /** Questions and answers shown on the page (and only those go into FAQPage structured data). */
  faq?: EduFaq[];
  /** Practice questions with answers shown on the page (LearningResource structured data). */
  exercises?: EduExercise[];
  /** The day the text was last reviewed or changed (YYYY-MM-DD). Used for sitemap lastmod and "yangilangan" text. */
  updated?: string;
  /** CEFR level the page is written for, when it has one. */
  level?: string;
  /** Owner pages: hidden from search engines even when published. */
  noindexOverride?: boolean;
}

const BASE_PAGES: SeoPage[] = [
  {
    path: '/ielts',
    related: ['/ielts/listening', '/ielts/reading', '/ielts/writing', '/ielts/speaking', '/ielts/mock-test', '/ielts/band-score', '/blog/ielts-nol-dan-tayyorlanish', '/blog/ielts-writing-task-2-tuzilishi'],
    name: 'IELTS',
    title: 'IELTS imtihoniga tayyorlanish — barcha modullar | EduLevel',
    description: 'IELTS Listening, Reading, Writing va Speaking modullari bo‘yicha mustaqil tayyorlanish: tuzilma, vaqt va mashq yo‘llari.',
    h1: 'IELTS imtihoniga tayyorlanish',
    lead: 'IELTS to‘rt modul (Listening, Reading, Writing, Speaking)dan iborat. Har bir modul alohida ko‘nikmani tekshiradi, shuning uchun tayyorlanish ham modul bo‘yicha rejalashtiriladi.',
    sections: [
      {
        heading: 'Modullar qisqacha',
        paragraphs: ['Listening va Reading modullari bitta varaq yoki kompyuterda o‘tkaziladi va javoblar darhol baholanadi. Writing va Speaking ustozlar yoki maxsus baholovchilar tomonidan baholanadi.'],
        items: [
          'Listening: 4 qism, 40 savol, audio bo‘yicha.',
          'Reading: 40 savol, 60 daqiqa (Academic va General Training variantlari bor).',
          'Writing: 2 ta vazifa, 60 daqiqa.',
          'Speaking: 3 qism, taxminan 11–14 daqiqa, suhbat shaklida.'
        ]
      },
      {
        heading: 'Qayerdan boshlash kerak',
        paragraphs: ['Avval o‘z darajangizni bilib oling, so‘ng eng kuchsiz modulga ko‘proq vaqt ajrating. Har bir modul uchun tegishli sahifani o‘qing: /ielts/listening, /ielts/reading, /ielts/writing, /ielts/speaking.']
      },
      {
        heading: 'EduLevel’da IELTS',
        paragraphs: ['EduLevel’da IELTS yo‘nalishi bo‘yicha darslar, mashqlar va mock testlar bor. Mock test natijalari tizim ichida ko‘rinadi; rasmiy IELTS ball faqat imtihon markazi tomonidan beriladi.']
      }
    ]
  },
  {
    path: '/ielts/listening',
    related: ['/ielts', '/ielts/reading', '/ielts/mock-test'],
    name: 'IELTS Listening',
    title: 'IELTS Listening — tuzilma va tayyorgarlik | EduLevel',
    description: 'IELTS Listening moduli: 4 qism, 40 savol, javob yozish qoidalari va audio tinglashni o‘rganish usullari.',
    h1: 'IELTS Listening moduli',
    lead: 'Listening moduli audio yozuvni bir marta eshitib, savollarga javob berishni talab qiladi. Savollar tartibi audio bilan bir xil bo‘ladi.',
    sections: [
      {
        heading: 'Tuzilma',
        paragraphs: ['Modul 4 qismdan iborat: ikki kishi suhbati va monolog, so‘ng akademik muhitdagi suhbat va ma’ruza. Jami 40 savol.'],
        items: ['Qism 1–2: kundalik hayot mavzulari.', 'Qism 3–4: ta’lim va akademik mavzular.', 'Javoblar imlosi va so‘z chegarasi savol ko‘rsatmasida yoziladi.']
      },
      {
        heading: 'Mashq usuli',
        paragraphs: ['Har kuni bir qism tinglang, savollarni tinglashdan oldin o‘qing, so‘ng javobni yozing. Keyin tagyozuv bilan tekshiring va xatolarni yozib boring: qaysi so‘z eshitilmadi, qaysi imlo xato bo‘ldi.']
      }
    ]
  },
  {
    path: '/ielts/reading',
    related: ['/ielts', '/ielts/listening', '/ielts/mock-test'],
    name: 'IELTS Reading',
    title: 'IELTS Reading — strategiya va mashqlar | EduLevel',
    description: 'IELTS Reading moduli: 3 matn, 40 savol, 60 daqiqa. Academic va General Training farqlari va vaqt boshqaruvi.',
    h1: 'IELTS Reading moduli',
    lead: 'Reading moduli 60 daqiqada uchta matn va 40 savolni o‘z ichiga oladi. Asosiy qiyinchilik vaqtni taqsimlash va matnda javobni tez topishdir.',
    sections: [
      {
        heading: 'Vaqtni taqsimlash',
        paragraphs: ['Har bir matnga taxminan 20 daqiqa ajrating. Savol turini avval aniqlang: true/false/not given, sarlavha moslash, to‘ldirish.'],
        items: ['Savollarni o‘qib, kalit so‘zlarni belgilang.', 'Matnda shu so‘zlar yoki ma’noga yaqin iboralarni qidiring.', 'Javobsiz qolgan savollarga ham javob yozing: noto‘g‘ri javob ball olib kelmaydi.']
      },
      {
        heading: 'Academic va General Training',
        paragraphs: ['Academic matnlar ilmiy-ommabop uslubda, General Training esa kundalik va ish muhitidagi hujjatlardan iborat. Ikkala variant uchun ham mashqlar mavjud.']
      }
    ]
  },
  {
    path: '/ielts/writing',
    related: ['/ielts', '/ielts/speaking', '/edubek-ai', '/blog/ielts-writing-task-2-tuzilishi'],
    name: 'IELTS Writing',
    title: 'IELTS Writing Task 1 va Task 2 — tayyorgarlik | EduLevel',
    description: 'IELTS Writing: Task 1 (kamida 150 so‘z, ~20 daqiqa) va Task 2 (kamida 250 so‘z, ~40 daqiqa) uchun tuzilma va mashq.',
    h1: 'IELTS Writing: Task 1 va Task 2',
    lead: 'Writing moduli ikki vazifadan iborat. Task 1 da grafik yoki jadval tahlil qilinadi, Task 2 da esse yoziladi. Har ikkisi ham uslub va mantiqiy tuzilishga e’tibor beradi.',
    sections: [
      {
        heading: 'Vazifalar',
        paragraphs: [],
        items: ['Task 1: kamida 150 so‘z, taxminan 20 daqiqa. Grafik yoki jadvalning asosiy tendensiyalarini yozing.', 'Task 2: kamida 250 so‘z, taxminan 40 daqiqa. Fikrni dalil va misol bilan asoslang.']
      },
      {
        heading: 'Yozma mashq',
        paragraphs: ['Har hafta bitta Task 2 esse yozing, so‘ng kirish, asosiy paragraflar va xulosa tuzilishini tekshiring. Xatolarni EduBek bilan tahlil qilishingiz mumkin, lekin rasmiy baho imtihon markazi tomonidan beriladi.']
      }
    ]
  },
  {
    path: '/ielts/speaking',
    related: ['/ielts', '/english/speaking', '/edubek-ai'],
    name: 'IELTS Speaking',
    title: 'IELTS Speaking — 3 qism va savollar | EduLevel',
    description: 'IELTS Speaking moduli: Part 1, 2, 3 tuzilishi, taxminan 11–14 daqiqa, og‘zaki mashq usullari.',
    h1: 'IELTS Speaking moduli',
    lead: 'Speaking moduli imtihon oluvchi bilan suhbatdan iborat: tanishtiruv, bir mavzuda monolog va chuqurroq muhokama.',
    sections: [
      {
        heading: 'Uch qism',
        paragraphs: [],
        items: ['Part 1: tanish mavzular bo‘yicha qisqa savol-javob.', 'Part 2: berilgan mavzuda 1–2 daqiqa gapirish (tayyorlanish uchun 1 daqiqa).', 'Part 3: Part 2 mavzusi bo‘yicha mavhumroq muhokama.']
      },
      {
        heading: 'Mashq usuli',
        paragraphs: ['Har kuni bitta mavzuda 2 daqiqa gapiring va yozib oling. Tinglab, to‘xtab qolgan joylarni va takrorlangan so‘zlarni belgilang. EduLevel’da ovozli suhbat (EduBek) bilan ham mashq qilish mumkin.']
      }
    ]
  },
  {
    path: '/ielts/mock-test',
    related: ['/ielts', '/ielts/band-score', '/cefr/mock-test', '/blog/mock-test-qanday-ishlatiladi'],
    name: 'IELTS mock test',
    title: 'IELTS mock test — imtihon sharoitida mashq | EduLevel',
    description: 'EduLevel’dagi IELTS mock testlar: vaqt bilan ishlash, natija va xatolar tahlili. Rasmiy ball emas, tayyorgarlik uchun.',
    h1: 'IELTS mock test',
    lead: 'Mock test — haqiqiy imtihonga o‘xshash sharoitda ishlash imkoni. Maqsad vaqtni his qilish va zaif joylarni topishdir.',
    sections: [
      {
        heading: 'Nimani tekshiradi',
        paragraphs: ['Mock testlar vaqt chegarasi bilan ishlaydi. Natijalar tizimda saqlanadi va xatolar bo‘yicha qayta ko‘rib chiqish mumkin.'],
        items: ['Vaqtni boshqarish.', 'Savol turlari bo‘yicha natija.', 'Takroriy xatolar ro‘yxati.']
      },
      {
        heading: 'Muhim eslatma',
        paragraphs: ['Mock test natijasi rasmiy IELTS bali emas. U tayyorgarlik darajasini ko‘rsatadi, xolos.']
      }
    ]
  },
  {
    path: '/ielts/band-score',
    related: ['/ielts', '/ielts/mock-test', '/cefr/mock-test'],
    name: 'IELTS band score',
    title: 'IELTS band score nima? — 0 dan 9 gacha | EduLevel',
    description: 'IELTS band score qanday hisoblanadi: 9 ballik shkala, to‘rt modul o‘rtachasi va yaxlitlash qoidasi.',
    h1: 'IELTS band score nima?',
    lead: 'IELTS natijasi 0 dan 9 gacha bo‘lgan band (ball) bilan ifodalanadi, yarim ball bilan ham. Har bir modul alohida baholanadi, umumiy band esa to‘rt modul o‘rtachasidan chiqariladi.',
    sections: [
      {
        heading: 'Hisoblash',
        paragraphs: ['To‘rt modul bandining o‘rtachasi hisoblanadi va rasmiy qoidaga ko‘ra yaxlitlanadi. Aniq qoidalar imtihon markazi hujjatlarida berilgan.']
      },
      {
        heading: 'Tayyorgarlik uchun',
        paragraphs: ['Maqsadli band tanlang va unga mos modullar bo‘yicha reja tuzing. Band kafolati haqida hech kim aniq va’da bera olmaydi: natija tayyorgarlik vaqti, daraja va imtihon kunidagi holatga bog‘liq.']
      }
    ]
  },
  {
    path: '/cefr/mock-test',
    related: ['/multilevel', '/english/level-test', '/ielts/band-score', '/blog/cefr-darajalari-tushuntirish'],
    name: 'CEFR mock test',
    title: 'CEFR mock test — A1 dan C2 gacha | EduLevel',
    description: 'CEFR darajalari bo‘yicha mock testlar va darajani taxminiy aniqlash. A1–C2 darajalar tavsifi.',
    h1: 'CEFR mock test',
    lead: 'CEFR olti daraja (A1, A2, B1, B2, C1, C2) bo‘yicha ishlaydi. Mock test sizning hozirgi darajangizni taxminan ko‘rsatadi.',
    sections: [
      {
        heading: 'Darajalar',
        paragraphs: [],
        items: ['A1–A2: asosiy kundalik iboralar.', 'B1: tanish mavzularda fikr bayon qilish.', 'B2: murakkab matn va muhokama.', 'C1–C2: keng va nozik ma’noli matnlar.']
      },
      {
        heading: 'Rasmiy baho haqida',
        paragraphs: ['Mock test natijasi rasmiy CEFR sertifikati emas. Rasmiy natija tegishli imtihon markazi tomonidan beriladi.']
      }
    ]
  },
  {
    path: '/multilevel',
    related: ['/cefr/mock-test', '/english/level-test', '/english/grammar'],
    name: 'Multilevel',
    title: 'Multilevel — ingliz tili darajasi bo‘yicha tayyorgarlik | EduLevel',
    description: 'Multilevel yo‘nalishi: darslar va testlar CEFR darajalari bo‘yicha tuzilgan, o‘quvchi darajasiga mos tanlanadi.',
    h1: 'Multilevel: darajaga mos ingliz tili',
    lead: 'Multilevel yo‘nalishida darslar va test paketlari CEFR darajalari bo‘yicha tuzilgan. Siz o‘z darajangizdan boshlab, keyingi darajaga o‘tasiz.',
    sections: [
      {
        heading: 'Qanday ishlaydi',
        paragraphs: ['Dars tugagach vazifa va test bajariladi. Keyingi dars oldingi dars tugagach ochiladi, shunda bilim ketma-ket mustahkamlanadi.']
      }
    ]
  },
  {
    path: '/english/grammar',
    related: ['/english/vocabulary', '/english/speaking', '/edubek-ai', '/blog/ingliz-tili-zamonlari-qisqacha'],
    name: 'English grammar',
    title: 'Ingliz tili grammatikasi — zamonlar va qoidalar | EduLevel',
    description: 'Ingliz tili grammatikasi: Present, Past, Future zamonlari, Perfect, shartli gaplar, passiv nisbat va modal fe’llar.',
    h1: 'Ingliz tili grammatikasi',
    lead: 'Grammatika qoidalarini yodlamasdan, misollar orqali o‘rganish eng samarali usul hisoblanadi. Quyida asosiy mavzular va ularni mashq qilish tartibi.',
    sections: [
      {
        heading: 'Asosiy mavzular',
        paragraphs: [],
        items: ['Present Simple va Present Continuous.', 'Past Simple va Past Continuous.', 'Present Perfect: qachon va qanday ishlatiladi.', 'Future: will, be going to va hozirgi davom etuvchi.', 'Modal fe’llar: can, must, should, may.', 'Passive voice va reported speech.']
      },
      {
        heading: 'Mashq tartibi',
        paragraphs: ['Har kuni bitta zamon. Misol gap yozing, keyin o‘zingiz tuzgan gapni boshqa mavzuga moslab qayta yozing. Xatolarni tekshirib, qoidani o‘zingiz izohlang.']
      }
    ]
  },
  {
    path: '/english/vocabulary',
    related: ['/english/grammar', '/english/speaking'],
    name: 'English vocabulary',
    title: 'Ingliz tili lug‘ati — so‘z yodlash usullari | EduLevel',
    description: 'Inglizcha so‘z boyligini oshirish: kontekstda yodlash, phrasal verbs va idiomalar, takrorlash usuli.',
    h1: 'Ingliz tili lug‘ati',
    lead: 'So‘zni yodlash uchun uni gap ichida, kontekstda eslab qolish kerak. Ro‘yxat yodlash ko‘pincha uzoq saqlanmaydi.',
    sections: [
      {
        heading: 'Usullar',
        paragraphs: [],
        items: ['Har kuni 10 ta yangi so‘z, har biri bilan bitta gap.', 'Takrorlash: 1 kun, 3 kun, 7 kun oralig‘ida (flashcard orqali).', 'Phrasal verbs va idiomalarni mavzu bo‘yicha guruhlash.']
      }
    ]
  },
  {
    path: '/english/speaking',
    related: ['/english/grammar', '/edubek-ai', '/ielts/speaking'],
    name: 'English speaking',
    title: 'Ingliz tilida gapirish — mashq usullari | EduLevel',
    description: 'Inglizcha gapirishni rivojlantirish: talaffuz, qisqa monolog va muloqot mashqlari, EduBek bilan ovozli suhbat.',
    h1: 'Ingliz tilida gapirish',
    lead: 'Gapirish ko‘nikmasi muntazam mashq bilan rivojlanadi. Har kuni qisqa bo‘lsa ham gapirish, bir haftalik tanaffusdan ko‘ra samaraliroq.',
    sections: [
      {
        heading: 'Kundalik mashq',
        paragraphs: [],
        items: ['5 daqiqa: bugungi kun haqida 5 gap.', '5 daqiqa: bitta mavzu bo‘yicha monolog, yozib olish.', 'Talaffuz: so‘zni eshiting, takrorlang, yozib solishtiring.']
      },
      {
        heading: 'EduBek bilan',
        paragraphs: ['EduBek ovozli suhbatda inglizcha gapiradi va sizga qisqa tuzatishlar beradi. U xato bo‘lishi mumkin, shuning uchun muhim qarorlarni o‘qituvchi bilan tekshiring.']
      }
    ]
  },
  {
    path: '/english/level-test',
    related: ['/cefr/mock-test', '/multilevel'],
    name: 'Ingliz tili darajasini aniqlash',
    title: 'Ingliz tili darajasini aniqlash — onlayn test | EduLevel',
    description: 'Ingliz tili darajangizni taxminan aniqlash uchun onlayn test: A1 dan C2 gacha, natija va tavsiya.',
    h1: 'Ingliz tili darajasini aniqlash',
    lead: 'Daraja testi sizga boshlang‘ich nuqtani ko‘rsatadi. Natija rasmiy sertifikat emas, lekin qaysi darajadan boshlash kerakligini tushunishga yordam beradi.',
    sections: [
      {
        heading: 'Test qanday o‘tadi',
        paragraphs: ['Test savollari grammatika, lug‘at va o‘qish ko‘nikmasini tekshiradi. Natija daraja va keyingi qadamlar bo‘yicha tavsiya bilan chiqadi.']
      }
    ]
  },
  {
    path: '/edubek-ai',
    related: ['/english/grammar', '/english/speaking', '/ielts/writing'],
    name: 'EduBek AI',
    title: 'EduBek AI — ingliz tili yordamchisi | EduLevel',
    description: 'EduBek AI: ingliz tili savollariga javob, yozma va ovozli suhbat mashqlari. Faqat ta’lim mavzularida ishlaydi.',
    h1: 'EduBek AI — ingliz tili yordamchisi',
    lead: 'EduBek EduLevel platformasining sun’iy intellekt yordamchisi. U ingliz tili, grammatika, IELTS/CEFR tayyorgarligi va platforma haqidagi savollarga javob beradi.',
    sections: [
      {
        heading: 'Nima qila oladi',
        paragraphs: [],
        items: ['Grammatika va so‘z savollariga qisqa, misolli javob.', 'Yozma matnni tuzatish va tushuntirish.', 'Ovozli suhbat: inglizcha gapirish mashqi.']
      },
      {
        heading: 'Cheklovlari',
        paragraphs: ['EduBek xato qilishi mumkin. Tibbiy, huquqiy yoki moliyaviy masalalarda javob bermaydi. Muhim qarorlar uchun mutaxassisga murojaat qiling.']
      }
    ]
  },
  {
    path: '/about',
    related: ['/editorial-policy', '/contact'],
    name: 'Biz haqimizda',
    title: 'EduLevel haqida | EduLevel',
    description: 'EduLevel — IELTS, CEFR va General English uchun onlayn ta’lim platformasi. Maqsadimiz va qanday ishlashimiz.',
    h1: 'EduLevel haqida',
    lead: 'EduLevel — ingliz tilini mustaqil o‘rganish uchun onlayn platforma: darslar, mashqlar, mock testlar va AI yordamchi EduBek.',
    sections: [
      {
        heading: 'Maqsad',
        paragraphs: ['Ingliz tilini aniq reja bilan o‘rganishni osonlashtirish. Har bir o‘quvchi o‘z darajasidan boshlaydi va natijasini ko‘radi.']
      },
      {
        heading: 'Kontent qanday tayyorlanadi',
        paragraphs: ['Dars va mashqlar ustoz tomonidan tayyorlanadi va nashrdan oldin ko‘rib chiqiladi. Tahririyat tamoyillari: /editorial-policy.']
      }
    ]
  },
  {
    path: '/contact',
    related: ['/about', '/privacy'],
    name: 'Aloqa',
    title: 'Aloqa — EduLevel | EduLevel',
    description: 'EduLevel bilan bog‘lanish: Telegram bot va platformadagi murojaat bo‘limi.',
    h1: 'Aloqa',
    lead: 'Savollar va murojaatlar uchun quyidagi kanallardan foydalaning.',
    sections: [
      {
        heading: 'Bog‘lanish usullari',
        paragraphs: [],
        items: ['Telegram bot: @edu_levelbot — dars kodi, depozit va yordam.', 'Platforma ichida: profil → murojaat (qo‘llab-quvvatlash).']
      }
    ]
  },
  {
    path: '/privacy',
    related: ['/terms', '/about'],
    name: 'Maxfiylik siyosati',
    title: 'Maxfiylik siyosati | EduLevel',
    description: 'EduLevel maxfiylik siyosati: qanday ma’lumot yig‘iladi, kimga yuboriladi, qanday himoyalanadi.',
    h1: 'Maxfiylik siyosati',
    lead: 'Ushbu sahifa EduLevel platformasi qanday ma’lumot yig‘ishi va uni qanday ishlatishi haqida. Matn platforma kodidagi haqiqiy ishlov berish jarayonlariga asoslangan.',
    sections: [
      {
        heading: 'Qanday ma’lumot yig‘iladi',
        paragraphs: ['Ro‘yxatdan o‘tishda: ism, familiya, telefon raqam yoki elektron pochta. Google orqali kirishda: Google hisobingizdagi ism, e-mail va profil rasmi. O‘quv jarayonida: mashq va test natijalari, dars progressi, AI bilan suhbat matnlari va to‘lov uchun yuklangan chek.', 'Parollar faqat xeshlangan (scrypt) ko‘rinishda saqlanadi va ochiq holatda hech qayerda ko‘rsatilmaydi.']
      },
      {
        heading: 'Nima uchun ishlatiladi',
        paragraphs: ['Hisobingizni boshqarish, darslar va natijalarni ko‘rsatish, depozit cheklarini tekshirish, savollarga javob berish va xavfsizlikni ta’minlash (kirishlarni cheklash, firibgarlikni oldini olish).']
      },
      {
        heading: 'Uchinchi tomon xizmatlari',
        paragraphs: [
          'Google (Firebase Authentication): Google orqali kirish uchun. Kirish tokeni serverda Google imzosi bo‘yicha tekshiriladi.',
          'Supabase: ma’lumotlar bazasi va fayllar (chek rasmlari, yuklangan materiallar) saqlanadi.',
          'Render: sayt serveri (Singapur mintaqasi) ishlaydi.',
          'Sun’iy intellekt provayderlari (Google Gemini, Groq, DeepSeek, OpenRouter, Mistral): EduBek AI suhbati, mashq baholash va savollarga javob uchun yozgan matningiz ushbu provayderlarga yuboriladi. EduBek suhbatida sizga ism bilan murojaat qilish uchun ismingiz (familiyasiz) so‘rovga qo‘shiladi. Telefon raqamingiz va e-mailingiz AI so‘roviga qo‘shilmaydi.',
          'Telegram: EduLevel Telegram boti orqali yuborilgan xabarlar va cheklar Telegram serveri orqali o‘tadi.'
        ]
      },
      {
        heading: 'Cookie va brauzer xotirasi',
        paragraphs: ['Sayt sessiya uchun el_session nomli cookie ishlatadi (faqat HTTP orqali, boshqa saytlardan so‘rovni cheklaydi). Brauzer xotirasida (localStorage) interfeys sozlamalari, imtihon holati va mehmon identifikatori saqlanadi. Reklama yoki tashqi kuzatish (analytics) skriptlari ishlatilmaydi.']
      },
      {
        heading: 'Huquqlaringiz',
        paragraphs: ['Shaxsiy ma’lumotingizni ko‘rish, tuzatish yoki hisobingizni o‘chirish so‘rovi bilan EduLevel bilan bog‘laning: Telegram @edu_levelbot.']
      }
    ]
  },
  {
    path: '/terms',
    related: ['/privacy', '/about'],
    name: 'Foydalanish shartlari',
    title: 'Foydalanish shartlari | EduLevel',
    description: 'EduLevel platformasidan foydalanish shartlari: hisob, kontent, to‘lov va javobgarlik.',
    h1: 'Foydalanish shartlari',
    lead: 'EduLevel saytidan va Telegram botidan foydalanish shartlari.',
    sections: [
      {
        heading: 'Hisob',
        paragraphs: ['Har bir foydalanuvchi o‘z hisobini himoya qiladi. Hisobni boshqalarga bermaslik tavsiya etiladi. Hisob orqali bajarilgan amallar uchun hisob egasi javobgar.']
      },
      {
        heading: 'Kontent',
        paragraphs: ['Dars, mashq va testlar faqat shaxsiy o‘quv maqsadida ishlatiladi. Ularni ruxsatsiz nusxalash, sotish yoki tarqatish taqiqlanadi.']
      },
      {
        heading: 'AI javoblari',
        paragraphs: ['EduBek AI va baholash javoblari avtomatik yaratiladi va xato bo‘lishi mumkin. Ular rasmiy imtihon natijasi yoki professional maslahat o‘rnini bosmaydi.']
      },
      {
        heading: 'To‘lov va VIP',
        paragraphs: ['VIP tariflar va depozit to‘lovlari sayt ichida ko‘rsatilgan narx va muddat bo‘yicha amal qiladi. Depozit cheki egasi tomonidan tasdiqlangandan keyin hisobga o‘tkaziladi.']
      },
      {
        heading: 'Taqiqlangan foydalanish',
        paragraphs: ['Boshqa foydalanuvchi hisobiga kirish, imtihon cheklovlarini chetlab o‘tish, xizmatga zarar yetkazadigan so‘rovlar yuborish taqiqlanadi. Buzilish holatida hisob cheklanishi mumkin.']
      },
      {
        heading: 'Xizmat o‘zgarishi',
        paragraphs: ['EduLevel xizmat tarkibi va narxlarini o‘zgartirish huquqini saqlaydi. Muhim o‘zgarishlar sayt orqali e’lon qilinadi.']
      }
    ]
  },
  {
    path: '/editorial-policy',
    related: ['/about'],
    name: 'Tahririyat tamoyillari',
    title: 'Tahririyat tamoyillari | EduLevel',
    description: 'EduLevel kontentni qanday tayyorlaydi va tekshiradi: muallif, ko‘rib chiqish va yangilash.',
    h1: 'Tahririyat tamoyillari',
    lead: 'Biz o‘quv kontentini aniq, tekshirilgan va yangilanadigan qilib tayyorlashga harakat qilamiz.',
    sections: [
      {
        heading: 'Muallif va ko‘rib chiqish',
        paragraphs: ['Har bir dars va maqola muallif tomonidan yoziladi va nashrdan oldin boshqa ko‘ruvchi tomonidan tekshiriladi. Yangilanish sanasi sahifada ko‘rsatiladi.']
      },
      {
        heading: 'Rasmiy ma’lumot',
        paragraphs: ['IELTS va CEFR tuzilmasi haqidagi ma’lumotlar rasmiy manbalarga asoslanadi. Rasmiy hamkorlik yoki sertifikat berish huquqi haqida da’vo qilinmaydi.']
      }
    ]
  },
  {
    path: "/blog",
    name: "Blog",
    title: "Blog — IELTS, CEFR va ingliz tili maqolalari | EduLevel",
    description: "IELTS, CEFR va ingliz tili bo‘yicha original maqolalar: tayyorgarlik rejasi, zamonlar, esse tuzilishi va mock test.",
    h1: "Blog: IELTS, CEFR va ingliz tili",
    lead: "Ingliz tili va imtihonlar bo‘yicha qisqa, aniq maqolalar. Har bir maqola tayyorlanish amaliyotiga asoslangan.",
    related: ["/blog/ielts-nol-dan-tayyorlanish", "/blog/cefr-darajalari-tushuntirish", "/blog/ielts-writing-task-2-tuzilishi", "/blog/ingliz-tili-zamonlari-qisqacha", "/blog/mock-test-qanday-ishlatiladi", "/blog/ingliz-tilini-nol-dan-boshlash", "/blog/speaking-ravonligini-oshirish", "/blog/listening-yaxshilash-usullari", "/blog/reading-tezligini-oshirish", "/blog/lugat-yodlash-usullari", "/blog/writing-xatolari-va-tuzatish"],
    sections: [
      {
        heading: "Maqolalar",
        paragraphs: ["Quyida barcha maqolalar ro‘yxati. Yangilari tez-tez qo‘shiladi."]
      }
    ]
  },
  {
    path: "/blog/ielts-nol-dan-tayyorlanish",
    name: "IELTS: noldan tayyorlanish rejasi",
    title: "IELTS ga noldan tayyorlanish: 8 haftalik reja | EduLevel",
    description: "IELTS ga noldan tayyorlanish uchun amaliy reja: avval darajani aniqlash, keyin modullar bo‘yicha haftalik tartib.",
    h1: "IELTS ga noldan tayyorlanish: 8 haftalik reja",
    lead: "IELTS ga tayyorlanishni boshlashning eng yaxshi yo‘li — avval o‘z darajangizni bilib olish va keyin rejani modullarga bo‘lish. Quyida umumiy tartib berilgan; aniq vaqt har kimda turlicha.",
    related: ["/ielts", "/ielts/mock-test", "/english/level-test"],
    sections: [
      {
        heading: "1-hafta: darajani aniqlang",
        paragraphs: ["Grammatika, lug‘at va o‘qish bo‘yicha qisqa test topshiring. Natija bo‘yicha qaysi ko‘nikma kuchsizligini yozib qo‘ying: bu keyingi haftalar uchun asos bo‘ladi."]
      },
      {
        heading: "2–4-haftalar: asosiy bilim",
        paragraphs: ["Kundalik grammatika va so‘z yodlash davom etadi. Har hafta bitta modul bilan boshlang: Listening (audio tinglash) va Reading (matn o‘qish) uchun har kuni 30–40 daqiqa ajrating."]
      },
      {
        heading: "5–6-haftalar: yozma ko‘nikma",
        paragraphs: ["Writing Task 1 va Task 2 ga haftada kamida bir marta yozing. Yozgan matningizni qayta o‘qib, bog‘lovchilar va argumentlar tuzilishini tekshiring."]
      },
      {
        heading: "7-hafta: gapirish",
        paragraphs: ["Har kuni 2–3 daqiqa mavzuda gapiring va yozib oling. Speaking Part 1, 2, 3 savollari bo‘yicha qisqa javoblar tayyorlang."]
      },
      {
        heading: "8-hafta: sinov",
        paragraphs: ["Mock test ishlang va vaqtni hisobga oling. Natijani emas, xatolar ro‘yxatini tahlil qiling: imtihon oldidan eng ko‘p takrorlanadigan xatolarni tuzatish muhim."]
      },
      {
        heading: "Eslatma",
        paragraphs: ["Bu reja umumiy. Maqsadli band va boshlang‘ich darajaga qarab 8 hafta yetarli bo‘lmasligi yoki ortiqcha bo‘lishi mumkin. Natijaga kafolat berilmaydi."]
      }
    ]
  },
  {
    path: "/blog/cefr-darajalari-tushuntirish",
    name: "CEFR darajalari tushuntirilgan",
    title: "CEFR darajalari: A1 dan C2 gacha tushuntirish | EduLevel",
    description: "CEFR ning olti darajasi (A1–C2) nimani anglatadi, har bir daraja qanday ko‘nikmani tasvirlaydi.",
    h1: "CEFR darajalari: A1 dan C2 gacha",
    lead: "CEFR — Yevropa Kengashining tilni bilish darajalari tizimi. U olti darajaga bo‘lingan. Daraja nomi o‘quvchi nimani qila olishini tasvirlaydi, faqat so‘zlar soni yoki grammatika emas.",
    related: ["/cefr/mock-test", "/multilevel", "/english/level-test"],
    sections: [
      {
        heading: "Asosiy guruhlar",
        paragraphs: ["A — boshlang‘ich foydalanuvchi, B — mustaqil foydalanuvchi, C — malakali foydalanuvchi. Har bir guruh ichida ikkita daraja bor (masalan A1 va A2)."]
      },
      {
        heading: "Darajalar",
        paragraphs: [],
        items: ["A1: tanishish, oddiy savol-javob, kundalik iboralar.", "A2: oddiy kundalik mavzularda qisqa muloqot.", "B1: tanish mavzularda asosiy fikrni tushunish va bayon qilish.", "B2: murakkab matn va muhokamalarda erkin muloqot.", "C1: keng, murakkab matnlarni tushunish; aniq va uslubiy gapirish.", "C2: deyarli ona tilidagidek tushunish va ifodalash."]
      },
      {
        heading: "Daraja qanday aniqlanadi",
        paragraphs: ["Rasmiy daraja faqat tan olingan imtihon markazi tomonidan beriladi. Onlayn testlar taxminiy yo‘nalish beradi, sertifikat bermaydi."]
      }
    ]
  },
  {
    path: "/blog/ielts-writing-task-2-tuzilishi",
    name: "IELTS Writing Task 2 tuzilishi",
    title: "IELTS Writing Task 2: esse tuzilishi | EduLevel",
    description: "IELTS Writing Task 2 essesi qanday tuziladi: kirish, asosiy paragraflar, xulosa, va kamida 250 so‘z qoidasi.",
    h1: "IELTS Writing Task 2: esse tuzilishi",
    lead: "Task 2 da berilgan fikr yoki savol bo‘yicha esse yoziladi. Baholashda g‘oya, tuzilish, til va grammatika hisobga olinadi. Tuzilish aniq bo‘lsa, fikr ham osonroq ko‘rinadi.",
    related: ["/ielts/writing", "/ielts", "/edubek-ai"],
    sections: [
      {
        heading: "Tuzilma",
        paragraphs: [],
        items: ["Kirish: mavzuni qisqa tanishtirish va pozitsiyangizni aytish (2–3 gap).", "Asosiy paragraf 1: bitta asosiy g‘oya, dalil va misol.", "Asosiy paragraf 2: ikkinchi g‘oya, dalil va misol.", "Xulosa: fikringizni qisqa takrorlash (2–3 gap). Yangi g‘oya kiritmang."]
      },
      {
        heading: "So‘z chegarasi",
        paragraphs: ["Kamida 250 so‘z yozing. Juda qisqa esse ball pasaytirishi mumkin. Har bir paragrafni bitta mantiqiy g‘oyaga bag‘lang."]
      },
      {
        heading: "Tekshirish",
        paragraphs: ["Yozib bo‘lgach, har bir paragrafda bitta g‘oya borligini va xulosa savolga javob berishini tekshiring. Takrorlangan so‘zlarni sinonim bilan almashtiring."]
      }
    ]
  },
  {
    path: "/blog/ingliz-tili-zamonlari-qisqacha",
    name: "Ingliz tili zamonlari qisqacha",
    title: "Ingliz tili zamonlari: qisqacha qo‘llanma | EduLevel",
    description: "Ingliz tilidagi asosiy zamonlar: Present, Past, Future va Perfect — qachon va qanday ishlatiladi.",
    h1: "Ingliz tili zamonlari: qisqacha qo‘llanma",
    lead: "Zamonlar ingliz tili grammatikasining asosi. Quyida to‘rt asosiy guruh va har birining vazifasi berilgan. Har bir zamonni misollar bilan mashq qilish eng yaxshi usul.",
    related: ["/english/grammar", "/english/speaking", "/edubek-ai"],
    sections: [
      {
        heading: "Present (hozirgi)",
        paragraphs: ["Present Simple — odat va doimiy haqiqat: “I work every day.” Present Continuous — hozir bo‘layotgan ish: “I am working now.”"]
      },
      {
        heading: "Past (o‘tgan)",
        paragraphs: ["Past Simple — o‘tgan tugagan ish: “I visited London in 2019.” Past Continuous — o‘tmishdagi jarayon: “I was reading when you called.”"]
      },
      {
        heading: "Future (kelajak)",
        paragraphs: ["will — qaror yoki bashorat: “I will call you.” be going to — oldindan rejalashtirilgan ish: “I am going to study tonight.”"]
      },
      {
        heading: "Perfect",
        paragraphs: ["Present Perfect — o‘tmishdagi ishning hozirgi natijasi yoki vaqt aniq bo‘lmagan tajriba: “I have finished my homework.” Vaqt aniq bo‘lsa, Past Simple ishlatiladi."]
      }
    ]
  },
  {
    path: "/blog/mock-test-qanday-ishlatiladi",
    name: "Mock test qanday ishlatiladi",
    title: "Mock test: imtihonga tayyorlanishda qanday ishlatish kerak | EduLevel",
    description: "Mock testdan maksimal foyda olish: vaqt bilan ishlash, xatolarni tahlil qilish va keyingi rejani tuzish.",
    h1: "Mock test: qanday ishlatish kerak",
    lead: "Mock test faqat ball ko‘rsatish uchun emas. U imtihon vaqtini his qilish va takrorlanadigan xatolarni topish uchun ishlatiladi. Natijadan keyingi tahlil eng muhim qadam.",
    related: ["/ielts/mock-test", "/cefr/mock-test", "/ielts/band-score"],
    sections: [
      {
        heading: "Tayyorgarlik",
        paragraphs: ["Testni tinch joyda, vaqt chegarasi bilan ishlang. Telefon va boshqa oynalarni yoping. Haqiqiy imtihonga yaqin sharoit foydali."]
      },
      {
        heading: "Natijadan keyin",
        paragraphs: [],
        items: ["Har bir xatoni yozing: nega xato bo‘ldi — so‘z, grammatika yoki vaqt?", "Takrorlanadigan 3 ta xatoni tanlang va ularga 1 hafta ajrating.", "Keyingi testni 1–2 hafta o‘tib ishlang va farqni solishtiring."]
      },
      {
        heading: "Eslatma",
        paragraphs: ["Mock test natijasi rasmiy imtihon bali emas. U tayyorgarlik yo‘nalishini ko‘rsatadi."]
      }
    ]
  }
];

/** Adds the deeper content (extra sections, practice, FAQ) to a base page by its path. */
function enrich(page: SeoPage): SeoPage {
  const e = ENRICHMENTS[page.path];
  if (!e) return page;
  return {
    ...page,
    sections: [...page.sections, ...(e.sections || [])],
    faq: e.faq ?? page.faq,
    exercises: e.exercises ?? page.exercises,
    related: Array.from(new Set([...(page.related || []), ...(e.relatedAdd || [])])).filter((r) => r !== page.path),
    level: e.level ?? page.level,
    updated: page.updated ?? UPDATED
  };
}

export const SEO_PAGES: SeoPage[] = [...BASE_PAGES.map(enrich), ...GRAMMAR_PAGES, ...GRAMMAR_PAGES_2, ...VOCAB_PAGES, ...IELTS_PAGES_2, ...MORE_PAGES, ...MORE_PAGES_2, ...LEVEL_PAGES];

export function findSeoPage(segments: string[]): SeoPage | undefined {
  const path = '/' + segments.filter(Boolean).join('/');
  return SEO_PAGES.find((p) => p.path === path);
}
