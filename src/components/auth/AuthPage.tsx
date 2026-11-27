import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  ArrowLeft,
  ArrowRight,
  Sun,
  Moon,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  MapPin,
  Lock,
  User,
  Phone,
  Send,
  Compass,
  Clock,
  Target,
  Eye,
  EyeOff,
  Check,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { LearningTrack } from '../../types';
import { googleSignIn } from '../../lib/firebase';
import { EduLevelLogo } from '../common/EduLevelLogo';
import { AuthVisual } from './AuthVisual';
import { cn } from '../ui/styles';

interface AuthPageProps {
  initialMode?: 'login' | 'register' | 'creator';
  onBackToHome?: () => void;
}

const REGIONS = [
  'Toshkent shahri',
  'Toshkent viloyati',
  'Samarqand viloyati',
  "Farg'ona viloyati",
  'Andijon viloyati',
  'Namangan viloyati',
  'Buxoro viloyati',
  'Xorazm viloyati',
  'Qashqadaryo viloyati',
  'Surxondaryo viloyati',
  'Jizzax viloyati',
  'Sirdaryo viloyati',
  'Navoiy viloyati',
  "Qoraqalpog'iston Respublikasi"
];

const TRACKS: { id: LearningTrack; short: string; title: string; desc: string; points: string[] }[] = [
  {
    id: 'ielts',
    short: 'IELTS',
    title: 'IELTS Academic & General',
    desc: 'Xorijiy universitetlar, grantlar, emigratsiya',
    points: ['4 ko‘nikma bo‘yicha mock imtihonlar', 'Band bo‘yicha taxminiy natija', 'Writing va Speaking AI bahosi']
  },
  {
    id: 'cefr',
    short: 'CEFR',
    title: 'CEFR Multilevel',
    desc: 'OTM va magistratura uchun milliy sertifikat',
    points: ['Multilevel formatidagi testlar', '75 ballik shkala bo‘yicha taxmin', 'B2 → C1 video darslar']
  },
  {
    id: 'general',
    short: 'General',
    title: 'General English',
    desc: 'Erkin so‘zlashuv, ish va kundalik muloqot',
    points: ['Amaliy grammatika va lug‘at', 'Speaking mashg‘ulotlari', 'Darajaga mos video darslar']
  }
];
const TARGETS: Record<LearningTrack, string[]> = {
  ielts: ['IELTS 6.5', 'IELTS 7.0', 'IELTS 7.5', 'IELTS 8.0+'],
  cefr: ['CEFR B1', 'CEFR B2', 'CEFR C1', 'CEFR C1+'],
  general: ['B1 Intermediate', 'B2 Upper', 'C1 Advanced', 'Erkin muloqot']
};
const STUDY_TIMES = [
  { time: '45 daqiqa / kun', label: 'Barqaror rejim' },
  { time: '1.5 soat / kun', label: 'Tavsiya etiladi — intensiv' },
  { time: '2.5+ soat / kun', label: 'Imtihon oldidan sprint' }
];
const REG_STEPS = ['Hisob', 'Yo‘nalish', 'Maqsad', 'Tasdiqlash'];

/** "+998 90 123 45 67" while typing a Uzbek number; e-mails are left as is. */
function formatPhone(v: string): string {
  if (/[a-z@]/i.test(v)) return v;
  const d = v.replace(/\D/g, '');
  if (!d) return v.trim().startsWith('+') ? '+' : '';
  let local: string;
  if (v.trim().startsWith('+')) {
    if (d.length < 3) return v; // still typing "+998"
    if (!d.startsWith('998')) return v;
    local = d.slice(3);
  } else {
    if (d.length > 9) return v;
    local = d;
  }
  const parts = [local.slice(0, 2), local.slice(2, 5), local.slice(5, 7), local.slice(7, 9)].filter(Boolean);
  return ('+998 ' + parts.join(' ')).trim();
}

function passwordStrength(pw: string) {
  const checks = [
    { ok: pw.length >= 8, label: '8+ belgi' },
    { ok: /[a-zA-Z]/.test(pw) && /\d/.test(pw), label: 'harf va raqam' },
    { ok: pw.length >= 12 || /[^a-zA-Z0-9]/.test(pw), label: '12+ belgi yoki belgi (!@#)' }
  ];
  const score = checks.filter((c) => c.ok).length;
  return { checks, score, label: ['Juda zaif', 'Zaif', 'Yaxshi', 'Kuchli'][score] };
}

