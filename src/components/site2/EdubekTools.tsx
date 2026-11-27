'use client';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { overallBand, countWords, WRITING_SECONDS, WRITING_TARGET, SPEAKING_SECONDS, MINIMAL_PAIRS, DAILY_WORDS, CUE_TOPICS } from '../../lib/edubekTools';
import { api } from '../../services/api';

type ToolId = 'band' | 'writing' | 'speaking' | 'breathe' | 'pomodoro' | 'pronounce' | 'word' | 'fix' | 'idiom' | 'practice';

const TOOLS: { id: ToolId; title: string; hint: string }[] = [
  { id: 'band', title: 'IELTS ball', hint: 'Har bo‘lim balini kiriting, umumiy ball chiqadi' },
  { id: 'writing', title: 'Yozish', hint: 'So‘z sanash va vaqt' },
  { id: 'speaking', title: 'Speaking', hint: 'Part 2: tayyorgarlik va gapirish' },
  { id: 'breathe', title: 'Nafas', hint: 'Imtihon oldidan tinchlanish' },
  { id: 'pomodoro', title: 'Pomodoro', hint: '25 daqiqa o‘qish, 5 daqiqa dam' },
  { id: 'pronounce', title: 'Talaffuz', hint: 'Adashtiriladigan tovushlar' },
  { id: 'word', title: 'Kunlik so‘z', hint: 'Har kuni bitta yangi so‘z' },
  { id: 'fix', title: 'Gap tuzatish · AI', hint: 'Gapingizni yozing: xatolari va sababi chiqadi' },
  { id: 'idiom', title: 'Ibora · AI', hint: 'So‘z yoki iboraning ma’nosi va misoli' },
  { id: 'practice', title: 'Mashq · AI', hint: 'Mavzu bo‘yicha 3 ta savol va javoblar' }
];

/** A countdown that ticks once a second and stops when the tool is closed. */
function useCountdown(seconds: number) {
  const [left, setLeft] = useState(seconds);
  const [running, setRunning] = useState(false);
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setLeft((v) => Math.max(0, v - 1)), 1000);
    return () => clearInterval(id);
  }, [running]);
  useEffect(() => {
    if (running && left === 0) setRunning(false);
  }, [left, running]);
  return {
    left,
    running,
    start: () => setRunning(true),
    pause: () => setRunning(false),
    reset: (s = seconds) => {
      setRunning(false);
      setLeft(s);
    }
  };
}

const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

const Card: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="rounded-[1.5rem] border border-line/80 bg-white/75 p-5 shadow-[0_18px_40px_-30px_rgba(18,16,14,0.35)] dark:border-white/10 dark:bg-white/[0.03]">{children}</div>
);

const Btn: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { primary?: boolean }> = ({ primary, className = '', ...rest }) => (
  <button
    type="button"
    {...rest}
    className={`rounded-full px-4 py-2 text-[13px] font-bold transition hover:-translate-y-0.5 disabled:opacity-40 ${primary ? 'bg-gradient-to-b from-[#ffa149] to-[#f2650f] text-white shadow-[0_10px_24px_-12px_rgba(242,101,15,0.8)]' : 'border border-line/80 bg-white/70 text-ink dark:border-white/15 dark:bg-white/[0.06] dark:text-white'} ${className}`}
  />
);

