'use client';
import React, { useState } from 'react';
import { Gift, Newspaper, Pin, Trash2, Pencil, Upload, X, Eye, EyeOff, Copy, Download } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import { NewsItem } from '../../types';
import { field, label } from '../ui/styles';
import { useCountdown } from '../../lib/useCountdown';

type Notice = { tone: 'ok' | 'error'; text: string } | null;

const card = 'rounded-2xl border border-line/80 bg-white/70 p-5 sm:p-6 dark:border-white/10 dark:bg-white/[0.03]';
const primaryBtn =
  'inline-flex h-11 items-center justify-center gap-2 rounded-full bg-gradient-to-b from-[#ffb45c] to-[#ef6c12] px-6 text-[13.5px] font-bold text-white shadow-[0_10px_24px_-10px_rgba(239,108,18,0.9)] transition-transform hover:-translate-y-0.5 disabled:opacity-60';
const ghostBtn =
  'inline-flex h-10 items-center justify-center gap-2 rounded-full border border-line bg-white/60 px-4 text-[13px] font-semibold text-ink transition-colors hover:bg-white dark:border-white/10 dark:bg-white/[0.05] dark:text-white';

const DURATIONS: Array<[string, number]> = [
  ['1 soat', 1],
  ['6 soat', 6],
  ['1 kun', 24],
  ['3 kun', 72],
  ['7 kun', 168],
  ['30 kun', 720]
];

const readAsBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error('read'));
    r.readAsDataURL(file);
  });

const NoticeBar: React.FC<{ n: Notice }> = ({ n }) =>
  n ? (
    <div role="status" className={`mb-4 rounded-xl px-4 py-2.5 text-[13px] font-semibold ${n.tone === 'ok' ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'bg-rose-500/10 text-rose-700 dark:text-rose-300'}`}>
      {n.text}
    </div>
  ) : null;

