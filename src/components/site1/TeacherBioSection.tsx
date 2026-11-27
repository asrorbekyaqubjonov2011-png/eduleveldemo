import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { User } from 'lucide-react';
import { Counter, Reveal } from '../ui/motion-primitives';

export const TeacherBioSection: React.FC = () => {
  const { db } = useApp();
  const [imgError, setImgError] = useState(false);
  const section = db.siteSections?.find((s) => s.key === 'teacher');
  if (section && !section.isVisible) return null;

  const t = db.teacherProfile;
  const words = (t.name || '').trim().split(/\s+/).filter(Boolean);
  const lastWord = words.length > 1 ? words[words.length - 1] : '';
  const firstPart = words.length > 1 ? words.slice(0, -1).join(' ') : t.name;

  const credentials = [
    { value: t.studentsCount, label: 'o‘quvchi' },
    { value: t.grantCount, label: 'davlat granti' },
    { value: t.nationalCertCount, label: 'natija' }
  ].filter((c) => c.value > 0);

  return (
    <section id="teacher-bio" className="relative overflow-x-clip py-20 sm:py-28">
      <div className="mx-auto grid w-full max-w-[1240px] items-center gap-14 px-5 sm:px-8 lg:grid-cols-12 lg:gap-16 lg:px-10">
        <div className="lg:col-span-5">
          <Reveal kind="left" distance={24} amount={0.15}>
            <div className="relative mx-auto w-full max-w-[420px] lg:mx-0" data-parallax="-0.05">
              <div className="relative aspect-[4/5] overflow-hidden rounded-[32px] bg-[#e9e1d5] shadow-[0_40px_80px_-40px_rgba(18,16,14,0.45)] dark:bg-[#1c1916]">
                {t.photoUrl && !imgError ? (
                  <img
                    src={t.photoUrl}
                    alt={t.name}
                    loading="lazy"
                    onError={() => setImgError(true)}
                    className="h-full w-full object-cover object-top transition-transform duration-[1400ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.03]"
                  />
                ) : (
                  <div className="relative flex h-full w-full flex-col items-center justify-center gap-6 overflow-hidden p-6 text-center">
                    <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(circle_at_28%_18%,rgba(255,161,73,0.38),transparent_55%),radial-gradient(circle_at_82%_92%,rgba(197,106,36,0.28),transparent_55%)]" />
                    <div className="relative flex h-32 w-32 items-center justify-center">
                      <span aria-hidden="true" className="teacher-ring absolute inset-0 rounded-full" />
                      <span className="font-display text-[46px] font-extrabold leading-none tracking-[-0.04em] text-ink dark:text-white">
                        {words.slice(0, 2).map((w) => w[0]?.toUpperCase() || '').join('') || <User className="h-10 w-10 text-ember-600/70" strokeWidth={1.4} />}
                      </span>
                    </div>
                    <span className="relative font-display text-[18px] font-extrabold text-ink dark:text-white">{t.name}</span>
                  </div>
                )}
              </div>
              {t.experienceYears > 0 ? (
                <div className="glass-premium absolute -bottom-6 right-3 rounded-2xl px-5 py-4 sm:-right-8">
                  <div className="font-display text-[26px] font-extrabold leading-none tracking-[-0.03em] text-ink dark:text-white"><Counter value={t.experienceYears} suffix="+ yil" /></div>
                  <div className="mt-1.5 text-[12px] text-ink-muted dark:text-stone-400">pedagogik tajriba</div>
                </div>
              ) : null}
            </div>
          </Reveal>
        </div>

        <div className="lg:col-span-7">
          <Reveal kind="right" distance={24} delay={60}>
            <div className="flex items-center gap-3 text-[13px] font-semibold text-[#ef6c12] dark:text-[#ffb45c]">
              <span className="h-px w-10 bg-[#ef6c12]/70" />
              Ustozingiz bilan tanishing
            </div>

            <h2 data-reveal="rise" className="mt-5 font-display text-[clamp(2.2rem,5vw,3.75rem)] font-extrabold leading-[1.02] tracking-[-0.045em] text-ink text-balance dark:text-white">
              {firstPart} {lastWord ? <span className="text-ember-gradient-static">{lastWord}</span> : null}
            </h2>

            <p className="mt-4 font-display text-[16px] font-bold tracking-[-0.01em] text-[#ef6c12] dark:text-[#ffb45c]">{t.title}</p>

            <p className="mt-5 max-w-xl text-[15px] leading-[1.8] text-ink-muted dark:text-stone-400">{t.bio}</p>
          </Reveal>

          {credentials.length ? (
            <Reveal delay={150} kind="right" distance={24}>
              <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3">
                {credentials.map((c) => (
                  <div key={c.label} className="border-l-2 border-[#ef6c12] pl-4">
                    <div className="font-display text-[clamp(1.6rem,2.8vw,2.1rem)] font-extrabold leading-none tracking-[-0.03em] tabular-nums text-ink dark:text-white">
                      <Counter value={c.value} suffix="+" />
                    </div>
                    <div className="mt-2 text-[13px] text-ink-muted dark:text-stone-400">{c.label}</div>
                  </div>
                ))}
              </div>
            </Reveal>
          ) : null}
        </div>
      </div>
    </section>
  );
};
