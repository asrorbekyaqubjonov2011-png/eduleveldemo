'use client';
import React, { useMemo, useState } from 'react';
import { cn } from '../ui/styles';

type Row = {
  provider: string; id: string; name: string | null; contextWindow: number | null; inputTokenLimit: number | null; outputTokenLimit: number | null;
  streaming: boolean | null; vision: boolean | null; audio: boolean | null; freeStatus: 'verified-free' | 'free-tier' | 'unknown'; usable: boolean;
};

const FREE_UZ: Record<Row['freeStatus'], string> = { 'verified-free': 'bepul (narx 0)', 'free-tier': 'bepul tarif (model bo‘yicha tasdiqlanmagan)', unknown: 'noma’lum — ishlatilmaydi' };
const yn = (v: boolean | null) => (v === null ? '—' : v ? 'ha' : 'yo‘q');
const n = (v: number | null) => (v === null ? '—' : v.toLocaleString('uz-UZ'));

/** Owner view of each provider's own model list. Unknown values are shown as "—" (never guessed). */
export const OwnerAiModelCatalog: React.FC = () => {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [checkedAt, setCheckedAt] = useState('');
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState('');
  const [prov, setProv] = useState('all');
  const [onlyUsable, setOnlyUsable] = useState(true);

  const load = async () => {
    setBusy(true);
    try {
      const res = await fetch('/api/owner/ai-models', { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      setRows(Array.isArray(data.models) ? data.models : []);
      setErrors(data.errors || {});
      setCheckedAt(data.checkedAt || '');
    } finally {
      setBusy(false);
    }
  };

  const shown = useMemo(
    () => (rows || []).filter((r) => (prov === 'all' || r.provider === prov) && (!onlyUsable || r.usable) && (!q.trim() || `${r.id} ${r.name || ''}`.toLowerCase().includes(q.trim().toLowerCase()))).slice(0, 200),
    [rows, q, prov, onlyUsable]
  );

  return (
    <section className="space-y-3 rounded-3xl border border-black/10 bg-white/70 p-5 dark:border-white/10 dark:bg-white/[0.04]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-[16px] font-semibold">Model katalogi</h3>
          <p className="text-[12.5px] text-ink-muted">Har bir provayderning o‘z ro‘yxatidan. Ro‘yxatda bo‘lish bepul ruxsatni isbotlamaydi; noma’lum qiymatlar «—» deb ko‘rsatiladi.</p>
        </div>
        <button type="button" onClick={load} disabled={busy} className="min-h-[44px] rounded-xl border border-black/10 px-4 text-[13px] font-semibold disabled:opacity-50 dark:border-white/15">{busy ? 'Yuklanmoqda…' : rows ? 'Yangilash' : 'Katalogni yuklash'}</button>
      </div>
      {rows ? (
        <>
          <div className="flex flex-wrap gap-2">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Qidirish" aria-label="Model qidirish" className="min-h-[44px] flex-1 rounded-xl border border-black/10 bg-transparent px-3 text-[14px] dark:border-white/15" />
            <select value={prov} onChange={(e) => setProv(e.target.value)} aria-label="Provayder" className="min-h-[44px] rounded-xl border border-black/10 bg-transparent px-3 text-[14px] dark:border-white/15">
              {['all', 'gemini', 'groq', 'openrouter', 'mistral'].map((p) => <option key={p} value={p}>{p === 'all' ? 'Barcha provayderlar' : p}</option>)}
            </select>
            <label className="flex min-h-[44px] items-center gap-2 text-[13px]"><input type="checkbox" checked={onlyUsable} onChange={(e) => setOnlyUsable(e.target.checked)} /> Faqat ishlatiladiganlar</label>
          </div>
          {Object.keys(errors).length ? <p className="text-[12.5px] text-ink-muted">{Object.entries(errors).map(([k, v]) => `${k}: ${v}`).join(' · ')}</p> : null}
          {checkedAt ? <p className="text-[12px] text-ink-muted">Oxirgi tekshiruv: {new Date(checkedAt).toLocaleString('uz-UZ')} · {shown.length} ta model</p> : null}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-[12.5px]">
              <thead><tr className="text-ink-muted"><th className="py-1 pr-2">Provayder</th><th className="pr-2">Model</th><th className="pr-2">Kontekst</th><th className="pr-2">Chiqish limiti</th><th className="pr-2">Stream</th><th className="pr-2">Rasm</th><th>Narx holati</th></tr></thead>
              <tbody>
                {shown.map((r) => (
                  <tr key={`${r.provider}/${r.id}`} className={cn('border-t border-black/5 dark:border-white/10', !r.usable && 'opacity-60')}>
                    <td className="py-1 pr-2">{r.provider}</td>
                    <td className="pr-2 font-mono">{r.id}</td>
                    <td className="pr-2">{n(r.contextWindow ?? r.inputTokenLimit)}</td>
                    <td className="pr-2">{n(r.outputTokenLimit)}</td>
                    <td className="pr-2">{yn(r.streaming)}</td>
                    <td className="pr-2">{yn(r.vision)}</td>
                    <td>{FREE_UZ[r.freeStatus]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </section>
  );
};
