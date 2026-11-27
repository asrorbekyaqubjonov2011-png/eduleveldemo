'use client';
import React, { useEffect, useState } from 'react';
import { Volume2, X } from 'lucide-react';
import { englishVoices, loadVoicePrefs, makeUtterance, saveVoicePrefs, canSpeak } from '../../lib/edubekVoice';

/** Choose which voice Edubek speaks with and how fast; try it before keeping it. */
export const EdubekVoicePanel: React.FC<{ onClose: () => void; mood?: string }> = ({ onClose, mood }) => {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [prefs, setPrefs] = useState(loadVoicePrefs);

  useEffect(() => {
    let alive = true;
    englishVoices().then((v) => alive && setVoices(v));
    return () => {
      alive = false;
    };
  }, []);

  const update = (next: typeof prefs) => {
    setPrefs(next);
    saveVoicePrefs(next);
  };
  const test = async () => {
    if (!canSpeak()) return;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(await makeUtterance("Hello! I'm Edubek. This is how I sound. Shall we practise English together?", mood));
  };

  return (
    <div role="dialog" aria-label="Edubek ovozi" className="liquid-glass edubek-panel w-[min(340px,calc(100vw-2rem))] rounded-[22px] p-4 text-left">
      <div className="flex items-center justify-between">
        <div className="text-[14px] font-extrabold text-ink dark:text-white">Edubek ovozi</div>
        <button type="button" onClick={onClose} aria-label="Yopish" className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-ink/5"><X className="h-4 w-4" /></button>
      </div>
      {!canSpeak() ? (
        <p className="mt-3 text-[12.5px] text-ink-muted dark:text-stone-400">Bu brauzer ovozni qo‘llamaydi. Chrome yoki Edge’da oching.</p>
      ) : (
        <>
          <label className="mt-3 block text-[12px] font-semibold text-ink-muted dark:text-stone-300" htmlFor="voice-pick">Ovoz</label>
          <select id="voice-pick" value={prefs.voiceURI || ''} onChange={(e) => update({ ...prefs, voiceURI: e.target.value || undefined })} className="mt-1 w-full rounded-xl border border-line bg-white/80 px-3 py-2 text-[13px] text-ink dark:border-white/15 dark:bg-white/[0.06] dark:text-white">
            <option value="">Eng yaxshisi (avtomatik)</option>
            {voices.map((v) => <option key={v.voiceURI} value={v.voiceURI}>{v.name} ({v.lang})</option>)}
          </select>
          <label className="mt-3 block text-[12px] font-semibold text-ink-muted dark:text-stone-300" htmlFor="voice-rate">Tezlik: {prefs.rate.toFixed(2)}×</label>
          <input id="voice-rate" type="range" min={0.7} max={1.3} step={0.05} value={prefs.rate} onChange={(e) => update({ ...prefs, rate: Number(e.target.value) })} className="mt-1 w-full accent-[#f2650f]" />
          <button type="button" onClick={test} className="mt-3 inline-flex h-10 items-center gap-2 rounded-full bg-gradient-to-b from-[#ffb45c] to-[#ef6c12] px-5 text-[13px] font-bold text-white"><Volume2 className="h-4 w-4" /> Sinab ko‘rish</button>
          <p className="mt-3 text-[11.5px] leading-snug text-ink-muted dark:text-stone-500">Eng tabiiy ovoz uchun Microsoft Edge brauzerini sinang: unda “Natural” (Aria, Jenny) ovozlari bor. Ovoz va kayfiyat: jahl chiqqanda tez va past, xafa bo‘lganda sekin, hursand bo‘lganda baland va tez gapiradi.</p>
        </>
      )}
    </div>
  );
};
