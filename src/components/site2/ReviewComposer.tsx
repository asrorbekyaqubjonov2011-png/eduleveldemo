import React, { useState } from 'react';
import { Star, Send, CheckCircle2, MessageSquareQuote } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { cn } from '../ui/styles';

/** Lets a student share an opinion; it appears on the landing page after the owner approves it. */
export const ReviewComposer: React.FC = () => {
  const { db, currentUser, submitReview } = useApp();
  const [text, setText] = useState('');
  const [rating, setRating] = useState(5);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const mine = (db.reviews || []).filter((r) => r.userId === currentUser?.id);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (text.trim().length < 20) return setMsg({ ok: false, text: 'Fikr kamida 20 ta belgidan iborat bo‘lsin.' });
    setBusy(true);
    const res = await submitReview(text.trim(), rating);
    setBusy(false);
    if (res?.success) {
      setText('');
      setMsg({ ok: true, text: 'Rahmat! Fikringiz ustozga yuborildi va tasdiqlangach bosh sahifada ko‘rinadi.' });
    } else setMsg({ ok: false, text: res?.message || 'Yuborib bo‘lmadi.' });
  };

  return (
    <section className="glass-premium rounded-[28px] p-6 sm:p-7" data-reveal>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-b from-[#ffa149] to-[#f2650f] text-white shadow-[0_10px_24px_-10px_rgba(242,101,15,0.85)]">
            <MessageSquareQuote className="h-5 w-5" />
          </span>
          <div>
            <h3 className="font-display text-[17px] font-extrabold text-ink dark:text-white">Fikringizni qoldiring</h3>
            <p className="text-[12.5px] text-ink-muted dark:text-stone-400">Edu Level bilan tajribangiz boshqalarga yo‘l ko‘rsatadi.</p>
          </div>
        </div>
        {mine.length ? (
          <span className="rounded-full bg-ember-500/12 px-3 py-1 text-[11.5px] font-semibold text-ember-700 dark:text-ember-300">
            {mine.filter((r) => r.status === 'approved').length} tasdiqlangan · {mine.filter((r) => r.status === 'pending').length} kutilmoqda
          </span>
        ) : null}
      </div>

      <form onSubmit={send} className="mt-5 space-y-3">
        <div className="flex gap-1" role="radiogroup" aria-label="Baho">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={rating === n}
              onClick={() => setRating(n)}
              className="rounded-full p-1 transition-transform hover:scale-110"
              aria-label={`${n} yulduz`}
            >
              <Star className={cn('h-6 w-6 text-ember-500', n <= rating ? 'fill-current' : 'opacity-30')} />
            </button>
          ))}
        </div>
        <textarea
          rows={3}
          maxLength={600}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Masalan: Reading simulyatori orqali 2 oyda 6.0 dan 7.5 ga chiqdim…"
          className="w-full resize-y rounded-2xl border border-line bg-white/70 px-4 py-3 text-[14px] text-ink outline-none transition-all placeholder:text-ink-muted/60 focus:border-ember-500/70 focus:ring-4 focus:ring-ember-500/10 dark:border-white/10 dark:bg-white/[0.04] dark:text-white"
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-[12px] text-ink-muted dark:text-stone-500">{text.length}/600</span>
          <button
            type="submit"
            disabled={busy}
            className="inline-flex h-11 items-center gap-2 rounded-full bg-gradient-to-b from-[#ffa149] to-[#f2650f] px-6 text-[14px] font-semibold text-white shadow-[0_12px_28px_-12px_rgba(242,101,15,0.85)] transition-transform hover:-translate-y-0.5 disabled:opacity-60"
          >
            <Send className="h-4 w-4" /> {busy ? 'Yuborilmoqda…' : 'Yuborish'}
          </button>
        </div>
        {msg ? (
          <div
            className={cn(
              'flex items-start gap-2 rounded-2xl p-3 text-[13px]',
              msg.ok ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'bg-rose-500/10 text-rose-700 dark:text-rose-300'
            )}
          >
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            {msg.text}
          </div>
        ) : null}
      </form>
    </section>
  );
};
