import React, { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import type { PromoCode } from '../../types';

const field = 'w-full rounded-xl border border-line/80 bg-white/80 px-3 py-2 text-[13.5px] text-ink outline-none focus:border-ember-500/60 dark:border-white/10 dark:bg-white/5 dark:text-white';

type Draft = {
  id?: string;
  code: string;
  planDiscounts: Record<string, string>;
  maxUses: string;
  expiresAt: string;
  active: boolean;
};

const emptyDraft = (planIds: string[]): Draft => ({
  code: '',
  planDiscounts: Object.fromEntries(planIds.map((id) => [id, ''])),
  maxUses: '0',
  expiresAt: '',
  active: true
});

/** Owner: discount codes for VIP purchases. Each plan has its own percent; uses and expiry are optional. */
export const PromoCodesManager: React.FC = () => {
  const { db, refreshDb } = useApp();
  const plans = db.vipPlans || [];
  const [draft, setDraft] = useState<Draft>(() => emptyDraft(plans.map((p) => p.id)));
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const edit = (promo: PromoCode) => {
    setDraft({
      id: promo.id,
      code: promo.code,
      planDiscounts: Object.fromEntries(plans.map((p) => [p.id, promo.planDiscounts[p.id] ? String(promo.planDiscounts[p.id]) : ''])),
      maxUses: String(promo.maxUses),
      expiresAt: promo.expiresAt ? promo.expiresAt.slice(0, 16) : '',
      active: promo.active
    });
    setMessage(null);
  };

  const save = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const planDiscounts = Object.fromEntries(
        Object.entries(draft.planDiscounts)
          .filter(([, v]) => v.trim() !== '')
          .map(([id, v]) => [id, Number(v)])
      );
      const res = await api.saveVipPromo({
        id: draft.id,
        code: draft.code,
        planDiscounts,
        maxUses: Number(draft.maxUses || 0),
        expiresAt: draft.expiresAt || null,
        active: draft.active
      });
      if (!res.success) {
        setMessage({ tone: 'error', text: res.message || 'Saqlab bo‘lmadi.' });
        return;
      }
      await refreshDb();
      setMessage({ tone: 'ok', text: draft.id ? 'Kod yangilandi.' : 'Promo kod yaratildi.' });
      setDraft(emptyDraft(plans.map((p) => p.id)));
    } catch {
      setMessage({ tone: 'error', text: 'Server bilan bog‘lanib bo‘lmadi.' });
    } finally {
      setBusy(false);
    }
  };

  const remove = async (promo: PromoCode) => {
    if (!window.confirm(`“${promo.code}” kodini o‘chirasizmi?`)) return;
    const res = await api.deletePromoCode(promo.id);
    if (!res.success) {
      setMessage({ tone: 'error', text: res.message || 'O‘chirib bo‘lmadi.' });
      return;
    }
    if (draft.id === promo.id) setDraft(emptyDraft(plans.map((p) => p.id)));
    await refreshDb();
  };

  const promos = db.promoCodes || [];

  return (
    <section className="space-y-5 rounded-[24px] border border-line/80 bg-white/70 p-5 sm:p-6 dark:border-white/10 dark:bg-white/[0.03]">
      <header>
        <h3 className="text-lg font-extrabold text-ink dark:text-white">Promo kodlar</h3>
        <p className="text-[13px] text-ink-muted dark:text-stone-400">
          Har bir tarif uchun alohida chegirma foizi. Ishlatish soni (0 = cheksiz) yoki muddat bilan cheklash mumkin.
        </p>
      </header>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
        className="grid gap-4 rounded-2xl border border-line/70 p-4 sm:grid-cols-2 dark:border-white/10"
      >
        <label className="space-y-1 text-[12px] font-semibold text-ink-muted dark:text-stone-400">
          Kod
          <input value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value.toUpperCase() })} placeholder="YANGI2026" maxLength={32} required className={field} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1 text-[12px] font-semibold text-ink-muted dark:text-stone-400">
            Ishlatish soni
            <input type="number" min={0} value={draft.maxUses} onChange={(e) => setDraft({ ...draft, maxUses: e.target.value })} className={field} />
          </label>
          <label className="space-y-1 text-[12px] font-semibold text-ink-muted dark:text-stone-400">
            Muddati (ixtiyoriy)
            <input type="datetime-local" value={draft.expiresAt} onChange={(e) => setDraft({ ...draft, expiresAt: e.target.value })} className={field} />
          </label>
        </div>

        <div className="space-y-2 sm:col-span-2">
          <div className="text-[12px] font-semibold text-ink-muted dark:text-stone-400">Tariflar bo‘yicha chegirma (%)</div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {plans.map((p) => (
              <label key={p.id} className="flex items-center justify-between gap-3 rounded-xl border border-line/70 px-3 py-2 text-[13px] dark:border-white/10">
                <span className="font-semibold text-ink dark:text-white">{p.name}</span>
                <span className="flex items-center gap-1">
                  <input
                    type="number"
                    min={0}
                    max={90}
                    value={draft.planDiscounts[p.id] ?? ''}
                    placeholder="0"
                    aria-label={`${p.name} chegirma foizi`}
                    onChange={(e) => setDraft({ ...draft, planDiscounts: { ...draft.planDiscounts, [p.id]: e.target.value } })}
                    className="w-20 rounded-lg border border-line/80 bg-white px-2 py-1 text-right text-[13px] dark:border-white/10 dark:bg-white/5 dark:text-white"
                  />
                  <span className="text-ink-muted">%</span>
                </span>
              </label>
            ))}
          </div>
        </div>

        <label className="flex items-center gap-2 text-[13px] text-ink dark:text-white">
          <input type="checkbox" checked={draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} />
          Faol
        </label>

        <div className="flex flex-wrap gap-2 sm:col-span-2">
          <button type="submit" disabled={busy} className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-[13px] font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-ink">
            <Plus className="h-4 w-4" /> {draft.id ? 'Yangilash' : 'Kod yaratish'}
          </button>
          {draft.id ? (
            <button type="button" onClick={() => setDraft(emptyDraft(plans.map((p) => p.id)))} className="rounded-full border border-line/80 px-5 py-2.5 text-[13px] font-semibold text-ink dark:border-white/10 dark:text-white">
              Bekor qilish
            </button>
          ) : null}
        </div>
        {message ? (
          <p role="status" className={`text-[13px] sm:col-span-2 ${message.tone === 'ok' ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}`}>{message.text}</p>
        ) : null}
      </form>

      {promos.length === 0 ? (
        <p className="text-[13px] text-ink-muted dark:text-stone-400">Hali promo kod yaratilmagan.</p>
      ) : (
        <ul className="divide-y divide-line/70 rounded-2xl border border-line/80 dark:divide-white/10 dark:border-white/10">
          {promos.map((p) => {
            const expired = p.expiresAt ? new Date(p.expiresAt).getTime() <= Date.now() : false;
            const exhausted = p.maxUses > 0 && p.usedCount >= p.maxUses;
            const status = !p.active ? 'O‘chirilgan' : expired ? 'Muddati tugagan' : exhausted ? 'Limit tugagan' : 'Faol';
            return (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <div className="font-mono text-[14px] font-bold text-ink dark:text-white">{p.code}</div>
                  <div className="text-[12px] text-ink-muted dark:text-stone-400">
                    {plans.filter((pl) => p.planDiscounts[pl.id]).map((pl) => `${pl.name} −${p.planDiscounts[pl.id]}%`).join(' · ') || 'Tarif yo‘q'}
                  </div>
                  <div className="text-[12px] text-ink-muted dark:text-stone-400">
                    Ishlatilgan: {p.usedCount}{p.maxUses > 0 ? ` / ${p.maxUses}` : ' (cheksiz)'}
                    {p.expiresAt ? ` · muddati ${new Date(p.expiresAt).toLocaleString('uz-UZ')} gacha` : ' · muddatsiz'}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${status === 'Faol' ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' : 'bg-ink/[0.06] text-ink-muted dark:bg-white/10 dark:text-stone-300'}`}>{status}</span>
                  <button onClick={() => edit(p)} aria-label={`${p.code} ni tahrirlash`} className="rounded-full p-2 text-ink-muted hover:bg-ink/[0.06] dark:text-stone-300"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => remove(p)} aria-label={`${p.code} ni o‘chirish`} className="rounded-full p-2 text-ink-muted hover:bg-rose-500/10 hover:text-rose-700 dark:text-stone-300"><Trash2 className="h-4 w-4" /></button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};