const fieldWrap =
  'group relative flex items-center rounded-2xl border border-line bg-white/70 transition-all focus-within:border-ember-500/70 focus-within:bg-white focus-within:ring-4 focus-within:ring-ember-500/10 dark:border-white/10 dark:bg-white/[0.04] dark:focus-within:border-ember-400/60 dark:focus-within:bg-white/[0.07]';
const fieldInput =
  'h-[52px] w-full bg-transparent pr-4 text-[14.5px] text-ink outline-none placeholder:text-ink-muted/60 dark:text-white dark:placeholder:text-stone-500';
const fieldIcon = 'ml-4 mr-3 h-[18px] w-[18px] shrink-0 text-ink-muted/70 transition-colors group-focus-within:text-ember-600 dark:text-stone-500 dark:group-focus-within:text-ember-400';
const labelCls = 'mb-2 block text-[12px] font-semibold text-ink-muted dark:text-stone-400';

const PrimaryButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ className, children, ...rest }) => (
  <button
    {...rest}
    className={cn(
      'group inline-flex h-[54px] w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-[#ffa149] to-[#f2650f] text-[15px] font-semibold text-white shadow-[0_16px_36px_-14px_rgba(242,101,15,0.8),inset_0_1px_0_rgba(255,255,255,0.3)] transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:pointer-events-none disabled:opacity-60',
      className
    )}
  >
    {children}
  </button>
);

