'use client';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../../context/AppContext';
import { cn } from '../ui/styles';
import { AlertTriangle, ArrowLeft, ArrowRight, Check, Clock, Flag, MessageSquareWarning, Maximize2, ShieldAlert } from 'lucide-react';

type TestRow = {
  id: string;
  kind: 'test' | 'tournament';
  title: string;
  description: string;
  access: 'open' | 'code';
  time_limit_seconds: number;
  attempts_allowed: number;
  require_fullscreen: boolean;
  max_violations: number;
  has_entry_code: boolean;
  question_count: number;
};
type MyAttempt = { test_id: string; status: string; percent: number | null; level_label: string | null; certificate_code: string | null; finished_at: string | null; started_at: string; attempt_no: number };
type Question = { id: string; prompt: string; options: string[]; points: number };
type AttemptState = {
  title: string;
  deadlineAt: string;
  requireFullscreen: boolean;
  maxViolations: number;
  violations: number;
  warningsLeft: number;
  answers: Record<string, number>;
  questions: Question[];
};
type Result = { percent: number; level: string | null; certificateCode: string | null; score: number; maxScore: number };

const fmt = (sec: number) => {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  return (h ? `${h}:${String(m).padStart(2, '0')}` : String(m)) + `:${String(r).padStart(2, '0')}`;
};


/** Enters full screen (Chrome, Edge, Firefox, Safari prefixes). Resolves true when the page is in full screen. */
function enterFullscreen(): Promise<boolean> {
  const el = document.documentElement as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void };
  try {
    if (document.fullscreenElement) return Promise.resolve(true);
    const r = el.requestFullscreen ? el.requestFullscreen() : el.webkitRequestFullscreen?.();
    return Promise.resolve(r).then(() => true).catch(() => false);
  } catch {
    return Promise.resolve(false);
  }
}

/**
 * "Levelni aniqlash": the student's list of level tests and tournaments, the entry flow (name, surname, class, code),
 * and the exam runner. The runner is a full-screen layer that covers the menu. It leaves full screen only when the
 * attempt ends; each leave, tab switch or page change is a violation reported to the server.
 */
export const LevelTestsView: React.FC = () => {
  const { currentUser } = useApp();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tests, setTests] = useState<TestRow[]>([]);
  const [mine, setMine] = useState<MyAttempt[]>([]);
  const [tab, setTab] = useState<'test' | 'tournament'>('test');
  const [picked, setPicked] = useState<TestRow | null>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/levels/tests', { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.message || 'Ro‘yxatni yuklab bo‘lmadi.');
      setTests(data.tests || []);
      setMine(data.myAttempts || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xatolik yuz berdi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(() => tests.filter((t) => t.kind === tab), [tests, tab]);

  if (attemptId && picked) {
    return <AttemptRunner attemptId={attemptId} test={picked} onExit={() => { setAttemptId(null); setPicked(null); void load(); }} />;
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-ember-600 dark:text-ember-300">Levelni aniqlash</p>
        <h1 className="mt-1 font-display text-[clamp(1.6rem,3vw,2.2rem)] font-extrabold tracking-tight">Testlar va turnirlar</h1>
        <p className="mt-2 max-w-2xl text-[14px] text-ink-muted dark:text-stone-300">
          Test vaqt bilan ishlanadi, natija owner belgilagan qoidalar bo‘yicha darajani beradi. Imtihon paytida sayt to‘liq ekranda ishlaydi.
        </p>
      </header>

      <div role="tablist" aria-label="Bo‘lim" className="inline-flex rounded-2xl border border-black/10 bg-white/60 p-1 dark:border-white/10 dark:bg-white/[0.04]">
        {(['test', 'tournament'] as const).map((k) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
            className={cn('min-h-[44px] rounded-xl px-5 text-[14px] font-semibold transition-colors', tab === k ? 'bg-ember-500 text-white' : 'text-ink-muted hover:text-ink dark:text-stone-300')}>
            {k === 'test' ? 'Testlar' : 'Turnirlar'}
          </button>
        ))}
      </div>

      {loading ? <p className="text-[14px] text-ink-muted dark:text-stone-300">Yuklanmoqda…</p> : null}
      {error ? <p role="alert" className="rounded-xl bg-rose-500/10 px-4 py-3 text-[14px] text-rose-700 dark:text-rose-300">{error}</p> : null}
      {!loading && !error && visible.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-black/15 p-6 text-center text-[14px] text-ink-muted dark:border-white/15 dark:text-stone-300">
          {tab === 'test' ? 'Hozircha ochiq test yo‘q.' : 'Hozircha ochiq turnir yo‘q.'}
        </p>
      ) : null}

      <ul className="grid gap-4 sm:grid-cols-2">
        {visible.map((t) => {
          const done = mine.filter((m) => m.test_id === t.id && m.status === 'finished');
          const best = done.reduce<MyAttempt | null>((acc, m) => (acc && (acc.percent ?? 0) >= (m.percent ?? 0) ? acc : m), null);
          const used = mine.filter((m) => m.test_id === t.id && m.status !== 'in_progress').length;
          const left = Math.max(0, t.attempts_allowed - used);
          return (
            <li key={t.id} className="rounded-3xl border border-black/10 bg-white/70 p-5 dark:border-white/10 dark:bg-white/[0.04]">
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-display text-lg font-bold">{t.title}</h2>
                <span className={cn('shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold', t.access === 'code' ? 'bg-violet-500/15 text-violet-700 dark:text-violet-300' : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300')}>
                  {t.access === 'code' ? 'Kod bilan' : 'Ochiq'}
                </span>
              </div>
              {t.description ? <p className="mt-2 text-[14px] text-ink-muted dark:text-stone-300">{t.description}</p> : null}
              <dl className="mt-4 grid grid-cols-3 gap-2 text-[12px]">
                <div><dt className="text-ink-muted dark:text-stone-400">Savollar</dt><dd className="font-semibold">{t.question_count}</dd></div>
                <div><dt className="text-ink-muted dark:text-stone-400">Vaqt</dt><dd className="font-semibold">{Math.round(t.time_limit_seconds / 60)} daq</dd></div>
                <div><dt className="text-ink-muted dark:text-stone-400">Urinish</dt><dd className="font-semibold">{left} / {t.attempts_allowed}</dd></div>
              </dl>
              {best ? (
                <p className="mt-3 rounded-xl bg-emerald-500/10 px-3 py-2 text-[13px] text-emerald-800 dark:text-emerald-200">
                  Eng yaxshi natija: {Math.round(best.percent ?? 0)}%{best.level_label ? ` · daraja ${best.level_label}` : ''}
                  {best.certificate_code ? ` · sertifikat ${best.certificate_code}` : ''}
                </p>
              ) : null}
              {t.kind === 'tournament' ? <TournamentBoard testId={t.id} /> : null}
              <button type="button" disabled={left === 0 && !mine.some((m) => m.test_id === t.id && m.status === 'in_progress')}
                onClick={() => setPicked(t)}
                className="mt-4 min-h-[44px] w-full rounded-2xl bg-ember-500 px-4 text-[15px] font-bold text-white transition-colors hover:bg-ember-600 disabled:cursor-not-allowed disabled:opacity-50">
                {mine.some((m) => m.test_id === t.id && m.status === 'in_progress') ? 'Davom ettirish' : left === 0 ? 'Urinishlar tugagan' : 'Boshlash'}
              </button>
            </li>
          );
        })}
      </ul>

      {picked && !attemptId ? (
        <StartForm test={picked} defaultName={currentUser?.name || ''} defaultSurname={currentUser?.surname || ''}
          onCancel={() => setPicked(null)} onStarted={(id) => setAttemptId(id)} />
      ) : null}
    </div>
  );
};

