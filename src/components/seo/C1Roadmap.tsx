import Link from 'next/link';

/**
 * CEFR C1 roadmap: a server-rendered page with a visual path B1 → B2 → C1. Plain text is in the HTML for search engines;
 * the motion (a path that draws itself, stage cards that rise in turn) is CSS only and stops for reduced-motion users.
 */

const STAGES = [
  {
    level: 'B1',
    title: 'Asosni mustahkamlash',
    weeks: '1–8 hafta',
    goal: 'Tanish mavzularda erkin gapirish. Asosiy zamonlarni xatosiz ishlatish.',
    weekly: ['4–5 kun, har kuni 30–40 daqiqa grammatika va so‘z', 'Haftada 1 qisqa matn: asosiy fikrni 5 gapda yozish', 'Kundalik mavzuda 2 daqiqa gapirib yozib olish'],
    check: 'Tanish mavzuda 2 daqiqa to‘xtamasdan gapira olasizmi?',
    tone: 'from-[#ffb45c] to-[#f2650f]'
  },
  {
    level: 'B2',
    title: 'Murakkab matn va fikr',
    weeks: '9–18 hafta',
    goal: 'Murakkabroq matnlarni tushunish. Fikrni sabab va natija bilan bayon qilish.',
    weekly: ['Haftada 2 marta audio tinglash (tagyozuv bilan va tagyozuvsiz)', 'Haftada 1 esse (200–250 so‘z), so‘ng xatolarni tahlil qilish', 'Shartli gaplar, passiv nisbat, reported speech'],
    check: 'Murakkab mavzuda sabab va natija bilan 3 daqiqali monolog gapira olasizmi?',
    tone: 'from-[#f2650f] to-[#c2410c]'
  },
  {
    level: 'C1',
    title: 'Tabiiylik va uslub',
    weeks: '19–30 hafta',
    goal: 'Nutqda tabiiylik, uslubga rioya, murakkab mavzuda aniq fikr.',
    weekly: ['Haftada 2 marta akademik yoki ommabop maqola: asosiy g‘oyani ajratish', 'Idiomalar va collocation’lar, ularni o‘z gapingizda ishlatish', 'Haftada 1 munozara: 5 daqiqa, yozib tahlil qilish'],
    check: 'Murakkab munozarada uslubni o‘zgartirib, aniq va tabiiy gapira olasizmi?',
    tone: 'from-[#c2410c] to-[#7c2d12]'
  }
];

const SKILLS = ['Grammatika', 'So‘z boyligi', 'Listening', 'Reading', 'Writing', 'Speaking'];

