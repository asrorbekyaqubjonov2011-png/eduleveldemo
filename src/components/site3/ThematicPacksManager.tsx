'use client';
import React, { useEffect, useState } from 'react';
import { Plus, Sparkles, Trash2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import { field, label } from '../ui/styles';
import type { ThematicQuizPack } from '../../types';

const CATEGORIES: { id: ThematicQuizPack['category']; label: string }[] = [
  { id: 'grammar', label: 'Grammatika' },
  { id: 'vocab', label: 'Lug‘at' },
  { id: 'phrasal_verbs', label: 'Phrasal verbs' },
  { id: 'reading', label: 'Reading' },
  { id: 'collocations', label: 'Collocations' },
  { id: 'prepositions', label: 'Prepositions' },
  { id: 'speaking_idioms', label: 'Speaking idioms' }
];
const LEVELS: ThematicQuizPack['level'][] = ['A2', 'B1', 'B2', 'C1', 'C2'];

type Question = ThematicQuizPack['questions'][number];

const readAsBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).replace(/^data:[^;]+;base64,/, ''));
    r.onerror = () => reject(new Error('Faylni o‘qib bo‘lmadi'));
    r.readAsDataURL(file);
  });

const blankPack = (): Partial<ThematicQuizPack> => ({
  title: '',
  category: 'grammar',
  level: 'B1',
  description: '',
  rewardXp: 100,
  rewardPoints: 50,
  icon: '📘',
  questions: []
});

/**
 * Owner's thematic quiz packs (the "Test paketlari" section of the student cabinet).
 * Questions are written by the AI from a pasted text or a .docx / .txt file, or added by hand.
 */