const BandTool: React.FC = () => {
  const [vals, setVals] = useState<[string, string, string, string]>(['', '', '', '']);
  const labels = ['Reading', 'Listening', 'Writing', 'Speaking'];
  const scores = vals.map((v) => (v === '' ? NaN : Number(v)));
  const complete = scores.every((n) => Number.isFinite(n));
  const band = complete ? overallBand(scores[0], scores[1], scores[2], scores[3]) : null;
  const steps = Array.from({ length: 19 }, (_, i) => String(i / 2));
  return (
    <Card>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {labels.map((label, i) => (
          <label key={label} className="flex flex-col gap-1.5 text-[12px] font-semibold text-ink-muted dark:text-stone-400">
            {label}
            <select
              value={vals[i]}
              onChange={(e) => setVals((prev) => prev.map((v, j) => (j === i ? e.target.value : v)) as [string, string, string, string])}
              className="rounded-xl border border-line/80 bg-white px-3 py-2 text-[14px] font-bold text-ink dark:border-white/15 dark:bg-stone-900 dark:text-white"
            >
              <option value="">—</option>
              {steps.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>
        ))}
      </div>
      <div className="mt-5 flex items-center justify-between rounded-2xl bg-ink/[0.04] px-5 py-4 dark:bg-white/[0.05]">
        <span className="text-[13px] font-semibold text-ink-muted dark:text-stone-400">Umumiy ball</span>
        <span className="font-display text-[34px] font-extrabold tracking-[-0.03em] text-ink dark:text-white">{band !== null ? band.toFixed(1) : '—'}</span>
      </div>
      <p className="mt-3 text-[12px] leading-relaxed text-ink-muted dark:text-stone-400">
        Qoida: to‘rt bo‘lim o‘rtachasi eng yaqin yarim ballga yaxlitlanadi (.25 → .5, .75 → keyingi butun). Bu taxminiy hisob, rasmiy natija emas.
      </p>
    </Card>
  );
};

const WritingTool: React.FC = () => {
  const [text, setText] = useState('');
  const [task, setTask] = useState<'task1' | 'task2'>('task2');
  const words = countWords(text);
  const target = WRITING_TARGET[task];
  const timer = useCountdown(WRITING_SECONDS.task2);
  const pickTask = (t: 'task1' | 'task2') => {
    setTask(t);
    timer.reset(WRITING_SECONDS[t]);
  };
  return (
    <Card>
      <div className="flex flex-wrap items-center gap-2">
        <Btn primary={task === 'task1'} onClick={() => pickTask('task1')}>Task 1 · 20 daq</Btn>
        <Btn primary={task === 'task2'} onClick={() => pickTask('task2')}>Task 2 · 40 daq</Btn>
        <Btn onClick={() => timer.reset(WRITING_SECONDS.full)}>To‘liq · 60 daq</Btn>
        <span className="ml-auto font-display text-[24px] font-extrabold tabular-nums text-ink dark:text-white" aria-live="off">{fmt(timer.left)}</span>
        <Btn primary onClick={() => (timer.running ? timer.pause() : timer.start())}>{timer.running ? 'To‘xtatish' : 'Boshlash'}</Btn>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={9}
        placeholder="Matningizni shu yerga yozing…"
        aria-label="Yozma matn"
        className="mt-4 w-full resize-y rounded-2xl border border-line/80 bg-white px-4 py-3 text-[15px] leading-relaxed text-ink outline-none focus:border-[#f2650f] dark:border-white/15 dark:bg-stone-900 dark:text-white"
      />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[13px]">
        <span className={words >= target ? 'font-bold text-emerald-600 dark:text-emerald-300' : 'text-ink-muted dark:text-stone-400'}>
          {words} so‘z · kamida {target}
        </span>
        <span className="text-ink-muted dark:text-stone-400">{words >= target ? 'Yetarli hajm' : `Yana ${target - words} so‘z kerak`}</span>
      </div>
    </Card>
  );
};

const SpeakingTool: React.FC = () => {
  const [topic, setTopic] = useState(CUE_TOPICS[0]);
  const prep = useCountdown(SPEAKING_SECONDS.prep);
  const speak = useCountdown(SPEAKING_SECONDS.speak);
  const phase = speak.left < SPEAKING_SECONDS.speak || speak.running ? 'speak' : 'prep';
  const left = phase === 'speak' ? speak.left : prep.left;
  return (
    <Card>
      <p className="text-[15px] font-semibold leading-relaxed text-ink dark:text-white">{topic}</p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Btn onClick={() => { setTopic(CUE_TOPICS[Math.floor(Math.random() * CUE_TOPICS.length)]); prep.reset(); speak.reset(); }}>Yangi mavzu</Btn>
        <Btn primary onClick={() => (prep.running || speak.running ? (prep.pause(), speak.pause()) : (prep.left > 0 ? prep.start() : speak.start()))}>
          {prep.running || speak.running ? 'To‘xtatish' : 'Boshlash'}
        </Btn>
        <Btn onClick={() => { prep.reset(); speak.reset(); }}>Qayta</Btn>
      </div>
      <div className="mt-5 flex items-center justify-between rounded-2xl bg-ink/[0.04] px-5 py-4 dark:bg-white/[0.05]">
        <span className="text-[13px] font-semibold text-ink-muted dark:text-stone-400">{phase === 'prep' ? 'Tayyorgarlik (1 daq)' : 'Gapirish (2 daq)'}</span>
        <span className="font-display text-[34px] font-extrabold tabular-nums text-ink dark:text-white">{fmt(left)}</span>
      </div>
      {prep.left === 0 && phase === 'prep' ? <p className="mt-3 text-[12.5px] text-ink-muted dark:text-stone-400">Tayyorgarlik tugadi. Boshlash ni bosing, gapirishni boshlang.</p> : null}
    </Card>
  );
};

const BreatheTool: React.FC = () => {
  const [on, setOn] = useState(false);
  const phases = ['Nafas oling', 'Ushlang', 'Chiqaring', 'Ushlang'];
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (!on) return;
    const id = setInterval(() => setStep((s) => (s + 1) % 4), 4000);
    return () => clearInterval(id);
  }, [on]);
  // Inhale grows the circle, exhale shrinks it; only transform and opacity change.
  const grown = step === 0 || step === 1;
  return (
    <Card>
      <div className="flex flex-col items-center gap-6 py-4">
        <div className="relative flex h-44 w-44 items-center justify-center">
          <span
            aria-hidden="true"
            className="absolute inset-0 rounded-full bg-gradient-to-b from-[#ffa149] to-[#f2650f] opacity-80 transition-transform duration-[4000ms] ease-in-out"
            style={{ transform: on && grown ? 'scale(1)' : on ? 'scale(0.55)' : 'scale(0.7)' }}
          />
          <span className="relative font-display text-[18px] font-extrabold text-white">{on ? phases[step] : 'Tayyormisiz?'}</span>
        </div>
        <Btn primary onClick={() => { setOn((v) => !v); setStep(0); }}>{on ? 'To‘xtatish' : 'Boshlash (4-4-4-4)'}</Btn>
        <p className="max-w-sm text-center text-[12.5px] leading-relaxed text-ink-muted dark:text-stone-400">Har bosqich 4 soniya: nafas oling, ushlang, chiqaring, yana ushlang. Bir necha marta takrorlang.</p>
      </div>
    </Card>
  );
};

