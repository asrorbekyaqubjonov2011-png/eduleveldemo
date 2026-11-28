'use client';
import React, { useCallback, useEffect, useState } from 'react';
import { field, label } from '../ui/styles';

type Test = {
  id: string; kind: 'test' | 'tournament'; title: string; description: string; access: 'open' | 'code'; status: 'draft' | 'published' | 'closed';
  time_limit_seconds: number; attempts_allowed: number; grading_rules: { min: number; max: number; level: string; certificate?: boolean }[];
  certificate_enabled: boolean; shuffle_questions: boolean; require_fullscreen: boolean; max_violations: number; has_entry_code: boolean;
  question_count: number; attempt_count: number; active_count: number;
  entry_code?: string | null;
};
type Question = { id: string; prompt: string; options: string[]; correct_index: number; points: number };
type Attempt = {
  id: string; first_name: string; last_name: string; class_name: string; status: string; attempt_no: number; percent: string | null;
  level_label: string | null; violations: number; blocked_at: string | null; has_unlock_code: boolean; started_at: string; finished_at: string | null;
  certificate_code: string | null; score: number | null; max_score: number | null;
  unlock_code?: string | null;
};

const api = async <T,>(url: string, init?: RequestInit): Promise<T & { success: boolean; message?: string }> => {
  const res = await fetch(url, { cache: 'no-store', ...init, headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) throw new Error(data.message || 'Xatolik yuz berdi.');
  return data;
};

const STATUS_UZ: Record<string, string> = { draft: 'Qoralama', published: 'Nashr qilingan', closed: 'Yopilgan', in_progress: 'Ishlamoqda', blocked: 'Bloklangan', finished: 'Yakunlangan', expired: 'Vaqti tugagan', abandoned: 'Tashlab ketilgan' };

/** Owner panel: create and run level tests and tournaments, add questions (form or TXT/DOCX), follow attempts, unlock blocked students, download reports. */
/** Owner asks the AI for a written report. The numbers come from the database; the AI writes the text around them. */
const AiReportBox: React.FC<{ testId?: string }> = ({ testId }) => {
  const [question, setQuestion] = useState('');
  const [busy, setBusy] = useState(false);
  const [answer, setAnswer] = useState('');
  const [err, setErr] = useState('');
  const ask = async () => {
    setBusy(true);
    setErr('');
    setAnswer('');
    try {
      const res = await fetch('/api/levels/owner/ai-report', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testId, question: question || undefined })
      });
      const d = await res.json().catch(() => ({}));
      if (d.answer) setAnswer(d.answer);
      else setErr(d.message || 'Hisobot tayyorlanmadi.');
      if (!d.answer && d.summary) setAnswer(d.summary);
    } catch {
      setErr('Tarmoq xatosi.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="rounded-3xl border border-black/10 p-5 dark:border-white/10">
      <h3 className="font-semibold">AI hisobot</h3>
      <p className="mt-1 text-[12px] text-ink-muted">Raqamlar bazadan olinadi, AI faqat matnni yozadi. Xohlasangiz savol yozing.</p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input className={field} value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Masalan: qaysi sinf eng yaxshi natija ko‘rsatdi?" maxLength={500} />
        <button type="button" disabled={busy} onClick={ask} className="min-h-[44px] rounded-2xl bg-ember-500 px-5 font-semibold text-white disabled:opacity-60">{busy ? 'Tayyorlanmoqda…' : 'Hisobot yozdirish'}</button>
      </div>
      {err ? <p role="alert" className="mt-3 text-[13px] text-rose-600">{err}</p> : null}
      {answer ? <pre className="mt-3 whitespace-pre-wrap rounded-2xl bg-black/[0.04] p-4 text-[13px] leading-relaxed dark:bg-white/[0.05]">{answer}</pre> : null}
    </section>
  );
};

