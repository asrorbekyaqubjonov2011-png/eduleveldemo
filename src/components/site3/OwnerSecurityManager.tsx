import React, { useEffect, useState } from 'react';
import { KeyRound, ShieldCheck, User, Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Glass, Button } from '../ui';
import { Reveal } from '../ui/motion-primitives';
import { cn, field, label } from '../ui/styles';

/** Owner account: change login name and password (hash stored on the server). */
export const OwnerSecurityManager: React.FC = () => {
  const { ownerChangePassword } = useApp();
  const [currentLogin, setCurrentLogin] = useState('');
  const [newLogin, setNewLogin] = useState('');
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    fetch('/api/auth/me', { cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => {
        if (j?.ownerUsername) {
          setCurrentLogin(j.ownerUsername);
          setNewLogin(j.ownerUsername);
        }
      })
      .catch(() => {});
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (!currentPass) return setMsg({ ok: false, text: 'Joriy parolni kiriting.' });
    if (newPass && newPass.length < 8) return setMsg({ ok: false, text: 'Yangi parol kamida 8 belgidan iborat bo‘lsin.' });
    if (newPass !== confirmPass) return setMsg({ ok: false, text: 'Yangi parol va tasdiq bir xil emas.' });
    const loginChanged = newLogin.trim() && newLogin.trim() !== currentLogin;
    if (!loginChanged && !newPass) return setMsg({ ok: false, text: 'Yangi login yoki yangi parol kiriting.' });
    setBusy(true);
    try {
      const res = await ownerChangePassword(currentPass, newPass, loginChanged ? newLogin.trim() : undefined);
      if (res.success) {
        setMsg({ ok: true, text: 'Saqlandi. Keyingi kirishda yangi ma’lumotlardan foydalaning.' });
        if (res.ownerUsername) setCurrentLogin(res.ownerUsername);
        setCurrentPass('');
        setNewPass('');
        setConfirmPass('');
      } else {
        setMsg({ ok: false, text: res.message || 'Saqlab bo‘lmadi.' });
      }
    } finally {
      setBusy(false);
    }
  };

  const strength = newPass.length >= 14 ? 3 : newPass.length >= 10 ? 2 : newPass.length >= 8 ? 1 : 0;

  return (
    <div className="space-y-6">
      <Reveal>
        <header>
          <span className="inline-flex items-center gap-2 rounded-full border border-line/80 bg-white/70 px-3.5 py-1.5 text-[10.5px] font-bold uppercase tracking-[0.16em] text-ink-muted dark:border-white/10 dark:bg-white/[0.05] dark:text-stone-400">
            <ShieldCheck className="h-3.5 w-3.5 text-ember-500" /> Xavfsizlik
          </span>
          <h1 className="mt-4 font-display text-[clamp(1.6rem,3.2vw,2.25rem)] font-extrabold leading-[1.07] tracking-[-0.035em] text-ink dark:text-white">
            Kirish ma’lumotlari
          </h1>
          <p className="mt-2 max-w-xl text-[14px] text-ink-muted dark:text-stone-400">
            Boshqaruv paneliga kirish uchun login va parol. Parol serverda faqat shifrlangan (hash) ko‘rinishda saqlanadi.
          </p>
        </header>
      </Reveal>

      <Reveal delay={80}>
        <Glass level={2} radius="rounded-[28px]" className="max-w-2xl p-6 sm:p-8">
          <div className="mb-6 flex items-center gap-3 rounded-2xl border border-line/70 bg-white/60 p-4 dark:border-white/10 dark:bg-white/[0.04]">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-b from-[#ffa149] to-[#f2650f] text-white">
              <User className="h-4 w-4" />
            </span>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-muted dark:text-stone-400">Joriy login</div>
              <div className="font-display text-[17px] font-bold text-ink dark:text-white">{currentLogin || '—'}</div>
            </div>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className={label}>Yangi login (ixtiyoriy)</label>
              <input value={newLogin} onChange={(e) => setNewLogin(e.target.value)} className={field} autoComplete="username" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={label}>Yangi parol</label>
                <input
                  type={show ? 'text' : 'password'}
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                  className={field}
                  autoComplete="new-password"
                  placeholder="kamida 8 belgi"
                />
              </div>
              <div>
                <label className={label}>Yangi parolni tasdiqlang</label>
                <input
                  type={show ? 'text' : 'password'}
                  value={confirmPass}
                  onChange={(e) => setConfirmPass(e.target.value)}
                  className={field}
                  autoComplete="new-password"
                />
              </div>
            </div>
            <div className="flex gap-1.5" aria-hidden="true">
              {[1, 2, 3].map((n) => (
                <span key={n} className={cn('h-1 flex-1 rounded-full transition-colors', strength >= n ? 'bg-ember-500' : 'bg-line dark:bg-white/10')} />
              ))}
            </div>
            <div className="border-t border-line/70 pt-4 dark:border-white/10">
              <label className={label}>Joriy parol (tasdiqlash uchun) *</label>
              <div className="relative">
                <input
                  type={show ? 'text' : 'password'}
                  value={currentPass}
                  onChange={(e) => setCurrentPass(e.target.value)}
                  className={cn(field, 'pr-12')}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShow((v) => !v)}
                  className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-ink-muted hover:bg-ink/[0.05] dark:text-stone-400 dark:hover:bg-white/5"
                  aria-label="Parolni ko‘rsatish"
                >
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {msg ? (
              <div
                className={cn(
                  'flex items-start gap-2.5 rounded-2xl border p-3.5 text-[13px]',
                  msg.ok
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-300'
                    : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-300'
                )}
              >
                {msg.ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />}
                {msg.text}
              </div>
            ) : null}

            <Button type="submit" variant="ember" size="lg" disabled={busy} className="w-full" iconLeft={<KeyRound className="h-4 w-4" />}>
              {busy ? 'Saqlanmoqda…' : 'Saqlash'}
            </Button>
          </form>
        </Glass>
      </Reveal>
    </div>
  );
};
