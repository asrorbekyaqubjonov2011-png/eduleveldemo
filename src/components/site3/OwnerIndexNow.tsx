'use client';
import React, { useCallback, useEffect, useState } from 'react';

type Hist = { at: string; reason: string; count: number; status: number | null; ok: boolean; message: string; sample: string[] };
type Info = { host: string; keyLocation: string; totalUrls: number; submittedUrls: number; pending: number; pendingSample: string[]; failed: number; lastAttemptAt: string | null; history: Hist[]; note: string };

/** IndexNow status and manual submit for the owner. Accepted submissions are not an indexing guarantee. */
export const OwnerIndexNow: React.FC = () => {
  const [info, setInfo] = useState<Info | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    const res = await fetch('/api/owner/indexnow', { cache: 'no-store' });
    if (res.ok) setInfo(await res.json());
  }, []);
  useEffect(() => { void load(); }, [load]);

  const run = async (action: 'submit' | 'retry') => {
    setBusy(true);
    setMsg('');
    try {
      const res = await fetch('/api/owner/indexnow', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) });
      const d = await res.json().catch(() => ({}));
      setMsg(d.message || 'Bajarildi');
      await load();
    } finally {
      setBusy(false);
    }
  };

  if (!info) return null;
  return (
    <section className="space-y-3 rounded-3xl border border-black/10 bg-white/70 p-5 dark:border-white/10 dark:bg-white/[0.04]">
      <h3 className="text-[16px] font-semibold">IndexNow (Bing, Yandex)</h3>
      <p className="text-[12.5px] text-ink-muted">Faqat yangi yoki o‘zgargan sahifalar yuboriladi. Qabul qilinishi indekslanishni kafolatlamaydi. Kalit fayli: <span className="font-mono break-all">{info.keyLocation}</span></p>
      <dl className="grid grid-cols-2 gap-2 text-[13px] sm:grid-cols-4">
        <div><dt className="text-ink-muted">Sitemap URL</dt><dd className="font-semibold">{info.totalUrls}</dd></div>
        <div><dt className="text-ink-muted">Yuborilgan</dt><dd className="font-semibold">{info.submittedUrls}</dd></div>
        <div><dt className="text-ink-muted">Navbatda (yangi)</dt><dd className="font-semibold">{info.pending}</dd></div>
        <div><dt className="text-ink-muted">Xato (qayta urinish)</dt><dd className="font-semibold">{info.failed}</dd></div>
      </dl>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={busy || info.pending === 0} onClick={() => run('submit')} className="min-h-[44px] rounded-xl border border-ember-500 px-4 text-[13px] font-semibold text-ember-700 disabled:opacity-50 dark:text-ember-300">Yangilarini yuborish</button>
        <button type="button" disabled={busy || info.failed === 0} onClick={() => run('retry')} className="min-h-[44px] rounded-xl border border-black/10 px-4 text-[13px] font-semibold disabled:opacity-50 dark:border-white/15">Xatolarni qayta yuborish</button>
      </div>
      {msg ? <p role="status" className="text-[13px]">{msg}</p> : null}
      {info.history.length ? (
        <ul className="space-y-1 text-[12.5px] text-ink-muted">
          {info.history.slice(0, 6).map((h) => (
            <li key={h.at}>{new Date(h.at).toLocaleString('uz-UZ')} · {h.reason} · {h.count} ta · {h.ok ? '✓' : '✗'} {h.message}</li>
          ))}
        </ul>
      ) : <p className="text-[12.5px] text-ink-muted">Hali yuborilmagan.</p>}
    </section>
  );
};
