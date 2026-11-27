'use client';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { cn } from '../ui/styles';
import { OwnerIndexNow } from './OwnerIndexNow';

type Section = { heading: string; paragraphs: string[]; items?: string[] };
type Faq = { q: string; a: string };
type Validation = { errors: string[]; warnings: string[]; words: number };
type Page = {
  id: string; title: string; description: string; h1: string; lead: string; sections: Section[]; faq: Faq[]; related: string[];
  status: 'draft' | 'published'; noindex: boolean; aiGenerated: boolean; reviewed: boolean; updatedAt: string; publishedAt?: string;
  history: { at: string; action: string }[]; validation?: Validation;
};

const EMPTY: Page = {
  id: '', title: '', description: '', h1: '', lead: '', sections: [{ heading: '', paragraphs: [''] }, { heading: '', paragraphs: [''] }], faq: [], related: [],
  status: 'draft', noindex: false, aiGenerated: false, reviewed: false, updatedAt: '', history: []
};
const field = 'mt-1 block w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-[14px] text-ink dark:border-white/15 dark:bg-stone-900 dark:text-white';
const btn = 'min-h-[44px] rounded-xl px-4 text-[13.5px] font-semibold disabled:opacity-50';

/**
 * Owner's SEO content manager: write or edit a page, ask the AI for a draft, see the quality report, preview, publish or
 * unpublish. A page goes public only when the owner confirms they read it and the checks pass. Text only (no HTML).
 */