/** Owner: the Yangiliklar section on the landing page, the news posts, and the limited-time VIP for everyone. */
export const NewsManager: React.FC = () => {
  const { db, refreshDb } = useApp();
  const sec = db.siteSections.find((s) => s.key === 'news');
  const visible = sec ? sec.isVisible : true;
  const gift = db.vipGift && db.vipGift.active && Date.parse(db.vipGift.endsAt) > Date.now() ? db.vipGift : undefined;
  const count = useCountdown(gift?.endsAt);
  const plans = db.vipPlans || [];

  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice>(null);

  // Gift form
  const [tier, setTier] = useState(plans[plans.length - 1]?.id || 'gold');
  const [hours, setHours] = useState(72);
  const [gTitle, setGTitle] = useState('Hamma uchun bepul VIP!');
  const [gMessage, setGMessage] = useState('Cheklangan vaqt ichida barcha o‘quvchilar uchun tarif bepul ochiq.');

  // News form
  const empty = { id: '', title: '', body: '', tag: '', imageUrl: '', pinned: false, published: true };
  const [form, setForm] = useState(empty);
  const editing = !!form.id;

  const run = async (key: string, fn: () => Promise<any>, ok: string, after?: () => void) => {
    setBusy(key);
    setNotice(null);
    try {
      const res = await fn();
      if (res?.success === false || res?.error) {
        setNotice({ tone: 'error', text: res.message || 'Saqlab bo‘lmadi.' });
        return;
      }
      await refreshDb();
      setNotice({ tone: 'ok', text: ok.replace('{n}', String(res?.studentsGifted ?? '')) });
      after?.();
    } catch {
      setNotice({ tone: 'error', text: 'Server bilan bog‘lanib bo‘lmadi.' });
    } finally {
      setBusy(null);
    }
  };

  const toggleSection = () =>
    run(
      'section',
      () => api.updateSiteSections(db.siteSections.map((s) => (s.key === 'news' ? { ...s, isVisible: !visible } : s))),
      visible ? 'Yangiliklar bo‘limi ochiq saytdan yashirildi.' : 'Yangiliklar bo‘limi ochiq saytda ko‘rinadi.'
    );

  const startGift = () => {
    if (!window.confirm(`Barcha o‘quvchilarga ${plans.find((p) => p.id === tier)?.name || tier} tarifi ${hours} soatga beriladi. Davom etamizmi?`)) return;
    return run('gift', () => api.vipGift({ tier, hours, title: gTitle, message: gMessage }), 'VIP sovg‘a boshlandi: {n} o‘quvchiga berildi. Yangiliklar bo‘limida ko‘rinadi.');
  };
  const stopGift = () => run('gift', () => api.vipGift({ action: 'stop' }), 'VIP sovg‘a to‘xtatildi, o‘quvchilar avvalgi tarifiga qaytdi.');

  const saveNews = (e: React.FormEvent) => {
    e.preventDefault();
    return run(
      'news',
      () => api.saveNews({ ...form, id: form.id || undefined }),
      editing ? 'Yangilik yangilandi.' : 'Yangilik e’lon qilindi.',
      () => setForm(empty)
    );
  };
  const remove = (n: NewsItem) => {
    if (!window.confirm(`“${n.title}” o‘chirilsinmi?`)) return;
    return run('del:' + n.id, () => api.deleteNews(n.id), 'Yangilik o‘chirildi.');
  };
  const upload = async (file?: File) => {
    if (!file) return;
    setBusy('upload');
    try {
      const res = await api.uploadAsset(await readAsBase64(file), file.name);
      const url = res?.url || res?.imageUrl;
      if (url) setForm((f) => ({ ...f, imageUrl: url }));
      else setNotice({ tone: 'error', text: res?.message || 'Rasm yuklanmadi.' });
    } catch {
      setNotice({ tone: 'error', text: 'Rasm yuklanmadi.' });
    } finally {
      setBusy(null);
    }
  };

  const subs = db.newsSubscribers || [];
  const copySubs = () => navigator.clipboard?.writeText(subs.map((s) => s.contact).join('\n')).then(() => setNotice({ tone: 'ok', text: `${subs.length} ta kontakt nusxalandi.` })).catch(() => {});
  const csvSubs = () => {
    const url = URL.createObjectURL(new Blob(['kontakt,turi,sana\n' + subs.map((s) => `${s.contact},${s.kind},${s.createdAt.slice(0, 10)}`).join('\n')], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'obunachilar.csv';
    a.click();
    URL.revokeObjectURL(url);
  };
  const items = [...(db.news || [])].sort((a, b) => Number(b.pinned) - Number(a.pinned) || Date.parse(b.createdAt) - Date.parse(a.createdAt));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-extrabold tracking-[-0.02em] text-ink dark:text-white">Yangiliklar & VIP sovg‘a</h1>
        <p className="mt-1 text-[13.5px] text-ink-muted dark:text-stone-400">Ochiq saytdagi yangiliklar bo‘limini boshqaring va hamma uchun cheklangan vaqtli VIP bering.</p>
      </header>
      <NoticeBar n={notice} />

      <section className={card}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[14px] font-bold text-ink dark:text-white"><Newspaper className="h-4 w-4" /> Bo‘lim ochiq saytda</div>
            <p className="mt-1 text-[12.5px] text-ink-muted dark:text-stone-400">O‘chiq bo‘lsa, yangiliklar ham, sovg‘a banneri ham ko‘rinmaydi.</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={visible}
            aria-label="Yangiliklar bo‘limi"
            disabled={busy === 'section'}
            onClick={toggleSection}
            className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full p-1 transition-colors duration-300 disabled:opacity-60 ${visible ? 'bg-gradient-to-r from-[#ffa149] to-[#f2650f]' : 'bg-ink/15 dark:bg-white/15'}`}
          >
            <span className={`block h-5 w-5 rounded-full bg-white shadow transition-transform duration-300 ${visible ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
        </div>
      </section>

      <section className={card}>
        <div className="flex items-center gap-2 text-[15px] font-bold text-ink dark:text-white"><Gift className="h-4 w-4 text-[#e8457a]" /> Hamma uchun VIP sovg‘a</div>
        {gift ? (
          <div className="mt-4 space-y-3">
            <div className="rounded-xl bg-[#f2650f]/10 p-4 text-[13.5px] text-ink dark:text-white">
              <div className="font-bold">{gift.title}</div>
              <div className="mt-1 text-ink-muted dark:text-stone-300">
                Tarif: <b>{plans.find((p) => p.id === gift.tier)?.name || gift.tier}</b> · Qoldi: <b className="tabular-nums">{count.days} kun {count.hours} soat {count.minutes} daq {count.seconds} son</b>
              </div>
            </div>
            <button type="button" onClick={stopGift} disabled={busy === 'gift'} className={ghostBtn}>Sovg‘ani hozir to‘xtatish</button>
          </div>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className={label} htmlFor="gift-tier">Tarif</label>
              <select id="gift-tier" className={field} value={tier} onChange={(e) => setTier(e.target.value)}>
                {plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className={label} htmlFor="gift-hours">Davomiyligi (soat)</label>
              <input id="gift-hours" className={field} type="number" min={1} max={2160} value={hours} onChange={(e) => setHours(Math.max(1, Math.min(2160, Number(e.target.value) || 1)))} />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {DURATIONS.map(([text, h]) => (
                  <button key={h} type="button" onClick={() => setHours(h)} className={`rounded-full border px-3 py-1 text-[12px] font-semibold ${hours === h ? 'border-[#f2650f] bg-[#f2650f]/10 text-[#c4520a]' : 'border-line text-ink-muted dark:border-white/10 dark:text-stone-400'}`}>{text}</button>
                ))}
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className={label} htmlFor="gift-title">Sarlavha</label>
              <input id="gift-title" className={field} maxLength={80} value={gTitle} onChange={(e) => setGTitle(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className={label} htmlFor="gift-msg">Xabar</label>
              <textarea id="gift-msg" className={field} rows={2} maxLength={240} value={gMessage} onChange={(e) => setGMessage(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <button type="button" onClick={startGift} disabled={busy === 'gift' || !plans.length} className={primaryBtn}><Gift className="h-4 w-4" /> Hamma uchun boshlash</button>
              <p className="mt-2 text-[12px] text-ink-muted dark:text-stone-400">Vaqt tugagach yoki to‘xtatilganda o‘quvchilar avvalgi tarifiga qaytadi. Yuqori tarifdagilar o‘zgarmaydi.</p>
            </div>
          </div>
        )}
      </section>

      <section className={card}>
        <div className="flex items-center justify-between">
          <div className="text-[15px] font-bold text-ink dark:text-white">{editing ? 'Yangilikni tahrirlash' : 'Yangi yangilik'}</div>
          {editing ? <button type="button" onClick={() => setForm(empty)} className={ghostBtn}><X className="h-4 w-4" /> Bekor qilish</button> : null}
        </div>
        <form onSubmit={saveNews} className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={label} htmlFor="news-title">Sarlavha</label>
            <input id="news-title" className={field} required minLength={3} maxLength={120} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <label className={label} htmlFor="news-body">Matn</label>
            <textarea id="news-body" className={field} rows={4} maxLength={4000} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
          </div>
          <div>
            <label className={label} htmlFor="news-tag">Belgi (ixtiyoriy)</label>
            <input id="news-tag" className={field} maxLength={24} placeholder="Yangi, Aksiya…" value={form.tag} onChange={(e) => setForm({ ...form, tag: e.target.value })} />
          </div>
          <div>
            <label className={label} htmlFor="news-img">Rasm havolasi (ixtiyoriy)</label>
            <div className="flex gap-2">
              <input id="news-img" className={field} placeholder="https://…" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} />
              <label className={`${ghostBtn} cursor-pointer shrink-0`}>
                <Upload className="h-4 w-4" /> {busy === 'upload' ? '…' : 'Yuklash'}
                <input type="file" accept="image/*" className="sr-only" onChange={(e) => upload(e.target.files?.[0])} />
              </label>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-5 sm:col-span-2">
            <label className="flex items-center gap-2 text-[13px] font-semibold text-ink dark:text-white"><input type="checkbox" checked={form.pinned} onChange={(e) => setForm({ ...form, pinned: e.target.checked })} /> Yuqorida mahkamlash</label>
            <label className="flex items-center gap-2 text-[13px] font-semibold text-ink dark:text-white"><input type="checkbox" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} /> E’lon qilish</label>
            <button type="submit" disabled={busy === 'news'} className={`${primaryBtn} sm:ml-auto`}>{editing ? 'Saqlash' : 'E’lon qilish'}</button>
          </div>
        </form>
      </section>

      <section className="space-y-3">
        <div className="text-[15px] font-bold text-ink dark:text-white">Yangiliklar ({items.length})</div>
        {items.length === 0 ? (
          <div className={`${card} text-center text-[13.5px] text-ink-muted dark:text-stone-400`}>Hali yangilik yo‘q. Yuqoridagi shakldan birinchisini e’lon qiling.</div>
        ) : (
          items.map((n) => (
            <article key={n.id} className={`${card} flex items-start gap-4`}>
              {n.imageUrl ? <img src={n.imageUrl} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover" /> : null}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 text-[11.5px] font-semibold">
                  {n.pinned ? <span className="inline-flex items-center gap-1 text-[#c4520a]"><Pin className="h-3 w-3" /> Mahkam</span> : null}
                  {n.tag ? <span className="rounded-full bg-ink/[0.06] px-2 py-0.5 dark:bg-white/10">{n.tag}</span> : null}
                  <span className={`inline-flex items-center gap-1 ${n.published ? 'text-emerald-600' : 'text-ink-muted'}`}>{n.published ? <><Eye className="h-3 w-3" /> E’lon qilingan</> : <><EyeOff className="h-3 w-3" /> Qoralama</>}</span>
                </div>
                <h3 className="mt-1 truncate text-[15px] font-bold text-ink dark:text-white">{n.title}</h3>
                <p className="line-clamp-2 text-[13px] text-ink-muted dark:text-stone-400">{n.body}</p>
              </div>
              <div className="flex shrink-0 gap-1.5">
                <button type="button" aria-label="Tahrirlash" className={ghostBtn} onClick={() => { setForm({ id: n.id, title: n.title, body: n.body, tag: n.tag || '', imageUrl: n.imageUrl || '', pinned: n.pinned, published: n.published }); window.scrollTo({ top: 0, behavior: 'smooth' }); }}><Pencil className="h-4 w-4" /></button>
                <button type="button" aria-label="O‘chirish" className={ghostBtn} disabled={busy === 'del:' + n.id} onClick={() => remove(n)}><Trash2 className="h-4 w-4 text-rose-600" /></button>
              </div>
            </article>
          ))
        )}
      </section>

      <section className={card}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-[15px] font-bold text-ink dark:text-white">Obunachilar ({subs.length})</div>
          {subs.length ? (
            <div className="flex gap-2">
              <button type="button" onClick={copySubs} className={ghostBtn}><Copy className="h-4 w-4" /> Nusxalash</button>
              <button type="button" onClick={csvSubs} className={ghostBtn}><Download className="h-4 w-4" /> CSV</button>
            </div>
          ) : null}
        </div>
        {subs.length === 0 ? (
          <p className="mt-3 text-[13px] text-ink-muted dark:text-stone-400">Hali obunachi yo‘q. Ochiq saytdagi Yangiliklar bo‘limida obuna formasi bor.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line/60 text-[13px] dark:divide-white/10">
            {subs.slice(0, 50).map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 py-2">
                <span className="min-w-0 truncate text-ink dark:text-white">{s.contact} <span className="text-ink-muted dark:text-stone-500">· {s.kind === 'email' ? 'e-mail' : s.kind === 'phone' ? 'telefon' : 'Telegram'} · {s.createdAt.slice(0, 10)}</span></span>
                <button type="button" aria-label="O‘chirish" onClick={() => run('sub:' + s.id, () => api.deleteNewsSubscriber(s.id), 'Obunachi o‘chirildi.')} className="flex h-8 w-8 items-center justify-center rounded-full text-rose-600 hover:bg-rose-500/10"><Trash2 className="h-4 w-4" /></button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};
