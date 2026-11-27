'use client';
import React, { useState } from 'react';
import { api } from '../../../services/api';

type LinkCode = { code: string; link: string; botUsername: string; expiresInMinutes: number };

/** Connects the student's site account to the Telegram bot with a short code (valid 30 minutes). */
export const TelegramLinkCard: React.FC = () => {
  const [data, setData] = useState<LinkCode | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = async () => {
    setBusy(true);
    setError(null);
    const r = await api.telegramLinkCode().catch(() => null);
    setBusy(false);
    if (r?.success) setData(r as LinkCode);
    else setError(r?.message || 'Kod olib bo‘lmadi. Qayta urinib ko‘ring.');
  };

  return (
    <section className="liquid-glass space-y-3 rounded-[24px] p-5">
      <h2 className="text-[15px] font-bold text-ink dark:text-white">Telegram bot bilan ulash</h2>
      <p className="text-[13px] leading-relaxed text-ink-muted dark:text-stone-400">
        Ulangach, botdagi darslar, progress, kunlik reja va eslatmalar sizning hisobingiz bilan ishlaydi.
      </p>
      {data ? (
        <div className="space-y-2 rounded-2xl bg-white/60 p-4 text-[13px] dark:bg-white/[0.04]">
          <p className="text-ink dark:text-white">
            Botga shu buyruqni yuboring: <b className="font-mono">/ulash {data.code}</b>
          </p>
          <a href={data.link} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center rounded-full bg-gradient-to-b from-[#ffa149] to-[#f2650f] px-5 font-semibold text-white">
            Botda ulash
          </a>
          <p className="text-[12px] text-ink-muted dark:text-stone-400">Kod {data.expiresInMinutes} daqiqa amal qiladi, bir marta ishlatiladi.</p>
        </div>
      ) : null}
      <button type="button" disabled={busy} onClick={create} className="h-10 rounded-full border border-line px-5 text-[13px] font-semibold text-ink disabled:opacity-50 dark:border-white/10 dark:text-white">
        {busy ? 'Yuklanmoqda…' : data ? 'Yangi kod olish' : 'Ulash kodini olish'}
      </button>
      {error ? <p role="alert" className="text-[12.5px] font-semibold text-rose-600 dark:text-rose-300">{error}</p> : null}
    </section>
  );
};