export const LevelTestsManager: React.FC = () => {
  const [tests, setTests] = useState<Test[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api<{ tests: Test[] }>('/api/levels/owner');
      setTests(data.tests || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Yuklab bo‘lmadi.');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const current = tests.find((t) => t.id === selected) || null;

  if (current) {
    return <TestDetail key={current.id} test={current} onBack={() => { setSelected(null); void load(); }} onChanged={load} />;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold">Levelni aniqlash va turnirlar</h2>
          <p className="text-[13px] text-ink-muted dark:text-stone-300">Testlar, kodli turnirlar, savollar, natijalar va hisobotlar.</p>
        </div>
        <button type="button" onClick={() => setCreating(true)} className="min-h-[44px] rounded-2xl bg-ember-500 px-5 font-bold text-white">Yangi test</button>
      </div>
      {error ? <p role="alert" className="rounded-xl bg-rose-500/10 px-4 py-3 text-[14px] text-rose-700">{error}</p> : null}
      {notice ? <p role="status" className="rounded-xl bg-emerald-500/10 px-4 py-3 text-[14px] text-emerald-700">{notice}</p> : null}
      <AiReportBox />
      {creating ? <CreateForm onDone={(id, code) => { setCreating(false); if (code) setNotice(`Kirish kodi: ${code} (faqat hozir ko‘rinadi, saqlab qo‘ying)`); setSelected(id); void load(); }} onCancel={() => setCreating(false)} /> : null}
      <ul className="grid gap-3 sm:grid-cols-2">
        {tests.map((t) => (
          <li key={t.id}>
            <button type="button" onClick={() => setSelected(t.id)} className="w-full rounded-2xl border border-black/10 bg-white/70 p-4 text-left hover:bg-white dark:border-white/10 dark:bg-white/[0.04]">
              <div className="flex items-start justify-between gap-2">
                <span className="font-semibold">{t.title}</span>
                <span className="rounded-full bg-black/5 px-2 py-0.5 text-[11px] font-bold dark:bg-white/10">{t.kind === 'tournament' ? 'Turnir' : 'Test'} · {STATUS_UZ[t.status]}</span>
              </div>
              <p className="mt-2 text-[12px] text-ink-muted dark:text-stone-300">{t.question_count} savol · {t.attempt_count} urinish · hozir {t.active_count} ishlamoqda · {t.access === 'code' ? 'kod bilan' : 'ochiq'}</p>
            </button>
          </li>
        ))}
      </ul>
      {!tests.length && !creating ? <p className="rounded-2xl border border-dashed border-black/15 p-6 text-center text-[14px] text-ink-muted">Hozircha test yo‘q. «Yangi test» tugmasini bosing.</p> : null}
    </div>
  );
};

const CreateForm: React.FC<{ onDone: (id: string, code: string | null) => void; onCancel: () => void }> = ({ onDone, onCancel }) => {
  const [kind, setKind] = useState<'test' | 'tournament'>('test');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [access, setAccess] = useState<'open' | 'code'>('open');
  const [minutes, setMinutes] = useState(30);
  const [attempts, setAttempts] = useState(1);
  const [maxViolations, setMaxViolations] = useState(2);
  const [fullscreen, setFullscreen] = useState(true);
  const [certificate, setCertificate] = useState(false);
  const [rules, setRules] = useState('0-39:A1\n40-69:B1\n70-100:C1:cert');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setMsg('');
    try {
      const data = await api<{ id: string; entryCode: string | null }>('/api/levels/owner', {
        method: 'POST',
        body: JSON.stringify({
          kind, title, description, access, timeLimitSeconds: minutes * 60, attemptsAllowed: attempts, maxViolations,
          requireFullscreen: fullscreen, certificateEnabled: certificate, gradingRules: parseRules(rules)
        })
      });
      onDone(data.id, data.entryCode);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Saqlab bo‘lmadi.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-3xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-[#111827]">
      <h3 className="font-display text-lg font-bold">Yangi test yoki turnir</h3>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className={label}>Turi
          <select className={field} value={kind} onChange={(e) => setKind(e.target.value as 'test' | 'tournament')}><option value="test">Test (levelni aniqlash)</option><option value="tournament">Turnir</option></select>
        </label>
        <label className={label}>Kirish
          <select className={field} value={access} onChange={(e) => setAccess(e.target.value as 'open' | 'code')}><option value="open">Ochiq</option><option value="code">Kod bilan (yopiq)</option></select>
        </label>
        <label className={`${label} sm:col-span-2`}>Nomi<input className={field} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={160} /></label>
        <label className={`${label} sm:col-span-2`}>Tavsif<textarea className={field} rows={2} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} /></label>
        <label className={label}>Vaqt (daqiqa)<input type="number" className={field} min={1} max={240} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} /></label>
        <label className={label}>Urinishlar soni<input type="number" className={field} min={1} max={10} value={attempts} onChange={(e) => setAttempts(Number(e.target.value))} /></label>
        <label className={label}>Ogohlantirish limiti<input type="number" className={field} min={0} max={10} value={maxViolations} onChange={(e) => setMaxViolations(Number(e.target.value))} /></label>
        <label className="flex min-h-[44px] items-center gap-3 text-[14px] font-semibold"><input type="checkbox" checked={fullscreen} onChange={(e) => setFullscreen(e.target.checked)} /> To‘liq ekran majburiy</label>
        <label className="flex min-h-[44px] items-center gap-3 text-[14px] font-semibold"><input type="checkbox" checked={certificate} onChange={(e) => setCertificate(e.target.checked)} /> Sertifikat berilsin</label>
        <label className={`${label} sm:col-span-2`}>Daraja qoidalari (har qator: min-max:daraja, sertifikat uchun oxiriga :cert)
          <textarea className={`${field} font-mono`} rows={4} value={rules} onChange={(e) => setRules(e.target.value)} />
        </label>
      </div>
      {msg ? <p role="alert" className="mt-3 text-[13px] text-rose-600">{msg}</p> : null}
      <div className="mt-5 flex gap-3">
        <button type="button" onClick={onCancel} className="min-h-[44px] flex-1 rounded-2xl border border-black/10 font-semibold">Bekor</button>
        <button type="button" disabled={busy || !title.trim()} onClick={submit} className="min-h-[44px] flex-1 rounded-2xl bg-ember-500 font-bold text-white disabled:opacity-50">Yaratish</button>
      </div>
    </div>
  );
};

/** "min-max:level[:cert]" per line → rule objects. Invalid lines are passed through and the server rejects them with a message. */
export function parseRules(text: string) {
  return text.split('\n').map((l) => l.trim()).filter(Boolean).map((line) => {
    const m = line.match(/^(\d+)\s*-\s*(\d+)\s*:\s*(.+)$/);
    if (!m) return { min: NaN, max: NaN, level: line, certificate: false };
    const parts = m[3].split(':').map((s) => s.trim());
    const cert = parts[parts.length - 1]?.toLowerCase() === 'cert';
    const level = (cert ? parts.slice(0, -1) : parts).join(':');
    return { min: Number(m[1]), max: Number(m[2]), level, certificate: cert };
  });
}

/** Start and end of the test window (local time in the form, ISO on the server). */
const ScheduleBox: React.FC<{ test: Test; onSaved: () => void; onMsg: (m: string) => void }> = ({ test, onSaved, onMsg }) => {
  const toLocal = (iso: string | null | undefined) => {
    if (!iso) return '';
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  const [starts, setStarts] = useState(toLocal((test as any).starts_at));
  const [ends, setEnds] = useState(toLocal((test as any).ends_at));
  const save = async () => {
    try {
      await api(`/api/levels/owner/${encodeURIComponent(test.id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ startsAt: starts ? new Date(starts).toISOString() : null, endsAt: ends ? new Date(ends).toISOString() : null })
      });
      onMsg('Vaqt saqlandi.');
      onSaved();
    } catch (e) { onMsg(e instanceof Error ? e.message : 'Saqlanmadi.'); }
  };
  return (
    <section className="rounded-3xl border border-black/10 p-5 dark:border-white/10">
      <h3 className="font-semibold">Ochilish oynasi</h3>
      <p className="mt-1 text-[12px] text-ink-muted">Bo‘sh qoldirilsa, test nashr qilinganda darhol ochiq bo‘ladi va muddati cheklanmaydi.</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className={label}>Boshlanish<input type="datetime-local" className={field} value={starts} onChange={(e) => setStarts(e.target.value)} /></label>
        <label className={label}>Tugash<input type="datetime-local" className={field} value={ends} onChange={(e) => setEnds(e.target.value)} /></label>
      </div>
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={save} className="min-h-[40px] rounded-xl bg-ember-500 px-4 font-semibold text-white">Saqlash</button>
        <button type="button" onClick={() => { setStarts(''); setEnds(''); }} className="min-h-[40px] rounded-xl border border-black/10 px-4 font-semibold">Tozalash</button>
      </div>
    </section>
  );
};

/** Inline editor for one question (owner). */
const QuestionEditor: React.FC<{ q: Question; testId: string; onDone: () => void; onMsg: (m: string) => void }> = ({ q, testId, onDone, onMsg }) => {
  const [prompt, setPrompt] = useState(q.prompt);
  const [options, setOptions] = useState(q.options.join('\n'));
  const [correct, setCorrect] = useState(q.correct_index + 1);
  const [points, setPoints] = useState(q.points);
  const save = async () => {
    try {
      await api(`/api/levels/owner/${encodeURIComponent(testId)}/questions`, {
        method: 'PUT',
        body: JSON.stringify({ questionId: q.id, prompt, options: options.split('\n').map((x) => x.trim()).filter(Boolean), correctIndex: correct - 1, points })
      });
      onMsg('Savol saqlandi.');
      onDone();
    } catch (e) { onMsg(e instanceof Error ? e.message : 'Saqlanmadi.'); }
  };
  return (
    <div className="mt-2 space-y-2 rounded-xl bg-black/[0.03] p-3 dark:bg-white/[0.04]">
      <textarea className={field} rows={2} value={prompt} onChange={(e) => setPrompt(e.target.value)} />
      <textarea className={`${field} font-mono`} rows={4} value={options} onChange={(e) => setOptions(e.target.value)} />
      <div className="flex flex-wrap items-center gap-3 text-[13px]">
        <label>To‘g‘ri variant (1 dan)<input type="number" min={1} className={`${field} mt-1 w-24`} value={correct} onChange={(e) => setCorrect(Number(e.target.value))} /></label>
        <label>Ball<input type="number" min={1} max={100} className={`${field} mt-1 w-24`} value={points} onChange={(e) => setPoints(Number(e.target.value))} /></label>
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={save} className="min-h-[40px] rounded-xl bg-ember-500 px-4 font-semibold text-white">Saqlash</button>
        <button type="button" onClick={onDone} className="min-h-[40px] rounded-xl border border-black/10 px-4 font-semibold">Bekor</button>
      </div>
    </div>
  );
};

const TestDetail: React.FC<{ test: Test; onBack: () => void; onChanged: () => void }> = ({ test, onBack, onChanged }) => {
  const [full, setFull] = useState<{ test: Test; questions: Question[] } | null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [filter, setFilter] = useState<'' | 'in_progress' | 'blocked' | 'finished'>('');
  const [msg, setMsg] = useState('');
  const [code, setCode] = useState<{ label: string; value: string } | null>(null);
  const [q, setQ] = useState({ prompt: '', options: 'A\nB\nC\nD', correct: 0 });
  const [importPreview, setImportPreview] = useState<{ count: number; errors: { line: number; message: string }[]; file: File } | null>(null);
  const [editingQ, setEditingQ] = useState<string | null>(null);
  const [classFilter, setClassFilter] = useState('');

  const loadDetail = useCallback(async () => {
    try {
      const d = await api<{ test: Test; questions: Question[] }>(`/api/levels/owner/${encodeURIComponent(test.id)}`);
      setFull({ test: d.test, questions: d.questions });
    } catch (e) { setMsg(e instanceof Error ? e.message : ''); }
  }, [test.id]);

  const loadAttempts = useCallback(async () => {
    try {
      const d = await api<{ attempts: Attempt[] }>(`/api/levels/owner/${encodeURIComponent(test.id)}/attempts${filter ? `?status=${filter}` : ''}`);
      setAttempts(d.attempts || []);
    } catch (e) { setMsg(e instanceof Error ? e.message : ''); }
  }, [test.id, filter]);

  useEffect(() => { void loadDetail(); }, [loadDetail]);
  useEffect(() => {
    void loadAttempts();
    const t = window.setInterval(() => void loadAttempts(), 10000);
    return () => window.clearInterval(t);
  }, [loadAttempts]);

  const duplicate = async () => {
    try {
      const d = await api<{ id: string; questions: number }>(`/api/levels/owner/${encodeURIComponent(test.id)}/duplicate`, { method: 'POST' });
      setMsg(`Nusxa yaratildi (${d.questions} savol). Ro‘yxatdan oching.`);
      onChanged();
    } catch (e) { setMsg(e instanceof Error ? e.message : ''); }
  };

  const deleteAttempt = async (attemptId: string) => {
    if (!window.confirm('Bu urinishni o‘chirasizmi? O‘quvchi shu urinish natijasini yo‘qotadi va testni qayta topshira oladi.')) return;
    try {
      await api(`/api/levels/owner/${encodeURIComponent(test.id)}/attempts`, { method: 'DELETE', body: JSON.stringify({ attemptId }) });
      setMsg('Urinish o‘chirildi.');
      void loadAttempts();
    } catch (e) { setMsg(e instanceof Error ? e.message : ''); }
  };

  const setStatus = async (status: 'draft' | 'published' | 'closed') => {
    try { await api(`/api/levels/owner/${encodeURIComponent(test.id)}`, { method: 'PATCH', body: JSON.stringify({ status }) }); setMsg(status === 'published' ? 'Nashr qilindi.' : 'Holat yangilandi.'); void loadDetail(); onChanged(); }
    catch (e) { setMsg(e instanceof Error ? e.message : ''); }
  };

  const removeTest = async () => {
    if (!window.confirm('Testni butunlay o‘chirasizmi? Savollar va barcha urinishlar ham o‘chadi. Hisobotni avval yuklab oling.')) return;
    try { await api(`/api/levels/owner/${encodeURIComponent(test.id)}`, { method: 'DELETE' }); onBack(); }
    catch (e) { setMsg(e instanceof Error ? e.message : ''); }
  };

  const newCode = async () => {
    try {
      const d = await api<{ entryCode: string }>(`/api/levels/owner/${encodeURIComponent(test.id)}`, { method: 'POST' });
      setCode({ label: 'Yangi kirish kodi', value: d.entryCode });
      onChanged();
    } catch (e) { setMsg(e instanceof Error ? e.message : ''); }
  };

  const addOne = async () => {
    const options = q.options.split('\n').map((s) => s.trim()).filter(Boolean);
    try {
      await api(`/api/levels/owner/${encodeURIComponent(test.id)}/questions`, { method: 'POST', body: JSON.stringify({ questions: [{ prompt: q.prompt, options, correctIndex: q.correct }] }) });
      setQ({ prompt: '', options: 'A\nB\nC\nD', correct: 0 });
      setMsg('Savol qo‘shildi.');
      void loadDetail();
    } catch (e) { setMsg(e instanceof Error ? e.message : ''); }
  };

  const delQuestion = async (qid: string) => {
    if (!window.confirm('Bu savolni o‘chirasizmi?')) return;
    try { await api(`/api/levels/owner/${encodeURIComponent(test.id)}/questions`, { method: 'DELETE', body: JSON.stringify({ questionId: qid }) }); void loadDetail(); }
    catch (e) { setMsg(e instanceof Error ? e.message : ''); }
  };

  const previewImport = async (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await fetch(`/api/levels/owner/${encodeURIComponent(test.id)}/import`, { method: 'POST', body: fd });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.success) throw new Error(d.message || 'Fayl o‘qilmadi.');
      setImportPreview({ count: d.count, errors: d.errors || [], file });
    } catch (e) { setMsg(e instanceof Error ? e.message : ''); }
  };

  const commitImport = async () => {
    if (!importPreview) return;
    const fd = new FormData();
    fd.append('file', importPreview.file);
    try {
      const res = await fetch(`/api/levels/owner/${encodeURIComponent(test.id)}/import?commit=1`, { method: 'POST', body: fd });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.success) throw new Error(d.message || 'Saqlanmadi.');
      setMsg(`${d.added} ta savol qo‘shildi${d.skipped ? `, ${d.skipped} ta qator o‘tkazib yuborildi` : ''}.`);
      setImportPreview(null);
      void loadDetail();
    } catch (e) { setMsg(e instanceof Error ? e.message : ''); }
  };

  const unlock = async (attemptId: string) => {
    try {
      const d = await api<{ unlockCode: string }>(`/api/levels/owner/${encodeURIComponent(test.id)}/attempts`, { method: 'POST', body: JSON.stringify({ attemptId }) });
      setCode({ label: 'Ochish kodi (30 daqiqa, bir marta)', value: d.unlockCode });
      void loadAttempts();
    } catch (e) { setMsg(e instanceof Error ? e.message : ''); }
  };

  const [summaryExport, setSummaryExport] = useState(false);
  const download = async (format: 'xlsx' | 'docx') => {
    try {
      const params = new URLSearchParams({ format, view: summaryExport ? 'summary' : 'all' });
      const res = await fetch(`/api/levels/owner/${encodeURIComponent(test.id)}/report?${params}`);
      if (!res.ok) { setMsg('Hisobot yuklanmadi.'); return; }
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement('a');
      a.href = url;
      a.download = `${test.title.replace(/[^\p{L}\p{N} _-]+/gu, '').slice(0, 60) || 'hisobot'}-${summaryExport ? 'saralangan' : 'barcha-urinishlar'}.${format}`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setMsg('Hisobot yuklanmadi. Internet aloqasini tekshiring.');
    }
  };

  const t = full?.test || test;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={onBack} className="min-h-[44px] rounded-2xl border border-black/10 px-4 font-semibold">← Ro‘yxat</button>
        <h2 className="font-display text-xl font-bold">{t.title}</h2>
        <span className="rounded-full bg-black/5 px-2.5 py-1 text-[12px] font-bold dark:bg-white/10">{STATUS_UZ[t.status]}</span>
      </div>
      {msg ? <p role="status" className="rounded-xl bg-black/5 px-4 py-2 text-[13px] dark:bg-white/10">{msg}</p> : null}
      {code ? (
        <div role="status" className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4">
          <p className="text-[13px] font-semibold">{code.label}</p>
          <p className="mt-1 font-mono text-3xl font-extrabold tracking-[0.2em]">{code.value}</p>
          <p className="mt-1 text-[12px] text-ink-muted">Bu kod faqat shu yerda ko‘rinadi. O‘quvchiga yuboring.</p>
          <button type="button" onClick={() => setCode(null)} className="mt-2 text-[13px] underline">Yopish</button>
        </div>
      ) : null}

      <AiReportBox testId={t.id} />
      <ScheduleBox test={t} onSaved={() => { void loadDetail(); onChanged(); }} onMsg={setMsg} />

      <section className="rounded-3xl border border-black/10 p-5 dark:border-white/10">
        <h3 className="font-semibold">Holat</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={() => setStatus('published')} className="min-h-[44px] rounded-xl bg-emerald-600 px-4 font-semibold text-white">Nashr qilish</button>
          <button type="button" onClick={() => setStatus('draft')} className="min-h-[44px] rounded-xl bg-black/10 px-4 font-semibold dark:bg-white/10">Qoralama</button>
          <button type="button" onClick={() => setStatus('closed')} className="min-h-[44px] rounded-xl bg-black/10 px-4 font-semibold dark:bg-white/10">Yopish</button>
          <button type="button" onClick={duplicate} className="min-h-[44px] rounded-xl bg-black/10 px-4 font-semibold dark:bg-white/10">Nusxalash</button>
          <button type="button" onClick={removeTest} className="min-h-[44px] rounded-xl bg-rose-600 px-4 font-semibold text-white">O‘chirish</button>
        </div>
        {t.access === 'code' ? (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="text-[14px]">Kirish kodi: <b className="font-mono text-[16px] tracking-[0.2em]">{t.entry_code || (t.has_entry_code ? '••••••' : 'yo‘q')}</b></span>
            {t.entry_code ? <button type="button" onClick={() => { void navigator.clipboard?.writeText(t.entry_code || ''); setMsg('Kod nusxalandi.'); }} className="min-h-[40px] rounded-xl border border-black/10 px-3 text-[13px] font-semibold">Nusxalash</button> : null}
            <button type="button" onClick={newCode} className="min-h-[40px] rounded-xl border border-black/10 px-3 text-[13px] font-semibold">Yangi kod yaratish</button>
            <button type="button" onClick={async () => { if (!window.confirm('Kodni o‘chirasizmi? Test ochiq bo‘lib qoladi.')) return; try { await api(`/api/levels/owner/${encodeURIComponent(test.id)}`, { method: 'PATCH', body: JSON.stringify({ clearEntryCode: true }) }); setMsg('Kod o‘chirildi, test ochiq.'); void loadDetail(); onChanged(); } catch (e) { setMsg(e instanceof Error ? e.message : ''); } }} className="min-h-[40px] rounded-xl border border-rose-500/40 px-3 text-[13px] font-semibold text-rose-600">Kodni o‘chirish</button>
          </div>
        ) : null}
      </section>

      <section className="rounded-3xl border border-black/10 p-5 dark:border-white/10">
        <h3 className="font-semibold">Savollar ({full?.questions.length ?? 0})</h3>
        <div className="mt-3 rounded-2xl bg-black/[0.03] p-4 dark:bg-white/[0.04]">
          <p className="text-[13px] font-semibold">Fayldan import (.txt yoki .docx)</p>
          <p className="mt-1 text-[12px] text-ink-muted">Har savol: «1. matn», so‘ng «A) variant», to‘g‘ri javob oxiriga «*». Avval ko‘rib chiqasiz, keyin saqlanadi.</p>
          <input type="file" accept=".txt,.docx" className="mt-2 text-[13px]" onChange={(e) => { const f = e.target.files?.[0]; if (f) void previewImport(f); }} />
          {importPreview ? (
            <div className="mt-3 rounded-xl bg-white p-3 text-[13px] dark:bg-[#0f172a]">
              <p className="font-semibold">Topildi: {importPreview.count} ta to‘g‘ri savol</p>
              {importPreview.errors.length ? <ul className="mt-2 max-h-40 list-disc overflow-y-auto pl-5 text-rose-600">{importPreview.errors.slice(0, 50).map((e, i) => <li key={i}>{e.line}-qator: {e.message}</li>)}</ul> : null}
              <div className="mt-3 flex gap-2">
                <button type="button" disabled={!importPreview.count} onClick={commitImport} className="min-h-[40px] rounded-xl bg-ember-500 px-4 font-semibold text-white disabled:opacity-50">Saqlash</button>
                <button type="button" onClick={() => setImportPreview(null)} className="min-h-[40px] rounded-xl border border-black/10 px-4 font-semibold">Bekor</button>
              </div>
            </div>
          ) : null}
        </div>
        <div className="mt-4 rounded-2xl bg-black/[0.03] p-4 dark:bg-white/[0.04]">
          <p className="text-[13px] font-semibold">Bitta savol qo‘shish</p>
          <textarea className={`${field} mt-2`} rows={2} placeholder="Savol matni" value={q.prompt} onChange={(e) => setQ({ ...q, prompt: e.target.value })} />
          <textarea className={`${field} mt-2 font-mono`} rows={4} value={q.options} onChange={(e) => setQ({ ...q, options: e.target.value })} />
          <label className="mt-2 block text-[13px]">To‘g‘ri variant raqami (1 dan boshlab)
            <input type="number" min={1} className={field} value={q.correct + 1} onChange={(e) => setQ({ ...q, correct: Math.max(0, Number(e.target.value) - 1) })} />
          </label>
          <button type="button" disabled={!q.prompt.trim()} onClick={addOne} className="mt-3 min-h-[40px] rounded-xl bg-ember-500 px-4 font-semibold text-white disabled:opacity-50">Qo‘shish</button>
        </div>
        <ol className="mt-4 space-y-2">
          {(full?.questions || []).map((x, i) => (
            <li key={x.id} className="flex items-start justify-between gap-3 rounded-xl border border-black/10 p-3 text-[14px] dark:border-white/10">
              <span><b>{i + 1}.</b> {x.prompt}<br /><span className="text-[12px] text-ink-muted">{x.options.map((o, j) => `${String.fromCharCode(65 + j)}) ${o}${j === x.correct_index ? ' ✓' : ''}`).join(' · ')}</span></span>
              <span className="flex shrink-0 gap-3">
                <button type="button" onClick={() => setEditingQ(editingQ === x.id ? null : x.id)} className="text-[13px] underline">Tahrirlash</button>
                <button type="button" onClick={() => delQuestion(x.id)} className="text-[13px] text-rose-600 underline">O‘chirish</button>
              </span>
              {editingQ === x.id ? <div className="basis-full"><QuestionEditor q={x} testId={test.id} onMsg={setMsg} onDone={() => { setEditingQ(null); void loadDetail(); }} /></div> : null}
            </li>
          ))}
        </ol>
      </section>

      <section className="rounded-3xl border border-black/10 p-5 dark:border-white/10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-semibold">Urinishlar</h3>
          <div className="flex flex-wrap gap-2">
            {(['', 'in_progress', 'blocked', 'finished'] as const).map((f) => (
              <button key={f || 'all'} type="button" onClick={() => setFilter(f)} className={`min-h-[36px] rounded-xl px-3 text-[13px] font-semibold ${filter === f ? 'bg-ember-500 text-white' : 'bg-black/5 dark:bg-white/10'}`}>
                {f ? STATUS_UZ[f] : 'Hammasi'}
              </button>
            ))}
            <select aria-label="Sinf bo‘yicha filtr" value={classFilter} onChange={(e) => setClassFilter(e.target.value)} className="min-h-[36px] rounded-xl border border-black/10 bg-transparent px-2 text-[13px]">
              <option value="">Barcha sinflar</option>
              {Array.from(new Set(attempts.map((a) => a.class_name).filter(Boolean))).sort().map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select aria-label="Eksport turi" value={summaryExport ? 'summary' : 'all'} onChange={(e) => setSummaryExport(e.target.value === 'summary')} className="min-h-[44px] rounded-xl border border-black/15 bg-white px-2 text-[13px] dark:border-white/20 dark:bg-slate-900">
              <option value="all">Barcha urinishlar</option>
              <option value="summary">Saralangan natijalar</option>
            </select>
            <button type="button" onClick={() => download('xlsx')} className="min-h-[36px] rounded-xl border border-black/10 px-3 text-[13px] font-semibold">Excel</button>
            <button type="button" onClick={() => download('docx')} className="min-h-[36px] rounded-xl border border-black/10 px-3 text-[13px] font-semibold">Word</button>
          </div>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-[13px]">
            <thead><tr className="text-ink-muted"><th className="py-2">Ism</th><th>Familiya</th><th>Sinf</th><th>Holat</th><th>Foiz</th><th>Daraja</th><th>Ogoh.</th><th>Vaqt</th><th /></tr></thead>
            <tbody>
              {attempts.filter((a) => !classFilter || a.class_name === classFilter).map((a) => (
                <tr key={a.id} className="border-t border-black/5 dark:border-white/10">
                  <td className="py-2">{a.first_name}</td><td>{a.last_name}</td><td>{a.class_name}</td>
                  <td>{STATUS_UZ[a.status] ?? a.status}</td>
                  <td>{a.percent == null ? '—' : `${Math.round(Number(a.percent))}%`}</td>
                  <td>{a.level_label ?? '—'}</td><td>{a.violations}</td>
                  <td>{new Date(a.started_at).toLocaleString('uz-UZ', { timeZone: 'Asia/Tashkent' })}</td>
                  <td>{a.status === 'blocked' ? (a.unlock_code ? <span className="font-mono font-bold tracking-[0.15em]">{a.unlock_code}</span> : <button type="button" onClick={() => unlock(a.id)} className="min-h-[36px] rounded-lg bg-ember-500 px-3 font-semibold text-white">Ochish kodi</button>) : null}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!attempts.length ? <p className="py-6 text-center text-ink-muted">Hozircha urinish yo‘q.</p> : null}
        </div>
      </section>
    </div>
  );
};