const TournamentBoard: React.FC<{ testId: string }> = ({ testId }) => {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<{ rank: number; first_name: string; last_name: string; class_name: string; percent: string; level_label: string | null }[] | null>(null);
  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next && rows === null) {
      const res = await fetch(`/api/levels/tests/${encodeURIComponent(testId)}/leaderboard`, { cache: 'no-store' });
      const d = await res.json().catch(() => ({}));
      setRows(d.leaderboard || []);
    }
  };
  return (
    <div className="mt-3">
      <button type="button" onClick={toggle} aria-expanded={open} className="min-h-[40px] text-[13px] font-semibold text-ember-600 underline dark:text-ember-300">{open ? 'Reytingni yopish' : 'Reytingni ko‘rish'}</button>
      {open ? (
        rows && rows.length ? (
          <ol className="mt-2 space-y-1 text-[13px]">
            {rows.slice(0, 10).map((r) => (
              <li key={r.rank} className="flex justify-between gap-3 rounded-lg bg-black/[0.03] px-3 py-1.5 dark:bg-white/[0.05]">
                <span>{r.rank}. {r.first_name} {r.last_name} <span className="text-ink-muted">({r.class_name})</span></span>
                <span className="font-semibold">{Math.round(Number(r.percent))}%</span>
              </li>
            ))}
          </ol>
        ) : <p className="mt-2 text-[13px] text-ink-muted">Hozircha natija yo‘q.</p>
      ) : null}
    </div>
  );
};

const StartForm: React.FC<{ test: TestRow; defaultName: string; defaultSurname: string; onCancel: () => void; onStarted: (id: string) => void }> = ({ test, defaultName, defaultSurname, onCancel, onStarted }) => {
  const [firstName, setFirstName] = useState(defaultName);
  const [lastName, setLastName] = useState(defaultSurname);
  const [className, setClassName] = useState('');
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setMsg('');
    setBusy(true);
    // Full screen must be requested inside the tap itself (Chrome and Edge refuse it after a network wait).
    if (test.require_fullscreen) enterFullscreen();
    try {
      const res = await fetch(`/api/levels/tests/${encodeURIComponent(test.id)}/start`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, className, entryCode: code || undefined })
      });
      const data = await res.json().catch(() => ({}));
      // 423 means the attempt is blocked: the runner shows the unlock screen for it.
      if (res.status === 423 && data.attemptId) {
        onStarted(data.attemptId);
        return;
      }
      if (!res.ok || !data.success) {
        setMsg(data.message || 'Boshlab bo‘lmadi.');
        return;
      }
      onStarted(data.attemptId);
    } catch {
      setMsg('Tarmoq xatosi. Qayta urinib ko‘ring.');
    } finally {
      setBusy(false);
    }
  };

  const input = 'min-h-[44px] w-full rounded-xl border border-black/10 bg-white px-3 text-[15px] dark:border-white/15 dark:bg-white/5';
  return (
    <div role="dialog" aria-modal="true" aria-label="Testni boshlash" className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-[#111827]">
        <h2 className="font-display text-xl font-bold">{test.title}</h2>
        <p className="mt-1 text-[13px] text-ink-muted dark:text-stone-300">Boshlashdan oldin ism, familiya va sinfingizni kiriting. Test to‘liq ekranda ochiladi.</p>
        <div className="mt-4 space-y-3">
          <label className="block text-[13px] font-semibold">Ism<input className={input} value={firstName} onChange={(e) => setFirstName(e.target.value)} maxLength={60} /></label>
          <label className="block text-[13px] font-semibold">Familiya<input className={input} value={lastName} onChange={(e) => setLastName(e.target.value)} maxLength={60} /></label>
          <label className="block text-[13px] font-semibold">Sinf<input className={input} value={className} onChange={(e) => setClassName(e.target.value)} maxLength={30} placeholder="masalan 9-A" /></label>
          {test.access === 'code' ? (
            <label className="block text-[13px] font-semibold">Kirish kodi<input className={input} value={code} onChange={(e) => setCode(e.target.value)} maxLength={12} inputMode="numeric" /></label>
          ) : null}
        </div>
        {msg ? <p role="alert" className="mt-3 text-[13px] text-rose-600 dark:text-rose-300">{msg}</p> : null}
        <div className="mt-5 flex gap-3">
          <button type="button" onClick={onCancel} className="min-h-[44px] flex-1 rounded-2xl border border-black/10 px-4 font-semibold dark:border-white/15">Bekor</button>
          <button type="button" disabled={busy} onClick={submit} className="min-h-[44px] flex-1 rounded-2xl bg-ember-500 px-4 font-bold text-white disabled:opacity-60">{busy ? 'Yuklanmoqda…' : 'Boshlash'}</button>
        </div>
      </div>
    </div>
  );
};

/** Full-screen exam runner. Covers the whole viewport (menu included) until the attempt is finished or expired. */
const WARN_WAIT_SEC = 5;