export function C1Roadmap() {
  return (
    <main className="c1-road relative isolate overflow-hidden bg-[#fbf7f2] text-[#1c1917] dark:bg-[#0f0c09] dark:text-stone-100">
      <style>{`
        @keyframes c1-draw { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }
        @keyframes c1-rise { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: none; } }
        @keyframes c1-glow { 0%, 100% { box-shadow: 0 0 0 0 rgba(242,101,15,0.35); } 50% { box-shadow: 0 0 0 10px rgba(242,101,15,0); } }
        .c1-path { stroke-dasharray: 1; stroke-dashoffset: 1; animation: c1-draw 1.8s ease-out 0.2s forwards; }
        .c1-stage { opacity: 0; animation: c1-rise 0.7s cubic-bezier(.2,.8,.2,1) forwards; }
                .c1-dot { animation: c1-glow 2.4s ease-in-out infinite; }
        @keyframes c1-aurora { 0% { transform: translate3d(-4%,-2%,0) scale(1); } 50% { transform: translate3d(3%,4%,0) scale(1.08); } 100% { transform: translate3d(-4%,-2%,0) scale(1); } }
        @keyframes c1-walk { 0% { offset-distance: 0%; opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { offset-distance: 100%; opacity: 0; } }
        .c1-aurora { animation: c1-aurora 14s ease-in-out infinite; }
        .c1-walker { offset-path: path('M 24 0 L 24 2400'); animation: c1-walk 9s linear infinite; }
        @supports (animation-timeline: view()) {
          .c1-reveal { animation: c1-rise 1s cubic-bezier(.2,.8,.2,1) both; animation-timeline: view(); animation-range: entry 5% cover 32%; animation-delay: 0s; }
        }
        @media (prefers-reduced-motion: reduce) {
          .c1-aurora, .c1-walker { animation: none; }
          .c1-walker { display: none; }
        }
        @media (prefers-reduced-motion: reduce) {
          .c1-path { animation: none; stroke-dashoffset: 0; }
          .c1-stage { animation: none; opacity: 1; }
          .c1-dot { animation: none; }
          .c1-reveal { animation: none !important; }
        }
      `}</style>

      <div aria-hidden className="c1-aurora pointer-events-none absolute -top-40 left-1/2 h-[560px] w-[760px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(255,180,92,0.45),rgba(242,101,15,0.15),transparent)] blur-3xl" />
      <div aria-hidden className="c1-aurora pointer-events-none absolute right-[-120px] top-[38%] h-[420px] w-[420px] rounded-full bg-[radial-gradient(closest-side,rgba(124,45,18,0.22),transparent)] blur-3xl" style={{ animationDelay: '-6s' }} />

      <div className="relative mx-auto max-w-5xl px-5 pb-20 pt-10 sm:px-8">
        <nav aria-label="Breadcrumb" className="text-[13px] text-stone-500 dark:text-stone-400">
          <Link href="/" className="underline-offset-4 hover:underline">EduLevel</Link> <span aria-hidden>/</span> <Link href="/cefr-tayyorgarlik" className="underline-offset-4 hover:underline">CEFR</Link> <span aria-hidden>/</span> <span>C1 yo‘l xaritasi</span>
        </nav>

        <header className="mt-6 max-w-3xl">
          <p className="inline-flex items-center gap-2 rounded-full border border-orange-300/50 bg-white/70 px-3.5 py-1.5 text-[12px] font-bold uppercase tracking-[0.16em] text-orange-700 dark:border-orange-400/30 dark:bg-white/5 dark:text-orange-300">
            <span className="c1-dot h-2 w-2 rounded-full bg-orange-500" /> CEFR yo‘l xaritasi
          </p>
          <h1 className="mt-5 font-display text-[clamp(2.2rem,5vw,3.8rem)] font-extrabold leading-[1.02] tracking-[-0.03em]">
            B1 dan <span className="text-orange-600 dark:text-orange-400">C1</span> gacha
          </h1>
          <p className="mt-5 text-[17px] leading-relaxed text-stone-600 dark:text-stone-300">
            B1 dan C1 gacha o‘tish odatda bir necha oy davom etadi. Quyida uch bosqich, haftalik tartib va har bosqichda o‘zingizni qanday tekshirishingiz berilgan. Muddatlar taxminiy: har kimning boshlang‘ich darajasi va vaqti turlicha.
          </p>
        </header>

        {/* The path: a drawn line through the three levels on wide screens, a vertical line on phones */}
        <div className="relative mt-14">
          <svg aria-hidden className="absolute left-6 top-0 hidden h-full w-4 md:block" preserveAspectRatio="none" viewBox="0 0 10 100">
            <path className="c1-path" d="M5 0 L5 100" pathLength={1} fill="none" stroke="url(#c1g)" strokeWidth="3" strokeLinecap="round" />
            <defs>
              <linearGradient id="c1g" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#ffb45c" />
                <stop offset="1" stopColor="#7c2d12" />
              </linearGradient>
            </defs>
          </svg>

          <span aria-hidden className="c1-walker absolute left-[18px] top-0 hidden h-3 w-3 rounded-full bg-orange-500 shadow-[0_0_18px_6px_rgba(242,101,15,0.45)] md:block" />
          <ol className="space-y-6 md:pl-16">
            {STAGES.map((s, i) => (
              <li key={s.level} className={`c1-stage c1-reveal relative`} style={{ animationDelay: `${0.3 + i * 0.25}s` }}>
                <article className="overflow-hidden rounded-[28px] border border-stone-200/80 bg-white/80 p-6 shadow-[0_18px_50px_-30px_rgba(124,45,18,0.35)] backdrop-blur dark:border-white/10 dark:bg-white/[0.04] sm:p-8">
                  <div className="flex flex-wrap items-center gap-4">
                    <span className={`flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${s.tone} font-display text-2xl font-extrabold text-white shadow-lg`}>{s.level}</span>
                    <div>
                      <h2 className="font-display text-2xl font-extrabold">{s.title}</h2>
                      <p className="text-[13px] font-semibold text-stone-500 dark:text-stone-400">{s.weeks} · taxminan</p>
                    </div>
                  </div>
                  <p className="mt-5 text-[16px] leading-relaxed text-stone-700 dark:text-stone-300">{s.goal}</p>
                  <ul className="mt-5 grid gap-2.5 text-[15px] text-stone-700 dark:text-stone-300 sm:grid-cols-3">
                    {s.weekly.map((w) => (
                      <li key={w} className="flex gap-2.5 rounded-2xl bg-orange-50/70 p-3.5 dark:bg-white/[0.05]">
                        <span aria-hidden className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-500" />
                        <span>{w}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-6 rounded-2xl border border-dashed border-orange-300/70 p-4 dark:border-orange-400/30">
                    <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-orange-700 dark:text-orange-300">O‘z-o‘zini tekshirish</p>
                    <p className="mt-1 text-[15px] text-stone-700 dark:text-stone-200">{s.check}</p>
                  </div>
                </article>
              </li>
            ))}
          </ol>
        </div>

        <section className="mt-16 grid gap-8 md:grid-cols-2">
          <div className="rounded-[28px] border border-stone-200/80 bg-white/80 p-7 dark:border-white/10 dark:bg-white/[0.04]">
            <h2 className="font-display text-xl font-extrabold">Har bir ko‘nikma</h2>
            <p className="mt-2 text-[15px] text-stone-600 dark:text-stone-300">Yo‘l davomida bu ko‘nikmalar birga rivojlanadi. Zaif tomoningizni haftalik tekshiruvda belgilang.</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {SKILLS.map((k) => (
                <span key={k} className="rounded-full bg-stone-900 px-3.5 py-1.5 text-[13px] font-semibold text-white dark:bg-white dark:text-stone-900">{k}</span>
              ))}
            </div>
          </div>
          <div className="rounded-[28px] border border-stone-200/80 bg-white/80 p-7 dark:border-white/10 dark:bg-white/[0.04]">
            <h2 className="font-display text-xl font-extrabold">Progress</h2>
            <p className="mt-2 text-[15px] text-stone-600 dark:text-stone-300">Har bir bosqichni tugatgach keyingisiga o‘tasiz. Shaxsiy progress tizimga kirgan holda kuzatiladi.</p>
            <ol className="mt-6 grid grid-cols-3 gap-2 text-center text-[13px] font-semibold" aria-label="Bosqichlar">
              {STAGES.map((s) => (
                <li key={s.level} className="rounded-2xl bg-stone-100 px-2 py-3 text-stone-600 dark:bg-white/5 dark:text-stone-300">
                  <span className="block font-display text-lg font-extrabold text-stone-900 dark:text-white">{s.level}</span>
                  {s.weeks}
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="mt-16 overflow-hidden rounded-[32px] bg-stone-900 p-8 text-white sm:p-12">
          <h2 className="font-display text-3xl font-extrabold">Boshlashga tayyormisiz?</h2>
          <p className="mt-3 max-w-xl text-[16px] text-stone-300">Avval darajangizni aniqlang, keyin B1 bosqichidan boshlang. Natija rasmiy sertifikat emas, lekin yo‘nalishni aniq ko‘rsatadi.</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/english/level-test" className="inline-flex min-h-[48px] items-center rounded-full bg-orange-500 px-6 font-semibold text-white transition-transform hover:-translate-y-0.5">Darajani aniqlash</Link>
            <Link href="/cefr/mock-test" className="inline-flex min-h-[48px] items-center rounded-full border border-white/20 px-6 font-semibold text-white transition-colors hover:bg-white/10">CEFR mock test</Link>
            <Link href="/multilevel" className="inline-flex min-h-[48px] items-center rounded-full border border-white/20 px-6 font-semibold text-white transition-colors hover:bg-white/10">Multilevel</Link>
          </div>
        </section>

        <p className="mt-10 text-[13px] text-stone-500 dark:text-stone-400">
          Boshqa sahifalar: <Link href="/cefr-tayyorgarlik" className="underline">CEFR tayyorgarlik</Link> · <Link href="/blog/cefr-darajalari-tushuntirish" className="underline">CEFR darajalari</Link> · <Link href="/english/grammar" className="underline">Grammatika</Link>
        </p>
      </div>
    </main>
  );
}
