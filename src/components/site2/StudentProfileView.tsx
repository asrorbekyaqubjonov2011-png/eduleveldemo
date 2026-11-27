'use client';
import React, { useState } from 'react';
import {
  ArrowLeft, Camera, Download, Trophy, BarChart3, CheckCircle2, ChevronRight, Crown, HelpCircle, LogOut, Lock, Moon, Receipt, Save, Send, User as UserIcon, Wallet, Mail, Palette
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import type { Language, User } from '../../types';
import { getRankByXp } from '../../lib/eduLogic';
import { isFirebaseConfigured } from '../../lib/firebase';
import { TestHistoryView } from './TestHistoryView';
import { DepositScreen } from './profile/DepositScreen';
import { TelegramLinkCard } from './profile/TelegramLinkCard';
import { StatsScreen } from './profile/StatsScreen';
import { MistakesScreen } from './profile/MistakesScreen';
import { imageToJpegDataUrl } from '../../lib/imageUpload';
import { perfPreference, setPerfPreference } from '../../lib/motion/perf';

const TRACK_LABEL: Record<string, string> = { ielts: 'IELTS', cefr: 'CEFR', general: 'General English' };
/** Accounts made with a phone number get a placeholder address; it is not a real e-mail. */
const realEmail = (e?: string) => (e && !/@edulevel\.uz$/i.test(e) ? e : '');
const som = (n: number) => `${Math.round(n).toLocaleString('en-US').replace(/,/g, ' ')} so‘m`;
const input = 'w-full rounded-xl border border-line bg-white/80 px-3.5 py-2.5 text-[14px] text-ink outline-none transition-colors focus:border-[#f2650f] dark:border-white/15 dark:bg-white/[0.05] dark:text-white';
const label = 'mb-1.5 block text-[12px] font-semibold text-ink-muted dark:text-stone-300';
const primary = 'inline-flex h-11 items-center gap-2 rounded-full bg-gradient-to-b from-[#ffb45c] to-[#ef6c12] px-6 text-[13.5px] font-bold text-white shadow-[0_10px_24px_-10px_rgba(239,108,18,0.9)] disabled:opacity-60';

type Screen = 'home' | 'info' | 'deposit' | 'history' | 'google' | 'security' | 'look' | 'results' | 'stats' | 'mistakes';

/** One tappable row of the settings list, in the manner of a messenger's settings. */
const Row: React.FC<{ icon: React.ElementType; tint: string; title: string; value?: string; onClick: () => void; danger?: boolean }> = ({ icon: Icon, tint, title, value, onClick, danger }) => (
  <button type="button" onClick={onClick} className="group flex w-full items-center gap-3.5 px-4 py-3 text-left transition-colors hover:bg-ink/[0.03] dark:hover:bg-white/[0.04]">
    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] text-white ${tint}`}><Icon className="h-[18px] w-[18px]" /></span>
    <span className={`min-w-0 flex-1 truncate text-[14.5px] font-semibold ${danger ? 'text-rose-600' : 'text-ink dark:text-white'}`}>{title}</span>
    {value ? <span className="max-w-[40%] truncate text-[13px] text-ink-muted dark:text-stone-400">{value}</span> : null}
    {!danger ? <ChevronRight className="h-4 w-4 shrink-0 text-ink-muted/60 transition-transform group-hover:translate-x-0.5 dark:text-stone-500" /> : null}
  </button>
);
const Group: React.FC<{ title?: string; children: React.ReactNode }> = ({ title, children }) => (
  <section>
    {title ? <h2 className="mb-2 px-2 text-[11.5px] font-bold uppercase tracking-[0.12em] text-ink-muted dark:text-stone-500">{title}</h2> : null}
    <div className="divide-y divide-line/60 overflow-hidden rounded-[22px] border border-line/80 bg-white/70 dark:divide-white/10 dark:border-white/10 dark:bg-white/[0.04]">{children}</div>
  </section>
);

/**
 * Student profile in the manner of a messenger's settings: a header with the person, then short lists.
 * Each row opens its own screen (personal details, top-up, history, Google, security, look, results).
 */
export const StudentProfileView: React.FC<{ onNavigateTab?: (tab: string) => void }> = ({ onNavigateTab }) => {
  const { currentUser, db, logout, updateStudentProfile } = useApp();
  const [screen, setScreen] = useState<Screen>('home');
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const [brokenPhoto, setBrokenPhoto] = useState('');

  const changePhoto = async (file?: File) => {
    if (!file) return;
    setPhotoBusy(true);
    setPhotoError('');
    try {
      const dataUrl = await imageToJpegDataUrl(file, 512, 0.85);
      const res = await api.uploadAsset(dataUrl, 'avatar.jpg');
      const url = res?.url || res?.imageUrl;
      if (!url) throw new Error(res?.message || 'Rasmni yuklab bo‘lmadi.');
      await updateStudentProfile({ avatar: url } as Partial<User>);
    } catch (e) {
      setPhotoError((e as Error).message || 'Rasmni yuklab bo‘lmadi.');
    } finally {
      setPhotoBusy(false);
    }
  };
  if (!currentUser) return null;

  const plan = currentUser.vipTier && currentUser.vipTier !== 'none' ? db.vipPlans.find((p) => p.id === currentUser.vipTier)?.name || currentUser.vipTier : '';
  const pending = (db.depositTransactions || []).filter((t) => t.userId === currentUser.id && t.status === 'pending').length;
  const initial = (currentUser.name || 'T').charAt(0).toUpperCase();
  const TITLES: Record<Exclude<Screen, 'home'>, string> = {
    info: 'Profil ma’lumotlari',
    deposit: 'Balansni to‘ldirish',
    history: 'Depozitlar tarixi',
    google: 'Google akkaunt',
    security: 'Xavfsizlik',
    look: 'Ko‘rinish va til',
    results: 'Natijalarim',
    stats: 'Yutuqlar va faollik',
    mistakes: 'Xatolar daftari'
  };

  if (screen !== 'home') {
    return (
      <div key={screen} className="mx-auto max-w-2xl animate-fadeIn px-1 py-4">
        <button type="button" onClick={() => setScreen('home')} className="mb-5 inline-flex items-center gap-2 rounded-full px-2 py-1.5 text-[14px] font-semibold text-ink-muted transition-colors hover:text-ink dark:text-stone-400 dark:hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Profil
        </button>
        <h1 className="mb-5 font-display text-2xl font-extrabold tracking-tight text-ink dark:text-white">{TITLES[screen]}</h1>
        {screen === 'info' ? <InfoScreen /> : null}
        {screen === 'deposit' ? <DepositScreen onDone={() => setScreen('history')} /> : null}
        {screen === 'history' ? <HistoryScreen onTopUp={() => setScreen('deposit')} /> : null}
        {screen === 'google' ? <GoogleScreen /> : null}
        {screen === 'security' ? <SecurityScreen /> : null}
        {screen === 'look' ? <LookScreen /> : null}
        {screen === 'results' ? <TestHistoryView /> : null}
        {screen === 'stats' ? <StatsScreen /> : null}
        {screen === 'mistakes' ? <MistakesScreen onPractice={() => onNavigateTab?.('mashqlar')} /> : null}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-1 py-4">
      <header className="liquid-glass flex flex-col items-center gap-3 rounded-[28px] px-6 py-7 text-center">
        <div className="relative">
          {currentUser.avatar && brokenPhoto !== currentUser.avatar && /^(https?:\/\/|\/)/.test(currentUser.avatar) ? (
            <img src={currentUser.avatar} alt="Profil rasmi" onError={() => setBrokenPhoto(currentUser.avatar || '')} className="h-24 w-24 rounded-full object-cover shadow-[0_18px_40px_-16px_rgba(232,69,122,0.7)]" />
          ) : (
            <span className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-[#ffb45c] to-[#e8457a] text-4xl font-extrabold text-white shadow-[0_18px_40px_-16px_rgba(232,69,122,0.7)]">{initial}</span>
          )}
          <label className="absolute -bottom-1 -right-1 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border-2 border-white bg-ink text-white shadow dark:border-[#1c1815] dark:bg-white dark:text-ink" aria-label="Profil rasmini almashtirish">
            {photoBusy ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <Camera className="h-4 w-4" />}
            <input type="file" accept="image/*" className="sr-only" onChange={(e) => { void changePhoto(e.target.files?.[0]); e.target.value = ''; }} />
          </label>
        </div>
        {photoError ? <p role="alert" className="text-[12.5px] font-semibold text-rose-700 dark:text-rose-300">{photoError}</p> : null}
        <div>
          <h1 className="font-display text-[22px] font-extrabold tracking-tight text-ink dark:text-white">{currentUser.name} {currentUser.surname || ''}</h1>
          <p className="mt-0.5 text-[13px] text-ink-muted dark:text-stone-400">
            {currentUser.telegramUsername ? `@${currentUser.telegramUsername} · ` : ''}{TRACK_LABEL[currentUser.track || 'ielts']} · {getRankByXp(currentUser.xp || 0).title}
          </p>
        </div>
        <div className="mt-1 flex flex-wrap justify-center gap-2 text-[12.5px] font-semibold">
          <span className="rounded-full bg-emerald-500/12 px-3 py-1 text-emerald-700 dark:text-emerald-300">Balans: {som(currentUser.balance || 0)}</span>
          <span className="rounded-full bg-[#f2650f]/12 px-3 py-1 text-[#c4520a] dark:text-[#ffc982]">{plan ? `VIP ${plan}` : 'VIP yo‘q'}</span>
          <span className="rounded-full bg-ink/[0.06] px-3 py-1 text-ink dark:bg-white/10 dark:text-white">{currentUser.xp || 0} XP</span>
        </div>
      </header>
      <TelegramLinkCard />

      <Group title="Hisob">
        <Row icon={UserIcon} tint="bg-[#f2650f]" title="Profil ma’lumotlari" value={currentUser.phone} onClick={() => setScreen('info')} />
        {db.features?.depositsEnabled === false ? null : (
          <Row icon={Wallet} tint="bg-emerald-500" title="Balansni to‘ldirish" value={pending ? `${pending} ta kutilmoqda` : som(currentUser.balance || 0)} onClick={() => setScreen('deposit')} />
        )}
        <Row icon={Receipt} tint="bg-sky-500" title="Depozitlar tarixi" onClick={() => setScreen('history')} />
        <Row icon={Crown} tint="bg-amber-500" title="VIP tariflar" value={plan || undefined} onClick={() => onNavigateTab?.('vip')} />
      </Group>

      <Group title="Sozlamalar">
        <Row icon={Mail} tint="bg-rose-500" title="Google akkaunt" value={realEmail(currentUser.email) || 'Ulanmagan'} onClick={() => setScreen('google')} />
        <Row icon={Lock} tint="bg-slate-500" title="Xavfsizlik" value="Parol" onClick={() => setScreen('security')} />
        <Row icon={Palette} tint="bg-violet-500" title="Ko‘rinish va til" onClick={() => setScreen('look')} />
      </Group>

      <Group title="O‘qish">
        <Row icon={Trophy} tint="bg-orange-500" title="Yutuqlar va faollik" value={`${currentUser.streakDays || 0} kun`} onClick={() => setScreen('stats')} />
        <Row icon={BarChart3} tint="bg-indigo-500" title="Natijalarim" onClick={() => setScreen('results')} />
        {db.features?.profileMistakes === false ? null : <Row icon={HelpCircle} tint="bg-amber-600" title="Xatolar daftari" onClick={() => setScreen('mistakes')} />}
        <Row icon={HelpCircle} tint="bg-teal-500" title="Yordam" value="Ustozga yozish" onClick={() => {
          const tg = (db.teacherProfile?.telegram || '').replace(/^@/, '').replace(/^https?:\/\/t\.me\//, '');
          if (tg) window.open(`https://t.me/${tg}`, '_blank', 'noopener');
          else onNavigateTab?.('dashboard');
        }} />
      </Group>

      <Group>
        <Row icon={LogOut} tint="bg-rose-500" title="Chiqish" onClick={() => logout()} danger />
      </Group>
    </div>
  );
};