export const SeoContentManager: React.FC = () => {
  const [pages, setPages] = useState<Page[]>([]);
  const [codePaths, setCodePaths] = useState<string[]>([]);
  const [draft, setDraft] = useState<Page | null>(null);
  const [originalId, setOriginalId] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [ai, setAi] = useState({ topic: '', keyword: '', level: '' });
  const [preview, setPreview] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/owner/seo-pages', { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.message || 'Yuklab bo‘lmadi.');
      setPages(data.pages || []);
      setCodePaths(data.codePaths || []);
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : 'Xatolik.' });
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const edit = (p: Page | null) => {
    setDraft(p ? JSON.parse(JSON.stringify(p)) : JSON.parse(JSON.stringify(EMPTY)));
    setOriginalId(p?.id || '');
    setPreview(false);
    setMsg(null);
  };

  const save = async (status: 'draft' | 'published') => {
    if (!draft) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch('/api/owner/seo-pages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ originalId, page: { ...draft, status } }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        setMsg({ ok: false, text: data.message || 'Saqlab bo‘lmadi.' });
        return;
      }
      setPages(data.pages || []);
      const saved = (data.pages as Page[]).find((p) => p.id === data.saved) || null;
      setMsg({ ok: true, text: status === 'published' ? 'Nashr qilindi. Sahifa saytda ochiladi va xaritaga (sitemap) qo‘shiladi.' : 'Qoralama saqlandi.' });
      if (saved) { setDraft(JSON.parse(JSON.stringify(saved))); setOriginalId(saved.id); }
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm(`/${id} sahifasini o‘chirasizmi?`)) return;
    const res = await fetch(`/api/owner/seo-pages?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    const data = await res.json().catch(() => ({}));
    if (data.success) { setPages(data.pages); if (draft?.id === id) setDraft(null); }
  };

  const generate = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch('/api/owner/seo-pages/draft', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(ai) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) { setMsg({ ok: false, text: data.message || 'Qoralama yaratilmadi.' }); return; }
      setDraft(data.draft);
      setOriginalId('');
      setMsg({ ok: true, text: 'AI qoralama yozdi. U hali saqlanmagan: o‘qing, faktlarni tekshiring, tahrirlang va saqlang. Nashr uchun o‘zingiz tasdiqlashingiz shart.' });
    } finally {
      setBusy(false);
    }
  };

  const set = <K extends keyof Page>(k: K, v: Page[K]) => setDraft((d) => (d ? { ...d, [k]: v } : d));
  const setSection = (i: number, s: Partial<Section>) => setDraft((d) => (d ? { ...d, sections: d.sections.map((x, k) => (k === i ? { ...x, ...s } : x)) } : d));
  const wordCount = useMemo(() => (draft ? [draft.lead, ...draft.sections.flatMap((s) => [s.heading, ...s.paragraphs, ...(s.items || [])]), ...draft.faq.flatMap((f) => [f.q, f.a])].join(' ').split(/\s+/).filter(Boolean).length : 0), [draft]);
  const current = draft && pages.find((p) => p.id === draft.id)?.validation;

  return (
    <div className="space-y-6">
      <OwnerIndexNow />
      <p className="text-[13.5px] text-ink-muted dark:text-stone-400">
        O‘quv sahifalari va maqolalar. Matn faqat oddiy matn (HTML qabul qilinmaydi). Sahifa nashr qilinishi uchun sifat tekshiruvidan o‘tishi va siz uni o‘qib chiqib tasdiqlashingiz kerak; AI yozgan matn avtomatik nashr qilinmaydi.
      </p>
      {msg ? <p role="status" className={cn('rounded-xl px-4 py-3 text-[14px]', msg.ok ? 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300' : 'bg-rose-500/10 text-rose-700')}>{msg.text}</p> : null}

      <section aria-label="Sahifalar ro‘yxati" className="rounded-3xl border border-black/10 p-4 dark:border-white/10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-semibold">Sahifalar ({pages.length})</h3>
          <button type="button" onClick={() => edit(null)} className={cn(btn, 'bg-ember-500 text-white')}>Yangi sahifa</button>
        </div>
        <ul className="mt-3 space-y-2">
          {pages.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-black/[0.03] px-3 py-2 text-[13px] dark:bg-white/[0.04]">
              <div className="min-w-0">
                <p className="truncate font-semibold">{p.title || p.id}</p>
                <p className="text-[12px] text-ink-muted">/{p.id} · {p.status === 'published' ? (p.noindex ? 'nashr (qidiruvdan yashirin)' : 'nashr qilingan') : 'qoralama'}{p.aiGenerated ? ' · AI' : ''} · {p.validation?.words ?? 0} so‘z{p.validation?.errors.length ? ` · ${p.validation.errors.length} ta xato` : ''}</p>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => edit(p)} className={cn(btn, 'border border-black/10 dark:border-white/15')}>Tahrirlash</button>
                <button type="button" onClick={() => remove(p.id)} className={cn(btn, 'border border-rose-500/40 text-rose-600')}>O‘chirish</button>
              </div>
            </li>
          ))}
          {!pages.length ? <li className="text-[13px] text-ink-muted">Hali sahifa yo‘q. «Yangi sahifa» ni bosing yoki AI dan qoralama so‘rang.</li> : null}
        </ul>
      </section>

      <section aria-label="AI qoralama" className="rounded-3xl border border-black/10 p-4 dark:border-white/10">
        <h3 className="font-semibold">AI bilan qoralama</h3>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          <label className="text-[12.5px] text-ink-muted">Mavzu<input aria-label="AI mavzu" className={field} value={ai.topic} onChange={(e) => setAi({ ...ai, topic: e.target.value })} placeholder="Masalan: IELTS Speaking Part 2 uchun maslahatlar" /></label>
          <label className="text-[12.5px] text-ink-muted">Asosiy so‘rov (keyword)<input aria-label="AI keyword" className={field} value={ai.keyword} onChange={(e) => setAi({ ...ai, keyword: e.target.value })} placeholder="ielts speaking part 2" /></label>
          <label className="text-[12.5px] text-ink-muted">Daraja<input aria-label="AI daraja" className={field} value={ai.level} onChange={(e) => setAi({ ...ai, level: e.target.value })} placeholder="B1 / B2 …" /></label>
        </div>
        <button type="button" onClick={generate} disabled={busy || ai.topic.trim().length < 5} className={cn(btn, 'mt-3 border border-ember-500 text-ember-700 dark:text-ember-300')}>{busy ? 'Yozilmoqda…' : 'Qoralama yaratish'}</button>
      </section>

      {draft ? (
        <section aria-label="Sahifa tahrirlovchisi" className="space-y-4 rounded-3xl border border-ember-500/40 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-[12.5px] text-ink-muted">Manzil (slug)<input aria-label="Manzil" className={field} value={draft.id} onChange={(e) => set('id', e.target.value.toLowerCase())} placeholder="blog/ielts-maslahatlar" /></label>
            <label className="text-[12.5px] text-ink-muted">Title ({draft.title.length}/70)<input aria-label="Title" className={field} value={draft.title} onChange={(e) => set('title', e.target.value)} /></label>
            <label className="text-[12.5px] text-ink-muted sm:col-span-2">Meta description ({draft.description.length}/170)<textarea aria-label="Description" rows={2} className={field} value={draft.description} onChange={(e) => set('description', e.target.value)} /></label>
            <label className="text-[12.5px] text-ink-muted sm:col-span-2">H1<input aria-label="H1" className={field} value={draft.h1} onChange={(e) => set('h1', e.target.value)} /></label>
            <label className="text-[12.5px] text-ink-muted sm:col-span-2">Kirish matni (lead)<textarea aria-label="Lead" rows={2} className={field} value={draft.lead} onChange={(e) => set('lead', e.target.value)} /></label>
          </div>

          <div className="space-y-3">
            {draft.sections.map((s, i) => (
              <div key={i} className="rounded-2xl bg-black/[0.03] p-3 dark:bg-white/[0.04]">
                <label className="text-[12.5px] text-ink-muted">Bo‘lim {i + 1} sarlavhasi (H2)<input aria-label={`Bo‘lim ${i + 1} sarlavhasi`} className={field} value={s.heading} onChange={(e) => setSection(i, { heading: e.target.value })} /></label>
                <label className="mt-2 block text-[12.5px] text-ink-muted">Matn (abzatslar bo‘sh qator bilan ajratiladi)<textarea aria-label={`Bo‘lim ${i + 1} matni`} rows={5} className={field} value={s.paragraphs.join('\n\n')} onChange={(e) => setSection(i, { paragraphs: e.target.value.split(/\n{2,}/) })} /></label>
                <label className="mt-2 block text-[12.5px] text-ink-muted">Ro‘yxat bandlari (har qatorda bittadan, ixtiyoriy)<textarea aria-label={`Bo‘lim ${i + 1} ro‘yxati`} rows={2} className={field} value={(s.items || []).join('\n')} onChange={(e) => setSection(i, { items: e.target.value.split('\n').filter((x) => x.trim()) })} /></label>
                <button type="button" onClick={() => set('sections', draft.sections.filter((_, k) => k !== i))} className="mt-2 min-h-[40px] text-[12.5px] font-semibold text-rose-600">Bo‘limni olib tashlash</button>
              </div>
            ))}
            <button type="button" onClick={() => set('sections', [...draft.sections, { heading: '', paragraphs: [''] }])} className={cn(btn, 'border border-black/10 dark:border-white/15')}>Bo‘lim qo‘shish</button>
          </div>

          <div className="space-y-2">
            <p className="text-[13px] font-semibold">Savol-javoblar (faqat sahifada ko‘rinadigan haqiqiy savollar)</p>
            {draft.faq.map((f, i) => (
              <div key={i} className="grid gap-2 rounded-2xl bg-black/[0.03] p-3 dark:bg-white/[0.04]">
                <input aria-label={`Savol ${i + 1}`} className={field} value={f.q} onChange={(e) => set('faq', draft.faq.map((x, k) => (k === i ? { ...x, q: e.target.value } : x)))} placeholder="Savol" />
                <textarea aria-label={`Javob ${i + 1}`} rows={2} className={field} value={f.a} onChange={(e) => set('faq', draft.faq.map((x, k) => (k === i ? { ...x, a: e.target.value } : x)))} placeholder="Javob" />
                <button type="button" onClick={() => set('faq', draft.faq.filter((_, k) => k !== i))} className="min-h-[40px] text-left text-[12.5px] font-semibold text-rose-600">Olib tashlash</button>
              </div>
            ))}
            <button type="button" onClick={() => set('faq', [...draft.faq, { q: '', a: '' }])} className={cn(btn, 'border border-black/10 dark:border-white/15')}>Savol qo‘shish</button>
          </div>

          <fieldset className="rounded-2xl border border-black/10 p-3 dark:border-white/10">
            <legend className="px-1 text-[12.5px] font-semibold">Ichki havolalar (shu sahifadan o‘tadigan sahifalar)</legend>
            <div className="mt-1 flex flex-wrap gap-2">
              {codePaths.map((p) => (
                <button key={p} type="button" aria-pressed={draft.related.includes(p)} onClick={() => set('related', draft.related.includes(p) ? draft.related.filter((x) => x !== p) : [...draft.related, p])}
                  className={cn('min-h-[36px] rounded-full border px-3 text-[12px] font-semibold', draft.related.includes(p) ? 'border-ember-500 bg-ember-500/10 text-ember-700 dark:text-ember-300' : 'border-black/10 text-ink-muted dark:border-white/15')}>{p}</button>
              ))}
            </div>
          </fieldset>

          <div className="space-y-2 text-[13px]">
            <label className="flex min-h-[44px] items-center gap-2"><input type="checkbox" checked={draft.noindex} onChange={(e) => set('noindex', e.target.checked)} /> Qidiruv tizimlaridan yashirish (noindex)</label>
            <label className="flex min-h-[44px] items-start gap-2 font-semibold"><input type="checkbox" className="mt-1" checked={draft.reviewed} onChange={(e) => set('reviewed', e.target.checked)} /> Matnni o‘qib chiqdim va faktlarni tekshirdim{draft.aiGenerated ? ' (AI yozgan matn)' : ''}</label>
          </div>

          <div className="rounded-2xl bg-black/[0.03] p-3 text-[13px] dark:bg-white/[0.04]">
            <p className="font-semibold">So‘z soni: {wordCount} {wordCount < 250 ? '(nashr uchun kamida 250)' : ''}</p>
            {current ? (
              <>
                {current.errors.length ? <ul className="mt-2 list-disc space-y-1 pl-5 text-rose-700">{current.errors.map((e) => <li key={e}>{e}</li>)}</ul> : <p className="mt-1 text-emerald-700 dark:text-emerald-300">Saqlangan nusxa sifat tekshiruvidan o‘tdi.</p>}
                {current.warnings.length ? <ul className="mt-2 list-disc space-y-1 pl-5 text-amber-700">{current.warnings.map((e) => <li key={e}>{e}</li>)}</ul> : null}
              </>
            ) : <p className="mt-1 text-ink-muted">Tekshiruv natijasini ko‘rish uchun avval qoralamani saqlang.</p>}
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => save('draft')} disabled={busy} className={cn(btn, 'border border-black/10 dark:border-white/15')}>Qoralama sifatida saqlash</button>
            <button type="button" onClick={() => save('published')} disabled={busy} className={cn(btn, 'bg-ember-500 text-white')}>Nashr qilish</button>
            {originalId && pages.find((p) => p.id === originalId)?.status === 'published' ? <button type="button" onClick={() => save('draft')} disabled={busy} className={cn(btn, 'border border-amber-500/50 text-amber-700')}>Nashrdan olish</button> : null}
            <button type="button" onClick={() => setPreview((v) => !v)} className={cn(btn, 'border border-black/10 dark:border-white/15')}>{preview ? 'Ko‘rishni yopish' : 'Ko‘rib chiqish (preview)'}</button>
          </div>

          {preview ? (
            <article aria-label="Preview" className="rounded-2xl border border-black/10 bg-white p-4 text-neutral-900">
              <h1 className="text-2xl font-extrabold">{draft.h1 || '(H1 yo‘q)'}</h1>
              <p className="mt-2 text-neutral-700">{draft.lead}</p>
              {draft.sections.map((s, i) => (
                <section key={i} className="mt-4">
                  <h2 className="text-xl font-bold">{s.heading}</h2>
                  {s.paragraphs.map((p, k) => <p key={k} className="mt-2">{p}</p>)}
                  {s.items?.length ? <ul className="mt-2 list-disc pl-6">{s.items.map((it, k) => <li key={k}>{it}</li>)}</ul> : null}
                </section>
              ))}
              {draft.faq.length ? <section className="mt-4"><h2 className="text-xl font-bold">Ko‘p beriladigan savollar</h2>{draft.faq.map((f, i) => <div key={i} className="mt-2"><h3 className="font-semibold">{f.q}</h3><p>{f.a}</p></div>)}</section> : null}
              <p className="mt-4 text-[12px] text-neutral-500">Qidiruvdagi ko‘rinish: <strong>{draft.title}</strong> — {draft.description}</p>
            </article>
          ) : null}
        </section>
      ) : null}
    </div>
  );
};
