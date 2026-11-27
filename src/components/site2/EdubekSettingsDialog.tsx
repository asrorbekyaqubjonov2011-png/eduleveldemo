'use client';
import React, { useState } from 'react';
import { X } from 'lucide-react';
import { getEdubekSettings, setEdubekSettings, type EdubekSettings, type VoiceEngine } from '../../lib/edubekSettings';

const VOICES: { id: VoiceEngine; label: string; hint: string }[] = [
  { id: 'browser', label: 'Qurilma ovozi (tavsiya, bepul)', hint: 'Brauzerning o‘z ovozi: darhol boshlanadi, internet va to‘lov talab qilmaydi.' },
  { id: 'auto', label: 'Avtomatik', hint: 'Server ovozi yoqilgan bo‘lsa Gemini, aks holda qurilma ovozi.' },
  { id: 'gemini', label: 'Gemini (o‘zbek va ingliz)', hint: 'Server ovozi: faqat owner yoqgan bo‘lsa ishlaydi, aks holda qurilma ovozi.' }
];

/** The student's Edubek settings: voice, animation and auto-speak. Saved in this browser. */
export const EdubekSettingsDialog: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [s, setS] = useState<EdubekSettings>(() => getEdubekSettings());
  const update = (next: Partial<EdubekSettings>) => {
    const merged = { ...s, ...next };
    setS(merged);
    setEdubekSettings(merged);
  };
  return (
    <div role="dialog" aria-modal="true" aria-label="Edubek sozlamalari" className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 p-4">
      <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-[28px] bg-paper-raised p-6 shadow-2xl dark:bg-[#1c1815]">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-[17px] font-extrabold text-ink dark:text-white">Edubek sozlamalari</h3>
          <button type="button" onClick={onClose} aria-label="Yopish" className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-ink/5"><X className="h-4 w-4" /></button>
        </div>
        <fieldset className="space-y-2">
          <legend className="mb-2 text-[13px] font-semibold text-ink dark:text-white">Ovoz</legend>
          {VOICES.map((v) => (
            <label key={v.id} className="flex cursor-pointer items-start gap-3 rounded-2xl border border-line/80 p-3 dark:border-white/10">
              <input type="radio" name="edubek-voice" checked={s.voice === v.id} onChange={() => update({ voice: v.id })} className="mt-1 accent-[#f2650f]" />
              <span>
                <span className="block text-[13.5px] font-semibold text-ink dark:text-white">{v.label}</span>
                <span className="block text-[12px] text-ink-muted dark:text-stone-400">{v.hint}</span>
              </span>
            </label>
          ))}
        </fieldset>
        <div className="mt-5 space-y-3">
          <label className="flex items-center justify-between gap-4 text-[13.5px] text-ink dark:text-white">
            <span>Javobni o‘zi gapirsin</span>
            <input type="checkbox" checked={s.autoSpeak} onChange={(e) => update({ autoSpeak: e.target.checked })} className="h-5 w-5 accent-[#f2650f]" />
          </label>
          <label className="flex items-center justify-between gap-4 text-[13.5px] text-ink dark:text-white">
            <span>Yordamchi harakatlansin</span>
            <input type="checkbox" checked={s.animations} onChange={(e) => update({ animations: e.target.checked })} className="h-5 w-5 accent-[#f2650f]" />
          </label>
        </div>
        <button type="button" onClick={onClose} className="mt-6 h-10 w-full rounded-full bg-ink text-[13px] font-semibold text-white dark:bg-white dark:text-ink">Tayyor</button>
      </div>
    </div>
  );
};