const PomodoroTool: React.FC = () => {
  const work = useCountdown(25 * 60);
  const [mode, setMode] = useState<'work' | 'break'>('work');
  const timer = mode === 'work' ? work : null;
  const left = timer ? timer.left : 0;
  const running = timer?.running ?? false;
  const [rest, setRest] = useState<number>(5 * 60);
  const [restLeft, setRestLeft] = useState(5 * 60);
  const [restRunning, setRestRunning] = useState(false);
  useEffect(() => {
    if (!restRunning) return;
    const id = setInterval(() => setRestLeft((v) => Math.max(0, v - 1)), 1000);
    return () => clearInterval(id);
  }, [restRunning]);
  useEffect(() => {
    if (restRunning && restLeft === 0) setRestRunning(false);
  }, [restLeft, restRunning]);
  const shown = mode === 'work' ? left : restLeft;
  const isRunning = mode === 'work' ? running : restRunning;
  return (
    <Card>
      <div className="flex flex-wrap items-center gap-2">
        <Btn primary={mode === 'work'} onClick={() => setMode('work')}>O‘qish · 25</Btn>
        <Btn primary={mode === 'break'} onClick={() => setMode('break')}>Dam · 5</Btn>
      </div>
      <div className="mt-5 flex items-center justify-center font-display text-[64px] font-extrabold tabular-nums tracking-[-0.04em] text-ink dark:text-white">{fmt(shown)}</div>
      <div className="mt-2 flex justify-center gap-2">
        <Btn primary onClick={() => (mode === 'work' ? (running ? work.pause() : work.start()) : setRestRunning((v) => !v))}>{isRunning ? 'To‘xtatish' : 'Boshlash'}</Btn>
        <Btn onClick={() => (mode === 'work' ? work.reset() : (setRestRunning(false), setRestLeft(rest)))}>Qayta</Btn>
      </div>
      <p className="mt-4 text-center text-[12px] text-ink-muted dark:text-stone-400">{mode === 'work' && left === 0 ? 'Ajoyib! Endi 5 daqiqa dam oling.' : 'Har 25 daqiqadan keyin qisqa dam oling.'}</p>
    </Card>
  );
};

