'use client';
import React, { useState } from 'react';
import { api } from '../../services/api';
import { Newspaper, Pin } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { VipGiftBanner } from '../ui/VipGiftBanner';
import { isGiftLive } from '../../lib/giftLive';

const MONTHS = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'];
const formatDate = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : `${d.getDate()}-${MONTHS[d.getMonth()]}, ${d.getFullYear()}`;
};

/**
 * Public news: what the owner published, with the limited-time VIP gift on top while one is live.
 * The owner switches the section on or off, and writes the news, in the owner panel (Yangiliklar).
 * With nothing to show, the section is not rendered at all.
 */
export const NewsSection: React.FC = () => {
  const { db } = useApp();
  const [contact, setContact] = useState('');
  const [subState, setSubState] = useState<{ ok: boolean; text: string } | null>(null);
  const [subBusy, setSubBusy] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [shared, setShared] = useState('');
  const [showAll, setShowAll] = useState(false);
  const sec = db.siteSections.find((s) => s.key === 'news');
  // The same news saved twice is shown once.
  const seenNews = new Set<string>();
  const items = [...(db.news || [])]
    .filter((n) => n.published)
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .filter((n) => {
      const key = `${n.title.trim()}|${n.body.trim()}`.toLowerCase();
      if (seenNews.has(key)) return false;
      seenNews.add(key);
      return true;
    });
  const gift = isGiftLive(db.vipGift);
  if (!items.length && !gift) return null;
  const canSubscribe = db.features?.newsSubscribe !== false;
  const subscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubBusy(true);
    setSubState(null);
    try {
      const r = await api.subscribeNews(contact);
      setSubState({ ok: !!r?.success, text: r?.message || (r?.success ? 'Rahmat!' : 'Yuborib bo‘lmadi.') });
      if (r?.success) setContact('');
    } catch {
      setSubState({ ok: false, text: 'Server bilan bog‘lanib bo‘lmadi.' });
    } finally {
      setSubBusy(false);
    }
  };

  return (
    <section id="news" aria-labelledby="news-title" className="relative overflow-x-clip py-20 sm:py-28">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-10 -z-10 mx-auto h-72 max-w-5xl rounded-full bg-gradient-to-r from-[#ffd9b8]/50 via-[#ffc1d4]/40 to-[#d9c8ff]/50 soft-blob" data-parallax="0.12" />
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-line/80 bg-white/60 px-3.5 py-1.5 text-[11.5px] font-bold uppercase tracking-[0.14em] text-[#c4520a] backdrop-blur dark:border-white/10 dark:bg-white/[0.04] dark:text-[#ffc982]">
            <Newspaper className="h-3.5 w-3.5" /> Yangiliklar
          </span>
          <h2 id="news-title" className="mt-5 font-display text-[clamp(2rem,4.4vw,3.2rem)] font-extrabold leading-[1.04] tracking-[-0.035em] text-ink dark:text-white">
            {sec?.title || 'Yangiliklar va maxsus takliflar'}
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-ink-muted dark:text-white/65">
            {sec?.subtitle || 'Platformadagi so‘nggi yangiliklar, yangi kurslar va cheklangan vaqtli takliflar.'}
          </p>
        </div>

        {gift ? (
          <div className="mt-10">
            <VipGiftBanner />
          </div>
        ) : null}

        {items.length ? (
          <>
          <ul className={`mt-10 grid gap-5 ${items.length === 1 ? 'grid-cols-1' : 'md:grid-cols-2 lg:grid-cols-3'}`}>
            {(showAll ? items : items.slice(0, 6)).map((n, i) => {
              const featured = i === 0 && (n.pinned || items.length > 1);
              const expanded = open === n.id;
              const long = n.body.length > 180;
              return (
                <li key={n.id} className={featured ? 'md:col-span-2' : ''}>
                  <article className="liquid-glass group flex h-full flex-col overflow-hidden rounded-[28px] transition-transform duration-500 hover:-translate-y-1">
                    {n.imageUrl ? (
                      <div className="relative overflow-hidden">
                        <img src={n.imageUrl} alt="" loading="lazy" className={`w-full object-cover transition-transform duration-[1200ms] group-hover:scale-[1.04] ${featured ? 'h-56 sm:h-64' : 'h-44'}`} />
                        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" />
                      </div>
                    ) : null}
                    <div className="flex flex-1 flex-col p-6">
                      <div className="flex flex-wrap items-center gap-2 text-[11.5px] font-semibold">
                        {n.pinned ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#f2650f]/12 px-2.5 py-1 text-[#c4520a] dark:text-[#ffc982]">
                            <Pin className="h-3 w-3" /> Muhim
                          </span>
                        ) : null}
                        {n.tag ? <span className="rounded-full bg-ink/[0.06] px-2.5 py-1 text-ink dark:bg-white/10 dark:text-white">{n.tag}</span> : null}
                        <span className="text-ink-muted dark:text-white/55">{formatDate(n.createdAt)}</span>
                      </div>
                      <h3 className={`mt-3 font-display font-extrabold leading-snug tracking-[-0.02em] text-ink dark:text-white ${featured ? 'text-[clamp(1.3rem,2.4vw,1.75rem)]' : 'text-[18px]'}`}>{n.title}</h3>
                      {n.body && n.body.trim().toLowerCase() !== n.title.trim().toLowerCase() ? (
                        <p className={`mt-2.5 whitespace-pre-line text-[14px] leading-relaxed text-ink-muted dark:text-white/70 ${expanded ? '' : 'line-clamp-4'}`}>{n.body}</p>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => {
                          const text = `${n.title} — Edu Level ${window.location.origin}/#news`;
                          if (navigator.share) navigator.share({ title: n.title, text }).catch(() => {});
                          else navigator.clipboard?.writeText(text).then(() => { setShared(n.id); setTimeout(() => setShared(''), 1600); }).catch(() => {});
                        }}
                        className="mt-3 self-start text-[12.5px] font-semibold text-ink-muted hover:text-ink dark:text-white/60 dark:hover:text-white"
                      >
                        {shared === n.id ? '✓ Havola nusxalandi' : 'Ulashish'}
                      </button>
                      {long ? (
                        <button type="button" onClick={() => setOpen(expanded ? null : n.id)} className="mt-3 self-start text-[13px] font-bold text-[#c4520a] hover:underline dark:text-[#ffc982]">
                          {expanded ? 'Yopish' : 'Davomini o‘qish'}
                        </button>
                      ) : null}
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
          {items.length > 6 ? (
            <div className="mt-8 flex justify-center">
              <button
                type="button"
                onClick={() => setShowAll((v) => !v)}
                className="rounded-full border border-line/80 bg-white/70 px-5 py-2.5 text-[13px] font-bold text-ink shadow-sm transition hover:-translate-y-0.5 dark:border-white/15 dark:bg-white/[0.06] dark:text-white"
              >
                {showAll ? 'Kamroq ko‘rsatish' : `Barchasini ko‘rish (${items.length})`}
              </button>
            </div>
          ) : null}
          </>
        ) : null}

        {canSubscribe ? (
          <form onSubmit={subscribe} className="liquid-glass mt-10 flex flex-col gap-3 rounded-[26px] p-5 sm:flex-row sm:items-center sm:p-6" data-reveal="rise">
            <div className="sm:flex-1">
              <div className="font-display text-[16px] font-extrabold text-ink dark:text-white">Yangiliklarni o‘tkazib yubormang</div>
              <p className="mt-0.5 text-[13px] text-ink-muted dark:text-white/65">E-mail, telefon yoki Telegram (@nom) qoldiring: yangi kurs va aksiyalar haqida birinchi bo‘lib xabar beramiz.</p>
            </div>
            <div className="flex flex-1 gap-2">
              <label htmlFor="news-contact" className="sr-only">E-mail, telefon yoki Telegram</label>
              <input id="news-contact" value={contact} onChange={(e) => setContact(e.target.value)} required maxLength={120} placeholder="email, +998… yoki @nom" className="h-12 min-w-0 flex-1 rounded-full border border-line bg-white/80 px-5 text-[14px] text-ink outline-none focus:border-[#f2650f] dark:border-white/15 dark:bg-white/[0.06] dark:text-white" />
              <button type="submit" disabled={subBusy} className="h-12 shrink-0 rounded-full bg-gradient-to-b from-[#ffb45c] to-[#ef6c12] px-6 text-[14px] font-bold text-white shadow-[0_10px_24px_-10px_rgba(239,108,18,0.9)] disabled:opacity-60">{subBusy ? '…' : 'Obuna'}</button>
            </div>
            {subState ? <p role={subState.ok ? 'status' : 'alert'} className={`text-[13px] font-semibold sm:basis-full ${subState.ok ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}`}>{subState.text}</p> : null}
          </form>
        ) : null}
      </div>
    </section>
  );
};