export const AuthPage: React.FC<AuthPageProps> = ({ initialMode = 'login', onBackToHome }) => {
  const { db, unifiedLogin, loginWithGoogle, registerStudent, setActiveSite, theme, toggleTheme } = useApp();

  const [mode, setMode] = useState<'login' | 'register' | 'creator'>(initialMode);
  const [loginInput, setLoginInput] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [creatorCode, setCreatorCode] = useState('');
  const [creatorLogin, setCreatorLogin] = useState('');

  const [name, setName] = useState('');
  const [surname, setSurname] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [region, setRegion] = useState('Toshkent shahri');
  const [telegramUsername, setTelegramUsername] = useState('');

  const [onboardingStep, setOnboardingStep] = useState(0);
  const [selectedTrack, setSelectedTrack] = useState<LearningTrack>('ielts');
  const [selectedTargetScore, setSelectedTargetScore] = useState('IELTS 7.5');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [selectedStudyTime, setSelectedStudyTime] = useState('1.5 soat / kun');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const teacher = db.teacherProfile;
  const strength = passwordStrength(registerPassword);
  const chooseTrack = (t: LearningTrack) => {
    setSelectedTrack(t);
    if (!TARGETS[t].includes(selectedTargetScore)) setSelectedTargetScore(TARGETS[t][2]);
  };

  const resetMessages = () => {
    setErrorMsg('');
    setSuccessMsg('');
  };

  const switchMode = (m: 'login' | 'register' | 'creator') => {
    resetMessages();
    setOnboardingStep(0);
    setMode(m);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    if (!loginInput.trim()) {
      setErrorMsg('Iltimos, telefon raqam yoki e-mail kiriting');
      return;
    }
    setLoading(true);
    try {
      const res = await unifiedLogin(loginInput, loginPassword);
      if (res.success) {
        setSuccessMsg(res.role === 'owner' ? 'Ustoz sifatida kirdingiz!' : 'Kabinetga muvaffaqiyatli kirdingiz!');
        setTimeout(() => setActiveSite(res.role === 'owner' ? 'site3_owner' : 'site2_lms'), 120);
      } else {
        setErrorMsg(res.message || 'Kirishda xatolik yuz berdi. Parol yoki telefon/e-mailni tekshiring.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Tarmoq xatosi yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuthLogin = async () => {
    resetMessages();
    setLoading(true);
    try {
      const res = await googleSignIn();
      if (res && res.user) {
        const gUser = res.user;
        const authRes = await loginWithGoogle({
          email: gUser.email || '',
          name: gUser.displayName || 'Google O‘quvchisi',
          avatar: gUser.photoURL || undefined,
          uid: gUser.uid,
          idToken: await gUser.getIdToken(),
          track: selectedTrack || 'ielts'
        });
        if (authRes.success) setSuccessMsg('Xush kelibsiz! Google hisobingiz orqali kabinetingiz ochildi.');
        else setErrorMsg(authRes.message || 'Google bilan kirishda xatolik yuz berdi');
      }
    } catch (e: any) {
      setErrorMsg(e?.message || 'Google bilan kirish bekor qilindi yoki xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    if (!creatorLogin.trim() || !creatorCode.trim()) {
      setErrorMsg('Iltimos, login va parolni kiriting');
      return;
    }
    setLoading(true);
    try {
      const res = await unifiedLogin(creatorLogin.trim(), creatorCode);
      if (res.success && res.role === 'owner') {
        setSuccessMsg('Owner sifatida kirdingiz!');
        setTimeout(() => setActiveSite('site3_owner'), 120);
      } else {
        setErrorMsg(res.message && !res.message.includes('topilmadi') ? res.message : 'Login yoki parol noto‘g‘ri');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Tarmoq xatosi yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  const handleStartOnboarding = (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    if (!name.trim()) return setErrorMsg('Iltimos, ismingizni kiriting');
    const id = identifier.trim();
    if (!id) return setErrorMsg('Iltimos, telefon raqam yoki e-mail kiriting');
    const isEmail = /@/.test(id);
    if (isEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(id)) return setErrorMsg('E-mail manzili noto‘g‘ri');
    if (!isEmail && id.replace(/\D/g, '').length !== 12) return setErrorMsg('Telefon raqam to‘liq emas: +998 XX XXX XX XX');
    if (!registerPassword || registerPassword.length < 8) return setErrorMsg("Parol kamida 8 ta belgidan iborat bo'lishi shart");
    setOnboardingStep(1);
  };

  const handleCompleteRegistration = async () => {
    resetMessages();
    if (!agreeTerms) return setErrorMsg('Davom etish uchun foydalanish shartlariga rozilik bildiring');
    setLoading(true);
    try {
      const res = await registerStudent({
        name: name.trim(),
        surname: surname.trim(),
        identifier: identifier.trim(),
        password: registerPassword,
        region,
        telegramUsername: telegramUsername.replace(/^@/, ''),
        track: selectedTrack,
        targetScore: selectedTargetScore,
        studyTimeDaily: selectedStudyTime
      });
      if (res.success) {
        setSuccessMsg("Tabriklaymiz! Shaxsiy o'quv kabinetingiz tayyorlandi...");
        setTimeout(() => setActiveSite('site2_lms'), 120);
      } else {
        setErrorMsg(res.message || "Ro'yxatdan o'tishda xatolik yuz berdi");
        setOnboardingStep(0);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Tarmoq xatosi');
      setOnboardingStep(0);
    } finally {
      setLoading(false);
    }
  };

  const goHome = () => (onBackToHome ? onBackToHome() : setActiveSite('site1_open'));

  return (
    <div className="relative min-h-[100svh] bg-[var(--page-bg)]">
      <div className="mx-auto grid min-h-[100svh] w-full max-w-[1440px] lg:grid-cols-[1.05fr_1fr]">
        {/* ------------------------------------------------------------ */}
        {/* Visual column                                                 */}
        {/* ------------------------------------------------------------ */}
        <aside className="relative hidden overflow-hidden lg:sticky lg:top-3 lg:m-3 lg:block lg:h-[calc(100svh-24px)] lg:rounded-[36px]">
          <AuthVisual />

          <div className="relative flex h-full flex-col justify-between p-10 text-white">
            <EduLevelLogo size="md" variant="white" showSubtitle={false} />

            <div>
              <h2 className="max-w-[460px] font-display text-[clamp(2.2rem,3.4vw,3.2rem)] font-extrabold leading-[1.02] tracking-[-0.04em]">
                {mode === 'register' ? (
                  <>
                    Kabinetingiz <span className="auth-hl">2 daqiqada</span> tayyor.
                  </>
                ) : (
                  <>
                    Har kuni bir qadam — <span className="auth-hl">katta natija</span> sari.
                  </>
                )}
              </h2>
              {mode === 'register' ? (
                <ul className="glass-night mt-8 max-w-[440px] space-y-3.5 rounded-[24px] p-5">
                  {[
                    { t: 'Haqiqiy imtihon formatidagi mocklar', d: 'Server vaqti, avtomatik saqlash, batafsil tahlil' },
                    { t: 'Yo‘nalishingizga mos video darslar', d: 'Qayerda to‘xtagan bo‘lsangiz, o‘sha joydan davom' },
                    { t: 'Progress va tavsiyalar', d: 'Ko‘nikmalar, natijalar dinamikasi, keyingi qadam' },
                    { t: 'AI yordamchi', d: 'Writing va Speaking bo‘yicha taxminiy baho' }
                  ].map((b) => (
                    <li key={b.t} className="flex gap-3">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#ffb45c]" />
                      <span>
                        <span className="block text-[14px] font-semibold">{b.t}</span>
                        <span className="block text-[12px] text-white/60">{b.d}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
              <div className="glass-night mt-8 max-w-[440px] rounded-[24px] p-5">
                <div className="flex items-center gap-3.5">
                  {teacher.photoUrl ? (
                    <img src={teacher.photoUrl} alt={teacher.name} className="h-12 w-12 rounded-full object-cover ring-2 ring-white/20" />
                  ) : null}
                  <div className="min-w-0">
                    <div className="font-display text-[15px] font-bold">{teacher.name}</div>
                    <div className="truncate text-[12px] text-white/60">{teacher.title}</div>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3 border-t border-white/10 pt-4 text-center">
                  {[
                    { v: `${(teacher.studentsCount || 0).toLocaleString('en-US')}+`, l: 'o‘quvchi' },
                    { v: `${(teacher.nationalCertCount || 0).toLocaleString('en-US')}+`, l: 'sertifikat' },
                    { v: `${teacher.experienceYears || 0} yil`, l: 'tajriba' }
                  ].map((s) => (
                    <div key={s.l}>
                      <div className="font-display text-[18px] font-extrabold tabular-nums">{s.v}</div>
                      <div className="text-[11px] text-white/55">{s.l}</div>
                    </div>
                  ))}
                </div>
              </div>
              )}
            </div>
          </div>
        </aside>

        {/* ------------------------------------------------------------ */}
        {/* Form column                                                   */}
        {/* ------------------------------------------------------------ */}
        <main className="relative flex flex-col px-5 py-6 sm:px-10 lg:px-14">
          <div className="pointer-events-none absolute right-0 top-0 h-[420px] w-[420px] rounded-full bg-ember-500/10 soft-blob" />
          <div className="relative flex items-center justify-between">
            <button
              onClick={goHome}
              className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-[13px] font-semibold text-ink-muted transition-colors hover:bg-ink/[0.05] hover:text-ink dark:text-stone-400 dark:hover:bg-white/5 dark:hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" /> Bosh sahifa
            </button>
            <button
              onClick={toggleTheme}
              aria-label="Rejimni almashtirish"
              className="glass-premium flex h-10 w-10 items-center justify-center rounded-full text-ink-muted hover:text-ink dark:text-stone-300 dark:hover:text-white"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>

          <div className="relative mx-auto flex w-full max-w-[460px] flex-1 flex-col justify-center py-10">
            <div className="lg:hidden">
              <EduLevelLogo size="md" showSubtitle={false} />
            </div>

            <h1 className="mt-8 font-display text-[clamp(2rem,3.2vw,2.6rem)] font-extrabold leading-[1.05] tracking-[-0.04em] text-ink dark:text-white lg:mt-0">
              {mode === 'login' && 'Xush kelibsiz'}
              {mode === 'register' && ['Hisob yarating', 'Yo‘nalishni tanlang', 'Maqsadingiz', 'Hammasi to‘g‘rimi?'][onboardingStep]}
              {mode === 'creator' && 'Owner kirishi'}
            </h1>
            <p className="mt-2 text-[14.5px] text-ink-muted dark:text-stone-400">
              {mode === 'login' && 'Kabinetingizga kirib, o‘qishni davom ettiring.'}
              {mode === 'register' && ['Bir daqiqada, bepul. Ma’lumotlaringiz himoyalangan.', 'Kabinetingizdagi barcha dars, test va mocklar shu yo‘nalishga moslanadi.', 'Natija va kunlik reja — progress bo‘limi shunga qarab tavsiya beradi.', 'Ma’lumotlarni tekshiring va kabinetni yarating.'][onboardingStep]}
              {mode === 'creator' && 'Platforma boshqaruv paneliga xavfsiz kirish.'}
            </p>

            {/* Segmented control */}
            {onboardingStep === 0 && mode !== 'creator' ? (
              <div className="glass-subtle relative mt-7 grid grid-cols-2 rounded-full p-1">
                <span
                  aria-hidden="true"
                  className="absolute bottom-1 top-1 w-[calc(50%-4px)] rounded-full bg-white shadow-[0_4px_14px_-6px_rgba(18,16,14,0.3)] transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] dark:bg-white/10"
                  style={{ transform: mode === 'login' ? 'translateX(4px)' : 'translateX(calc(100% + 4px))' }}
                />
                {(['login', 'register'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => switchMode(m)}
                    className={cn(
                      'relative z-10 h-10 rounded-full text-[13.5px] font-semibold transition-colors',
                      mode === m ? 'text-ink dark:text-white' : 'text-ink-muted hover:text-ink dark:text-stone-400 dark:hover:text-white'
                    )}
                  >
                    {m === 'login' ? 'Kirish' : 'Ro‘yxatdan o‘tish'}
                  </button>
                ))}
              </div>
            ) : null}

            {mode === 'register' ? (
              <ol className="mt-7 flex items-center gap-2" aria-label="Ro‘yxatdan o‘tish bosqichlari">
                {REG_STEPS.map((label, i) => {
                  const done = i < onboardingStep;
                  const cur = i === onboardingStep;
                  return (
                    <li key={label} className="flex min-w-0 flex-1 items-center gap-2" aria-current={cur ? 'step' : undefined}>
                      <span
                        className={cn(
                          'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-bold transition-colors duration-300',
                          done ? 'bg-ink text-white dark:bg-white dark:text-ink' : cur ? 'bg-gradient-to-b from-[#ffa149] to-[#f2650f] text-white' : 'border border-line text-ink-muted dark:border-white/15 dark:text-stone-500'
                        )}
                      >
                        {done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : i + 1}
                      </span>
                      <span className={cn('hidden truncate text-[12px] font-semibold sm:block', cur ? 'text-ink dark:text-white' : 'text-ink-muted dark:text-stone-500')}>{label}</span>
                      {i < REG_STEPS.length - 1 ? <span className={cn('h-px flex-1', done ? 'bg-ink/40 dark:bg-white/40' : 'bg-line dark:bg-white/10')} /> : null}
                    </li>
                  );
                })}
              </ol>
            ) : null}

            {/* Alerts */}
            <div aria-live="polite">
              {errorMsg && (
                <div className="mt-6 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-[13px] text-rose-700 dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-300">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
              {successMsg && (
                <div className="mt-6 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-[13px] text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-300">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}
            </div>

            {/* LOGIN */}
            {mode === 'login' && (
              <form onSubmit={handleLoginSubmit} className="mt-7 space-y-4">
                <div>
                  <label className={labelCls} htmlFor="login-id">Telefon raqam yoki e-mail</label>
                  <div className={fieldWrap}>
                    <Phone className={fieldIcon} />
                    <input
                      id="login-id"
                      autoComplete="username"
                      value={loginInput}
                      onChange={(e) => setLoginInput(formatPhone(e.target.value))}
                      placeholder="+998 90 123 45 67"
                      className={fieldInput}
                    />
                  </div>
                </div>
                <div>
                  <label className={labelCls} htmlFor="login-pass">Parol</label>
                  <div className={fieldWrap}>
                    <Lock className={fieldIcon} />
                    <input
                      id="login-pass"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••"
                      className={fieldInput}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="mr-3 flex h-9 w-9 items-center justify-center rounded-full text-ink-muted hover:bg-ink/[0.05] dark:text-stone-400 dark:hover:bg-white/5"
                      aria-label={showPassword ? 'Parolni yashirish' : 'Parolni ko‘rsatish'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <PrimaryButton type="submit" disabled={loading} className="mt-2">
                  {loading ? 'Tekshirilmoqda…' : 'Kirish'}
                  {!loading && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />}
                </PrimaryButton>
              </form>
            )}

            {/* REGISTER — step 0 */}
            {mode === 'register' && onboardingStep === 0 && (
              <form onSubmit={handleStartOnboarding} className="mt-7 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls} htmlFor="reg-name">Ism *</label>
                    <div className={fieldWrap}>
                      <User className={fieldIcon} />
                      <input id="reg-name" autoComplete="given-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ism" className={fieldInput} />
                    </div>
                  </div>
                  <div>
                    <label className={labelCls} htmlFor="reg-surname">Familiya</label>
                    <div className={fieldWrap}>
                      <input id="reg-surname" autoComplete="family-name" value={surname} onChange={(e) => setSurname(e.target.value)} placeholder="Familiya" className={cn(fieldInput, 'pl-4')} />
                    </div>
                  </div>
                </div>
                <div>
                  <label className={labelCls} htmlFor="reg-id">Telefon raqam yoki e-mail *</label>
                  <div className={fieldWrap}>
                    <Phone className={fieldIcon} />
                    <input id="reg-id" autoComplete="username" value={identifier} onChange={(e) => setIdentifier(formatPhone(e.target.value))} placeholder="+998 90 123 45 67 yoki e-mail" inputMode="text" className={fieldInput} />
                  </div>
                </div>
                <div>
                  <label className={labelCls} htmlFor="reg-pass">Parol * (kamida 8 belgi)</label>
                  <div className={fieldWrap}>
                    <Lock className={fieldIcon} />
                    <input
                      id="reg-pass"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={registerPassword}
                      onChange={(e) => setRegisterPassword(e.target.value)}
                      placeholder="••••••••"
                      className={fieldInput}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="mr-3 flex h-9 w-9 items-center justify-center rounded-full text-ink-muted hover:bg-ink/[0.05] dark:text-stone-400 dark:hover:bg-white/5"
                      aria-label={showPassword ? 'Parolni yashirish' : 'Parolni ko‘rsatish'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {registerPassword ? (
                    <div className="mt-2.5">
                      <div className="flex gap-1.5" aria-hidden="true">
                        {[1, 2, 3].map((n) => (
                          <span
                            key={n}
                            className={cn(
                              'h-1 flex-1 rounded-full transition-colors duration-300',
                              strength.score >= n ? (strength.score === 1 ? 'bg-rose-500' : strength.score === 2 ? 'bg-amber-500' : 'bg-emerald-500') : 'bg-line dark:bg-white/10'
                            )}
                          />
                        ))}
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px]">
                        <span className="font-semibold text-ink dark:text-white">{strength.label}</span>
                        {strength.checks.map((c) => (
                          <span key={c.label} className={cn('inline-flex items-center gap-1', c.ok ? 'text-emerald-700 dark:text-emerald-400' : 'text-ink-muted dark:text-stone-500')}>
                            <Check className={cn('h-3 w-3', c.ok ? 'opacity-100' : 'opacity-30')} strokeWidth={3} /> {c.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls} htmlFor="reg-region">Hudud</label>
                    <div className={fieldWrap}>
                      <MapPin className={fieldIcon} />
                      <select id="reg-region" value={region} onChange={(e) => setRegion(e.target.value)} className={cn(fieldInput, 'cursor-pointer appearance-none')}>
                        {REGIONS.map((r) => (
                          <option key={r} value={r} className="text-ink">
                            {r}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className={labelCls} htmlFor="reg-tg">Telegram</label>
                    <div className={fieldWrap}>
                      <Send className={fieldIcon} />
                      <input id="reg-tg" value={telegramUsername} onChange={(e) => setTelegramUsername(e.target.value)} placeholder="@username" className={fieldInput} />
                    </div>
                  </div>
                </div>
                <PrimaryButton type="submit" className="mt-2">
                  Davom etish <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </PrimaryButton>
              </form>
            )}

            {/* REGISTER — onboarding wizard */}
            {mode === 'register' && onboardingStep > 0 && (
              <div className="mt-6">
                {onboardingStep === 1 && (
                  <div className="space-y-3" role="radiogroup" aria-label="Yo‘nalish">
                    {TRACKS.map((t) => {
                      const on = selectedTrack === t.id;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          role="radio"
                          aria-checked={on}
                          onClick={() => chooseTrack(t.id)}
                          className={cn(
                            'w-full rounded-[22px] border p-4 text-left transition-all duration-300 sm:p-5',
                            on ? 'border-ink bg-white shadow-[0_18px_40px_-24px_rgba(18,16,14,0.45)] dark:border-white dark:bg-white/[0.06]' : 'border-line bg-white/60 hover:border-ink/25 dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-white/25'
                          )}
                        >
                          <div className="flex items-start gap-3.5">
                            <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl font-display text-[12px] font-extrabold', on ? 'bg-gradient-to-b from-[#ffa149] to-[#f2650f] text-white' : 'bg-ink/[0.05] text-ink-muted dark:bg-white/10 dark:text-stone-300')}>
                              {t.short}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="flex items-center justify-between gap-2">
                                <span className="text-[15px] font-semibold text-ink dark:text-white">{t.title}</span>
                                <span className={cn('flex h-5 w-5 shrink-0 items-center justify-center rounded-full border', on ? 'border-ink bg-ink text-white dark:border-white dark:bg-white dark:text-ink' : 'border-line dark:border-white/20')}>
                                  {on ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
                                </span>
                              </span>
                              <span className="mt-0.5 block text-[12.5px] text-ink-muted dark:text-stone-400">{t.desc}</span>
                              <span className={cn('grid overflow-hidden transition-all duration-500', on ? 'mt-3 grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0')}>
                                <span className="min-h-0 space-y-1.5">
                                  {t.points.map((pt) => (
                                    <span key={pt} className="flex items-center gap-2 text-[12.5px] text-ink-soft dark:text-stone-300">
                                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-ember-600 dark:text-ember-400" /> {pt}
                                    </span>
                                  ))}
                                </span>
                              </span>
                            </span>
                          </div>
                        </button>
                      );
                    })}
                    <p className="flex items-start gap-2 px-1 pt-1 text-[12px] text-ink-muted dark:text-stone-500">
                      <Compass className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Faqat bitta yo‘nalish tanlanadi. Keyinchalik o‘zgartirish uchun ustozga murojaat qilasiz.
                    </p>
                  </div>
                )}

                {onboardingStep === 2 && (
                  <div className="space-y-6">
                    <div>
                      <div className="mb-3 flex items-center gap-2 text-[13px] font-semibold text-ink dark:text-white">
                        <Target className="h-4 w-4 text-ember-500" /> Maqsad natija
                      </div>
                      <div className="grid grid-cols-2 gap-2.5">
                        {TARGETS[selectedTrack].map((score) => (
                          <button
                            key={score}
                            type="button"
                            onClick={() => setSelectedTargetScore(score)}
                            className={cn(
                              'h-14 rounded-2xl border font-display text-[15px] font-bold transition-all',
                              selectedTargetScore === score ? 'border-ink bg-ink text-white dark:border-white dark:bg-white dark:text-ink' : 'border-line bg-white/60 text-ink hover:border-ink/25 dark:border-white/10 dark:bg-white/[0.03] dark:text-white'
                            )}
                          >
                            {score}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="mb-3 flex items-center gap-2 text-[13px] font-semibold text-ink dark:text-white">
                        <Clock className="h-4 w-4 text-ember-500" /> Kunlik vaqt
                      </div>
                      <div className="space-y-2">
                        {STUDY_TIMES.map((item) => (
                          <button
                            key={item.time}
                            type="button"
                            onClick={() => setSelectedStudyTime(item.time)}
                            className={cn(
                              'flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition-all',
                              selectedStudyTime === item.time ? 'border-ink bg-white dark:border-white dark:bg-white/[0.06]' : 'border-line bg-white/60 hover:border-ink/25 dark:border-white/10 dark:bg-white/[0.03]'
                            )}
                          >
                            <span>
                              <span className="block text-[14px] font-semibold text-ink dark:text-white">{item.time}</span>
                              <span className="block text-[12px] text-ink-muted dark:text-stone-400">{item.label}</span>
                            </span>
                            <span className={cn('flex h-5 w-5 items-center justify-center rounded-full border', selectedStudyTime === item.time ? 'border-ink bg-ink text-white dark:border-white dark:bg-white dark:text-ink' : 'border-line dark:border-white/20')}>
                              {selectedStudyTime === item.time ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {onboardingStep === 3 && (
                  <div>
                    <dl className="divide-y divide-line overflow-hidden rounded-[22px] border border-line bg-white/70 dark:divide-white/[0.08] dark:border-white/10 dark:bg-white/[0.03]">
                      {[
                        { k: 'Ism', v: `${name} ${surname}`.trim(), step: 0 },
                        { k: 'Telefon / e-mail', v: identifier, step: 0 },
                        { k: 'Hudud', v: region + (telegramUsername ? ` · @${telegramUsername.replace(/^@/, '')}` : ''), step: 0 },
                        { k: 'Yo‘nalish', v: TRACKS.find((t) => t.id === selectedTrack)?.title || '', step: 1 },
                        { k: 'Maqsad va vaqt', v: `${selectedTargetScore} · ${selectedStudyTime}`, step: 2 }
                      ].map((row) => (
                        <div key={row.k} className="flex items-center gap-3 px-4 py-3">
                          <dt className="w-[38%] shrink-0 text-[12px] text-ink-muted dark:text-stone-400">{row.k}</dt>
                          <dd className="min-w-0 flex-1 truncate text-[13.5px] font-semibold text-ink dark:text-white">{row.v}</dd>
                          <button type="button" onClick={() => setOnboardingStep(row.step)} className="text-[12px] font-semibold text-ember-700 hover:underline dark:text-ember-400">
                            O‘zgartirish
                          </button>
                        </div>
                      ))}
                    </dl>
                    <label className="mt-4 flex cursor-pointer items-start gap-3 text-[12.5px] leading-relaxed text-ink-muted dark:text-stone-400">
                      <input type="checkbox" checked={agreeTerms} onChange={(e) => setAgreeTerms(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-[#ef6c12]" />
                      Ma’lumotlarim kabinet va natijalarni saqlash uchun ishlatilishiga roziman. Parol shifrlangan holda saqlanadi.
                    </label>
                  </div>
                )}

                <div className="mt-7 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setOnboardingStep((s) => Math.max(0, s - 1))}
                    className="h-[54px] rounded-2xl border border-line px-6 text-[14px] font-semibold text-ink hover:bg-ink/[0.04] dark:border-white/10 dark:text-white dark:hover:bg-white/5"
                  >
                    Orqaga
                  </button>
                  {onboardingStep < 3 ? (
                    <PrimaryButton type="button" onClick={() => setOnboardingStep((s) => s + 1)}>
                      Davom etish <ArrowRight className="h-4 w-4" />
                    </PrimaryButton>
                  ) : (
                    <PrimaryButton type="button" onClick={handleCompleteRegistration} disabled={loading || !agreeTerms}>
                      {loading ? 'Yaratilmoqda…' : 'Kabinetni yaratish'} {!loading && <Sparkles className="h-4 w-4" />}
                    </PrimaryButton>
                  )}
                </div>
              </div>
            )}

            {/* OWNER */}
            {mode === 'creator' && (
              <form onSubmit={handleCreatorSubmit} className="mt-7 space-y-4">
                <div className="flex items-start gap-3 rounded-2xl border border-line bg-white/60 p-4 text-[13px] text-ink-muted dark:border-white/10 dark:bg-white/[0.03] dark:text-stone-400">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-ember-500" />
                  Platforma egasining boshqaruv paneli. Login va parol faqat egasiga ma’lum.
                </div>
                <div>
                  <label className={labelCls} htmlFor="owner-login">Login</label>
                  <div className={fieldWrap}>
                    <User className={fieldIcon} />
                    <input
                      id="owner-login"
                      autoComplete="username"
                      value={creatorLogin}
                      onChange={(e) => setCreatorLogin(e.target.value)}
                      placeholder="login"
                      className={fieldInput}
                    />
                  </div>
                </div>
                <div>
                  <label className={labelCls} htmlFor="owner-code">Parol</label>
                  <div className={fieldWrap}>
                    <KeyRound className={fieldIcon} />
                    <input
                      id="owner-code"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      value={creatorCode}
                      onChange={(e) => setCreatorCode(e.target.value)}
                      placeholder="••••••••"
                      className={fieldInput}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="mr-3 flex h-9 w-9 items-center justify-center rounded-full text-ink-muted hover:bg-ink/[0.05] dark:text-stone-400 dark:hover:bg-white/5"
                      aria-label={showPassword ? 'Parolni yashirish' : 'Parolni ko‘rsatish'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <PrimaryButton type="submit" disabled={loading}>
                  {loading ? 'Tekshirilmoqda…' : 'Boshqaruv paneliga kirish'}
                </PrimaryButton>
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="w-full text-center text-[13px] font-semibold text-ink-muted hover:text-ink dark:text-stone-400 dark:hover:text-white"
                >
                  O‘quvchi sifatida kirish
                </button>
              </form>
            )}

            {/* Google */}
            {mode !== 'creator' && onboardingStep === 0 ? (
              <>
                {mode === 'register' ? (
                  <div className="mt-6">
                    <div className="mb-2 text-[12px] font-semibold text-ink-muted dark:text-stone-400">
                      Google orqali ro‘yxatdan o‘tsangiz, yo‘nalishingiz:
                    </div>
                    <div className="glass-subtle grid grid-cols-3 rounded-full p-1">
                      {TRACKS.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => chooseTrack(t.id)}
                          className={cn(
                            'h-9 rounded-full text-[12.5px] font-semibold transition-all',
                            selectedTrack === t.id
                              ? 'bg-gradient-to-b from-[#ffa149] to-[#f2650f] text-white shadow-[0_8px_18px_-8px_rgba(242,101,15,0.8)]'
                              : 'text-ink-muted hover:text-ink dark:text-stone-400 dark:hover:text-white'
                          )}
                        >
                          {t.id === 'ielts' ? 'IELTS' : t.id === 'cefr' ? 'CEFR' : 'General'}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
                <div className="my-6 flex items-center gap-4 text-[12px] text-ink-muted dark:text-stone-500">
                  <span className="h-px flex-1 bg-line dark:bg-white/10" /> yoki <span className="h-px flex-1 bg-line dark:bg-white/10" />
                </div>
                <button
                  type="button"
                  onClick={handleGoogleAuthLogin}
                  disabled={loading}
                  className="glass-premium flex h-[52px] w-full items-center justify-center gap-3 rounded-2xl text-[14px] font-semibold text-ink transition-transform hover:-translate-y-0.5 disabled:opacity-60 dark:text-white"
                >
                  <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" aria-hidden="true">
                    <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.4 14.6 2.4 12 2.4 6.7 2.4 2.4 6.7 2.4 12s4.3 9.6 9.6 9.6c5.5 0 9.2-3.9 9.2-9.4 0-.6-.1-1.1-.2-1.6H12z" />
                  </svg>
                  Google bilan davom etish
                </button>
              </>
            ) : null}
          </div>

          <p className="relative text-center text-[11.5px] text-ink-muted/80 dark:text-stone-500">
            © {new Date().getFullYear()} Edu Level · IELTS · CEFR · General English
          </p>
        </main>
      </div>
    </div>
  );
};
