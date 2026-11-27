import React, { useMemo, useState } from 'react';
import { MessageSquareQuote, Plus, Star, Check, EyeOff, Trash2, Pencil, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Review } from '../../types';
import { Glass, Button, Pill } from '../ui';
import { Reveal } from '../ui/motion-primitives';
import { cn, field, label } from '../ui/styles';
import { downloadCsv } from '../../lib/csvDownload';

const EMPTY: Partial<Review> = { name: '', subtitle: '', text: '', rating: 5, status: 'approved', photoUrl: '' };

/** Owner moderation for the landing-page testimonials marquee. */
export const ReviewsManager: React.FC = () => {
  const { db, ownerReviews } = useApp();
  const reviews = db.reviews || [];
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'hidden'>('all');
  const [editing, setEditing] = useState<Partial<Review> | null>(null);
  const [busy, setBusy] = useState(false);

  const list = useMemo(() => reviews.filter((r) => filter === 'all' || r.status === filter), [reviews, filter]);
  const counts = {
    all: reviews.length,
    pending: reviews.filter((r) => r.status === 'pending').length,
    approved: reviews.filter((r) => r.status === 'approved').length,
    hidden: reviews.filter((r) => r.status === 'hidden').length
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setBusy(true);
    const res = await ownerReviews({ action: 'save', review: editing });
    setBusy(false);
    if (res?.success) setEditing(null);
    else alert(res?.message || 'Saqlab bo‘lmadi');
  };

  return (
    <div className="space-y-6">
      <Reveal>
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-line/80 bg-white/70 px-3.5 py-1.5 text-[10.5px] font-bold uppercase tracking-[0.16em] text-ink-muted dark:border-white/10 dark:bg-white/[0.05] dark:text-stone-400">
              <MessageSquareQuote className="h-3.5 w-3.5 text-ember-500" /> Fikrlar
            </span>
            <h1 className="mt-4 font-display text-[clamp(1.6rem,3.2vw,2.25rem)] font-extrabold leading-[1.07] tracking-[-0.035em] text-ink dark:text-white">
              O‘quvchilar fikrlari
            </h1>
            <p className="mt-2 max-w-xl text-[14px] text-ink-muted dark:text-stone-400">
              Tasdiqlangan fikrlar bosh sahifadagi aylanib turuvchi lentada ko‘rinadi. O‘quvchilar kabinetdan yuborgan fikrlar avval shu yerda tekshiriladi.
            </p>
          </div>
          <Button variant="ember" size="md" iconLeft={<Plus className="h-4 w-4" />} onClick={() => setEditing({ ...EMPTY })}>
            Fikr qo‘shish
          </Button>
        </header>
      </Reveal>

      <div className="glass-subtle inline-flex flex-wrap rounded-full p-1">
        {(['all', 'pending', 'approved', 'hidden'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'rounded-full px-4 py-1.5 text-[12px] font-semibold transition-all',
              filter === f
                ? 'bg-gradient-to-b from-[#ffa149] to-[#f2650f] text-white shadow-[0_8px_18px_-8px_rgba(242,101,15,0.8)]'
                : 'text-ink-muted hover:text-ink dark:text-stone-400 dark:hover:text-white'
            )}
          >
            {{ all: 'Barchasi', pending: 'Kutilmoqda', approved: 'Tasdiqlangan', hidden: 'Yashirilgan' }[f]} ({counts[f]})
          </button>
        ))}
      </div>

      <div className="flex justify-end">
        <button type="button" onClick={() => downloadCsv(`fikrlar-${new Date().toISOString().slice(0, 10)}.csv`, [['Sana', 'Ism', 'Baho', 'Matn', 'Holat'], ...reviews.map((x: any) => [String(x.createdAt || '').slice(0, 10), x.userName || x.name || '', x.rating ?? '', x.text || '', x.status || ''])])} disabled={reviews.length === 0} className="inline-flex h-9 items-center gap-2 rounded-full border border-line bg-white/70 px-4 text-[12.5px] font-semibold text-ink disabled:opacity-40 dark:border-white/10 dark:bg-white/[0.05] dark:text-white">
          Excel (CSV)
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {list.map((r) => (
          <Glass key={r.id} level={1} radius="rounded-[24px]" className="flex flex-col p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                {r.photoUrl ? (
                  <img src={r.photoUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
                ) : (
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-b from-[#ffa149] to-[#f2650f] font-bold text-white">
                    {r.name.charAt(0)}
                  </span>
                )}
                <div>
                  <div className="font-semibold text-ink dark:text-white">{r.name}</div>
                  <div className="text-[12px] text-ink-muted dark:text-stone-400">{r.subtitle || '—'}</div>
                </div>
              </div>
              <Pill tone={r.status === 'approved' ? 'emerald' : r.status === 'pending' ? 'ember' : 'neutral'}>
                {{ approved: 'Tasdiqlangan', pending: 'Kutilmoqda', hidden: 'Yashirin' }[r.status]}
              </Pill>
            </div>
            <div className="mt-3 flex gap-0.5 text-ember-500" aria-label={`${r.rating} yulduz`}>
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className={cn('h-3.5 w-3.5', i < r.rating ? 'fill-current' : 'opacity-25')} />
              ))}
            </div>
            <p className="mt-2 flex-1 text-[13.5px] leading-relaxed text-ink/80 dark:text-stone-300">“{r.text}”</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {r.status !== 'approved' ? (
                <Button size="sm" variant="ember" iconLeft={<Check className="h-3.5 w-3.5" />} onClick={() => ownerReviews({ action: 'status', id: r.id, status: 'approved' })}>
                  Tasdiqlash
                </Button>
              ) : (
                <Button size="sm" variant="outline" iconLeft={<EyeOff className="h-3.5 w-3.5" />} onClick={() => ownerReviews({ action: 'status', id: r.id, status: 'hidden' })}>
                  Yashirish
                </Button>
              )}
              <Button size="sm" variant="ghost" iconLeft={<Pencil className="h-3.5 w-3.5" />} onClick={() => setEditing({ ...r })}>
                Tahrirlash
              </Button>
              <Button
                size="sm"
                variant="ghost"
                iconLeft={<Trash2 className="h-3.5 w-3.5" />}
                onClick={() => confirm('Fikr o‘chirilsinmi?') && ownerReviews({ action: 'delete', id: r.id })}
              >
                O‘chirish
              </Button>
            </div>
          </Glass>
        ))}
        {list.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-[24px] border border-dashed border-line/80 bg-white/50 px-6 py-14 text-center md:col-span-2 dark:border-white/10 dark:bg-white/[0.02]">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-ember-500/10 text-ember-600 dark:bg-ember-500/15 dark:text-ember-400">
              <MessageSquareQuote className="h-6 w-6" />
            </div>
            <p className="mt-4 font-display text-[15px] font-bold tracking-tight text-ink dark:text-white">Bu bo‘limda hozircha fikr yo‘q.</p>
            <p className="mt-1 max-w-sm text-[12.5px] text-ink-muted dark:text-stone-400">O‘quvchilar kabinetdan fikr yuborganda, ular shu yerda tekshiriladi.</p>
          </div>
        ) : null}
      </div>

      {editing ? (
        <div className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-ink/45 p-4 backdrop-blur-md dark:bg-black/65">
          <form onSubmit={save} className="glass-focused my-10 w-full max-w-lg rounded-[28px] p-6 sm:p-7">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="font-display text-[18px] font-extrabold text-ink dark:text-white">{editing.id ? 'Fikrni tahrirlash' : 'Yangi fikr'}</h3>
              <button type="button" onClick={() => setEditing(null)} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-ink/[0.06] dark:hover:bg-white/10">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className={label}>Ism *</label>
                  <input className={field} value={editing.name || ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
                </div>
                <div>
                  <label className={label}>Izoh (natija, shahar)</label>
                  <input className={field} placeholder="IELTS 7.5 · Toshkent" value={editing.subtitle || ''} onChange={(e) => setEditing({ ...editing, subtitle: e.target.value })} />
                </div>
              </div>
              <div>
                <label className={label}>Fikr matni *</label>
                <textarea rows={4} className={cn(field, 'resize-y')} value={editing.text || ''} onChange={(e) => setEditing({ ...editing, text: e.target.value })} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className={label}>Baho</label>
                  <select className={cn(field, 'cursor-pointer')} value={editing.rating || 5} onChange={(e) => setEditing({ ...editing, rating: Number(e.target.value) })}>
                    {[5, 4, 3, 2, 1].map((n) => (
                      <option key={n} value={n}>
                        {'★'.repeat(n)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={label}>Holat</label>
                  <select className={cn(field, 'cursor-pointer')} value={editing.status || 'approved'} onChange={(e) => setEditing({ ...editing, status: e.target.value as Review['status'] })}>
                    <option value="approved">Tasdiqlangan</option>
                    <option value="pending">Kutilmoqda</option>
                    <option value="hidden">Yashirin</option>
                  </select>
                </div>
              </div>
              <div>
                <label className={label}>Rasm havolasi (ixtiyoriy)</label>
                <input className={field} placeholder="https://…" value={editing.photoUrl || ''} onChange={(e) => setEditing({ ...editing, photoUrl: e.target.value })} />
              </div>
              <Button type="submit" variant="ember" size="lg" className="w-full" disabled={busy}>
                {busy ? 'Saqlanmoqda…' : 'Saqlash'}
              </Button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
};