const InfoScreen: React.FC = () => {
  const { currentUser, updateStudentProfile } = useApp();
  const [f, setF] = useState({
    name: currentUser?.name || '',
    surname: currentUser?.surname || '',
    region: currentUser?.region || '',
    targetScore: currentUser?.targetScore || '',
    studyTimeDaily: currentUser?.studyTimeDaily || '',
    telegramUsername: currentUser?.telegramUsername || ''
  });
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF((p) => ({ ...p, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.name.trim()) return setError('Ismingizni kiriting.');
    setBusy(true);
    setError('');
    try {
      await updateStudentProfile({ name: f.name.trim(), surname: f.surname.trim(), region: f.region.trim(), targetScore: f.targetScore.trim(), studyTimeDaily: f.studyTimeDaily.trim(), telegramUsername: f.telegramUsername.trim().replace(/^@/, '') } as Partial<User>);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setError('Saqlab bo‘lmadi. Qayta urinib ko‘ring.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      <div><label className={label} htmlFor="p-name">Ism</label><input id="p-name" className={input} value={f.name} onChange={set('name')} required maxLength={60} /></div>
      <div><label className={label} htmlFor="p-surname">Familiya</label><input id="p-surname" className={input} value={f.surname} onChange={set('surname')} maxLength={60} /></div>
      <div className="sm:col-span-2">
        <label className={label} htmlFor="p-phone">Telefon (login)</label>
        <input id="p-phone" className={`${input} opacity-70`} value={currentUser?.phone || ''} readOnly />
        <p className="mt-1 text-[11.5px] text-ink-muted dark:text-stone-500">Telefonni o‘zgartirish uchun ustozga murojaat qiling.</p>
      </div>
      <div><label className={label} htmlFor="p-region">Hudud</label><input id="p-region" className={input} value={f.region} onChange={set('region')} maxLength={60} /></div>
      <div><label className={label} htmlFor="p-tg">Telegram</label><input id="p-tg" className={input} value={f.telegramUsername} onChange={set('telegramUsername')} maxLength={40} placeholder="@username" /></div>
      <div><label className={label} htmlFor="p-target">Maqsad (masalan: IELTS 7.0)</label><input id="p-target" className={input} value={f.targetScore} onChange={set('targetScore')} maxLength={40} /></div>
      <div><label className={label} htmlFor="p-time">Kunlik mashg‘ulot vaqti</label><input id="p-time" className={input} value={f.studyTimeDaily} onChange={set('studyTimeDaily')} maxLength={40} placeholder="Masalan: 1 soat" /></div>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <button type="submit" disabled={busy} className={primary}><Save className="h-4 w-4" /> {busy ? 'Saqlanmoqda…' : 'Saqlash'}</button>
        {saved ? <span role="status" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-emerald-700 dark:text-emerald-400"><CheckCircle2 className="h-4 w-4" /> Saqlandi</span> : null}
        {error ? <span role="alert" className="text-[13px] font-semibold text-rose-700 dark:text-rose-400">{error}</span> : null}
      </div>
    </form>
  );
};

const HistoryScreen: React.FC<{ onTopUp: () => void }> = ({ onTopUp }) => {
  const { db, currentUser } = useApp();
  const mine = (db.depositTransactions || []).filter((t) => t.userId === currentUser?.id).slice(0, 30);
  const [open, setOpen] = useState('');
  const STATUS: Record<string, string> = { pending: 'Kutilmoqda', completed: 'Tasdiqlandi', rejected: 'Rad etildi' };
  const TONE: Record<string, string> = { pending: 'bg-amber-500/15 text-amber-800 dark:text-amber-300', completed: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300', rejected: 'bg-rose-500/15 text-rose-700 dark:text-rose-300' };
  if (!mine.length) {
    return (
      <div className="rounded-2xl border border-line/80 bg-white/60 p-8 text-center dark:border-white/10 dark:bg-white/[0.03]">
        <p className="text-[14px] text-ink-muted dark:text-stone-400">Hali depozit so‘rovi yo‘q.</p>
        <button type="button" onClick={onTopUp} className={`${primary} mt-4`}>Balansni to‘ldirish</button>
      </div>
    );
  }
  const approvedTotal = mine.filter((t) => t.status === 'completed').reduce((a, t) => a + t.amount, 0);
  return (
    <>
    <p className="mb-3 text-[13px] text-ink-muted dark:text-stone-400">Tasdiqlangan jami: <b className="text-ink dark:text-white">{som(approvedTotal)}</b> · kutilmoqda: {mine.filter((t) => t.status === 'pending').length} ta</p>
    <ul className="divide-y divide-line/60 overflow-hidden rounded-[22px] border border-line/80 bg-white/70 dark:divide-white/10 dark:border-white/10 dark:bg-white/[0.04]">
      {mine.map((t) => (
        <li key={t.id}>
          <button type="button" onClick={() => setOpen(open === t.id ? '' : t.id)} className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left text-[14px]">
            <span className="text-ink-muted dark:text-stone-400">{new Date(t.createdAt).toLocaleDateString('uz-UZ')}</span>
            <span className="font-mono font-bold text-ink dark:text-white">{som(t.amount)}</span>
            <span className={`rounded-full px-2.5 py-0.5 text-[11.5px] font-bold ${TONE[t.status] || ''}`}>{STATUS[t.status] || t.status}</span>
          </button>
          {open === t.id ? (
            <div className="space-y-2 bg-ink/[0.02] px-4 pb-4 text-[13px] text-ink-muted dark:bg-white/[0.02] dark:text-stone-400">
              <div>Kod: <span className="font-mono text-ink dark:text-white">{t.paymentCode}</span></div>
              {t.receiptUrl ? <a href={t.receiptUrl} target="_blank" rel="noopener noreferrer"><img src={t.receiptUrl} alt="Chek" className="mt-1 max-h-56 rounded-xl border border-line object-contain" /></a> : null}
              {t.status === 'completed' && t.approvedAt ? <div>Tasdiqlangan: {new Date(t.approvedAt).toLocaleString('uz-UZ')}</div> : null}
            </div>
          ) : null}
        </li>
      ))}
    </ul>
    </>
  );
};

const GoogleScreen: React.FC = () => {
  const { currentUser, updateStudentProfile } = useApp();
  const [email, setEmail] = useState(realEmail(currentUser?.email));
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setNote('');
    try {
      await updateStudentProfile({ email: email.trim() } as Partial<User>);
      setNote('Saqlandi.');
    } catch {
      setNote('Saqlab bo‘lmadi.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4 rounded-[22px] border border-line/80 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.04]">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[22px] font-black shadow-sm" aria-hidden="true"><span className="bg-gradient-to-br from-[#4285f4] via-[#ea4335] to-[#fbbc05] bg-clip-text text-transparent">G</span></span>
        <div className="min-w-0">
          <div className="truncate text-[15px] font-bold text-ink dark:text-white">{realEmail(currentUser?.email) || 'E-mail kiritilmagan'}</div>
          <div className="text-[12.5px] text-ink-muted dark:text-stone-400">Google bilan kirish: {isFirebaseConfigured ? 'platformada yoqilgan' : 'hozircha yoqilmagan'}</div>
        </div>
      </div>
      <form onSubmit={save} className="space-y-3">
        <div><label className={label} htmlFor="g-email">Google e-mail manzilingiz</label><input id="g-email" type="email" className={input} value={email} onChange={(e) => setEmail(e.target.value)} maxLength={120} placeholder="ism@gmail.com" /></div>
        <p className="text-[12.5px] text-ink-muted dark:text-stone-500">Bu manzil hisobingiz bilan bog‘lanadi: ustoz sizga Google Meet havolalari va hujjatlarni shu manzilga yuborishi mumkin.</p>
        <div className="flex items-center gap-3"><button type="submit" disabled={busy} className={primary}><Save className="h-4 w-4" /> Saqlash</button>{note ? <span role="status" className="text-[13px] font-semibold text-emerald-700 dark:text-emerald-400">{note}</span> : null}</div>
      </form>
    </div>
  );
};

const passwordStrength = (p: string) => {
  let score = 0;
  if (p.length >= 8) score++;
  if (p.length >= 12) score++;
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) score++;
  if (/\d/.test(p)) score++;
  if (/[^A-Za-z0-9]/.test(p)) score++;
  return score <= 1 ? { label: 'zaif', pct: 25, tone: 'bg-rose-500' } : score <= 3 ? { label: 'o‘rtacha', pct: 60, tone: 'bg-amber-500' } : { label: 'kuchli', pct: 100, tone: 'bg-emerald-500' };
};

const SecurityScreen: React.FC = () => {
  const { db, currentUser } = useApp();
  const [oldP, setOldP] = useState('');

  const [newP, setNewP] = useState('');
  const [again, setAgain] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const strength = passwordStrength(newP);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newP.length < 8) return setMsg({ ok: false, text: 'Yangi parol kamida 8 belgi bo‘lsin.' });
    if (newP !== again) return setMsg({ ok: false, text: 'Yangi parollar bir xil emas.' });
    setBusy(true);
    setMsg(null);
    try {
      const r = await api.changeStudentPassword(oldP, newP);
      if (r?.success) {
        setMsg({ ok: true, text: 'Parol almashtirildi.' });
        setOldP(''); setNewP(''); setAgain('');
      } else setMsg({ ok: false, text: r?.message || 'Almashtirib bo‘lmadi.' });
    } catch {
      setMsg({ ok: false, text: 'Server bilan bog‘lanib bo‘lmadi.' });
    } finally {
      setBusy(false);
    }
  };
  return (
    <form onSubmit={submit} className="space-y-4">
      <div><label className={label} htmlFor="s-old">Joriy parol</label><input id="s-old" type="password" autoComplete="current-password" className={input} value={oldP} onChange={(e) => setOldP(e.target.value)} required /></div>
      <div><label className={label} htmlFor="s-new">Yangi parol</label><input id="s-new" type="password" autoComplete="new-password" className={input} value={newP} onChange={(e) => setNewP(e.target.value)} required minLength={8} /></div>
      <div><label className={label} htmlFor="s-again">Yangi parolni takrorlang</label><input id="s-again" type="password" autoComplete="new-password" className={input} value={again} onChange={(e) => setAgain(e.target.value)} required minLength={8} /></div>
      {newP ? (
        <div aria-live="polite">
          <div className="h-1.5 overflow-hidden rounded-full bg-ink/10 dark:bg-white/10"><div className={`h-full rounded-full transition-[width] ${strength.tone}`} style={{ width: `${strength.pct}%` }} /></div>
          <p className="mt-1 text-[12px] text-ink-muted dark:text-stone-400">Parol kuchi: {strength.label}</p>
        </div>
      ) : null}
      {msg ? <p role={msg.ok ? 'status' : 'alert'} className={`text-[13px] font-semibold ${msg.ok ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>{msg.text}</p> : null}
      <button type="submit" disabled={busy} className={primary}><Lock className="h-4 w-4" /> {busy ? 'Saqlanmoqda…' : 'Parolni almashtirish'}</button>
      <div className="mt-6 border-t border-line/70 pt-5 dark:border-white/10">
        <h3 className="text-[14px] font-bold text-ink dark:text-white">Ma’lumotlarim</h3>
        <p className="mt-1 text-[12.5px] text-ink-muted dark:text-stone-400">Platformada saqlangan o‘z ma’lumotlaringiz (profil, test natijalari, depozitlar, kartochkalar) bitta faylda.</p>
        <button
          type="button"
          onClick={() => {
            if (!currentUser) return;
            const { password, ...me } = currentUser as typeof currentUser & { password?: string };
            void password;
            const data = {
              yuklangan: new Date().toISOString(),
              profil: me,
              testlar: (db.testAttempts || []).filter((a) => a.userId === currentUser.id),
              depozitlar: (db.depositTransactions || []).filter((t) => t.userId === currentUser.id),
              kartochkalar: (db.flashcards || []).filter((c) => c.userId === currentUser.id)
            };
            const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
            const a = document.createElement('a');
            a.href = url;
            a.download = 'edulevel-malumotlarim.json';
            a.click();
            URL.revokeObjectURL(url);
          }}
          className="mt-3 inline-flex h-10 items-center gap-2 rounded-full border border-line bg-white/70 px-4 text-[13px] font-semibold text-ink dark:border-white/10 dark:bg-white/5 dark:text-white"
        ><Download className="h-4 w-4" /> Yuklab olish (JSON)</button>
      </div>
    </form>
  );
};

const LANGS: Array<{ code: Language; label: string }> = [{ code: 'uz', label: 'O‘zbekcha' }, { code: 'uz_cyrl', label: 'Ўзбекча' }, { code: 'en', label: 'English' }];
const LookScreen: React.FC = () => {
  const { theme, toggleTheme, language, setLanguage } = useApp();
  const [motionReduced, setMotionReduced] = useState(() => { try { return localStorage.getItem('edulevel_motion') === 'reduced'; } catch { return false; } });
  const [perf, setPerf] = useState<'auto' | 'lite' | 'full'>(() => perfPreference());
  return (
    <div className="space-y-5">
      <Group title="Mavzu">
        <button type="button" onClick={toggleTheme} className="flex w-full items-center gap-3.5 px-4 py-3.5 text-left">
          <span className="flex h-9 w-9 items-center justify-center rounded-[11px] bg-violet-500 text-white"><Moon className="h-[18px] w-[18px]" /></span>
          <span className="flex-1 text-[14.5px] font-semibold text-ink dark:text-white">Tungi rejim</span>
          <span role="switch" aria-checked={theme === 'dark'} className={`relative inline-flex h-7 w-12 items-center rounded-full p-1 transition-colors ${theme === 'dark' ? 'bg-gradient-to-r from-[#ffa149] to-[#f2650f]' : 'bg-ink/15'}`}><span className={`block h-5 w-5 rounded-full bg-white shadow transition-transform ${theme === 'dark' ? 'translate-x-5' : ''}`} /></span>
        </button>
      </Group>
      <Group title="Til">
        {LANGS.map((l) => (
          <button key={l.code} type="button" onClick={() => setLanguage(l.code)} className="flex w-full items-center justify-between px-4 py-3.5 text-left text-[14.5px] font-semibold text-ink dark:text-white">
            {l.label}{language === l.code ? <CheckCircle2 className="h-5 w-5 text-[#f2650f]" /> : null}
          </button>
        ))}
      </Group>
      <Group title="Harakat va tezlik">
        <button type="button" onClick={() => { const next = motionReduced ? 'full' : 'reduced'; try { if (next === 'reduced') localStorage.setItem('edulevel_motion', 'reduced'); else localStorage.removeItem('edulevel_motion'); } catch { /* storage blocked */ } setMotionReduced(next === 'reduced'); }} className="flex w-full items-center gap-3.5 px-4 py-3.5 text-left">
          <span className="flex-1"><span className="block text-[14.5px] font-semibold text-ink dark:text-white">Kam harakat</span><span className="block text-[12px] text-ink-muted dark:text-stone-400">Bezak animatsiyalar to‘xtaydi (sahifa yangilanganda to‘liq amal qiladi)</span></span>
          <span role="switch" aria-checked={motionReduced} className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full p-1 transition-colors ${motionReduced ? 'bg-gradient-to-r from-[#ffa149] to-[#f2650f]' : 'bg-ink/15'}`}><span className={`block h-5 w-5 rounded-full bg-white shadow transition-transform ${motionReduced ? 'translate-x-5' : ''}`} /></span>
        </button>
        <div className="px-4 py-3.5">
          <div className="text-[14.5px] font-semibold text-ink dark:text-white">Effektlar darajasi</div>
          <div className="text-[12px] text-ink-muted dark:text-stone-400">“Yengil” kuchsiz kompyuterda sayt silliq ishlashi uchun xira va murakkab effektlarni o‘chiradi.</div>
          <div role="group" aria-label="Effektlar darajasi" className="mt-2.5 inline-flex rounded-full border border-line/80 bg-white/70 p-1 dark:border-white/10 dark:bg-white/[0.04]">
            {([['auto', 'Avto'], ['lite', 'Yengil'], ['full', 'To‘liq']] as const).map(([v, text]) => (
              <button key={v} type="button" aria-pressed={perf === v} onClick={() => { setPerfPreference(v); setPerf(v); window.location.reload(); }} className={`rounded-full px-4 py-1.5 text-[12.5px] font-semibold ${perf === v ? 'bg-ink text-white dark:bg-white dark:text-ink' : 'text-ink-muted dark:text-stone-300'}`}>{text}</button>
            ))}
          </div>
        </div>
      </Group>
      <p className="px-2 text-[12px] text-ink-muted dark:text-stone-500">Saytning ayrim qismlari hozircha faqat o‘zbek tilida.</p>
    </div>
  );
};
