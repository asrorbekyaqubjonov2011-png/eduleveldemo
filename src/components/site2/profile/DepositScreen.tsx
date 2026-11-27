'use client';
import React, { useRef, useState } from 'react';
import { CheckCircle2, Copy, ImagePlus, Loader2, Send, X } from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { api } from '../../../services/api';
import { QrCode } from '../../ui/QrCode';
import { imageToJpegDataUrl } from '../../../lib/imageUpload';

const PRESETS = [50000, 100000, 200000, 500000];
const group = (digits: string) => digits.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim();
const som = (n: number) => `${Math.round(n).toLocaleString('en-US').replace(/,/g, ' ')} so‘m`;

/**
 * Top up the balance in four clear steps: pay to the card (scan the QR or copy the number),
 * enter the amount, attach the receipt, send. The owner sees the receipt and approves.
 */
export const DepositScreen: React.FC<{ onDone: () => void }> = ({ onDone }) => {
  const { db, currentUser, requestDeposit } = useApp();
  const settings = db.telegramBotSettings;
  const card = (settings?.cardNumber || '').replace(/\D/g, '');
  const minimum = Number(settings?.minDepositAmount) || 0;
  const [amount, setAmount] = useState<number>(Math.max(PRESETS[1], minimum));
  const [receipt, setReceipt] = useState<{ url: string; preview: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [copied, setCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const pending = (db.depositTransactions || []).filter((t) => t.userId === currentUser?.id && t.status === 'pending');

  const copy = () => {
    navigator.clipboard?.writeText(card).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }).catch(() => {});
  };

  const pick = async (file?: File) => {
    if (!file) return;
    setError('');
    setUploading(true);
    try {
      const dataUrl = await imageToJpegDataUrl(file);
      const res = await api.uploadAsset(dataUrl, file.name.replace(/\.[^.]+$/, '') + '.jpg', 'receipt');
      const url = res?.url || res?.imageUrl;
      if (!url) throw new Error(res?.message || 'Chekni yuklab bo‘lmadi. Qayta urinib ko‘ring.');
      setReceipt({ url, preview: dataUrl });
    } catch (e) {
      setError((e as Error).message || 'Chekni yuklab bo‘lmadi.');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const submit = async () => {
    setError('');
    if (!amount || amount < minimum) return setError(`Minimal depozit: ${som(minimum)}`);
    if (!receipt) return setError('Avval to‘lov chekini yuklang.');
    setBusy(true);
    try {
      const res = await requestDeposit(amount, undefined, 'card', receipt.url);
      if (res && res.success === false) return setError(res.message || 'So‘rovni yuborib bo‘lmadi.');
      setSent(true);
    } catch {
      setError('So‘rovni yuborib bo‘lmadi. Internetni tekshirib, qayta urinib ko‘ring.');
    } finally {
      setBusy(false);
    }
  };

  if (!card || !currentUser) {
    return <p className="rounded-2xl bg-amber-50 p-4 text-[13.5px] text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">To‘lov rekvizitlari hali sozlanmagan. Ustozga murojaat qiling.</p>;
  }

  if (sent) {
    return (
      <div className="space-y-4 py-6 text-center">
        <span className="pop-in mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600"><CheckCircle2 className="h-9 w-9" /></span>
        <h3 className="font-display text-xl font-extrabold text-ink dark:text-white">So‘rov yuborildi</h3>
        <p className="mx-auto max-w-sm text-[13.5px] text-ink-muted dark:text-stone-400">{som(amount)} uchun so‘rovingiz ustozga yetib bordi. Ustoz chekni tekshirib tasdiqlagach, balansingiz avtomatik to‘ladi.</p>
        <button type="button" onClick={onDone} className="inline-flex h-11 items-center rounded-full bg-ink px-6 text-[13.5px] font-bold text-white dark:bg-white dark:text-ink">Tushunarli</button>
      </div>
    );
  }

  const stepNo = 'flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#f2650f] text-[12px] font-extrabold text-white';
  return (
    <div className="space-y-6">
      {pending.length > 0 ? (
        <p role="status" className="rounded-2xl bg-amber-500/10 px-4 py-3 text-[13px] text-amber-900 dark:text-amber-200">
          Sizda tasdiqlanishi kutilayotgan {pending.length} ta so‘rov bor ({som(pending.reduce((a, t) => a + t.amount, 0))}). Yangisini yuborsangiz ham bo‘ladi.
        </p>
      ) : null}

      <section>
        <div className="mb-3 flex items-center gap-2 text-[14px] font-bold text-ink dark:text-white"><span className={stepNo}>1</span> Kartaga o‘tkazing</div>
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#2b2118] via-[#3b2a1c] to-[#f2650f] p-5 text-white shadow-[0_24px_50px_-26px_rgba(242,101,15,0.8)]">
          <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-12 h-44 w-44 rounded-full bg-white/10" />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70">Karta raqami</div>
              <div className="mt-1.5 font-mono text-[clamp(1.2rem,4.6vw,1.75rem)] font-bold tracking-[0.06em]">{group(card)}</div>
              {settings?.cardHolder ? (
                <>
                  <div className="mt-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70">Karta egasi</div>
                  <div className="mt-1 text-[15px] font-semibold">{settings.cardHolder}</div>
                </>
              ) : null}
              <button type="button" onClick={copy} className="mt-4 inline-flex h-10 items-center gap-2 rounded-full bg-white/15 px-4 text-[13px] font-semibold backdrop-blur transition-colors hover:bg-white/25">
                {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? 'Nusxalandi' : 'Raqamni nusxalash'}
              </button>
            </div>
            <div className="flex flex-col items-center gap-2 sm:items-end">
              <QrCode value={card} size={140} label="Karta raqami QR kodi" />
              <span className="text-[11.5px] text-white/75">To‘lov ilovasida skaner qiling</span>
            </div>
          </div>
        </div>
        {settings?.cardOrMerchantInfo ? <p className="mt-3 text-[12.5px] text-ink-muted dark:text-stone-400">{settings.cardOrMerchantInfo}</p> : null}
      </section>

      <section>
        <div className="mb-3 flex items-center gap-2 text-[14px] font-bold text-ink dark:text-white"><span className={stepNo}>2</span> Summani kiriting</div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Summa">
          {PRESETS.filter((p) => p >= minimum).map((p) => (
            <button key={p} type="button" aria-pressed={amount === p} onClick={() => setAmount(p)} className={`rounded-full px-4 py-2 text-[13px] font-semibold transition-colors ${amount === p ? 'bg-ink text-white dark:bg-white dark:text-ink' : 'border border-line text-ink dark:border-white/15 dark:text-white'}`}>
              {som(p)}
            </button>
          ))}
        </div>
        {(db.vipPlans || []).filter((p) => p.priceMonthly > 0).length ? (
          <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Tarif narxi">
            {(db.vipPlans || []).filter((p) => p.priceMonthly > 0).map((p) => (
              <button key={p.id} type="button" onClick={() => setAmount(p.priceMonthly)} aria-pressed={amount === p.priceMonthly} className={`rounded-full border px-3.5 py-1.5 text-[12.5px] font-semibold transition-colors ${amount === p.priceMonthly ? 'border-[#f2650f] bg-[#f2650f]/10 text-[#c4520a]' : 'border-line text-ink-muted dark:border-white/15 dark:text-stone-300'}`}>
                {p.name}: {som(p.priceMonthly)}
              </button>
            ))}
          </div>
        ) : null}
        <div className="mt-3 flex items-center gap-3">
          <input
            type="text"
            inputMode="numeric"
            aria-label="Depozit summasi"
            value={amount ? amount.toLocaleString('en-US').replace(/,/g, ' ') : ''}
            onChange={(e) => setAmount(Number(e.target.value.replace(/\D/g, '')) || 0)}
            className="h-12 w-full max-w-[260px] rounded-2xl border border-line bg-white/70 px-4 text-[17px] font-bold tabular-nums text-ink outline-none focus:border-[#f2650f] dark:border-white/15 dark:bg-white/[0.05] dark:text-white"
          />
          <span className="text-[13px] font-semibold text-ink-muted dark:text-stone-400">so‘m</span>
        </div>
        {minimum > 0 ? <p className="mt-2 text-[12px] text-ink-muted dark:text-stone-500">Minimal summa: {som(minimum)}</p> : null}
      </section>

      <section>
        <div className="mb-3 flex items-center gap-2 text-[14px] font-bold text-ink dark:text-white"><span className={stepNo}>3</span> To‘lov chekini joylang</div>
        <input ref={fileRef} type="file" accept="image/*" className="sr-only" id="receipt-file" onChange={(e) => pick(e.target.files?.[0])} />
        {receipt ? (
          <div className="flex items-center gap-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3">
            <img src={receipt.preview} alt="Yuklangan chek" className="h-20 w-20 rounded-xl object-cover" />
            <div className="min-w-0 flex-1 text-[13px] font-semibold text-emerald-800 dark:text-emerald-200">Chek yuklandi</div>
            <button type="button" onClick={() => setReceipt(null)} aria-label="Chekni olib tashlash" className="flex h-9 w-9 items-center justify-center rounded-full text-ink-muted hover:bg-ink/5"><X className="h-4 w-4" /></button>
          </div>
        ) : (
          <label htmlFor="receipt-file" className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line bg-white/40 px-4 py-8 text-center transition-colors hover:border-[#f2650f]/60 dark:border-white/15 dark:bg-white/[0.03]">
            {uploading ? <Loader2 className="h-6 w-6 animate-spin text-[#f2650f]" /> : <ImagePlus className="h-6 w-6 text-[#f2650f]" />}
            <span className="text-[13.5px] font-semibold text-ink dark:text-white">{uploading ? 'Yuklanmoqda…' : 'Skrinshot yoki rasm tanlang'}</span>
            <span className="text-[12px] text-ink-muted dark:text-stone-500">To‘lov ilovasidagi chek ko‘rinsin: summa, sana va karta oxiri</span>
          </label>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center gap-2 text-[14px] font-bold text-ink dark:text-white"><span className={stepNo}>4</span> Tasdiqlang va yuboring</div>
        <button type="button" onClick={submit} disabled={busy || uploading} className="inline-flex h-12 items-center gap-2 rounded-full bg-gradient-to-b from-[#ffb45c] to-[#ef6c12] px-7 text-[14px] font-bold text-white shadow-[0_12px_28px_-12px_rgba(239,108,18,0.9)] transition-transform hover:-translate-y-0.5 disabled:opacity-60">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} {busy ? 'Yuborilmoqda…' : `${som(amount || 0)} to‘lovni tasdiqlash`}
        </button>
        {error ? <p role="alert" className="mt-3 text-[13px] font-semibold text-rose-700 dark:text-rose-400">{error}</p> : null}
      </section>
    </div>
  );
};
