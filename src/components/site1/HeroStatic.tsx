import type { HeroPublicData } from '@/src/lib/seo/heroPhoto';
import { imageKitUrl } from '@/src/lib/media/imageUrl';

/**
 * The landing hero as plain server-rendered HTML: the first screen a visitor sees (the main heading is the largest
 * text, so this is what the browser measures as the page's main content). It shows the same copy and layout as the
 * interactive hero; the client app replaces it once it has loaded. Numbers and photo come from the owner's saved
 * settings; a number that is not set is not shown, and a missing photo shows the teacher's initials.
 */
export function HeroStatic({ data }: { data: HeroPublicData | null }) {
  const d: HeroPublicData = data ?? { photo: null, name: '', title: '', students: 0, certs: 0, grants: 0, experienceYears: 0 };
  const initials = (d.name || 'EduLevel').split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  const stats = [
    { value: d.students, label: 'Faol o‘quvchilar' },
    { value: d.certs, label: 'IELTS 7.5+ & C1' },
    { value: d.grants, label: 'Grant yutganlar' }
  ].filter((s) => s.value > 0);
  return (
    <section aria-label="EduLevel" className="relative isolate overflow-hidden bg-[#fbf6ef] text-ink dark:bg-[#07080b] dark:text-white">
      <div className="relative z-10 mx-auto grid max-w-[1320px] items-center gap-10 px-5 pb-16 pt-28 sm:min-h-[100svh] sm:gap-12 sm:px-8 sm:pb-28 sm:pt-32 lg:grid-cols-[1.12fr_0.88fr] lg:gap-8 lg:px-12">
        <div className="max-w-[720px]">
          <div className="inline-flex items-center gap-2.5 rounded-full border border-black/5 bg-white/70 py-1.5 pl-2 pr-4 text-[12.5px] font-semibold text-ink/85 dark:border-white/10 dark:bg-white/10 dark:text-white/90">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#ff8a2b]/20">
              <span className="h-2 w-2 rounded-full bg-[#ff7a1a]" />
            </span>
            International Learning Platform
            <span className="hidden text-ink/30 sm:inline">·</span>
            <span className="hidden text-[#c4520a] dark:text-[#ffc982] sm:inline">IELTS · CEFR · General English</span>
          </div>

          <h1 className="mt-6 font-display text-[clamp(2.5rem,6.5vw,5.3rem)] font-extrabold leading-[0.96] tracking-[-0.045em] sm:mt-7">
            <span className="block">Learn Smarter.</span>
            <span className="block text-[#ff6a14]">Achieve Bigger.</span>
          </h1>

          <p className="mt-6 max-w-[540px] text-[clamp(1rem,1.5vw,1.2rem)] leading-relaxed text-ink-muted dark:text-white/75">
            IELTS, CEFR va General English uchun yagona ta’lim hamkoringiz — AI bilan mashq qiling, har kuni izchil o‘sing va global maqsadlaringizga yeting.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3 sm:mt-9">
            <a href="/ielts-tayyorgarlik" className="inline-flex h-14 items-center gap-2.5 rounded-full bg-gradient-to-b from-[#ffa149] to-[#f2650f] px-7 text-[15px] font-semibold text-white">
              O‘qishni boshlash <span aria-hidden="true">→</span>
            </a>
            <a href="/#books" className="inline-flex h-14 items-center rounded-full border border-black/10 bg-white/70 px-6 text-[15px] font-semibold text-ink dark:border-white/15 dark:bg-white/10 dark:text-white">
              Kitoblarni ko‘rish
            </a>
          </div>

          {stats.length > 0 ? (
            <div className="mt-10 grid max-w-[600px] rounded-[24px] border border-black/5 bg-white/70 px-2 py-4 sm:px-3" style={{ gridTemplateColumns: `repeat(${stats.length}, minmax(0, 1fr))` }}>
              {stats.map((s) => (
                <div key={s.label} className="border-r border-ink/10 px-3 last:border-r-0 dark:border-white/10 sm:px-5">
                  <div className="font-display text-[clamp(1.15rem,2.2vw,1.7rem)] font-extrabold leading-none tracking-tight tabular-nums">{s.value.toLocaleString('en-US')}+</div>
                  <div className="mt-1 text-[11.5px] text-ink-muted dark:text-white/60">{s.label}</div>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="mx-auto w-full max-w-[380px] rounded-[28px] border border-black/5 bg-white/80 p-3 shadow-[0_30px_80px_-40px_rgba(60,35,10,0.45)] dark:border-white/10 dark:bg-white/[0.06]">
          <div className="relative aspect-[4/5] overflow-hidden rounded-[22px] bg-gradient-to-b from-[#ffd1a1] to-[#c77a3a]">
            {d.photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageKitUrl(d.photo)} alt={d.name ? `${d.name} — o‘qituvchi` : 'O‘qituvchi'} width={380} height={475} fetchPriority="high" decoding="async" className="h-full w-full object-cover object-top" />
            ) : (
              <div className="flex h-full w-full items-center justify-center font-display text-[84px] font-extrabold text-white/90" aria-label="O‘qituvchi rasmi hali qo‘yilmagan">{initials}</div>
            )}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-5 text-white">
              <p className="font-display text-[20px] font-extrabold leading-tight">{d.name || 'EduLevel'}</p>
              {d.title ? <p className="mt-1 text-[13px] text-white/80">{d.title}</p> : null}
              {d.experienceYears > 0 ? <p className="mt-2 text-[12px] text-white/70">{d.experienceYears} yil tajriba</p> : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
