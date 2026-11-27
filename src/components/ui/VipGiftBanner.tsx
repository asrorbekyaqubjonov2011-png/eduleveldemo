'use client';
import React from 'react';
import { Gift, Sparkles } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useCountdown } from '../../lib/useCountdown';

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * The owner's limited-time VIP for everyone: what it is, which plan, and a live countdown.
 * Renders nothing when no gift is live. `compact` is the slimmer version for the student cabinet.
 */
export const VipGiftBanner: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { db, currentUser, setActiveSite } = useApp();
  const gift = db.vipGift;
  const c = useCountdown(gift?.endsAt);
  if (db.features?.vipGiftBanner === false) return null; // switched off by the owner
  if (!gift || !gift.active || c.done) return null;
  const plan = (db.vipPlans || []).find((p) => p.id === gift.tier);
  const cells: Array<[string, number]> = [
    ['kun', c.days],
    ['soat', c.hours],
    ['daq', c.minutes],
    ['son', c.seconds]
  ];

  return (
    <div data-reveal="grow" className={`gift-card liquid-glass relative overflow-hidden rounded-[28px] ${compact ? 'p-4 sm:p-5' : 'p-6 sm:p-8'}`}>
      <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-12 h-44 w-44 rounded-full bg-[#ff9a3c]/25 soft-blob" />
      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <span className="gift-bob flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-b from-[#ffb36b] to-[#e8457a] text-white shadow-[0_14px_30px_-12px_rgba(232,69,122,0.8)]">
            <Gift className="h-6 w-6" />
          </span>
          <div className="min-w-0">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#c4520a] dark:text-[#ffc982]">
              <Sparkles className="h-3 w-3" /> Cheklangan vaqt
            </div>
            <h3 className="mt-1 font-display text-[clamp(1.15rem,2.4vw,1.6rem)] font-extrabold leading-tight tracking-[-0.02em] text-ink dark:text-white">{gift.title}</h3>
            <p className="mt-1 text-[13.5px] leading-relaxed text-ink-muted dark:text-white/70">
              {gift.message || `Barcha o‘quvchilar uchun ${plan?.name || gift.tier.toUpperCase()} tarifi bepul ochiq.`}
              {plan ? <span className="ml-1 font-semibold text-ink dark:text-white">({plan.name})</span> : null}
            </p>
            {!compact && !currentUser ? (
              <button type="button" onClick={() => setActiveSite('auth')} className="mt-3 inline-flex h-10 items-center rounded-full bg-gradient-to-b from-[#ffb45c] to-[#ef6c12] px-5 text-[13px] font-bold text-white shadow-[0_10px_24px_-10px_rgba(239,108,18,0.9)] transition-transform hover:-translate-y-0.5">
                Ro‘yxatdan o‘tib, olish
              </button>
            ) : null}
            {currentUser ? <p className="mt-2 text-[12.5px] font-semibold text-emerald-700 dark:text-emerald-300">Sizga faollashtirilgan.</p> : null}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2" role="timer" aria-label="Qolgan vaqt">
          {cells.map(([label, value]) => (
            <div key={label} className="flex w-[58px] flex-col items-center rounded-2xl border border-white/60 bg-white/55 py-2.5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/[0.06]">
              <span className="font-display text-[22px] font-extrabold tabular-nums leading-none text-ink dark:text-white">{pad(value)}</span>
              <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-muted dark:text-white/55">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
