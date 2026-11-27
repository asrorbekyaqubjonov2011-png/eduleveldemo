import React from 'react';
import { useApp } from '../../context/AppContext';
import { Send, Phone } from 'lucide-react';
import { Reveal } from '../ui/motion-primitives';

export const ContactSupportSection: React.FC = () => {
  const { db } = useApp();
  const section = db.siteSections.find((s) => s.key === 'contact');
  const t = db.teacherProfile;
  /** A link that works whether the owner typed a full address, t.me/name or @name. */
  const tgLink = (v?: string) => {
    const x = (v || '').trim();
    if (!x) return '';
    if (/^https?:\/\//i.test(x)) return x;
    return `https://t.me/${x.replace(/^@/, '').replace(/^t\.me\//i, '')}`;
  };
  const channel = tgLink(db.liveStream?.streamUrl) || tgLink(db.liveStream?.telegramChannel);
  const stats = db.publicStats;
  const telegramHandle = t.telegram?.includes('t.me/') ? `@${t.telegram.split('t.me/')[1]}` : t.telegram;

  if (section && !section.isVisible) return null;

  const title = section?.title || 'Savolingiz bormi? Bizga yozing';
  const titleWords = title.trim().split(/\s+/);
  const titleTail = titleWords.length > 2 ? titleWords.slice(-2).join(' ') : '';
  const titleHead = titleWords.length > 2 ? titleWords.slice(0, -2).join(' ') : title;

  return (
    <section id="contact" className="relative overflow-x-clip py-20 sm:py-28">
      <div className="mx-auto w-full max-w-[1240px] px-5 sm:px-8 lg:px-10">
        <Reveal>
          <div className="relative overflow-hidden rounded-[2.25rem] bg-gradient-to-br from-[#ff7a3d] via-[#f25a2f] to-[#e0461c] px-6 py-16 text-center text-white shadow-[0_50px_100px_-50px_rgba(224,70,28,0.8)] sm:px-12 sm:py-20">
            <div className="relative">
              <h2 data-reveal="rise" className="mx-auto max-w-2xl font-display text-[clamp(2rem,4.6vw,3.4rem)] font-extrabold leading-[1.04] tracking-[-0.04em] text-balance">
                {titleHead} {titleTail ? <span className="text-[#ffe0c7]">{titleTail}</span> : null}
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-[15px] leading-relaxed text-white/85">
                Telegram orqali murojaat qiling yoki bevosita qo‘ng‘iroq qiling — sizga tez javob beramiz.
              </p>

              <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
                {t.telegram ? (
                  <a
                    href={tgLink(t.telegram)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-12 items-center gap-2.5 rounded-full bg-[#ffd9c4] px-6 text-[14px] font-semibold text-[#2b1208] transition-transform hover:-translate-y-0.5"
                  >
                    <Send className="h-4 w-4" />
                    Telegram {telegramHandle ? <span className="font-medium opacity-70">{telegramHandle}</span> : null}
                  </a>
                ) : null}
                {channel && channel !== tgLink(t.telegram) ? (
                  <a href={channel} target="_blank" rel="noopener noreferrer" className="inline-flex h-12 items-center gap-2.5 rounded-full border border-white/70 px-6 text-[14px] font-semibold text-white transition-colors hover:bg-white/10">
                    <Send className="h-4 w-4" /> Telegram kanalga qo‘shilish
                  </a>
                ) : null}
                {t.phone ? (
                  <a
                    href={`tel:${t.phone.replace(/[^+\d]/g, '')}`}
                    className="inline-flex h-12 items-center gap-2.5 rounded-full border border-white/70 px-6 text-[14px] font-semibold text-white transition-colors hover:bg-white/10"
                  >
                    <Phone className="h-4 w-4" />
                    {t.phone}
                  </a>
                ) : null}
              </div>
              {stats && stats.students > 0 ? (
                <p className="mt-6 text-[13px] text-white/80">
                  Platformada {stats.students} ta o‘quvchi o‘qiyapti{stats.activeToday > 0 ? ` · bugun ${stats.activeToday} tasi mashq qildi` : ''}
                </p>
              ) : null}
            </div>
          </div>
        </Reveal>

      </div>
    </section>
  );
};
