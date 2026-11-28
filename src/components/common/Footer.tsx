import React from 'react';
import Link from 'next/link';
import { useApp } from '../../context/AppContext';
import { Phone, Send, ArrowUpRight, BookOpen, ShieldCheck, Mail } from 'lucide-react';
import { EduLevelLogo } from './EduLevelLogo';
import { cn } from '../ui/styles';

/**
 * Footer — quiet editorial close.
 * A dark cap under the light canvas: brand column, two link columns, and a
 * hairline legal row. Deliberately plain so the hero and proof sections own
 * the page's drama.
 */
export const Footer: React.FC<{ onOpenOwnerModal?: () => void }> = ({ onOpenOwnerModal }) => {
  const { db, setActiveSite } = useApp();

  const jump = (id: string) => {
    setActiveSite('site1_open');
    const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth';
    setTimeout(() => {
      const target = document.getElementById(id);
      if (target) target.scrollIntoView({ behavior });
      else window.scrollTo({ top: 0, behavior });
    }, 160);
  };

  const linkClass =
    'text-[12.5px] leading-relaxed text-white/50 transition-colors hover:text-white inline-flex min-h-[34px] items-center gap-1.5';

  return (
    <footer className="relative mt-24 overflow-hidden bg-[#12100e] text-white">
      {/* warm rim light at the top edge */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(255,160,80,0.5), transparent)',
        }}
      />
      <div
        className="pointer-events-none absolute -top-40 left-1/2 h-[26rem] w-[46rem] -translate-x-1/2 rounded-full soft-blob"
        style={{ background: 'radial-gradient(circle, rgba(255,138,43,0.16) 0%, transparent 70%)' }}
      />

      {/* Bottom padding keeps the copyright row clear of the Edubek dock and the back-to-top button. */}
      <div className="relative mx-auto max-w-[1240px] px-5 pb-32 pt-16 sm:px-8 sm:pb-36 lg:px-10">
        <div className="grid gap-12 md:grid-cols-12">
          {/* Brand */}
          <div className="md:col-span-5">
            <EduLevelLogo size="md" variant="white" showSubtitle />
            <p className="mt-5 max-w-sm text-[12.5px] leading-relaxed text-white/65">
              O'zbekiston yoshlarini IELTS Academic & GT, CEFR Multilevel va xalqaro universitetlar
              talabaligiga tayyorlovchi 3-in-1 intellektual ta'lim ekotizimi.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2.5">
              {db.teacherProfile.phone?.trim() && <a href={`tel:${db.teacherProfile.phone.replace(/[^+\d]/g, '')}`} className="inline-flex items-center gap-1.5 text-[12.5px] text-white/55 transition-colors hover:text-white">
                <Phone className="h-3.5 w-3.5 text-ember-400" />
                <span className="font-mono">{db.teacherProfile.phone}</span>
              </a>}
              <a
                href={db.teacherProfile.telegram}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-ember-400 transition-colors hover:text-ember-300"
              >
                <Send className="h-3.5 w-3.5" />
                Telegram kanal
              </a>
            </div>
          </div>

          {/* Programs */}
          <div className="md:col-span-3">
            <h4 className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/65">
              Ta'lim dasturlari
            </h4>
            <ul className="mt-4 space-y-2.5">
              {[
                { label: 'IELTS Band 8.0+ Masterclass', href: '/ielts-tayyorgarlik' },
                { label: 'CEFR Multilevel C1 kursi', href: '/cefr-tayyorgarlik' },
                { label: 'General English & Fluency', href: '/ingliz-tili-darslari' },
                { label: 'Raqamli kutubxona', id: 'books' },
                { label: '4-Skill Mock arenasi', href: '/ielts/mock-test' },
                { label: 'VIP tariflar', id: 'vip' },
              ].map(({ label, id, href }) => (
                <li key={label}>
                  {href
                    ? <Link href={href} className={linkClass}>{label}</Link>
                    : <button onClick={() => jump(id ?? 'top')} className={linkClass}>{label}</button>}
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div className="md:col-span-4">
            <h4 className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/65">
              Yordam va aloqa
            </h4>
            <ul className="mt-4 space-y-2.5">
              <li>
                <button onClick={() => jump('teacher-bio')} className={linkClass}>
                  <ShieldCheck className="h-3.5 w-3.5 text-white/65" />
                  Akademik standartlar
                </button>
              </li>
              <li>
                <button onClick={() => jump('contact')} className={linkClass}>
                  <Mail className="h-3.5 w-3.5 text-white/65" />
                  Savol va murojaat yuborish
                </button>
              </li>
              <li>
                <a href="https://ielts.org" target="_blank" rel="noreferrer" className={linkClass}>
                  <BookOpen className="h-3.5 w-3.5 text-white/65" />
                  Rasmiy IELTS portali
                  <ArrowUpRight className="h-3 w-3 text-white/65" />
                </a>
              </li>
              <li>
                <a href="https://my.uzbmb.uz" target="_blank" rel="noreferrer" className={linkClass}>
                  <BookOpen className="h-3.5 w-3.5 text-white/65" />
                  UzBMB milliy sertifikat
                  <ArrowUpRight className="h-3 w-3 text-white/65" />
                </a>
              </li>
            </ul>

            <div className="mt-6 flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3.5 py-3">
              <div className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-emerald-400" />
              <p className="text-[11px] leading-snug text-white/65">
                Shaxsiy konsultatsiya uchun ustozga to'g'ridan-to'g'ri yozing.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-14 flex flex-col items-start justify-between gap-3 border-t border-white/8 pt-6 sm:flex-row sm:items-center">
          <p className="text-[11px] text-white/65">
            © {new Date().getFullYear()} Edu Level English Platform. Barcha huquqlar himoyalangan.
          </p>
          <p className="text-[10.5px] text-white/65">
            Cambridge Assessment English va CEFR xalqaro standartlari asosida.
          </p>
        </div>
      </div>
    </footer>
  );
};
