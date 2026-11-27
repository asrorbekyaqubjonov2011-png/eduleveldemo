'use client';
import React, { useEffect, useState } from 'react';
import { Award, Sparkles, X, ZoomIn } from 'lucide-react';
import { useApp } from '../../context/AppContext';

type Cat = 'all' | 'ielts' | 'cefr' | 'other';
const categoryOf = (type: string): Exclude<Cat, 'all'> => (/ielts/i.test(type) ? 'ielts' : /cefr|multilevel|\b[abc][12]\b/i.test(type) ? 'cefr' : 'other');
const CAT_LABEL: Record<Cat, string> = { all: 'Hammasi', ielts: 'IELTS', cefr: 'CEFR', other: 'Boshqa' };

/** Public results: only results the owner has published. Empty state is said plainly. */
export const ResultsSection: React.FC = () => {
  const { db } = useApp();
  const [cat, setCat] = useState<Cat>('all');
  const [zoom, setZoom] = useState<{ url: string; name: string } | null>(null);
  useEffect(() => {
    if (!zoom) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setZoom(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [zoom]);
  const sec = db.siteSections.find((s) => s.key === 'results');
  const published = (db.studentResults || []).filter((r) => r.isPublished);
  const counts: Record<Cat, number> = { all: published.length, ielts: 0, cefr: 0, other: 0 };
  published.forEach((r) => { counts[categoryOf(r.certificateType || '')] += 1; });
  const items = cat === 'all' ? published : published.filter((r) => categoryOf(r.certificateType || '') === cat);

  return (
    <section id="results" aria-labelledby="results-title" className="relative overflow-x-clip py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-6" data-reveal="rise">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-line/80 bg-white/60 px-3.5 py-1.5 text-[11.5px] font-bold uppercase tracking-[0.14em] text-[#c4520a] dark:border-white/10 dark:bg-white/[0.04] dark:text-[#ffc982]">
              <Award className="h-3.5 w-3.5" /> Natijalar
            </span>
            <h2 id="results-title" className="mt-5 font-display text-[clamp(2rem,4.4vw,3.2rem)] font-extrabold leading-[1.04] tracking-[-0.035em] text-ink dark:text-white">
              {sec?.title || 'O‘quvchilarimiz natijalari'}
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-ink-muted dark:text-white/65">
              {sec?.subtitle || 'Ustoz tomonidan e’lon qilingan haqiqiy natijalar va sertifikatlar.'}
            </p>
          </div>
        </div>

        {published.length > 1 && (Object.keys(CAT_LABEL) as Cat[]).filter((c) => c === 'all' || counts[c] > 0).length > 2 ? (
          <div role="group" aria-label="Natijalar turi" className="mt-8 flex flex-wrap gap-2" data-reveal="rise">
            {(Object.keys(CAT_LABEL) as Cat[]).filter((c) => c === 'all' || counts[c] > 0).map((c) => (
              <button key={c} type="button" aria-pressed={cat === c} onClick={() => setCat(c)} className={`rounded-full px-4 py-2 text-[13px] font-semibold transition-colors ${cat === c ? 'bg-ink text-white dark:bg-white dark:text-ink' : 'border border-line/80 bg-white/60 text-ink-muted hover:text-ink dark:border-white/10 dark:bg-white/[0.04] dark:text-stone-300'}`}>
                {CAT_LABEL[c]} <span className="ml-1 tabular-nums opacity-60">{counts[c]}</span>
              </button>
            ))}
          </div>
        ) : null}

        {items.length === 0 ? (
          <div data-reveal="zoom" className="mt-12 flex flex-col items-center rounded-[28px] border border-dashed border-line/90 bg-white/50 px-6 py-16 text-center dark:border-white/10 dark:bg-white/[0.02]">
            <span className="results-orb flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-b from-[#ffb36b] to-[#e8457a] text-white shadow-[0_16px_34px_-14px_rgba(232,69,122,0.7)]">
              <Sparkles className="h-7 w-7" />
            </span>
            <p className="mt-6 font-display text-[18px] font-bold text-ink dark:text-white">Natijalar hali e’lon qilinmagan</p>
            <p className="mt-2 max-w-md text-[14px] leading-relaxed text-ink-muted dark:text-white/60">
              Ustoz tasdiqlagan natijalar va sertifikatlar shu yerda chiqadi.
            </p>
          </div>
        ) : (
          <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((r, i) => {
              const initials = (r.studentName || 'O').split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
              return (
                <li key={r.id} data-reveal="grow" data-reveal-delay={(i % 6) * 110} data-reveal-distance={70} data-reveal-duration={1100} className="group">
                  <article className="flex h-full flex-col rounded-[26px] border border-line/70 bg-white/80 p-6 shadow-[0_24px_50px_-34px_rgba(18,16,14,0.35)] transition-transform duration-500 hover:-translate-y-1.5 dark:border-white/10 dark:bg-white/[0.04]">
                    <div className="flex items-center gap-4">
                      {r.photoUrl ? (
                        <img src={r.photoUrl} alt={r.studentName} loading="lazy" className="h-14 w-14 rounded-2xl object-cover ring-1 ring-black/5" />
                      ) : (
                        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-b from-[#ffe2c4] to-[#ffb07a] font-display text-[18px] font-extrabold text-[#12100e]">{initials}</span>
                      )}
                      <div className="min-w-0">
                        <div className="truncate font-display text-[17px] font-bold text-ink dark:text-white">{r.studentName}</div>
                        <div className="truncate text-[12.5px] text-ink-muted dark:text-white/60">{[r.region, r.university].filter(Boolean).join(' · ')}</div>
                      </div>
                    </div>
                    <div className="mt-5 rounded-2xl bg-ink/[0.03] p-4 dark:bg-white/[0.04]">
                      <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#c4520a] dark:text-[#ffc982]">{r.certificateType}</div>
                      <div className="mt-1 font-display text-[15px] font-bold leading-snug text-ink dark:text-white">{r.score}</div>
                      {r.examDate ? <div className="mt-1 text-[12px] text-ink-muted dark:text-white/55">{r.examDate}</div> : null}
                    </div>
                    {r.story ? <p className="mt-4 line-clamp-3 text-[13.5px] leading-relaxed text-ink-muted dark:text-white/65">{r.story}</p> : null}
                    {r.certificateImageUrl ? (
                      <button type="button" onClick={() => setZoom({ url: r.certificateImageUrl as string, name: r.studentName })} className="group/cert relative mt-auto block overflow-hidden rounded-2xl border border-line/70 text-left dark:border-white/10" aria-label={`${r.studentName} sertifikatini kattalashtirish`}>
                        <img src={r.certificateImageUrl} alt="" loading="lazy" className="aspect-[4/3] w-full object-cover transition-transform duration-700 group-hover/cert:scale-105" />
                        <span className="absolute inset-x-0 bottom-0 flex items-center gap-1.5 bg-gradient-to-t from-black/60 to-transparent px-3 pb-2 pt-6 text-[12px] font-semibold text-white"><ZoomIn className="h-3.5 w-3.5" /> Sertifikatni ko‘rish</span>
                      </button>
                    ) : null}
                  </article>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {zoom ? (
        <div role="dialog" aria-modal="true" aria-label={`${zoom.name} sertifikati`} onClick={() => setZoom(null)} className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4">
          <button type="button" onClick={() => setZoom(null)} aria-label="Yopish" className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur"><X className="h-5 w-5" /></button>
          <img src={zoom.url} alt={`${zoom.name} sertifikati`} onClick={(e) => e.stopPropagation()} className="max-h-[88vh] max-w-full rounded-2xl object-contain shadow-2xl" />
        </div>
      ) : null}
    </section>
  );
};