/** Reads a word aloud with the browser's own voice (no server, no key). */
function speak(text: string) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-US';
  u.rate = 0.9;
  window.speechSynthesis.speak(u);
  return true;
}

const PronounceTool: React.FC = () => {
  const [i, setI] = useState(0);
  const [canSpeak, setCanSpeak] = useState(true);
  const pair = MINIMAL_PAIRS[i];
  const say = (w: string) => setCanSpeak(speak(w));
  return (
    <Card>
      <p className="text-[12.5px] font-semibold uppercase tracking-[0.14em] text-ink-muted dark:text-stone-400">{pair[2]}</p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {[pair[0], pair[1]].map((w) => (
          <button key={w} type="button" onClick={() => say(w)} className="rounded-2xl border border-line/80 bg-white/80 px-4 py-6 font-display text-[26px] font-extrabold text-ink transition hover:-translate-y-0.5 dark:border-white/15 dark:bg-white/[0.05] dark:text-white">
            {w}
            <span className="mt-1 block text-[11.5px] font-semibold text-ink-muted dark:text-stone-400">Eshiting</span>
          </button>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between">
        <Btn onClick={() => { setI((v) => (v + 1) % MINIMAL_PAIRS.length); }}>Keyingi juftlik</Btn>
        <span className="text-[12px] text-ink-muted dark:text-stone-400">{i + 1} / {MINIMAL_PAIRS.length}</span>
      </div>
      {!canSpeak ? <p className="mt-3 text-[12.5px] text-amber-700 dark:text-amber-300">Bu brauzerda ovoz chiqarish yo‘q. So‘zlarni o‘zingiz talaffuz qiling.</p> : null}
    </Card>
  );
};

const WordTool: React.FC = () => {
  const day = Math.floor(Date.now() / 86400000);
  const [i, setI] = useState(day % DAILY_WORDS.length);
  const w = DAILY_WORDS[i];
  const [canSpeak, setCanSpeak] = useState(true);
  return (
    <Card>
      <div className="font-display text-[34px] font-extrabold tracking-[-0.03em] text-ink dark:text-white">{w.en}</div>
      <div className="mt-1 text-[15px] text-ink-muted dark:text-stone-400">{w.uz}</div>
      <p className="mt-4 rounded-2xl bg-ink/[0.04] px-4 py-3 text-[14px] italic leading-relaxed text-ink dark:bg-white/[0.05] dark:text-stone-200">“{w.example}”</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Btn onClick={() => setCanSpeak(speak(w.en))}>Tinglash</Btn>
        <Btn onClick={() => setCanSpeak(speak(w.example))}>Misolni tinglash</Btn>
        <Btn primary onClick={() => setI((v) => (v + 1) % DAILY_WORDS.length)}>Keyingi so‘z</Btn>
      </div>
      {!canSpeak ? <p className="mt-3 text-[12.5px] text-amber-700 dark:text-amber-300">Bu brauzerda ovoz chiqarish yo‘q.</p> : null}
    </Card>
  );
};

/** A question to Edubek: the answer appears under the box. Uses the same tutor endpoint as the chat (AI time applies). */
const AskTool: React.FC<{ placeholder: string; cta: string; build: (input: string) => string; multiline?: boolean }> = ({ placeholder, cta, build, multiline }) => {
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const run = async () => {
    const q = input.trim();
    if (q.length < 2 || busy) return;
    setBusy(true);
    setError(null);
    setAnswer(null);
    try {
      const r = await api.askEdubek(build(q), { mode: 'explain', level: 'B1' });
      if (!r?.success) setError(r?.message || 'Javob olinmadi. Qayta urinib ko‘ring.');
      else setAnswer(String(r.reply || '').trim() || 'Javob topilmadi.');
    } catch {
      setError('Server bilan bog‘lanib bo‘lmadi.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card>
      {multiline ? (
        <textarea value={input} onChange={(e) => setInput(e.target.value)} rows={3} maxLength={1200} placeholder={placeholder} aria-label={placeholder} className="w-full resize-y rounded-2xl border border-line/80 bg-white px-4 py-3 text-[15px] leading-relaxed text-ink outline-none focus:border-[#f2650f] dark:border-white/15 dark:bg-stone-900 dark:text-white" />
      ) : (
        <input value={input} onChange={(e) => setInput(e.target.value)} maxLength={300} placeholder={placeholder} aria-label={placeholder} className="w-full rounded-2xl border border-line/80 bg-white px-4 py-3 text-[15px] text-ink outline-none focus:border-[#f2650f] dark:border-white/15 dark:bg-stone-900 dark:text-white" />
      )}
      <div className="mt-3 flex items-center gap-2">
        <Btn primary onClick={run} disabled={busy || input.trim().length < 2}>{busy ? 'Edubek o‘ylayapti…' : cta}</Btn>
        {answer ? <Btn onClick={() => { setAnswer(null); setInput(''); }}>Tozalash</Btn> : null}
      </div>
      {error ? <p role="alert" className="mt-4 rounded-2xl bg-rose-500/10 px-4 py-3 text-[13.5px] text-rose-700 dark:text-rose-300">{error}</p> : null}
      {answer ? (
        <div className="mt-4 whitespace-pre-wrap rounded-2xl bg-ink/[0.04] px-4 py-4 text-[14.5px] leading-relaxed text-ink dark:bg-white/[0.05] dark:text-stone-100" aria-live="polite">{answer}</div>
      ) : null}
    </Card>
  );
};

/** Edubek's study tools: the first seven work without AI; the last three ask Edubek (AI time applies). */

export const EdubekTools: React.FC = () => {
  const [active, setActive] = useState<ToolId>('band');
  const tool = useMemo(() => TOOLS.find((t) => t.id === active) || TOOLS[0], [active]);
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    ref.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [active]);
  return (
    <div ref={ref} className="space-y-5">
      <div role="tablist" aria-label="Edubek vositalari" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 no-scrollbar">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={active === t.id}
            type="button"
            onClick={() => setActive(t.id)}
            className={`shrink-0 rounded-full px-4 py-2 text-[13px] font-bold transition ${active === t.id ? 'bg-ink text-white dark:bg-white dark:text-ink' : 'border border-line/80 bg-white/70 text-ink-muted hover:text-ink dark:border-white/15 dark:bg-white/[0.04] dark:text-stone-300 dark:hover:text-white'}`}
          >
            {t.title}
          </button>
        ))}
      </div>
      <p className="text-[13px] text-ink-muted dark:text-stone-400">{tool.hint}</p>
      <div key={active} className="animate-section" role="tabpanel">
        {active === 'band' ? <BandTool /> : null}
        {active === 'writing' ? <WritingTool /> : null}
        {active === 'speaking' ? <SpeakingTool /> : null}
        {active === 'breathe' ? <BreatheTool /> : null}
        {active === 'pomodoro' ? <PomodoroTool /> : null}
        {active === 'pronounce' ? <PronounceTool /> : null}
        {active === 'word' ? <WordTool /> : null}
        {active === 'fix' ? (
          <AskTool multiline placeholder="Masalan: He go to school every day." cta="Tekshirish" build={(t) => `Quyidagi ingliz gapni tekshiring. Avval to‘g‘ri variantini yozing, so‘ng har bir xatoni va uning sababini o‘zbekcha tushuntiring. Qisqa va aniq bo‘lsin.\n\nGap: ${t}`} />
        ) : null}
        {active === 'idiom' ? (
          <AskTool placeholder="Masalan: break the ice" cta="Izohlash" build={(t) => `“${t}” so‘zi yoki iborasining ma’nosini o‘zbekcha tushuntiring, kundalik hayotdan 2 ta ingliz misol va o‘zbekcha tarjimasini bering. Qisqa bo‘lsin.`} />
        ) : null}
        {active === 'practice' ? (
          <AskTool placeholder="Mavzu: Present Perfect, Articles, Conditionals…" cta="Mashq yaratish" build={(t) => `“${t}” mavzusi bo‘yicha 3 ta mashq savoli yozing (ingliz tilida). Har savoldan keyin javobini alohida ko‘rsating: 1) savol, 2) javob. Oxirida qisqa qoida o‘zbekcha.`} />
        ) : null}
      </div>
    </div>
  );
};
