'use client';
import React, { useEffect, useRef, useState } from 'react';
import { Send, Volume2, VolumeX, X } from 'lucide-react';
import { matchDockTopic, type DockTopic } from '../../lib/edubekDockMatch';
import { useApp } from '../../context/AppContext';
import { EdubekAvatar, EdubekMood } from '../site2/EdubekAvatar';
import { isGiftLive } from '../../lib/giftLive';
import { subscribeScroll } from '../../lib/motion/scrollEngine';

type Msg = { from: 'bot' | 'me'; text: string };
type Topic = DockTopic;

const som = (n: number) => `${Math.round(n).toLocaleString('uz-UZ').replace(/ /g, ' ')} so‘m`;

/**
 * Edubek on the public site: a small face in the corner that looks around, greets once,
 * and answers the questions visitors ask most. Answers come from the site's own data (plans,
 * news, teacher), so nothing here calls the AI and nothing can be invented. Voice is optional.
 */
export const EdubekDock: React.FC = () => {
  // On phones the dock steps aside while the page is scrolled (so it never covers the text being read) and returns when the scroll stops.
  // The class goes on the element itself, from the scroll engine: no React state changes on each scroll frame.
  const dockRef = useRef<HTMLDivElement | null>(null);
  const openRef = useRef(false);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let away = false;
    const unsubscribe = subscribeScroll({
      write: (f) => {
        const el = dockRef.current;
        if (!el || f.dir === 0) return;
        if (openRef.current) return; // an open conversation never slides away while the page scrolls
        if (!away) {
          away = true;
          el.classList.add('edubek-dock-away');
        }
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
          away = false;
          el.classList.remove('edubek-dock-away');
        }, 900);
      }
    });
    return () => {
      unsubscribe();
      if (timer) clearTimeout(timer);
      if (timer) clearTimeout(timer);
    };
  }, []);
  const { db, currentUser, setActiveSite } = useApp();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    openRef.current = open;
    if (open) dockRef.current?.classList.remove('edubek-dock-away');
  }, [open]);
  const [mood, setMood] = useState<EdubekMood>('idle');
  const [hint, setHint] = useState(false);
  // The greeting bubble steps aside once the reader moves on, so it never sits over the page they are reading.
  useEffect(() => {
    if (!hint) return;
    const onScroll = () => {
      if (window.scrollY > 120) setHint(false);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [hint]);
  const [voice, setVoice] = useState(false);
  const [sleepy, setSleepy] = useState(false);
  const sleepyRef = useRef(false);
  const [msgs, setMsgs] = useState<Msg[]>([{ from: 'bot', text: 'Salom! Men Edubek — EduLevel yordamchisiman. Nima haqida bilmoqchisiz?' }]);
  const listRef = useRef<HTMLDivElement | null>(null);
  const [draft, setDraft] = useState('');
  const [kb, setKb] = useState(0);
  // The phone keyboard covers fixed elements: the dock lifts by the covered height.
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv || !open) return;
    const update = () => setKb(Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop)));
    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => { vv.removeEventListener('resize', update); vv.removeEventListener('scroll', update); setKb(0); };
  }, [open]);

  // A tap outside the open panel closes it.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => { if (dockRef.current && !dockRef.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open]);

  const timers = useRef<number[]>([]);
  const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window;

  const later = (fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    timers.current.push(id);
  };

  useEffect(() => {
    try {
      if (localStorage.getItem('edubek_voice') === '1') setVoice(true);
    } catch {
      /* private mode: voice stays off */
    }
    let shown = false;
    try {
      shown = sessionStorage.getItem('edubek_greeted') === '1';
    } catch {
      /* ignore */
    }
    if (!shown) {
      later(() => {
        setHint(true);
        setMood('happy');
        try {
          sessionStorage.setItem('edubek_greeted', '1');
        } catch {
          /* ignore */
        }
      }, 3500);
      later(() => {
        setHint(false);
        setMood('idle');
      }, 12500);
    }
    return () => {
      timers.current.forEach((t) => window.clearTimeout(t));
      if (canSpeak) window.speechSynthesis.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // After a minute with no touch of the page, Edubek dozes; any move wakes it.
  useEffect(() => {
    // The state is written only when it changes, so a move does not re-render the dock.
    const setDozing = (v: boolean) => {
      if (sleepyRef.current !== v) {
        sleepyRef.current = v;
        setSleepy(v);
      }
    };
    let t = window.setTimeout(() => setDozing(true), 60_000);
    const wake = () => {
      setDozing(false);
      window.clearTimeout(t);
      t = window.setTimeout(() => setDozing(true), 60_000);
    };
    const unsubscribe = subscribeScroll({
      write: (f) => {
        if (f.dir !== 0) wake();
      }
    });
    window.addEventListener('pointermove', wake, { passive: true });
    window.addEventListener('keydown', wake);
    return () => {
      unsubscribe();
      window.clearTimeout(t);
      window.removeEventListener('pointermove', wake);
      window.removeEventListener('keydown', wake);
    };
  }, []);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [msgs, open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const hasNews = (db.news || []).some((n) => n.published);
  if (db.features?.publicEdubek === false) return null;
  const gift = isGiftLive(db.vipGift) ? db.vipGift : undefined;

  const topics: Array<{ id: Topic; label: string; show: boolean }> = [
    { id: 'level', label: 'Qaysi daraja menga mos?', show: true },
    { id: 'vip', label: 'VIP tariflar', show: (db.vipPlans || []).length > 0 },
    { id: 'news', label: gift ? 'Bepul VIP aksiyasi' : 'Yangiliklar', show: hasNews || !!gift },
    { id: 'teacher', label: 'Ustoz haqida', show: !!db.teacherProfile?.name },
    { id: 'start', label: 'Qanday boshlayman?', show: !currentUser }
  ];

  const go = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const reply = (topic: Topic): { text: string; after?: () => void } => {
    if (topic === 'level') {
      return {
        text: 'Aniq darajangizni ro‘yxatdan o‘tgach, mashqlar va mock testlar ko‘rsatadi. Sahifadagi B1 dan C1 gacha yo‘l xaritasi har bosqich uchun maqsad ballni ko‘rsatadi. Hozir xaritaga olib boraymi?',
        after: () => go('levels')
      };
    }
    if (topic === 'vip') {
      const plans = db.vipPlans || [];
      const lines = plans.map((p) => `${p.name}: ${p.priceMonthly > 0 ? som(p.priceMonthly) : 'bepul'} / ${p.durationDays} kun`);
      return { text: lines.length ? `Tariflar: ${lines.join('; ')}. Batafsil pastda.` : 'Tariflar hali e’lon qilinmagan.', after: () => go('vip') };
    }
    if (topic === 'news') {
      const items = (db.news || []).filter((n) => n.published).slice(0, 3);
      const parts: string[] = [];
      if (gift) parts.push(`${gift.title} — ${db.vipPlans.find((p) => p.id === gift.tier)?.name || gift.tier} tarifi cheklangan vaqt bepul.`);
      if (items.length) parts.push(`So‘nggi yangiliklar: ${items.map((n) => n.title).join('; ')}.`);
      return { text: parts.join(' ') || 'Hozircha yangilik yo‘q.', after: () => go('news') };
    }
    if (topic === 'teacher') {
      const t = db.teacherProfile;
      const bits = [t?.name, t?.title, t?.experienceYears ? `${t.experienceYears} yillik tajriba` : ''].filter(Boolean);
      return { text: bits.length ? `${bits.join(', ')}. Pastda ustoz haqida to‘liq ma’lumot bor.` : 'Ustoz haqida ma’lumot tez orada.', after: () => go('teacher-bio') };
    }
    if (topic === 'ielts') {
      return { text: 'IELTS va CEFR uchun darslar, mashqlar va mock testlar bor. Tayyorgarlik sahifalari: /ielts-tayyorgarlik va /cefr-tayyorgarlik. Natija rasmiy ball emas, tayyorgarlik uchun taxminiy ko‘rsatkich.', after: () => go('levels') };
    }
    if (topic === 'books') {
      return { text: 'Kitoblar bo‘limida elektron materiallar bor. Pastdagi “Kitoblar” bo‘limini oching.', after: () => go('books') };
    }
    return { text: 'Ro‘yxatdan o‘tish bepul: ism, yo‘nalish (IELTS, CEFR yoki umumiy) va maqsadingizni tanlaysiz, kabinet shu zahoti ochiladi. Boshlaymizmi?', after: () => setActiveSite('auth') };
  };

  const speak = (text: string) => {
    if (!voice || !canSpeak) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const v = voices.find((x) => x.lang.toLowerCase().startsWith('uz')) || voices.find((x) => x.lang.toLowerCase().startsWith('en'));
    if (v) u.voice = v;
    u.pitch = 1.05;
    u.onstart = () => setMood('speaking');
    u.onend = () => setMood('happy');
    u.onerror = () => setMood('idle');
    window.speechSynthesis.speak(u);
  };

  const ask = (t: { id: Topic; label: string }) => {
    setMsgs((m) => [...m, { from: 'me', text: t.label }]);
    setMood('thinking');
    later(() => {
      const r = reply(t.id);
      setMsgs((m) => [...m, { from: 'bot', text: r.text }]);
      setMood('happy');
      speak(r.text);
      if (r.after && t.id !== 'start') later(() => r.after?.(), 700);
      else if (r.after) later(() => { setOpen(false); r.after?.(); }, 1800);
      if (!voice) later(() => setMood('idle'), 3000);
    }, 650);
  };

  const askTyped = () => {
    const q = draft.trim();
    if (!q) return;
    setDraft('');
    const topic = matchDockTopic(q);
    if (topic) {
      ask({ id: topic, label: q });
      return;
    }
    setMsgs((m) => [...m, { from: 'me', text: q }]);
    setMood('thinking');
    later(() => {
      const text = currentUser
        ? 'Bu savolga batafsil javobni kabinetdagi EduBek AI chatida olasiz: u ingliz tili, grammatika va tayyorgarlik bo‘yicha yordam beradi.'
        : 'Bu savolga umumiy sahifada aniq javobim yo‘q. Bepul ro‘yxatdan o‘tsangiz, EduBek AI chati ingliz tili bo‘yicha batafsil javob beradi.';
      setMsgs((m) => [...m, { from: 'bot', text }]);
      setMood('idle');
    }, 450);
  };

  const toggleVoice = () => {
    const next = !voice;
    setVoice(next);
    try {
      localStorage.setItem('edubek_voice', next ? '1' : '0');
    } catch {
      /* ignore */
    }
    if (!next && canSpeak) {
      window.speechSynthesis.cancel();
      setMood('idle');
    }
  };

  return (
    <div ref={dockRef} style={kb ? { bottom: `calc(1rem + ${kb}px)` } : undefined} className="edubek-dock fixed bottom-4 left-4 z-40 flex max-w-[calc(100vw-5.5rem)] flex-col items-start gap-3 sm:bottom-6 sm:left-6">
      {open ? (
        <div role="dialog" aria-label="Edubek yordamchisi" className="edubek-panel w-[340px] max-w-[calc(100vw-1.5rem)] rounded-[26px] bg-white/95 p-4 shadow-[0_30px_80px_-30px_rgba(40,25,10,0.45)] ring-1 ring-black/5 backdrop-blur-xl animate-fadeIn dark:bg-[#17120e]/95 dark:ring-white/10">
          <div className="flex items-center justify-between">
            <div className="text-[14px] font-extrabold text-ink dark:text-white">Edubek</div>
            <div className="flex items-center gap-1">
              {canSpeak ? (
                <button type="button" onClick={toggleVoice} aria-pressed={voice} aria-label={voice ? 'Ovozni o‘chirish' : 'Ovozni yoqish'} className="flex h-9 w-9 items-center justify-center rounded-full text-ink-muted hover:bg-ink/5 dark:text-white/70">
                  {voice ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                </button>
              ) : null}
              <button type="button" onClick={() => setOpen(false)} aria-label="Yopish" className="flex h-9 w-9 items-center justify-center rounded-full text-ink-muted hover:bg-ink/5 dark:text-white/70">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div ref={listRef} className="mt-3 max-h-[min(38vh,240px)] space-y-2 overflow-y-auto pr-1" aria-live="polite">
            {msgs.map((m, i) => (
              <div key={i} className={m.from === 'me' ? 'flex justify-end' : 'flex'}>
                <div className={`max-w-[88%] rounded-2xl px-3.5 py-2 text-[13px] leading-relaxed ${m.from === 'me' ? 'bg-gradient-to-b from-[#ffb45c] to-[#ef6c12] text-white' : 'bg-white/70 text-ink dark:bg-white/10 dark:text-white'}`}>{m.text}</div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {topics.filter((t) => t.show).map((t) => (
              <button key={t.id} type="button" onClick={() => ask(t)} className="rounded-full border border-[#f2650f]/30 bg-white/60 px-3 py-1.5 text-[12px] font-semibold text-[#c4520a] transition-colors hover:bg-[#f2650f]/10 dark:bg-white/5 dark:text-[#ffc982]">
                {t.label}
              </button>
            ))}
          </div>
          <form onSubmit={(e) => { e.preventDefault(); askTyped(); }} className="mt-3 flex items-center gap-2">
            <input value={draft} onChange={(e) => setDraft(e.target.value.slice(0, 200))} placeholder="Savol yozing…" aria-label="Edubek ga savol" enterKeyHint="send"
              className="min-h-[44px] min-w-0 flex-1 rounded-full border border-black/10 bg-white px-4 text-[14px] text-ink outline-none focus:border-[#f2650f] dark:border-white/15 dark:bg-white/5 dark:text-white" />
            <button type="submit" disabled={!draft.trim()} aria-label="Yuborish" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-[#ffa149] to-[#f2650f] text-white transition-opacity disabled:opacity-40">
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      ) : hint ? (
        <div className="liquid-glass hidden max-w-[230px] rounded-2xl px-4 py-2.5 text-[13px] font-semibold text-ink animate-fadeIn sm:block dark:text-white">Salom! Men Edubek. Savolingiz bormi?</div>
      ) : null}
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          setHint(false);
          if (!open) setMood('happy');
          else if (mood !== 'speaking') setMood('idle');
        }}
        onPointerEnter={() => mood === 'idle' && setMood('happy')}
        onPointerLeave={() => mood === 'happy' && !open && setMood('idle')}
        aria-label={open ? 'Edubek yordamchisini yopish' : 'Edubek yordamchisini ochish'}
        aria-expanded={open}
        className="flex h-[60px] w-[66px] items-center justify-center rounded-[24px] sm:h-[68px] sm:w-[78px] sm:rounded-[28px] bg-transparent transition-transform duration-300 hover:-translate-y-1 active:scale-95 focus-visible:outline-2 focus-visible:outline-[#f2650f]"
      >
        <EdubekAvatar mood={mood === 'idle' && sleepy ? 'sleepy' : mood === 'idle' && gift ? 'surprised' : mood} size={52} />
      </button>
    </div>
  );
};