export const ThematicPacksManager: React.FC = () => {
  const { db, refreshDb } = useApp();
  const packs = (db.thematicQuizPacks || []) as ThematicQuizPack[];
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Partial<ThematicQuizPack> | null>(null);
  const [source, setSource] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [count, setCount] = useState(10);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  // AI questions wait here for the owner's review: nothing reaches students until the owner presses "Qo‘shish".
  const [review, setReview] = useState<{ questions: Question[]; rejected: number } | null>(null);

  const selected = packs.find((p) => p.id === selectedId) || null;
  // A review belongs to the pack it was written for: switching packs drops it.
  useEffect(() => setReview(null), [selectedId]);

  const savePack = async (pack: Partial<ThematicQuizPack>) => {
    setBusy('Saqlanmoqda…');
    setMsg(null);
    try {
      const res = await api.saveThematicPack(pack as Record<string, unknown>);
      if (!res?.success) {
        setMsg({ ok: false, text: res?.message || 'Saqlab bo‘lmadi' });
        return null;
      }
      await refreshDb();
      setSelectedId(res.pack.id);
      return res.pack as ThematicQuizPack;
    } catch {
      setMsg({ ok: false, text: 'Server bilan bog‘lanib bo‘lmadi' });
      return null;
    } finally {
      setBusy(null);
    }
  };

  const createPack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    if (!editing.title?.trim()) {
      setMsg({ ok: false, text: 'Paket nomini kiriting.' });
      return;
    }
    const pack = await savePack({ ...editing, questions: [] });
    if (pack) {
      setEditing(null);
      setMsg({ ok: true, text: 'Paket yaratildi. Endi unga savollar qo‘shing.' });
    }
  };

  const generate = async () => {
    if (!selected) return;
    const text = source.trim();
    if (!file && text.length < 80) {
      setMsg({ ok: false, text: 'Matn yozing (kamida 80 belgi) yoki .docx / .txt fayl yuklang.' });
      return;
    }
    setBusy('AI savollar yozmoqda…');
    setMsg(null);
    try {
      const payload: { text?: string; fileBase64?: string; fileName?: string; count: number; title?: string } = { count, title: selected.title };
      if (file) {
        if (file.size > 8 * 1024 * 1024) {
          setMsg({ ok: false, text: 'Fayl hajmi 8 MB dan oshmasligi kerak.' });
          return;
        }
        payload.fileBase64 = await readAsBase64(file);
        payload.fileName = file.name;
      } else {
        payload.text = text;
      }
      const r = await api.quizFromDocument(payload);
      if (!r?.success) {
        setMsg({ ok: false, text: r?.message || 'AI savol yoza olmadi.' });
        return;
      }
      const added: Question[] = (r.questions || []).map((q: { prompt: string; options: string[]; correctAnswerIndex: number; explanation?: string }, i: number) => ({
        id: `q-${Date.now()}-${i}`,
        testId: selected.id,
        prompt: q.prompt,
        options: q.options,
        correctAnswerIndex: q.correctAnswerIndex,
        explanation: q.explanation || '',
        difficulty: 'medium'
      })) as Question[];
      setReview({ questions: added, rejected: Array.isArray(r.rejected) ? r.rejected.length : 0 });
      setMsg({ ok: true, text: `AI ${added.length} ta savol yozdi. Ularni ko‘rib chiqing: to‘g‘ri javobni o‘zingiz tasdiqlamaguncha o‘quvchilarga chiqmaydi.` });
    } catch {
      setMsg({ ok: false, text: 'Server bilan bog‘lanib bo‘lmadi' });
    } finally {
      setBusy(null);
    }
  };

  const removeQuestion = async (qid: string) => {
    if (!selected) return;
    await savePack({ ...selected, questions: selected.questions.filter((q) => q.id !== qid) });
  };

  const removePack = async () => {
    if (!selected || !window.confirm(`“${selected.title}” paketini o‘chirasizmi?`)) return;
    setBusy('O‘chirilmoqda…');
    const res = await api.deleteThematicPack(selected.id);
    setBusy(null);
    if (res?.success) {
      setSelectedId(null);
      await refreshDb();
    } else setMsg({ ok: false, text: res?.message || 'O‘chirib bo‘lmadi' });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[18px] font-extrabold text-ink dark:text-white">Test paketlari</h2>
          <p className="text-[12.5px] text-ink-muted dark:text-stone-400">O‘quvchilar kabinetidagi mavzuli testlar. Savollarni AI matndan yoki Word faylidan yozadi.</p>
        </div>
        <button type="button" onClick={() => setEditing(blankPack())} className="inline-flex h-10 items-center gap-2 rounded-full bg-ink px-4 text-[13px] font-semibold text-white dark:bg-white dark:text-ink">
          <Plus className="h-4 w-4" /> Yangi paket
        </button>
      </div>

      {msg ? <div role="status" className={`rounded-xl px-4 py-2.5 text-[13px] font-semibold ${msg.ok ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'bg-rose-500/10 text-rose-700 dark:text-rose-300'}`}>{msg.text}</div> : null}
      {review ? (
        <section aria-label="AI savollarini ko‘rib chiqish" className="space-y-3 rounded-2xl border border-ember-500/40 p-4">
          <p className="text-[13px] font-semibold">Ko‘rib chiqish: {review.questions.length} ta savol{review.rejected ? ` (${review.rejected} tasi sifat tekshiruvidan o‘tmadi: takror yoki noto‘g‘ri variantlar)` : ''}</p>
          <ol className="space-y-3">
            {review.questions.map((q, i) => (
              <li key={q.id} className="rounded-xl bg-black/[0.03] p-3 text-[13px] dark:bg-white/[0.04]">
                <p className="font-semibold">{i + 1}. {q.prompt}</p>
                <ul className="mt-1.5 space-y-0.5">
                  {q.options.map((o, k) => (
                    <li key={k} className={k === q.correctAnswerIndex ? 'font-semibold text-emerald-700 dark:text-emerald-300' : ''}>{String.fromCharCode(65 + k)}. {o}{k === q.correctAnswerIndex ? '  ✓ to‘g‘ri javob' : ''}</li>
                  ))}
                </ul>
                {q.explanation ? <p className="mt-1 text-[12px] text-ink-muted">{q.explanation}</p> : null}
                <button type="button" onClick={() => setReview((rv) => (rv ? { ...rv, questions: rv.questions.filter((x) => x.id !== q.id) } : rv))} className="mt-2 min-h-[40px] rounded-lg border border-rose-500/40 px-3 text-[12.5px] font-semibold text-rose-600">Olib tashlash</button>
              </li>
            ))}
          </ol>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!review.questions.length || !!busy}
              onClick={async () => {
                if (!selected || !review.questions.length) return;
                const saved = await savePack({ ...selected, questions: [...selected.questions, ...review.questions] });
                if (saved) {
                  setMsg({ ok: true, text: `${review.questions.length} ta savol tasdiqlandi va qo‘shildi.` });
                  setReview(null);
                  setSource('');
                  setFile(null);
                }
              }}
              className="min-h-[44px] rounded-xl bg-ember-500 px-5 text-[14px] font-semibold text-white disabled:opacity-50"
            >
              Tasdiqlash va qo‘shish
            </button>
            <button type="button" onClick={() => { setReview(null); setMsg(null); }} className="min-h-[44px] rounded-xl border border-black/10 px-5 text-[14px] font-semibold dark:border-white/15">Bekor qilish</button>
          </div>
        </section>
      ) : null}

      {editing ? (
        <form onSubmit={createPack} className="grid gap-4 rounded-[24px] border border-line/80 bg-white/70 p-5 md:grid-cols-2 dark:border-white/10 dark:bg-white/[0.03]">
          <div className="md:col-span-2">
            <label className={label} htmlFor="tp-title">Paket nomi</label>
            <input id="tp-title" className={field} value={editing.title || ''} onChange={(e) => setEditing({ ...editing, title: e.target.value })} maxLength={160} />
          </div>
          <div>
            <label className={label} htmlFor="tp-cat">Kategoriya</label>
            <select id="tp-cat" className={field} value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value as ThematicQuizPack['category'] })}>
              {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className={label} htmlFor="tp-level">Daraja</label>
            <select id="tp-level" className={field} value={editing.level} onChange={(e) => setEditing({ ...editing, level: e.target.value as ThematicQuizPack['level'] })}>
              {LEVELS.map((l) => <option key={l}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className={label} htmlFor="tp-xp">Mukofot XP</label>
            <input id="tp-xp" type="number" min={0} max={1000} className={field} value={editing.rewardXp ?? 0} onChange={(e) => setEditing({ ...editing, rewardXp: Number(e.target.value) })} />
          </div>
          <div>
            <label className={label} htmlFor="tp-pts">Mukofot ball (coin)</label>
            <input id="tp-pts" type="number" min={0} max={1000} className={field} value={editing.rewardPoints ?? 0} onChange={(e) => setEditing({ ...editing, rewardPoints: Number(e.target.value) })} />
          </div>
          <div className="md:col-span-2">
            <label className={label} htmlFor="tp-desc">Tavsif</label>
            <textarea id="tp-desc" rows={2} className={field} value={editing.description || ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })} maxLength={400} />
          </div>
          <div className="flex gap-3 md:col-span-2">
            <button type="submit" disabled={!!busy} className="h-11 rounded-full bg-ink px-6 text-[13.5px] font-semibold text-white disabled:opacity-60 dark:bg-white dark:text-ink">Paketni yaratish</button>
            <button type="button" onClick={() => setEditing(null)} className="h-11 rounded-full border border-line px-6 text-[13.5px] font-semibold text-ink dark:border-white/10 dark:text-white">Bekor qilish</button>
          </div>
        </form>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        <ul className="space-y-2" aria-label="Paketlar">
          {packs.length === 0 ? <li className="rounded-2xl border border-dashed border-line p-4 text-[13px] text-ink-muted dark:border-white/10 dark:text-stone-400">Hali paket yo‘q. “Yangi paket” tugmasini bosing.</li> : null}
          {packs.map((p) => (
            <li key={p.id}>
              <button type="button" onClick={() => setSelectedId(p.id)} className={`w-full rounded-2xl border p-4 text-left transition-colors ${selectedId === p.id ? 'border-[#f2650f] bg-[#f2650f]/[0.06]' : 'border-line/80 bg-white/70 hover:border-[#f2650f]/40 dark:border-white/10 dark:bg-white/[0.03]'}`}>
                <div className="text-[14px] font-bold text-ink dark:text-white">{p.icon} {p.title}</div>
                <div className="mt-1 text-[12px] text-ink-muted dark:text-stone-400">{p.level} · {p.questions.length} ta savol · +{p.rewardXp} XP</div>
              </button>
            </li>
          ))}
        </ul>

        {selected ? (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-[16px] font-extrabold text-ink dark:text-white">{selected.title}</div>
                <div className="text-[12.5px] text-ink-muted dark:text-stone-400">{selected.description || 'Tavsif yo‘q'}</div>
              </div>
              <button type="button" onClick={removePack} disabled={!!busy} className="inline-flex h-9 items-center gap-1.5 rounded-full border border-rose-300 px-3 text-[12.5px] font-semibold text-rose-700 disabled:opacity-50 dark:text-rose-300">
                <Trash2 className="h-3.5 w-3.5" /> Paketni o‘chirish
              </button>
            </div>

            <div className="space-y-3 rounded-[22px] border border-line/80 bg-white/70 p-5 dark:border-white/10 dark:bg-white/[0.03]">
              <div className="flex items-center gap-2 text-[14px] font-bold text-ink dark:text-white"><Sparkles className="h-4 w-4 text-[#f2650f]" /> AI bilan savol qo‘shish</div>
              <textarea rows={4} maxLength={60000} className={field} placeholder="Mavzu bo‘yicha matnni shu yerga qo‘ying (konspekt, qoida, matn)…" value={source} onChange={(e) => setSource(e.target.value)} aria-label="Savol uchun matn" />
              <div className="flex flex-wrap items-center gap-3">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-line px-3 py-1.5 text-[12.5px] font-semibold text-ink-muted dark:border-white/10">
                  <input type="file" accept=".docx,.txt,.md" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] || null)} aria-label="Hujjat yuklash (.docx, .txt, .md)" />
                  {file ? file.name : 'Word (.docx) / .txt yuklash'}
                </label>
                <select className={`${field} w-auto`} value={count} onChange={(e) => setCount(Number(e.target.value))} aria-label="Savollar soni">
                  {[5, 10, 15, 20].map((n) => <option key={n} value={n}>{n} ta savol</option>)}
                </select>
                <button type="button" onClick={generate} disabled={!!busy} className="h-10 rounded-full bg-gradient-to-b from-[#ffb45c] to-[#ef6c12] px-5 text-[13px] font-bold text-white disabled:opacity-60">
                  {busy || 'AI bilan qo‘shish'}
                </button>
              </div>
            </div>

            <ol className="space-y-3">
              {selected.questions.map((q, i) => (
                <li key={q.id} className="rounded-2xl border border-line/80 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-[13.5px] font-semibold text-ink dark:text-white">{i + 1}. {q.prompt}</p>
                    <button type="button" onClick={() => removeQuestion(q.id)} aria-label={`${i + 1}-savolni o‘chirish`} className="shrink-0 rounded-full p-1.5 text-ink-muted hover:text-rose-600"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                  <ul className="mt-2 grid gap-1 sm:grid-cols-2">
                    {q.options.map((o, oi) => (
                      <li key={oi} className={`rounded-lg px-3 py-1.5 text-[12.5px] ${oi === q.correctAnswerIndex ? 'bg-emerald-500/15 font-semibold text-emerald-800 dark:text-emerald-200' : 'bg-ink/[0.04] text-ink-muted dark:bg-white/[0.05] dark:text-stone-300'}`}>
                        {String.fromCharCode(65 + oi)}. {o}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
              {selected.questions.length === 0 ? <li className="text-[13px] text-ink-muted dark:text-stone-400">Savollar hali yo‘q.</li> : null}
            </ol>
          </div>
        ) : (
          <div className="rounded-[22px] border border-dashed border-line p-8 text-center text-[13px] text-ink-muted dark:border-white/10 dark:text-stone-400">Chapdan paketni tanlang.</div>
        )}
      </div>
    </div>
  );
};