const AttemptRunner: React.FC<{ attemptId: string; test: TestRow; onExit: () => void }> = ({ attemptId, test, onExit }) => {
  const { currentUser } = useApp();
  const [state, setState] = useState<AttemptState | null>(null);
  const [status, setStatus] = useState<'loading' | 'in_progress' | 'blocked' | 'done' | 'error'>('loading');
  const [result, setResult] = useState<Result | null>(null);
  const [now, setNow] = useState(Date.now);
  const [index, setIndex] = useState(0);
  const [errMsg, setErrMsg] = useState('');
  const [saveWarn, setSaveWarn] = useState('');
  // Centered warning after leaving the test: "Tushundim" unlocks after 5 seconds.
  const [warn, setWarn] = useState<{ warningsLeft: number; kind: string } | null>(null);
  const [warnWait, setWarnWait] = useState(0);
  const [gate, setGate] = useState(false);
  const [flags, setFlags] = useState<string[]>([]);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [report, setReport] = useState<{ text: string; reason: string; sent: boolean; busy: boolean; failed?: boolean } | null>(null);
  const [reportedFor, setReportedFor] = useState<string[]>([]);
  const [summary, setSummary] = useState<{ unanswered: number; spentSec: number } | null>(null);
  const stateRef = useRef<AttemptState | null>(null);
  const [finishBusy, setFinishBusy] = useState(false);
  const [finishErr, setFinishErr] = useState('');
  const lastReport = useRef(0);
  const finishing = useRef(false);
  // The deadline is an absolute server time; this device's clock may differ, so the difference is measured once.
  const skew = useRef(0);
  const [fsRefused, setFsRefused] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const pendingAnswers = useRef<Record<string, number>>({});
  const saveWorker = useRef<Promise<boolean> | null>(null);
  const persistPending = useCallback(() => {
    try { localStorage.setItem(`lvl-pending-${attemptId}`, JSON.stringify(pendingAnswers.current)); } catch { /* storage may be unavailable */ }
  }, [attemptId]);
  const flushAnswers = useCallback((): Promise<boolean> => {
    if (saveWorker.current) return saveWorker.current;
    const work = async (): Promise<boolean> => {
      while (Object.keys(pendingAnswers.current).length) {
        const [qid, choice] = Object.entries(pendingAnswers.current)[0];
        setSaveWarn('Javoblar saqlanmoqda…');
        try {
          const res = await fetch(`/api/levels/attempts/${encodeURIComponent(attemptId)}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ questionId: qid, choice })
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok || !data.success) throw new Error(data.message || 'Javob saqlanmadi');
          if (pendingAnswers.current[qid] === choice) delete pendingAnswers.current[qid];
          persistPending();
        } catch {
          setSaveWarn('Javob hali serverda saqlanmadi. Internetni tekshiring; qayta uriniladi.');
          return false;
        }
      }
      setSaveWarn('');
      return true;
    };
    const promise = work().finally(() => { saveWorker.current = null; });
    saveWorker.current = promise;
    return promise;
  }, [attemptId, persistPending]);
  useEffect(() => {
    if (status !== 'in_progress') return;
    const retry = () => { if (Object.keys(pendingAnswers.current).length) void flushAnswers(); };
    const timer = window.setInterval(retry, 3000);
    window.addEventListener('online', retry);
    return () => { window.clearInterval(timer); window.removeEventListener('online', retry); };
  }, [status, flushAnswers]);

  const load = useCallback(async () => {
    const res = await fetch(`/api/levels/attempts/${encodeURIComponent(attemptId)}`, { cache: 'no-store' });
    const serverDate = Date.parse(res.headers.get('date') || '');
    if (Number.isFinite(serverDate)) skew.current = serverDate - Date.now();
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
      setErrMsg(data.message || 'Urinish yuklanmadi.');
      setStatus('error');
      return;
    }
    if (data.status === 'in_progress') {
      try {
        const saved = JSON.parse(localStorage.getItem(`lvl-pending-${attemptId}`) || '{}');
        if (saved && typeof saved === 'object') {
          for (const q of (data as AttemptState).questions) {
            const choice = saved[q.id];
            if (Number.isInteger(choice) && choice >= 0 && choice < q.options.length) pendingAnswers.current[q.id] = choice;
          }
        }
      } catch { /* ignore invalid local data */ }
      setState({ ...(data as AttemptState), answers: { ...data.answers, ...pendingAnswers.current } });
      if (Object.keys(pendingAnswers.current).length) void flushAnswers();
      setStatus('in_progress');
    } else if (data.status === 'blocked') {
      setStatus('blocked');
    } else {
      setResult(data.result || null);
      setStatus('done');
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    }
  }, [attemptId, flushAnswers]);

  useEffect(() => {
    void load().catch(() => { setErrMsg('Tarmoq xatosi. Testni qayta oching.'); setStatus('error'); });
  }, [load]);

  // Flags ("belgilash") are kept on this device only, per attempt.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(`lvl-flags-${attemptId}`);
      if (raw) setFlags(JSON.parse(raw));
    } catch { /* storage unavailable */ }
  }, [attemptId]);
  const toggleFlag = (qid: string) => {
    setFlags((f) => {
      const next = f.includes(qid) ? f.filter((x) => x !== qid) : [...f, qid];
      try { localStorage.setItem(`lvl-flags-${attemptId}`, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };

  useEffect(() => { stateRef.current = state; }, [state]);
  const requireFs = state?.requireFullscreen ?? false;

  // The test is meant to run in full screen: if the page is not (the tap's request was refused, or the attempt was
  // resumed), a centered gate asks for one tap. Violations are not counted while the gate is open.
  useEffect(() => {
    if (status !== 'in_progress' || !requireFs) return;
    setGate(!document.fullscreenElement);
    const onChange = () => { if (document.fullscreenElement) { setGate(false); setFsRefused(false); } };
    const onError = () => setFsRefused(true);
    document.addEventListener('fullscreenchange', onChange);
    document.addEventListener('fullscreenerror', onError);
    return () => { document.removeEventListener('fullscreenchange', onChange); document.removeEventListener('fullscreenerror', onError); };
  }, [status, requireFs]);

  // Clock: refresh every second; the server decides the real expiry.
  useEffect(() => {
    if (status !== 'in_progress') return;
    const tick = () => setNow(Date.now() + skew.current);
    tick();
    const t = window.setInterval(tick, 1000);
    document.addEventListener('visibilitychange', tick);
    return () => { window.clearInterval(t); document.removeEventListener('visibilitychange', tick); };
  }, [status]);

  // 5-second wait before "Tushundim" can be pressed.
  useEffect(() => {
    if (!warn) return;
    setWarnWait(WARN_WAIT_SEC);
    const t = window.setInterval(() => setWarnWait((w) => Math.max(0, w - 1)), 1000);
    return () => window.clearInterval(t);
  }, [warn]);

  const finish = useCallback(async () => {
    if (finishing.current) return;
    finishing.current = true;
    setFinishBusy(true);
    setFinishErr('');
    try {
      const saved = await flushAnswers();
      if (!saved) {
        const st = stateRef.current;
        if (!st || Date.now() + skew.current < new Date(st.deadlineAt).getTime()) throw new Error('Saqlanmagan javoblar bor. Internetni tekshirib qayta urinib ko‘ring.');
        // Deadline has passed. The server grades only acknowledged answers.
        setSaveWarn('Vaqt tugadi. Faqat serverga saqlangan javoblar baholanadi.');
      }
      const res = await fetch(`/api/levels/attempts/${encodeURIComponent(attemptId)}`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok && !data.result) throw new Error(data.message || 'Yuborib bo‘lmadi');
      const st = stateRef.current;
      if (st) {
        const left = (new Date(st.deadlineAt).getTime() - (Date.now() + skew.current)) / 1000;
        setSummary({
          unanswered: st.questions.filter((qq) => st.answers[qq.id] === undefined).length,
          spentSec: Math.min(test.time_limit_seconds, Math.max(0, test.time_limit_seconds - Math.max(0, left)))
        });
      }
      if (data.result) setResult(data.result);
      setStatus('done');
      setConfirmFinish(false);
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
      try { localStorage.removeItem(`lvl-flags-${attemptId}`); } catch { /* ignore */ }
    } catch (e) {
      // Network failure: the answers are already saved on the server; nothing is lost and the student can press again.
      setFinishErr(e instanceof Error && e.message !== 'Failed to fetch' ? e.message : 'Tarmoq xatosi. Saqlash holatini tekshirib qayta urinib ko‘ring.');
    } finally {
      finishing.current = false;
      setFinishBusy(false);
    }
  }, [attemptId, test.time_limit_seconds, flushAnswers]);

  // Time is up: finish on the server (it closes the attempt and scores it).
  useEffect(() => {
    if (status === 'in_progress' && state && now >= new Date(state.deadlineAt).getTime()) void finish();
  }, [now, status, state, finish]);

  // Violations: leaving fullscreen, hiding the tab, or losing focus. One report per event, throttled.
  useEffect(() => {
    if (status !== 'in_progress' || gate) return;
    const report = async (kind: string) => {
      const t = Date.now();
      if (t - lastReport.current < 1500) return;
      lastReport.current = t;
      try {
        const res = await fetch(`/api/levels/attempts/${encodeURIComponent(attemptId)}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event: kind })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.success) return;
        if (data.status === 'blocked' || data.blocked) {
          setStatus('blocked');
          return;
        }
        setState((s) => (s ? { ...s, violations: data.violations ?? s.violations, warningsLeft: data.warningsLeft ?? s.warningsLeft } : s));
        setWarn({ warningsLeft: data.warningsLeft ?? 0, kind });
      } catch {
        /* offline: the next event reports again */
      }
    };
    const onVis = () => { if (document.visibilityState === 'hidden') void report('hidden'); };
    const onBlur = () => { void report('blur'); };
    const onFs = () => { if (!document.fullscreenElement && requireFs) void report('fullscreen'); };
    const onBefore = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('blur', onBlur);
    document.addEventListener('fullscreenchange', onFs);
    window.addEventListener('beforeunload', onBefore);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('fullscreenchange', onFs);
      window.removeEventListener('beforeunload', onBefore);
    };
  }, [status, attemptId, requireFs, gate]);

  const choose = async (qid: string, choice: number) => {
    if (!state || finishing.current) return;
    setState((s) => s ? { ...s, answers: { ...s.answers, [qid]: choice } } : s);
    pendingAnswers.current[qid] = choice;
    persistPending();
    await flushAnswers();
  };

  // Keyboard: 1–9 / A–D choose, arrows move, F flags.
  useEffect(() => {
    if (status !== 'in_progress' || warn || gate || confirmFinish || report) return;
    const onKey = (e: KeyboardEvent) => {
      const qs = state?.questions || [];
      const q = qs[index];
      if (!q) return;
      const t = e.target as HTMLElement | null;
      if (t && /input|textarea/i.test(t.tagName)) return;
      if (e.key === 'ArrowRight') setIndex((i) => Math.min(qs.length - 1, i + 1));
      else if (e.key === 'ArrowLeft') setIndex((i) => Math.max(0, i - 1));
      else if (/^[1-9]$/.test(e.key) && Number(e.key) <= q.options.length) void choose(q.id, Number(e.key) - 1);
      else if (/^[a-dA-D]$/.test(e.key) && e.key.toUpperCase().charCodeAt(0) - 65 < q.options.length) void choose(q.id, e.key.toUpperCase().charCodeAt(0) - 65);
      else if (e.key === 'f' || e.key === 'F') toggleFlag(q.id);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, warn, gate, confirmFinish, report, state, index]);

  const REASONS = ['Savol noto‘g‘ri', 'Javob variantlari noto‘g‘ri', 'To‘g‘ri javob mavjud emas', 'Matnda xato bor', 'Rasm yoki audio ishlamayapti', 'Texnik muammo', 'Boshqa sabab'];

  const sendReport = async () => {
    if (!report || !state || report.busy) return;
    const q = state.questions[index];
    setReport({ ...report, busy: true });
    try {
      const res = await fetch('/api/support-tickets', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `[Test shikoyati] Test: ${state.title} (${test.id}) · savol ${index + 1}${q ? ` (${q.id})` : ''} · sabab: ${report.reason}${report.text.trim() ? ` · izoh: ${report.text.trim()}` : ''}`.slice(0, 3900),
          userName: [currentUser?.name, currentUser?.surname].filter(Boolean).join(' ') || 'O‘quvchi',
          userPhone: currentUser?.phone || '',
          category: 'texnik'
        })
      });
      if (!res.ok) throw new Error('send');
      setReportedFor((r) => [...r, q?.id || String(index)]);
      setReport({ text: '', reason: report.reason, sent: true, busy: false });
    } catch {
      setReport({ ...report, busy: false, failed: true });
    }
  };

  const shell = (children: React.ReactNode) => (
    createPortal(
      <div className="fixed inset-0 z-[10000] flex flex-col overflow-y-auto bg-white text-[#14161a]" data-level-runner>
        {children}
      </div>,
      document.body
    )
  );

  if (status === 'loading') return shell(<div className="m-auto flex items-center gap-3 p-6 text-slate-500"><span className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />Yuklanmoqda…</div>);
  if (status === 'error') return shell(
    <div className="m-auto max-w-sm p-6 text-center">
      <p className="text-slate-700">{errMsg}</p>
      <button onClick={onExit} className="mt-4 min-h-[44px] rounded-2xl bg-blue-600 px-5 font-semibold text-white">Orqaga</button>
    </div>
  );
  if (status === 'blocked') return <BlockedScreen attemptId={attemptId} title={test.title} onUnlocked={() => { setStatus('loading'); void load(); }} onExit={onExit} />;
  if (status === 'done') {
    const sum = summary;
    const spent = sum ? Math.max(0, Math.round(sum.spentSec)) : null;
    const advice = result?.level
      ? `Siz ${result.level} darajasiga mos natija ko‘rsatdingiz. Shu daraja grammatikasi va lug‘atini mustahkamlab, keyingi darajaga tayyorlaning.`
      : 'Natija bo‘yicha zaif mavzularni takrorlang va mashq qilib, testni qayta ishlang.';
    return shell(
      <div className="m-auto w-full max-w-lg p-6 text-center">
        <div className="lvl-rise mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600"><Check className="h-7 w-7" /></div>
        <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-slate-400">Test yakunlandi</p>
        <h2 className="mt-2 font-display text-2xl font-extrabold">{test.title}</h2>
        {result ? (
          <div className="lvl-rise mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_24px_60px_-30px_rgba(20,40,90,0.35)]">
            <p className="text-5xl font-extrabold text-blue-600">{Math.round(result.percent)}%</p>
            <p className="mt-1 text-slate-500">{result.score} / {result.maxScore} ball</p>
            {result.level ? <p className="mt-4 text-xl font-bold">Daraja: {result.level}</p> : <p className="mt-4 text-slate-500">Daraja belgilanmagan.</p>}
            <dl className="mt-5 grid grid-cols-3 gap-2 text-center text-[12.5px]">
              <div className="rounded-2xl bg-slate-50 p-3"><dt className="text-slate-500">Aniqlik</dt><dd className="mt-0.5 text-[15px] font-bold">{Math.round(result.percent)}%</dd></div>
              <div className="rounded-2xl bg-slate-50 p-3"><dt className="text-slate-500">Javobsiz</dt><dd className="mt-0.5 text-[15px] font-bold">{sum ? sum.unanswered : '—'}</dd></div>
              <div className="rounded-2xl bg-slate-50 p-3"><dt className="text-slate-500">Sarflangan vaqt</dt><dd className="mt-0.5 text-[15px] font-bold">{spent === null ? '—' : fmt(spent)}</dd></div>
            </dl>
            <p className="mt-5 rounded-2xl bg-blue-50 p-3 text-left text-[13.5px] text-blue-900">{advice}</p>
            <p className="mt-3 text-[12px] text-slate-400">Bu natija taxminiy daraja belgisi; rasmiy CEFR sertifikati emas.</p>
            {result.certificateCode ? <p className="mt-4 rounded-xl bg-emerald-500/10 p-3 text-emerald-800">Sertifikat kodi: {result.certificateCode}</p> : null}
          </div>
        ) : null}
        <button onClick={onExit} className="mt-6 min-h-[48px] w-full rounded-2xl bg-blue-600 px-5 font-bold text-white transition-transform active:scale-[0.98]">Testlarga qaytish</button>
      </div>
    );
  }

  // In progress
  const questions = state?.questions || [];
  const q = questions[index];
  const remaining = state ? (new Date(state.deadlineAt).getTime() - now) / 1000 : 0;
  const answered = Object.keys(state?.answers || {}).length;
  const unanswered = questions.map((qq, i) => ({ qq, i })).filter(({ qq }) => state?.answers[qq.id] === undefined);
  const flaggedCount = flags.filter((f) => questions.some((x) => x.id === f)).length;
  const pct = questions.length ? (answered / questions.length) * 100 : 0;
  const low = remaining < 300;
  const overlay = Boolean(warn || gate);

  const navigator = (
    <>
      <div className="grid grid-cols-6 gap-2 sm:grid-cols-8 lg:grid-cols-5">
        {questions.map((qq, i) => {
          const done = state?.answers[qq.id] !== undefined;
          const flagged = flags.includes(qq.id);
          return (
            <button key={qq.id} type="button" onClick={() => { setIndex(i); setDrawer(false); }}
              aria-label={`Savol ${i + 1}: ${done ? 'javob berilgan' : 'ishlanmagan'}${flagged ? ', belgilangan' : ''}${i === index ? ', joriy' : ''}`} aria-current={i === index ? 'step' : undefined}
              className={cn('relative h-11 rounded-xl text-[13px] font-bold transition-all',
                i === index ? 'bg-blue-600 text-white shadow-md' : done ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200' : 'border border-slate-200 bg-white text-slate-500',
                flagged && 'ring-2 ring-amber-400')}>
              {i + 1}
              {done && i !== index ? <Check className="absolute right-0.5 top-0.5 h-3 w-3 text-emerald-600" aria-hidden /> : null}
              {flagged ? <Flag className="absolute -right-1 -top-1 h-3.5 w-3.5 fill-amber-400 text-amber-500" aria-hidden /> : null}
            </button>
          );
        })}
      </div>
      <ul className="mt-4 space-y-1.5 text-[12.5px] text-slate-500">
        <li className="flex items-center gap-2"><i className="inline-block h-3 w-3 rounded bg-blue-600" />Joriy savol</li>
        <li className="flex items-center gap-2"><i className="inline-block h-3 w-3 rounded bg-emerald-100 ring-1 ring-emerald-300" />Javob berilgan: <b className="text-slate-700">{answered}</b></li>
        <li className="flex items-center gap-2"><i className="inline-block h-3 w-3 rounded border border-slate-300" />Ishlanmagan: <b className="text-slate-700">{unanswered.length}</b></li>
        <li className="flex items-center gap-2"><Flag className="h-3 w-3 fill-amber-400 text-amber-500" />Belgilangan: <b className="text-slate-700">{flaggedCount}</b></li>
      </ul>
    </>
  );

  return shell(
    <>
      <div className={cn('flex min-h-0 flex-1 flex-col transition-[filter] duration-300', overlay && 'pointer-events-none select-none blur-[6px]')} aria-hidden={overlay}>
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-600 font-display text-[12px] font-extrabold text-white">EL</span>
              <div className="min-w-0">
                <p className="truncate text-[14px] font-bold">{state?.title}</p>
                <p className="text-[12px] text-slate-500">Savol {index + 1} / {questions.length}<span className="hidden sm:inline"> · javob berilgan {answered}</span></p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {requireFs ? (
                <span className={cn('hidden items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold sm:inline-flex', gate ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700')}>
                  <Maximize2 className="h-3.5 w-3.5" />{gate ? 'To‘liq ekran o‘chiq' : 'To‘liq ekran'}
                </span>
              ) : null}
              <div role="timer" aria-label="Qolgan vaqt" className={cn('flex items-center gap-2 rounded-2xl border px-3.5 py-2 font-mono text-[16px] font-bold tabular-nums transition-colors', low ? 'animate-pulse border-rose-300 bg-rose-50 text-rose-700' : 'border-slate-200 bg-slate-50')}>
                <Clock className="h-4 w-4" />{fmt(remaining)}
              </div>
            </div>
          </div>
          <div className="h-1 w-full bg-slate-100"><div className="h-full bg-blue-600 transition-[width] duration-500" style={{ width: `${pct}%` }} /></div>
        </header>

        <div className="mx-auto flex w-full max-w-[1040px] flex-1 gap-6 px-4 pb-28 pt-5 sm:px-6 lg:pb-8">
          <main className="min-w-0 flex-1 lg:max-w-[720px]">
            {saveWarn ? <p role="alert" className="mb-3 rounded-xl bg-amber-50 px-4 py-2.5 text-[13px] text-amber-800">{saveWarn}</p> : null}
            {q ? (
              <section key={q.id} className="lvl-rise rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_24px_60px_-34px_rgba(20,40,90,0.35)] sm:p-7">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-[12px] font-bold text-blue-700">Savol {index + 1}</span>
                  <div className="flex gap-1.5">
                    <button type="button" onClick={() => toggleFlag(q.id)} aria-pressed={flags.includes(q.id)} title="Keyinroq ko‘rib chiqish uchun belgilash (F)"
                      className={cn('inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border px-3 text-[12.5px] font-semibold transition-colors', flags.includes(q.id) ? 'border-amber-300 bg-amber-50 text-amber-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50')}>
                      <Flag className="h-3.5 w-3.5" />{flags.includes(q.id) ? 'Belgilangan' : 'Keyin ko‘rish'}
                    </button>
                    <button type="button" onClick={() => setReport({ text: '', reason: REASONS[0], sent: false, busy: false })} title="Savolda xato bo‘lsa shikoyat yuboring"
                      className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-slate-200 px-3 text-[12.5px] font-semibold text-slate-600 transition-colors hover:bg-slate-50">
                      <MessageSquareWarning className="h-3.5 w-3.5" />Shikoyat bildirish
                    </button>
                  </div>
                </div>
                <h3 className="whitespace-pre-line font-display text-[1.2rem] font-bold leading-snug sm:text-[1.4rem]">{q.prompt}</h3>
                <div role="radiogroup" aria-label={`Savol ${index + 1} javoblari`} className="mt-5 grid gap-3">
                  {q.options.map((opt, i) => {
                    const picked = state?.answers[q.id] === i;
                    return (
                      <button key={i} type="button" role="radio" aria-checked={picked} onClick={() => { if (!picked) void choose(q.id, i); }}
                        className={cn('group flex min-h-[58px] items-center gap-3 rounded-2xl border px-4 py-3 text-left text-[15.5px] transition-all duration-200 active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600',
                          picked ? 'border-blue-600 bg-blue-50 shadow-[0_10px_26px_-16px_rgba(37,99,235,0.8)]' : 'border-slate-200 bg-white hover:-translate-y-px hover:border-blue-300 hover:bg-slate-50')}>
                        <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px] font-bold transition-colors', picked ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-blue-100')}>{String.fromCharCode(65 + i)}</span>
                        <span className="min-w-0 flex-1 break-words">{opt}</span>
                        {picked ? <Check className="h-4 w-4 shrink-0 text-blue-600" aria-hidden /> : null}
                      </button>
                    );
                  })}
                </div>
              </section>
            ) : null}
          </main>

          <aside className="hidden w-[280px] shrink-0 lg:block" aria-label="Savollar navigatori">
            <div className="sticky top-24 rounded-3xl border border-slate-200 bg-white p-5">
              <h2 className="mb-3 text-[13px] font-bold uppercase tracking-[0.12em] text-slate-400">Savollar</h2>
              {navigator}
            </div>
          </aside>
        </div>

        <footer className="fixed inset-x-0 bottom-0 z-10 border-t border-slate-200 bg-white/95 backdrop-blur lg:sticky">
          <div className="mx-auto flex w-full max-w-6xl gap-2 px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:gap-3 sm:px-6">
            <button type="button" aria-label="Oldingi savol" disabled={index === 0} onClick={() => setIndex((i) => Math.max(0, i - 1))} className="inline-flex min-h-[50px] w-[52px] flex-none items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white font-semibold transition-transform active:scale-[0.98] disabled:opacity-40 sm:w-auto sm:flex-1"><ArrowLeft className="h-4 w-4" /><span className="hidden sm:inline">Oldingi</span></button>
            <button type="button" onClick={() => setDrawer(true)} className="inline-flex min-h-[50px] flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 font-semibold lg:hidden">
              <span className="text-[13px]">Savollar</span><span className="rounded-full bg-slate-100 px-2 py-0.5 text-[12px]">{answered}/{questions.length}</span>
            </button>
            {index < questions.length - 1 ? (
              <button type="button" aria-label="Keyingi savol" onClick={() => setIndex((i) => i + 1)} className="inline-flex min-h-[50px] w-[52px] flex-none items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white font-semibold transition-transform active:scale-[0.98] sm:w-auto sm:flex-1"><span className="hidden sm:inline">Keyingi</span><ArrowRight className="h-4 w-4" /></button>
            ) : null}
            <button type="button" onClick={() => setConfirmFinish(true)} className="min-h-[50px] flex-[1.35] whitespace-nowrap rounded-2xl bg-blue-600 px-3 text-[15px] font-bold text-white shadow-[0_12px_28px_-14px_rgba(37,99,235,0.9)] transition-transform active:scale-[0.98] sm:flex-1">Yakunlash</button>
          </div>
        </footer>
      </div>

      {/* Mobile question navigator (drawer) */}
      {drawer ? (
        <div role="dialog" aria-modal="true" aria-label="Savollar" className="lvl-fade fixed inset-0 z-[10005] flex items-end bg-slate-900/40 lg:hidden" onClick={() => setDrawer(false)}>
          <div className="lvl-rise max-h-[75vh] w-full overflow-y-auto rounded-t-[28px] bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-slate-200" />
            <h2 className="mb-3 text-[13px] font-bold uppercase tracking-[0.12em] text-slate-400">Savollar</h2>
            {navigator}
            <button type="button" onClick={() => setDrawer(false)} className="mt-5 min-h-[48px] w-full rounded-2xl border border-slate-200 font-semibold">Yopish</button>
          </div>
        </div>
      ) : null}

      {/* Left the test: centered warning, "Tushundim" unlocks after 5 seconds */}
      {warn ? (
        <div role="alertdialog" aria-modal="true" aria-label="Ogohlantirish" className="lvl-fade fixed inset-0 z-[10010] flex items-center justify-center bg-slate-900/45 p-4">
          <div className="lvl-pop w-full max-w-md rounded-[28px] bg-white p-7 text-center shadow-[0_40px_90px_-30px_rgba(0,0,0,0.55)]">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-600"><AlertTriangle className="h-7 w-7" /></div>
            <h2 className="mt-4 font-display text-xl font-extrabold">Diqqat!</h2>
            <p className="mt-2 text-[14.5px] leading-relaxed text-slate-600">
              {warn.kind === 'fullscreen'
                ? 'Siz to‘liq ekran rejimidan chiqdingiz. Testni davom ettirish uchun ogohlantirish bilan tanishing va to‘liq ekran rejimiga qayting.'
                : 'Siz test oynasidan chiqdingiz. Testni davom ettirish uchun ogohlantirish bilan tanishing va test oynasiga qayting.'}
            </p>
            <p className="mt-2 text-[13.5px] text-slate-500">Qolgan ogohlantirish: <b>{warn.warningsLeft}</b>. Keyingi chiqishda test bloklanadi.</p>
            <p className="mt-3 flex items-center justify-center gap-2 font-mono text-[15px] font-bold tabular-nums"><Clock className="h-4 w-4" />Qolgan vaqt: {fmt(remaining)}</p>
            <button type="button" disabled={warnWait > 0}
              onClick={() => { setWarn(null); if (requireFs) void enterFullscreen().then((ok) => { if (!ok) { setFsRefused(true); setGate(true); } }); }}
              className="mt-6 min-h-[52px] w-full rounded-2xl bg-blue-600 text-[16px] font-bold text-white transition-all disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400">
              {warnWait > 0 ? `Tushundim (${warnWait})` : 'Tushundim'}
            </button>
          </div>
        </div>
      ) : null}

      {/* Full-screen gate (one tap enters full screen; it never traps the student if the browser refuses) */}
      {gate && !warn ? (
        <div role="dialog" aria-modal="true" aria-label="To‘liq ekran" className="lvl-fade fixed inset-0 z-[10010] flex items-center justify-center bg-white/70 p-4">
          <div className="lvl-pop w-full max-w-md rounded-[28px] bg-white p-7 text-center shadow-[0_40px_90px_-30px_rgba(0,0,0,0.45)] ring-1 ring-slate-200">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-600"><Maximize2 className="h-7 w-7" /></div>
            <h2 className="mt-4 font-display text-xl font-extrabold">Test to‘liq ekranda ishlanadi</h2>
            <p className="mt-2 text-[14.5px] text-slate-600">Chrome va Edge’da to‘liq ekranga o‘tish uchun bir marta bosing. Test davomida boshqa oynaga o‘tmang.</p>
            {fsRefused ? <p role="alert" className="mt-3 rounded-xl bg-amber-50 p-3 text-[13px] text-amber-800">Brauzer to‘liq ekranga ruxsat bermadi. Qayta urinib ko‘ring yoki «Davom etish» ni bosing; chiqishlar baribir hisoblanadi.</p> : null}
            <button type="button" onClick={() => { void enterFullscreen().then((ok) => { if (ok) setGate(false); else setFsRefused(true); }); }} className="mt-6 min-h-[52px] w-full rounded-2xl bg-blue-600 text-[16px] font-bold text-white transition-transform active:scale-[0.98]">To‘liq ekranda boshlash</button>
            {fsRefused ? <button type="button" onClick={() => setGate(false)} className="mt-3 min-h-[48px] w-full rounded-2xl border border-slate-200 font-semibold">To‘liq ekransiz davom etish</button> : null}
          </div>
        </div>
      ) : null}

      {/* Finish confirmation with the list of unanswered questions */}
      {confirmFinish ? (
        <div role="dialog" aria-modal="true" aria-label="Testni yakunlash" className="lvl-fade fixed inset-0 z-[10010] flex items-center justify-center bg-slate-900/45 p-4">
          <div className="lvl-pop max-h-[90vh] w-full max-w-md overflow-y-auto rounded-[28px] bg-white p-7 shadow-[0_40px_90px_-30px_rgba(0,0,0,0.55)]">
            <h2 className="font-display text-xl font-extrabold">Testni yakunlaysizmi?</h2>
            <dl className="mt-4 grid grid-cols-2 gap-2 text-[13px]">
              <div className="rounded-2xl bg-slate-50 p-3"><dt className="text-slate-500">Jami savollar</dt><dd className="text-[17px] font-bold">{questions.length}</dd></div>
              <div className="rounded-2xl bg-emerald-50 p-3"><dt className="text-emerald-700">Javob berilgan</dt><dd className="text-[17px] font-bold text-emerald-800">{answered}</dd></div>
              <div className="rounded-2xl bg-slate-50 p-3"><dt className="text-slate-500">Javob berilmagan</dt><dd className="text-[17px] font-bold">{unanswered.length}</dd></div>
              <div className="rounded-2xl bg-amber-50 p-3"><dt className="text-amber-700">Belgilangan</dt><dd className="text-[17px] font-bold text-amber-800">{flaggedCount}</dd></div>
            </dl>
            <p className="mt-3 flex items-center gap-2 text-[13.5px] text-slate-600"><Clock className="h-4 w-4" />Qolgan vaqt: <b className="font-mono">{fmt(remaining)}</b></p>
            {unanswered.length ? (
              <div className="mt-4 rounded-2xl bg-amber-50 p-3">
                <p className="text-[13px] font-semibold text-amber-900">Ishlanmagan savollar:</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {unanswered.map(({ qq, i }) => (
                    <button key={qq.id} type="button" onClick={() => { setIndex(i); setConfirmFinish(false); }} className="h-10 min-w-10 rounded-lg border border-amber-300 bg-white px-2 text-[13px] font-bold text-amber-900">{i + 1}</button>
                  ))}
                </div>
              </div>
            ) : null}
            <p className="mt-4 text-[13px] text-slate-500">Yakunlagandan keyin javoblarni o‘zgartirib bo‘lmaydi.</p>
            <div className="mt-5 flex gap-3">
              <button type="button" onClick={() => setConfirmFinish(false)} className="min-h-[50px] flex-1 rounded-2xl border border-slate-200 font-semibold">Testga qaytish</button>
              <button type="button" disabled={finishBusy} onClick={() => void finish()} className="min-h-[50px] flex-1 rounded-2xl bg-blue-600 font-bold text-white disabled:opacity-60">{finishBusy ? 'Yuborilmoqda…' : 'Yakunlash'}</button>
            </div>
            {finishErr ? <p role="alert" className="mt-3 text-[13px] text-rose-600">{finishErr}</p> : null}
          </div>
        </div>
      ) : null}

      {/* Complaint about a question */}
      {report ? (
        <div role="dialog" aria-modal="true" aria-label="Shikoyat" className="lvl-fade fixed inset-0 z-[10010] flex items-center justify-center bg-slate-900/45 p-4">
          <div className="lvl-pop max-h-[92vh] w-full max-w-md overflow-y-auto rounded-[28px] bg-white p-7 shadow-[0_40px_90px_-30px_rgba(0,0,0,0.55)]">
            <div className="flex items-center gap-2"><ShieldAlert className="h-5 w-5 text-blue-600" /><h2 className="font-display text-xl font-extrabold">Shikoyat bildirish</h2></div>
            {report.sent ? (
              <>
                <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-[14px] text-emerald-800">Shikoyatingiz yuborildi. Rahmat! Ustoz ko‘rib chiqadi. Javoblaringiz saqlangan, vaqt to‘xtamaydi.</p>
                <button type="button" onClick={() => setReport(null)} className="mt-5 min-h-[50px] w-full rounded-2xl bg-blue-600 font-bold text-white">Testga qaytish</button>
              </>
            ) : (
              <>
                <p className="mt-2 text-[13.5px] text-slate-600">Savol {index + 1} bo‘yicha sababni tanlang. Test vaqti to‘xtamaydi.</p>
                {reportedFor.includes(q?.id || String(index)) ? <p className="mt-2 rounded-xl bg-amber-50 p-2.5 text-[12.5px] text-amber-800">Bu savol uchun shikoyat allaqachon yuborilgan. Yana yuborishingiz mumkin, lekin takrorlamang.</p> : null}
                <div role="radiogroup" aria-label="Shikoyat sababi" className="mt-3 grid gap-2">
                  {REASONS.map((r) => (
                    <button key={r} type="button" role="radio" aria-checked={report.reason === r} onClick={() => setReport({ ...report, reason: r })}
                      className={cn('min-h-[44px] rounded-xl border px-3 text-left text-[14px] transition-colors', report.reason === r ? 'border-blue-600 bg-blue-50 font-semibold text-blue-800' : 'border-slate-200 hover:bg-slate-50')}>{r}</button>
                  ))}
                </div>
                <textarea value={report.text} onChange={(e) => setReport({ ...report, text: e.target.value.slice(0, 1000) })} rows={3} placeholder="Qo‘shimcha izoh (ixtiyoriy)" aria-label="Qo‘shimcha izoh"
                  className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-[15px] outline-none focus:border-blue-500" />
                {report.failed ? <p role="alert" className="mt-2 text-[13px] text-rose-600">Yuborib bo‘lmadi (tarmoq). Javoblaringiz saqlangan; qayta urinib ko‘ring.</p> : null}
                <div className="mt-4 flex gap-3">
                  <button type="button" onClick={() => setReport(null)} className="min-h-[50px] flex-1 rounded-2xl border border-slate-200 font-semibold">Bekor</button>
                  <button type="button" disabled={report.busy} onClick={() => void sendReport()} className="min-h-[50px] flex-1 rounded-2xl bg-blue-600 font-bold text-white disabled:opacity-50">{report.busy ? 'Yuborilmoqda…' : 'Yuborish'}</button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
};

const BlockedScreen: React.FC<{ attemptId: string; title: string; onUnlocked: () => void; onExit: () => void }> = ({ attemptId, title, onUnlocked, onExit }) => {
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    setMsg('');
    try {
      const res = await fetch(`/api/levels/attempts/${encodeURIComponent(attemptId)}/unlock`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) { setMsg(data.message || 'Kod noto‘g‘ri.'); return; }
      onUnlocked();
    } finally {
      setBusy(false);
    }
  };
  return (
    createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center overflow-y-auto bg-[#fbfaf7] p-6 text-[#1b1a17]">
      <div className="w-full max-w-sm text-center">
        <p className="text-[13px] uppercase tracking-[0.16em] text-rose-600">Test bloklandi</p>
        <h2 className="mt-2 font-display text-2xl font-extrabold">{title}</h2>
        <p className="mt-3 text-[14px] text-[#6b665e]">Ogohlantirish limiti tugadi. Davom etish uchun ustozingizdan kod oling.</p>
        <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" placeholder="6 xonali kod"
          aria-label="Ochish kodi" className="mt-5 min-h-[52px] w-full rounded-2xl border border-black/10 bg-white px-4 text-center font-mono text-2xl tracking-[0.3em]" />
        {msg ? <p role="alert" className="mt-3 text-[14px] text-rose-600">{msg}</p> : null}
        <button type="button" disabled={busy || code.length !== 6} onClick={submit} className="mt-4 min-h-[48px] w-full rounded-2xl bg-ember-500 font-bold text-white disabled:opacity-50">Kodni tasdiqlash</button>
        <button type="button" onClick={onExit} className="mt-3 min-h-[44px] w-full rounded-2xl border border-black/10 bg-white font-semibold">Orqaga</button>
      </div>
    </div>,
      document.body
    )
  );
};
