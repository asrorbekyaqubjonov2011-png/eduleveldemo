import type { AppDatabase } from '../types';

/**
 * Structural defaults inserted once, only into empty tables (see src/lib/db/bootstrap.ts).
 * They contain no students, statistics, payment details, live-stream titles or sample
 * lessons. The owner fills in everything else from the admin panel.
 */
export const structuralDefaults: Pick<
  AppDatabase,
  'teacherProfile' | 'faqs' | 'vipPlans' | 'siteSections' | 'siteTheme' | 'liveStream' | 'telegramBotSettings' | 'features'
> = {
  teacherProfile: {
    name: 'Muxtorov Jasurbek',
    title: 'Norin tumani ixtisoslashgan maktabi ingliz tili o‘qituvchisi',
    bio: '10 yildan ortiq tajriba. 200+ IELTS 7.5+ / C1 natija.',
    photoUrl: '',
    experienceYears: 10,
    studentsCount: 0, // real count is entered by the owner; the public site shows no number until it is set
    nationalCertCount: 200,
    grantCount: 0,
    phone: '',
    telegram: 'https://t.me/edulevel_english',
    methodology: '',
  },
  faqs: [
    {
      id: 'faq-1',
      question: 'Qanday ro‘yxatdan o‘taman?',
      answer: '“Ro‘yxatdan o‘tish” tugmasini bosing, ism, telefon raqam yoki e-mail va parol kiriting, so‘ng yo‘nalishingizni (IELTS, CEFR yoki General English) tanlang. Kabinetingiz darhol ochiladi.',
      orderIndex: 0,
      isVisible: true
    },
    {
      id: 'faq-2',
      question: 'Yo‘nalishni keyin o‘zgartirsa bo‘ladimi?',
      answer: 'Kabinetdagi darslar, testlar, videolar va kitoblar tanlangan yo‘nalishga moslashtirilgan. Yo‘nalishni o‘zgartirish kerak bo‘lsa, ustozga murojaat qiling — u kabinetingizni yangi yo‘nalishga o‘tkazadi.',
      orderIndex: 1,
      isVisible: true
    },
    {
      id: 'faq-3',
      question: 'VIP tarifni qanday faollashtiraman?',
      answer: 'Kabinetdagi “Hisob & depozit” bo‘limidan balansni to‘ldirasiz. Ustoz to‘lovni tasdiqlagach, “VIP tariflar” bo‘limida kerakli tarifni tanlab, balansdan faollashtirasiz.',
      orderIndex: 2,
      isVisible: true
    },
    {
      id: 'faq-4',
      question: 'Testlar haqiqiy imtihon formatidami?',
      answer: 'Ha. Mashqlar Reading, Listening, Speaking va Writing bo‘yicha IELTS va CEFR yo‘nalishlariga moslab tuzilgan. Natijalar taxminiy amaliyot bahosi bo‘lib, rasmiy imtihon natijasi emas.',
      orderIndex: 3,
      isVisible: true
    },
    {
      id: 'faq-5',
      question: 'Writing va Speaking’ni kim baholaydi?',
      answer: 'Yozma va og‘zaki javoblaringizni AI darhol taxminiy mezonlar bo‘yicha tahlil qiladi va xatolar ustida izoh beradi. Ustoz natijalaringizni kabinet orqali kuzatib boradi.',
      orderIndex: 4,
      isVisible: true
    }
  ],
  siteTheme: { activeBackground: 'ivory_editorial' },
  liveStream: { isLive: false, title: '', telegramChannel: '', streamUrl: '' },
  features: { coinEnabled: true },
  telegramBotSettings: {
    botUsername: '',
    botName: '',
    isActive: false,
    minDepositAmount: 10000,
    cardOrMerchantInfo: '',
    cardNumber: '',
    cardHolder: '',
    supportTelegram: '',
    autoApprovalDemo: false
  },
  vipPlans: [
    {
      id: 'start',
      name: 'START',
      priceMonthly: 190000,
      durationDays: 30,
      description: "Boshlang'ich bosqich: bazaviy video darslar, konspektlar va 4 ta bepul kitob",
      badge: "Boshlang'ich",
      features: [
        'Barcha bazaviy video darslar (1080p)',
        "Darslarga biriktirilgan PDF qo'llanmalar",
        'Mavzulashtirilgan tezkor quizlar',
        'Kutubxonadagi 4 ta bepul kitobga to‘liq kirish',
        'Global chat hamjamiyatiga kirish'
      ],
      hasAI: false,
      aiDailyLimit: 0,
      bookAllowanceCount: 4,
      isPopular: false
    },
    {
      id: 'gold',
      name: 'GOLD',
      priceMonthly: 340000,
      durationDays: 60,
      description: "IELTS & CEFR jiddiy tayyorgarlik ko'ruvchilar uchun eng maqbul tanlov",
      badge: 'Eng ommabop',
      features: [
        'Barcha START imkoniyatlari',
        'IELTS & CEFR maxsus video darslari',
        'AI Ingliz Tili Yordamchisi (kuniga 50 ta tahlil)',
        '3-Darajali (B1/B2/C1) aqlli tarjimon',
        'Kutubxonadagi 8 ta kitobga kirish'
      ],
      hasAI: true,
      aiDailyLimit: 50,
      bookAllowanceCount: 8,
      isPopular: true
    },
    {
      id: 'plus',
      name: 'PLUS',
      priceMonthly: 450000,
      durationDays: 60,
      description: 'Reading & Listening simulatorlari va ko‘paytirilgan AI limitlari',
      badge: 'Intensiv Amaliyot',
      features: [
        'Barcha GOLD imkoniyatlari',
        'Haqiqiy Split-Screen Reading Simulator',
        'Listening Audio Simulator & Transkriptlar',
        'AI Yordamchisi (kuniga 75 ta tahlil)',
        'Kutubxonadagi 12 ta kitobga kirish'
      ],
      hasAI: true,
      aiDailyLimit: 75,
      bookAllowanceCount: 12,
      isPopular: false
    },
    {
      id: 'pro',
      name: 'PRO',
      priceMonthly: 590000,
      durationDays: 90,
      description: '4 ta ko‘nikma (Reading, Listening, Writing, Speaking) to‘liq arenasi',
      badge: '4-Skill Arena',
      features: [
        'Barcha PLUS imkoniyatlari',
        'AI Real-Format Writing Grader (inshoni rangli xatolar bilan tekshirish)',
        'Virtual AI Speaking Examiner (ovozli audio waveform bilan)',
        'AI Yordamchisi (kuniga 120 ta tahlil)',
        '16 ta kitobga kirish va yuklab olish'
      ],
      hasAI: true,
      aiDailyLimit: 120,
      bookAllowanceCount: 16,
      isPopular: false
    },
    {
      id: 'premium',
      name: 'PREMIUM',
      priceMonthly: 790000,
      durationDays: 90,
      description: 'Kengaytirilgan AI yordamchi va Writing, Speaking bo‘yicha chuqur baholash',
      badge: 'To‘liq paket',
      features: [
        'Barcha PRO imkoniyatlari',
        'Kengaytirilgan ovozli AI Avatar suhbati',
        'Writing va Speaking uchun batafsil AI tahlil',
        'Haftalik ustoz bilan jonli yopiq vebinar',
        '20 ta kitobga kengaytirilgan kirish'
      ],
      hasAI: true,
      aiDailyLimit: 300,
      bookAllowanceCount: 20,
      isPopular: false
    },
    {
      id: 'legend',
      name: 'LEGEND',
      priceMonthly: 1200000,
      durationDays: 120,
      description: 'IELTS 8.5+ va C1 sertifikatini maqsad qilgan abituriyentlar uchun mutlaq qurollanish',
      badge: 'Maksimal Natija',
      features: [
        'Barcha PREMIUM imkoniyatlari',
        'Cheksiz to‘liq Mock Imtihonlar (Full Mock)',
        'QR-kodli rasmiy Mock sertifikatlari',
        'Cheksiz AI Yordamchisi (kuniga 9999 so‘rov)',
        'Barcha raqamli kitoblarga cheksiz kirish'
      ],
      hasAI: true,
      aiDailyLimit: 9999,
      bookAllowanceCount: 999,
      isPopular: false
    },
    {
      id: 'individual',
      name: 'INDIVIDUAL',
      priceMonthly: 1800000,
      durationDays: 120,
      description: 'Muxtorov Jasurbek ustozning shaxsiy nazorati, 1-ga-1 speaking darslari va cheksiz barcha xizmatlar',
      badge: 'Eksklyuziv 1-ga-1',
      features: [
        'Barcha LEGEND imkoniyatlari',
        'Muxtorov Jasurbek ustoz bilan haftada 2 marta 1-ga-1 shaxsiy darslar',
        'Shaxsiy insho tahlili va individual o‘quv rejasi',
        'Imtihongacha to‘liq kafolatlangan kuzatuv'
      ],
      hasAI: true,
      aiDailyLimit: 9999,
      bookAllowanceCount: 999,
      isPopular: false
    }
  ],
  siteSections: [
    {
      id: 'sec-news',
      key: 'news',
      title: 'Yangiliklar',
      subtitle: 'Platformadagi so‘nggi yangiliklar va maxsus takliflar.',
      isVisible: true,
      orderIndex: 1
    },
    {
      id: 'sec-levels',
      key: 'levels',
      title: 'B1 dan C1 gacha — bosqichma-bosqich',
      subtitle: 'Har bir bosqich aniq maqsad balli bilan. Qayerda turganingizni bilib, keyingi qadamni rejalang.',
      isVisible: true,
      orderIndex: 2
    },
    {
      id: 'sec-results',
      key: 'results',
      title: 'O‘quvchilarimiz natijalari',
      subtitle: 'Ustoz tomonidan e’lon qilingan haqiqiy natijalar va sertifikatlar.',
      isVisible: true,
      orderIndex: 4
    },
    {
      id: 'sec-hero',
      key: 'hero',
      title: 'Ingliz tilini tushuning, yodlamang',
      subtitle: "IELTS 8.5+, CEFR C1 va OTM 100% grantiga erishish uchun professional ustoz va AI mentor bilan o‘qing.",
      isVisible: true,
      orderIndex: 1
    },
    {
      id: 'sec-books',
      key: 'books',
      title: 'Raqamli kutubxona',
      subtitle: 'Mehmonlar uchun 4 ta mutlaqo bepul kitob',
      isVisible: true,
      orderIndex: 2
    },
    {
      id: 'sec-testimonials',
      key: 'testimonials',
      title: 'Ular nima deydi',
      subtitle: 'O‘quvchilarimizning haqiqiy fikrlari',
      isVisible: true,
      orderIndex: 3
    },
    {
      id: 'sec-vip',
      key: 'vip',
      title: 'VIP tariflar',
      subtitle: 'Ehtiyojingizga mos tarifni tanlang',
      isVisible: true,
      orderIndex: 4
    },
    {
      id: 'sec-teacher',
      key: 'teacher',
      title: 'Ustoz bilan tanishing',
      subtitle: 'Muxtorov Jasurbek — tajribali ingliz tili ustozi',
      isVisible: true,
      orderIndex: 5
    },
    {
      id: 'sec-faq',
      key: 'faq',
      title: 'Ko‘p so‘raladigan savollar',
      subtitle: 'Javob topmadingizmi? Telegram orqali yozing.',
      isVisible: true,
      orderIndex: 6
    },
    {
      id: 'sec-contact',
      key: 'contact',
      title: 'Savolingiz bormi? Bizga yozing',
      subtitle: 'To‘g‘ridan-to‘g‘ri ustozga murojaat qiling va tezda javob oling',
      isVisible: true,
      orderIndex: 7
    }
  ],
};
