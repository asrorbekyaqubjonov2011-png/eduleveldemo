import React, { useEffect, useState } from 'react';
import { HelpCircle, Plus, ArrowUp, ArrowDown, Trash2, Eye, EyeOff, Save } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { FaqItem } from '../../types';
import { Glass, Button } from '../ui';
import { Reveal } from '../ui/motion-primitives';
import { cn, field, label } from '../ui/styles';

/** Owner editor for the landing-page FAQ section. */
export const FaqManager: React.FC = () => {
  const { db, updateFaqs } = useApp();
  const [items, setItems] = useState<FaqItem[]>(() => [...(db.faqs || [])].sort((a, b) => a.orderIndex - b.orderIndex));
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!dirty) setItems([...(db.faqs || [])].sort((a, b) => a.orderIndex - b.orderIndex));
  }, [db.faqs, dirty]);

  const change = (next: FaqItem[]) => {
    setItems(next.map((f, i) => ({ ...f, orderIndex: i })));
    setDirty(true);
    setSaved(false);
  };
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    change(next);
  };

  const save = async () => {
    const res = await updateFaqs(items.filter((f) => f.question.trim() && f.answer.trim()));
    if (res?.success) {
      setDirty(false);
      setSaved(true);
    } else alert(res?.message || 'Saqlab bo‘lmadi');
  };

  return (
    <div className="space-y-6">
      <Reveal>
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-line/80 bg-white/70 px-3.5 py-1.5 text-[10.5px] font-bold uppercase tracking-[0.16em] text-ink-muted dark:border-white/10 dark:bg-white/[0.05] dark:text-stone-400">
              <HelpCircle className="h-3.5 w-3.5 text-ember-500" /> FAQ
            </span>
            <h1 className="mt-4 font-display text-[clamp(1.6rem,3.2vw,2.25rem)] font-extrabold leading-[1.07] tracking-[-0.035em] text-ink dark:text-white">
              Savol-javoblar
            </h1>
            <p className="mt-2 max-w-xl text-[14px] text-ink-muted dark:text-stone-400">
              Bosh sahifadagi “Ko‘p so‘raladigan savollar” bo‘limi. Tartibni o‘qlar bilan o‘zgartiring.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="md"
              iconLeft={<Plus className="h-4 w-4" />}
              onClick={() => change([...items, { id: 'faq-' + Date.now(), question: '', answer: '', orderIndex: items.length, isVisible: true }])}
            >
              Savol qo‘shish
            </Button>
            <Button variant="ember" size="md" iconLeft={<Save className="h-4 w-4" />} onClick={save} disabled={!dirty}>
              {saved && !dirty ? 'Saqlandi' : 'Saqlash'}
            </Button>
          </div>
        </header>
      </Reveal>

      <div className="space-y-3">
        {items.map((f, i) => (
          <Glass key={f.id} level={1} radius="rounded-[24px]" className={cn('p-5', !f.isVisible && 'opacity-60')}>
            <div className="flex items-start gap-3">
              <span className="mt-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ember-500/12 text-[12px] font-bold text-ember-700 dark:text-ember-300">
                {i + 1}
              </span>
              <div className="flex-1 space-y-3">
                <div>
                  <label className={label}>Savol</label>
                  <input className={field} value={f.question} onChange={(e) => change(items.map((x) => (x.id === f.id ? { ...x, question: e.target.value } : x)))} />
                </div>
                <div>
                  <label className={label}>Javob</label>
                  <textarea rows={3} className={cn(field, 'resize-y')} value={f.answer} onChange={(e) => change(items.map((x) => (x.id === f.id ? { ...x, answer: e.target.value } : x)))} />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <button onClick={() => move(i, -1)} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-ink/[0.06] dark:hover:bg-white/10" aria-label="Yuqoriga">
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button onClick={() => move(i, 1)} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-ink/[0.06] dark:hover:bg-white/10" aria-label="Pastga">
                  <ArrowDown className="h-4 w-4" />
                </button>
                <button
                  onClick={() => change(items.map((x) => (x.id === f.id ? { ...x, isVisible: !x.isVisible } : x)))}
                  className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-ink/[0.06] dark:hover:bg-white/10"
                  aria-label={f.isVisible ? 'Yashirish' : 'Ko‘rsatish'}
                >
                  {f.isVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => change(items.filter((x) => x.id !== f.id))}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-rose-600 hover:bg-rose-500/10"
                  aria-label="O‘chirish"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </Glass>
        ))}
        {items.length === 0 ? (
          <Glass level={1} radius="rounded-[24px]" className="p-8 text-center text-[14px] text-ink-muted dark:text-stone-400">
            Hozircha savol yo‘q. “Savol qo‘shish” tugmasini bosing.
          </Glass>
        ) : null}
      </div>
    </div>
  );
};
