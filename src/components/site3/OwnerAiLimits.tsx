'use client';
import React, { useState } from 'react';
import { Clock } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import { DEFAULT_AI_LIMITS } from '../../lib/aiLimitsDefaults';
import { field, label } from '../ui/styles';

const card = 'rounded-2xl border border-line/80 bg-white/70 p-5 sm:p-6 dark:border-white/10 dark:bg-white/[0.03]';

/** Owner: how many minutes a day each plan may use the AI (0 = no limit). */
export const OwnerAiLimits: React.FC = () => {
  const { db, refreshDb } = useApp();
  const saved = db.aiLimits || DEFAULT_AI_LIMITS;
  const plans = db.vipPlans || [];
  const [free, setFree] = useState(String(saved.freeMinutes));
  const [mins, setMins] = useState<Record<string, string>>(() => Object.fromEntries(plans.map((p) => [p.id, String(saved.planMinutes[p.id] ?? DEFAULT_AI_LIMITS.planMinutes[p.id] ?? 60)])));
  const [inPerM, setInPerM] = useState(String(saved.inPerM || ''));
  const [outPerM, setOutPerM] = useState(String(saved.outPerM || ''));
  const [cap, setCap] = useState(String(saved.capSom || ''));
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setNote(null);
    try {
      const res = await api.saveAiLimits({ freeMinutes: Number(free) || 0, planMinutes: Object.fromEntries(Object.entries(mins).map(([k, v]) => [k, Number(v) || 0])), inPerM: Number(inPerM) || 0, outPerM: Number(outPerM) || 0, capSom: Number(cap) || 0 });
      if (!res?.success) setNote({ ok: false, text: res?.message || 'Saqlab bo‘lmadi.' });
      else {
        await refreshDb();
        setNote({ ok: true, text: 'Saqlandi. O‘quvchilar uchun darhol amal qiladi.' });
      }
    } catch {
      setNote({ ok: false, text: 'Server bilan bog‘lanib bo‘lmadi.' });
    } finally {
      setBusy(false);
    }
  };
  const hours = (m: string) => {
    const n = Number(m) || 0;
    return n === 0 ? 'cheklovsiz' : n >= 60 ? `${(n / 60).toFixed(n % 60 ? 1 : 0)} soat` : `${n} daqiqa`;
  };

  return (
    <form onSubmit={save} className={`${card} space-y-5`}>
      <div>
        <div className="flex items-center gap-2 text-[15px] font-bold text-ink dark:text-white"><Clock className="h-4 w-4 text-[#f2650f]" /> Kunlik AI vaqti</div>
        <p className="mt-1 text-[12.5px] text-ink-muted dark:text-stone-400">
          O‘quvchi AI bo‘limi ochiq turgan vaqt shu hisobga qo‘shiladi; yozuv va gapirish tekshiruvlari har biri 45 soniya hisoblanadi. Vaqt tugasa AI ertagacha to‘xtaydi. 0 yozsangiz cheklov bo‘lmaydi. Owner uchun cheklov yo‘q.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <label className={label} htmlFor="lim-free">Tarifsiz o‘quvchilar (daqiqa)</label>
          <input id="lim-free" className={field} type="number" min={0} max={1440} value={free} onChange={(e) => setFree(e.target.value)} />
          <div className="mt-1 text-[11.5px] text-ink-muted dark:text-stone-500">{hours(free)} / kun</div>
        </div>
        {plans.map((p) => (
          <div key={p.id}>
            <label className={label} htmlFor={`lim-${p.id}`}>{p.name} (daqiqa)</label>
            <input id={`lim-${p.id}`} className={field} type="number" min={0} max={1440} value={mins[p.id] ?? ''} onChange={(e) => setMins((m) => ({ ...m, [p.id]: e.target.value }))} />
            <div className="mt-1 text-[11.5px] text-ink-muted dark:text-stone-500">{hours(mins[p.id] ?? '0')} / kun</div>
          </div>
        ))}
      </div>
      <div className="border-t border-line/70 pt-5 dark:border-white/10">
        <div className="text-[14px] font-bold text-ink dark:text-white">AI xarajati (so‘mda)</div>
        <p className="mt-1 text-[12.5px] text-ink-muted dark:text-stone-400">Google narxlarini shu yerga yozing: statistikada AI necha so‘m turishini ko‘rasiz. Oylik chegara qo‘ysangiz, shu summaga yetganda o‘quvchilar uchun AI keyingi oygacha to‘xtaydi (owner ishlayveradi).</p>
        <div className="mt-3 grid gap-4 sm:grid-cols-3">
          <div><label className={label} htmlFor="p-in">1 mln kirish tokeni (so‘m)</label><input id="p-in" className={field} type="number" min={0} value={inPerM} onChange={(e) => setInPerM(e.target.value)} placeholder="masalan 1500" /></div>
          <div><label className={label} htmlFor="p-out">1 mln chiqish tokeni (so‘m)</label><input id="p-out" className={field} type="number" min={0} value={outPerM} onChange={(e) => setOutPerM(e.target.value)} placeholder="masalan 6000" /></div>
          <div><label className={label} htmlFor="p-cap">Oylik chegara (so‘m, 0 = yo‘q)</label><input id="p-cap" className={field} type="number" min={0} value={cap} onChange={(e) => setCap(e.target.value)} placeholder="masalan 500000" /></div>
        </div>
      </div>
      {note ? <div role="status" className={`rounded-xl px-4 py-2.5 text-[13px] font-semibold ${note.ok ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'bg-rose-500/10 text-rose-700 dark:text-rose-300'}`}>{note.text}</div> : null}
      <button type="submit" disabled={busy} className="inline-flex h-11 items-center rounded-full bg-gradient-to-b from-[#ffb45c] to-[#ef6c12] px-6 text-[13.5px] font-bold text-white shadow-[0_10px_24px_-10px_rgba(239,108,18,0.9)] disabled:opacity-60">Saqlash</button>
    </form>
  );
};
