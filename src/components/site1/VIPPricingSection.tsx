import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { setPendingPlan } from '../../lib/vipHandoff';
import { Check, Minus, ArrowRight, Sparkles, BookOpen, ChevronDown } from 'lucide-react';
import { Reveal } from '../ui/motion-primitives';
import { SectionHeader, Button } from '../ui';
import { cn } from '../ui/styles';
import { VIPPlan } from '../../types';

type CellValue = boolean | string;

const renderCell = (value: CellValue) => {
  if (value === true) {
    return (
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#ff8a2b]/10 text-[#c9540a] dark:bg-[#ff8a2b]/12 dark:text-[#ffb45c]">
        <Check className="h-3 w-3" strokeWidth={3} />
      </span>
    );
  }
  if (value === false) {
    return <Minus className="mx-auto h-3.5 w-3.5 text-ink-muted/25 dark:text-stone-700" strokeWidth={2.4} />;
  }
  return <span className="text-[11.5px] font-semibold tabular-nums">{value}</span>;
};

export const VIPPricingSection: React.FC = () => {
  const { db, setActiveSite, currentUser } = useApp();
  const section = db.siteSections.find((s) => s.key === 'vip');
  const titleWords = (() => {
    const words = (section?.title || 'O‘zingizga mos tarifni tanlang').trim().split(' ');
    const tail = words.slice(-2).join(' ');
    return { head: words.slice(0, -2).join(' '), tail };
  })();

  if (section && !section.isVisible) return null;

  // Every plan the owner has, cheapest first (a plan must never vanish from the page because of its id).
  const plans: VIPPlan[] = [...(db.vipPlans || [])].sort((a, b) => a.priceMonthly - b.priceMonthly);

  const fmt = (n: number) => n.toLocaleString('en-US').replace(/,/g, ' ');

  return (
    <section id="vip" className="relative overflow-x-clip py-20 sm:py-28">
      <div aria-hidden data-parallax="0.25" className="pointer-events-none absolute -left-24 top-24 h-72 w-72 rounded-full bg-[#ffb274]/30 soft-blob dark:bg-[#f2650f]/10" />
      <div aria-hidden data-parallax="0.5" className="pointer-events-none absolute -right-20 bottom-24 h-80 w-80 rounded-full bg-[#ffd9b8]/45 soft-blob dark:bg-[#c9540a]/10" />
      <div className="relative mx-auto w-full max-w-[1240px] px-5 sm:px-8 lg:px-10">
        <Reveal>
          <div className="flex flex-col items-center text-center">
            <span className="inline-flex items-center gap-3 text-[13px] font-semibold text-[#ef6c12] dark:text-[#ffb45c]">
              <span className="h-px w-10 bg-[#ef6c12]/70" />
              VIP tariflar
            </span>
            <h2 className="mt-5 max-w-3xl font-display text-[clamp(2rem,4.6vw,3.5rem)] font-extrabold leading-[1.03] tracking-[-0.04em] text-ink text-balance dark:text-white">
              {titleWords.head} <span className="text-ember-gradient-static">{titleWords.tail}</span>
            </h2>
            {section?.subtitle ? <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-ink-muted dark:text-stone-400">{section.subtitle}</p> : null}
          </div>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4 xl:gap-4">
          {plans.map((plan, idx) => {
            const isFeatured = plan.id === 'gold' || plan.isPopular;
            return (
              <Reveal key={plan.id} delay={idx * 120} distance={84} duration={1100} kind="grow" amount={0.08} className="h-full">
                <article
                  className={cn(
                    'relative flex h-full flex-col rounded-[28px] border p-6 transition-transform duration-500 hover:-translate-y-1',
                    isFeatured
                      ? 'border-transparent bg-[#0f0d0b] text-white shadow-[0_40px_80px_-36px_rgba(18,16,14,0.8)] dark:bg-gradient-to-b dark:from-[#3a1d0a] dark:to-[#140c07] dark:shadow-[0_40px_90px_-30px_rgba(242,101,15,0.45)] dark:ring-1 dark:ring-[#ff8a2b]/35'
                      : 'border-line/70 bg-white/85 text-ink shadow-[0_20px_50px_-36px_rgba(18,16,14,0.35)] dark:border-white/10 dark:bg-white/[0.04] dark:text-white'
                  )}
                >
                  <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-2">
                    <span className="min-w-0 whitespace-nowrap font-display text-[13px] font-extrabold uppercase tracking-[0.16em]">{plan.name}</span>
                    {plan.badge ? (
                      <span
                        className={cn(
                          'max-w-full rounded-full px-2.5 py-1 text-[10.5px] font-semibold',
                          isFeatured ? 'bg-[#ff8a2b] text-[#231201]' : 'bg-[#ffe6d1] text-[#a33d0a] dark:bg-[#ff8a2b]/15 dark:text-[#ffcf8f]'
                        )}
                      >
                        {plan.badge}
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-6 flex items-end gap-1.5">
                    <span className="font-display text-[30px] font-extrabold leading-none tracking-[-0.03em] tabular-nums">{fmt(plan.priceMonthly)}</span>
                    <span className="pb-0.5 text-[12px] font-semibold opacity-70">so‘m</span>
                  </div>
                  <div className="mt-1.5 text-[12.5px] opacity-65">{plan.durationDays} kun</div>

                  <p className="mt-5 min-h-[64px] text-[13.5px] leading-relaxed opacity-80">{plan.description}</p>

                  <div className="flex-1" />

                  <button
                    onClick={() => {
                      // Remember the chosen plan; the student area opens it after sign-in.
                      setPendingPlan(plan.id);
                      setActiveSite(currentUser ? 'site2_lms' : 'auth');
                    }}
                    className={cn(
                      'mt-7 h-12 w-full rounded-full text-[14px] font-semibold transition-colors',
                      isFeatured ? 'bg-[#f25a2f] text-white hover:bg-[#ff6a3d]' : 'border border-ink/15 text-ink hover:border-ink/40 dark:border-white/20 dark:text-white dark:hover:border-white/40'
                    )}
                  >
                    Tanlash
                  </button>
                </article>
              </Reveal>
            );
          })}
          {(() => {
            // Fills the last row with a helper card, so the grid never ends with an empty gap.
            const rest = (4 - (plans.length % 4)) % 4;
            if (!rest) return null;
            const span = rest === 1 ? 'xl:col-span-1' : rest === 2 ? 'xl:col-span-2' : 'xl:col-span-3';
            const tg = db.teacherProfile?.telegram || '';
            return (
              <Reveal delay={plans.length * 120} distance={84} duration={1100} kind="grow" amount={0.08} className={cn('h-full', span)}>
                <div className="relative flex h-full min-h-[260px] flex-col justify-between overflow-hidden rounded-[28px] border border-dashed border-ember-400/50 bg-gradient-to-br from-[#fff4ea] to-[#fde3cf] p-6 dark:from-white/[0.05] dark:to-white/[0.02]">
                  <div>
                    <span className="font-display text-[12px] font-extrabold uppercase tracking-[0.18em] text-ember-600 dark:text-ember-300">Yordam kerakmi?</span>
                    <h3 className="mt-3 font-display text-[22px] font-extrabold leading-tight tracking-[-0.03em] text-ink dark:text-white">Qaysi tarif sizga mos?</h3>
                    <p className="mt-2 max-w-md text-[13.5px] leading-relaxed text-ink-muted dark:text-stone-300">Maqsadingiz va vaqtingizni yozing, ustoz eng mos tarifni tavsiya qiladi.</p>
                  </div>
                  {tg ? (
                    <a href={tg.startsWith('http') ? tg : `https://t.me/${tg.replace(/^@/, '')}`} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex w-fit items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-[13px] font-bold text-white transition hover:-translate-y-0.5 dark:bg-white dark:text-ink">
                      Ustozga yozish →
                    </a>
                  ) : null}
                </div>
              </Reveal>
            );
          })()}
        </div>

        {db.features?.planCompare === false ? null : <PlanComparison plans={plans} />}
      </div>
    </section>
  );
};

/** Side-by-side plans, built only from what the owner set: price, length, AI time and every listed feature. */
const PlanComparison: React.FC<{ plans: VIPPlan[] }> = ({ plans }) => {
  const [open, setOpen] = React.useState(false);
  if (plans.length < 2) return null;
  const fmt = (n: number) => n.toLocaleString('en-US').replace(/,/g, ' ');
  const minutes = (p: VIPPlan) => (p.hasAI ? (p.aiDailyMinutes ? (p.aiDailyMinutes >= 60 ? `${+(p.aiDailyMinutes / 60).toFixed(1)} soat` : `${p.aiDailyMinutes} daq`) : 'Cheksiz') : false);
  const rows: Array<{ label: string; cell: (p: VIPPlan) => CellValue | React.ReactNode }> = [
    { label: 'Narxi', cell: (p) => `${fmt(p.priceMonthly)} so‘m` },
    { label: 'Amal qilish muddati', cell: (p) => `${p.durationDays} kun` },
    { label: 'AI yordamchi (Edubek)', cell: (p) => !!p.hasAI },
    { label: 'AI vaqti (kuniga)', cell: (p) => minutes(p) },
    { label: 'Kutubxona kvotasi', cell: (p) => (p.bookAllowanceCount ? `${p.bookAllowanceCount} kitob` : false) },
    {
      label: 'Tarkibi',
      cell: (p) => (
        <ul className="mx-auto max-w-[200px] space-y-1.5 text-left text-[12px] leading-snug">
          {(p.features || []).slice(0, 6).map((f) => (
            <li key={f} className="flex gap-1.5"><Check className="mt-0.5 h-3 w-3 shrink-0 text-[#c9540a]" strokeWidth={3} /><span>{f}</span></li>
          ))}
        </ul>
      )
    }
  ];
  return (
    <div className="mt-14" data-reveal="rise">
      <div className="flex justify-center">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="plan-compare"
          className="inline-flex h-11 items-center gap-2 rounded-full border border-line/80 bg-white/70 px-5 text-[13.5px] font-semibold text-ink transition-colors hover:bg-white dark:border-white/10 dark:bg-white/[0.05] dark:text-white"
        >
          Tariflarni solishtirish
          <ChevronDown className={cn('h-4 w-4 transition-transform duration-300', open && 'rotate-180')} />
        </button>
      </div>
      <div id="plan-compare" className={cn('grid transition-[grid-template-rows] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]', open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
        <div className="overflow-hidden" inert={!open}>
      <div className="mt-6 overflow-x-auto rounded-[24px] border border-line/70 bg-white/80 dark:border-white/10 dark:bg-white/[0.04]">
        <table className="w-full min-w-[640px] border-collapse text-left text-[13px]">
          <thead>
            <tr className="border-b border-line/70 dark:border-white/10">
              <th className="sticky left-0 bg-inherit px-4 py-3.5 text-[11.5px] font-bold uppercase tracking-[0.12em] text-ink-muted dark:text-stone-400">Imkoniyat</th>
              {plans.map((p) => (
                <th key={p.id} className="px-4 py-3.5 text-center font-display text-[13px] font-extrabold uppercase tracking-[0.12em] text-ink dark:text-white">{p.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label} className="border-b border-line/50 last:border-0 dark:border-white/5">
                <th scope="row" className="sticky left-0 bg-inherit px-4 py-3 font-medium text-ink dark:text-white">{r.label}</th>
                {plans.map((p) => (
                  <td key={p.id} className="px-4 py-3 text-center align-top text-ink dark:text-white">{(() => { const v = r.cell(p); return typeof v === 'boolean' || typeof v === 'string' ? renderCell(v) : v; })()}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
        </div>
      </div>
    </div>
  );
};
