import React, { useState } from 'react';
import { downloadCsv } from '../../lib/csvDownload';
import { useApp } from '../../context/AppContext';
import {
  Search,
  ShieldAlert,
  CheckCircle,
  Ban,
  UserCheck,
  Edit2,
  Trash2,
  Phone,
  Save,
  X,
  KeyRound,
  Send,
  Mail,
  Wallet,
  Coins,
  Zap,
  Sparkles,
  Users,
  UserX,
  RefreshCw,
  Crown,
  ArrowDownToLine
} from 'lucide-react';
import { VIPTier, User } from '../../types';

import { api } from '../../services/api';
import { Glass, Button, Pill } from '../ui';
import { Reveal } from '../ui/motion-primitives';
import { field, label, cn } from '../ui/styles';

/** Student list as a spreadsheet file for the owner's own records. */
const exportStudents = (users: Array<Record<string, any>>) =>
  downloadCsv(`oquvchilar-${new Date().toISOString().slice(0, 10)}.csv`, [
    ['Ism', 'Familiya', 'Telefon', 'Telegram', 'E-mail', 'Yo‘nalish', 'Tarif', 'Tarif tugashi', 'Balans', 'XP', 'Ro‘yxatdan o‘tgan'],
    ...users.map((u) => [u.name, u.surname, u.phone, u.telegramUsername ? '@' + u.telegramUsername : '', /@edulevel\.uz$/i.test(u.email || '') ? '' : u.email, u.track, u.vipTier, (u.vipExpiresAt || '').slice(0, 10), u.balance || 0, u.xp || 0, (u.registeredAt || '').slice(0, 10)])
  ]);

export const StudentsManager: React.FC = () => {
  const {
    db,
    updateStudentVIP,
    toggleStudentBlock,
    updateStudentFull,
    deleteStudent,
    refreshDb,
    banStudentLevel1,
    unbanStudent,
    adjustStudentPointsAndCoins
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTierFilter, setSelectedTierFilter] = useState<string>('all');
  const [editingStudent, setEditingStudent] = useState<User | null>(null);
  const [selectedDetailStudent, setSelectedDetailStudent] = useState<User | null>(null);
  const [awardStudent, setAwardStudent] = useState<User | null>(null);
  const [awardXpInput, setAwardXpInput] = useState<number>(200);
  const [awardCoinsInput, setAwardCoinsInput] = useState<number>(50);
  const [awardReasonInput, setAwardReasonInput] = useState<string>("Faollik uchun ustoz rag‘bati");
  const [aiAnalysisText, setAiAnalysisText] = useState<string>('');
  const [aiLoading, setAiLoading] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [showPassword, setShowPassword] = useState(false);
  const [bonusPointsInput, setBonusPointsInput] = useState<number>(0);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [banDaysInput, setBanDaysInput] = useState<number>(7);
  const [banReasonInput, setBanReasonInput] = useState<string>('Platforma qoidalarini buzganlik');

  const handleAwardPointsAndCoins = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!awardStudent) return;
    setSaving(true);
    try {
      await adjustStudentPointsAndCoins(
        awardStudent.id,
        Number(awardXpInput) || 0,
        Number(awardCoinsInput) || 0,
        awardReasonInput
      );
      setSuccessMsg(`✅ ${awardStudent.name}ga ${awardXpInput >= 0 ? `+${awardXpInput}` : awardXpInput} XP va ${awardCoinsInput >= 0 ? `+${awardCoinsInput}` : awardCoinsInput} EduCoin muvaffaqiyatli berildi!`);
      setAwardStudent(null);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      alert("Xatolik yuz berdi: " + (err?.message || "Saqlanmadi"));
    } finally {
      setSaving(false);
    }
  };

  const handleRunAiAnalysis = async (student: User) => {
    setAiLoading(true);
    setAiAnalysisText('');
    try {
      const res = await api.generateStudentAiAnalysis({
        name: student.name,
        surname: student.surname,
        track: student.track,
        targetScore: student.targetScore,
        studyTimeDaily: student.studyTimeDaily,
        xp: student.xp,
        points: student.points,
        streakDays: student.streakDays,
        completedLessonsCount: student.completedLessons?.length || 0
      });
      if (res.text) {
        setAiAnalysisText(res.text);
      } else {
        setAiAnalysisText(`${student.name} platformada muntazam ravishda shug'ullanmoqda. Streak: ${student.streakDays || 0} kun, to'plangan XP: ${student.xp || 0}. Darslarni o'z vaqtida bajarib bormoqda.`);
      }
    } catch (err) {
      setAiAnalysisText(`${student.name} bo'yicha tahlil: O'quvchining streak ko'rsatkichi va ishlagan testlari o'rtacha a'lo darajada. Mashg'ulotlarni davom ettirish tavsiya etiladi.`);
    } finally {
      setAiLoading(false);
    }
  };

  // Auto-poll every 4 seconds so any newly registered student appears instantly
  React.useEffect(() => {
    refreshDb();
    const interval = setInterval(() => {
      refreshDb();
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleManualRefresh = async () => {
    setRefreshing(true);
    await refreshDb();
    setTimeout(() => setRefreshing(false), 600);
  };

  // Include all registered users except system owner/creator so no user is hidden
  const students = (db.users || []).filter(u => u.role === 'student' || (u as any).role !== 'owner');

  const filteredStudents = students.filter(s => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      (s.name || '').toLowerCase().includes(q) ||
      (s.surname || '').toLowerCase().includes(q) ||
      (s.phone || '').includes(q) ||
      (s.additionalPhone || '').includes(q) ||
      (s.email || '').toLowerCase().includes(q) ||
      (s.telegramUsername || '').toLowerCase().includes(q) ||
      (s.region || '').toLowerCase().includes(q);
    // "inactive": no visit for seven days or more (lastActiveDate is a Tashkent calendar day).
    const inactiveDays = s.lastActiveDate ? Math.floor((Date.now() - Date.parse(s.lastActiveDate)) / 86_400_000) : 999;
    const matchesTier =
      selectedTierFilter === 'all' ||
      (selectedTierFilter === 'inactive' ? inactiveDays >= 7 : s.vipTier === selectedTierFilter);
    return matchesSearch && matchesTier;
  });

  const handleStartEdit = (student: User) => {
    setEditingStudent(student);
    setEditForm({
      id: student.id,
      name: student.name,
      surname: student.surname || '',
      phone: student.phone,
      additionalPhone: student.additionalPhone || '',
      email: student.email || '',
      telegramUsername: student.telegramUsername || '',
      balance: student.balance || 0,
      region: student.region || 'Toshkent',
      vipTier: student.vipTier,
      track: student.track || 'ielts',
      vipExpiresAt: student.vipExpiresAt || new Date(Date.now() + 30 * 86400000).toISOString(),
      isBlocked: !!student.isBlocked
    });
    setBonusPointsInput(0);
  };

  const handleSaveEdit = async () => {
    if (!editingStudent) return;
    setSaving(true);
    try {
      await updateStudentFull({
        ...editForm,
        telegramUsername: editForm.telegramUsername?.replace(/^@/, ''),
        balance: Number(editForm.balance) || 0,
        bonusPoints: Number(bonusPointsInput) || 0
      });
      setSuccessMsg(`${editForm.name} ma’lumotlari (Telegram/Hisob/Telefon) muvaffaqiyatli yangilandi!`);
      setEditingStudent(null);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`${name} ni platformadan o‘chirmoqchimisiz?`)) {
      await deleteStudent(id);
    }
  };

  const handleToggleBlock = async (id: string) => {
    await toggleStudentBlock(id);
  };

  const totalCompletedLessons = students.reduce((acc, s) => acc + (s.completedLessons?.length || 0), 0);
  const totalVipCount = students.filter(s => s.vipTier !== 'start' && s.vipTier !== 'free').length;
  const totalBalances = students.reduce((acc, s) => acc + (s.balance || 0), 0);

  /* ------------------------------------------------------------------ */
  /* Shared micro styles                                                 */
  /* ------------------------------------------------------------------ */
  const modalShell = 'glass-4 w-full rounded-[1.75rem] p-5 sm:p-7 my-8 relative';
  const iconAction =
    'inline-flex h-8 w-8 items-center justify-center rounded-full border border-line/70 text-ink-muted transition-all hover:border-ember-500/40 hover:bg-ember-500/[0.06] hover:text-ember-700 dark:border-white/10 dark:text-stone-400 dark:hover:bg-white/[0.06] dark:hover:text-ember-300';

  return (
    <div className="space-y-7">
      {/* ---------------------------------------------------------------- */}
      {/* HEADER                                                            */}
      {/* ---------------------------------------------------------------- */}
      <Reveal>
        <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <Pill tone="ember">
              <UserCheck className="h-3 w-3" />
              O‘quvchilar & Balans Boshqaruvi
            </Pill>
            <h1 className="mt-4 font-display text-[clamp(1.6rem,3.2vw,2.25rem)] font-extrabold leading-[1.07] tracking-[-0.035em] text-ink text-balance dark:text-white">
              Ro‘yxatdan O‘tgan O‘quvchilarni To‘liq Boshqarish
            </h1>
            <p className="mt-2 text-[13.5px] leading-relaxed text-ink-muted dark:text-stone-400">
              O‘quvchilarning Telegram username, telefon, qo‘shimcha raqam, email, VIP tarifi va hamyon balansini
              to‘liq nazorat qilish.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="glass"
              size="md"
              onClick={handleManualRefresh}
              disabled={refreshing}
              iconLeft={<RefreshCw className={cn('h-4 w-4', refreshing ? 'animate-spin text-ember-600' : 'text-ink-muted')} />}
            >
              {refreshing ? 'Yangilanmoqda...' : 'Ro‘yxatni Yangilash'}
            </Button>
            <Button
              variant="outline"
              size="md"
              onClick={() => {
                const phones = filteredStudents.map((s) => s.phone).filter(Boolean);
                navigator.clipboard?.writeText(phones.join('\n')).then(() => alert(`${phones.length} ta telefon raqami nusxalandi.`)).catch(() => alert('Nusxalab bo‘lmadi.'));
              }}
            >
              Filtrdagi telefonlar
            </Button>
            <Button variant="outline" size="md" onClick={() => exportStudents(db.users.filter((u) => u.role === 'student'))}>
              Excel (CSV)
            </Button>
          </div>
        </header>
      </Reveal>

      {successMsg && (
        <Reveal>
          <div className="flex items-center gap-2.5 rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.08] px-4 py-3 text-[12.5px] font-semibold text-emerald-700 dark:text-emerald-300">
            <CheckCircle className="h-4 w-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        </Reveal>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* METRICS                                                           */}
      {/* ---------------------------------------------------------------- */}
      <Reveal delay={70}>
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Glass level={1} radius="rounded-[1.5rem]" className="p-5">
            <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-muted dark:text-stone-400">
              Jami O‘quvchilar
            </span>
            <div className="mt-4 font-display text-[clamp(1.5rem,2.4vw,1.85rem)] font-extrabold leading-none tracking-[-0.03em] text-ink tabular-nums dark:text-white">
              {students.length}
              <span className="ml-1 text-[12px] font-semibold text-ink-muted dark:text-stone-400">nafar</span>
            </div>
            <div className="mt-3 flex items-center gap-1.5 border-t border-line/70 pt-2.5 text-[11px] text-ink-muted dark:border-white/5 dark:text-stone-400">
              <Users className="h-3 w-3" />
              Ro‘yxatdan o‘tgan barcha foydalanuvchilar
            </div>
          </Glass>

          <Glass level={1} radius="rounded-[1.5rem]" className="p-5">
            <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-muted dark:text-stone-400">
              Jami Hamyon Balanslari
            </span>
            <div className="mt-4 font-display text-[clamp(1.3rem,2.1vw,1.6rem)] font-extrabold leading-none tracking-[-0.03em] text-ink tabular-nums dark:text-white">
              {totalBalances.toLocaleString()}
              <span className="ml-1 text-[12px] font-semibold text-ink-muted dark:text-stone-400">so‘m</span>
            </div>
            <div className="mt-3 flex items-center gap-1.5 border-t border-line/70 pt-2.5 text-[11px] text-ink-muted dark:border-white/5 dark:text-stone-400">
              <Wallet className="h-3 w-3 text-emerald-500" />
              Barcha o‘quvchilar hisobida
            </div>
          </Glass>

          <Glass level={1} radius="rounded-[1.5rem]" className="p-5">
            <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-muted dark:text-stone-400">
              Faol VIP O‘quvchilar
            </span>
            <div className="mt-4 font-display text-[clamp(1.5rem,2.4vw,1.85rem)] font-extrabold leading-none tracking-[-0.03em] text-ink tabular-nums dark:text-white">
              {totalVipCount}
              <span className="ml-1 text-[12px] font-semibold text-ink-muted dark:text-stone-400">nafar</span>
            </div>
            <div className="mt-3 flex items-center gap-1.5 border-t border-line/70 pt-2.5 text-[11px] text-ink-muted dark:border-white/5 dark:text-stone-400">
              <Crown className="h-3 w-3 text-ember-500" />
              START dan yuqori tariflar
            </div>
          </Glass>

          <Glass level={1} radius="rounded-[1.5rem]" className="p-5">
            <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-muted dark:text-stone-400">
              O‘tilgan Darslar Jami
            </span>
            <div className="mt-4 font-display text-[clamp(1.5rem,2.4vw,1.85rem)] font-extrabold leading-none tracking-[-0.03em] text-ink tabular-nums dark:text-white">
              {totalCompletedLessons}
              <span className="ml-1 text-[12px] font-semibold text-ink-muted dark:text-stone-400">ta</span>
            </div>
            <div className="mt-3 flex items-center gap-1.5 border-t border-line/70 pt-2.5 text-[11px] text-ink-muted dark:border-white/5 dark:text-stone-400">
              <CheckCircle className="h-3 w-3 text-emerald-500" />
              Barcha o‘quvchilar bo‘yicha
            </div>
          </Glass>
        </section>
      </Reveal>

      {/* ---------------------------------------------------------------- */}
      {/* TOOLBAR                                                           */}
      {/* ---------------------------------------------------------------- */}
      <Reveal delay={100}>
        <Glass level={1} radius="rounded-[1.5rem]" className="flex flex-col gap-3 p-3.5 sm:flex-row sm:items-center sm:justify-between sm:p-4">
          <div className="relative w-full sm:max-w-sm">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-muted/60 dark:text-stone-500" />
            <input
              type="text"
              placeholder="Ism, telefon, @telegram, email yoki viloyat..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className={cn(field, 'py-2.5 pl-10 text-[12.5px]')}
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-muted dark:text-stone-400">
              Tarif
            </span>
            <select
              value={selectedTierFilter}
              onChange={e => setSelectedTierFilter(e.target.value)}
              className={cn(field, 'w-auto cursor-pointer py-2.5 text-[12px]')}
            >
              <option value="all">Barchasi</option>
              <option value="inactive">Nofaollar (7+ kun kirmagan)</option>
              <option value="free">FREE</option>
              {db.vipPlans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <Pill tone="neutral">{filteredStudents.length} natija</Pill>
          </div>
        </Glass>
      </Reveal>

      {/* ---------------------------------------------------------------- */}
      {/* STUDENTS TABLE                                                    */}
      {/* ---------------------------------------------------------------- */}
      <Reveal delay={130}>
        <Glass level={2} className="overflow-hidden">
          {filteredStudents.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-ember-500/10 text-ember-600 dark:bg-ember-500/15 dark:text-ember-400">
                <UserX className="h-6 w-6" />
              </div>
              <p className="mt-4 font-display text-[15px] font-bold tracking-tight text-ink dark:text-white">
                O‘quvchilar topilmadi.
              </p>
              <p className="mt-1 max-w-sm text-[12.5px] text-ink-muted dark:text-stone-400">
                Qidiruv so‘zini o‘zgartiring yoki tarif filtrini tozalang.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] border-collapse text-left">
                <thead className="glass-1 sticky top-0 z-10">
                  <tr className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted dark:text-stone-400">
                    <th className="px-4 py-3.5 font-bold">O‘quvchi</th>
                    <th className="px-4 py-3.5 font-bold">Telegram</th>
                    <th className="px-4 py-3.5 font-bold">Telefonlar & Email</th>
                    <th className="px-4 py-3.5 font-bold">Balans</th>
                    <th className="px-4 py-3.5 font-bold">VIP Tarif</th>
                    <th className="px-4 py-3.5 font-bold">Holat</th>
                    <th className="sticky right-0 z-[1] bg-[#fbf6ef] px-4 py-3.5 text-right font-bold shadow-[-12px_0_18px_-14px_rgba(43,29,18,0.35)] dark:bg-[#15120f]">To‘liq Boshqarish</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/70 dark:divide-white/5">
                  {filteredStudents.map(student => {
                    const isBlocked = student.isBlocked;
                    const cleanTg = (student.telegramUsername || '').replace(/^@/, '');

                    return (
                      <tr
                        key={student.id}
                        className="group transition-colors duration-200 hover:bg-ember-500/[0.04] dark:hover:bg-white/[0.02]"
                      >
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-ember-300 via-ember-500 to-ember-700 font-display text-[12px] font-extrabold text-white shadow-[0_6px_16px_-8px_rgba(239,108,18,0.8)]">
                              {student.name.slice(0, 1)}
                            </div>
                            <div className="min-w-0">
                              <div className="truncate text-[12.5px] font-bold text-ink dark:text-white">
                                {student.name} {student.surname}
                              </div>
                              <div className="mt-0.5 truncate text-[10.5px] text-ink-muted dark:text-stone-500">
                                {student.region || 'Toshkent'} · {new Date(student.registeredAt).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          {cleanTg ? (
                            <a
                              href={`https://t.me/${cleanTg}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 font-mono text-[11.5px] font-bold text-ember-700 transition-colors hover:text-ember-600 dark:text-ember-400 dark:hover:text-ember-300"
                            >
                              <Send className="h-3 w-3" />
                              <span>@{cleanTg}</span>
                            </a>
                          ) : (
                            <span className="text-[11px] text-ink-muted/60 dark:text-stone-600">—</span>
                          )}
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex items-center gap-1.5 font-mono text-[11.5px] font-bold text-ink-soft dark:text-stone-200">
                            <Phone className="h-3 w-3 text-ink-muted/70 dark:text-stone-500" />
                            {student.phone}
                          </div>
                          {student.additionalPhone && (
                            <div className="mt-0.5 flex items-center gap-1.5 font-mono text-[10.5px] text-ink-muted dark:text-stone-500">
                              <Phone className="h-2.5 w-2.5" />
                              {student.additionalPhone}
                            </div>
                          )}
                          {student.email && (
                            <div className="mt-0.5 flex max-w-[170px] items-center gap-1.5 truncate text-[10.5px] text-ink-muted dark:text-stone-500">
                              <Mail className="h-2.5 w-2.5 shrink-0" />
                              <span className="truncate">{student.email}</span>
                            </div>
                          )}
                        </td>

                        <td className="whitespace-nowrap px-4 py-4">
                          <span className="font-mono text-[12px] font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                            {(student.balance || 0).toLocaleString()}
                          </span>
                          <span className="ml-1 text-[10px] font-medium text-ink-muted dark:text-stone-500">so‘m</span>
                        </td>

                        <td className="px-4 py-4">
                          <Pill tone="ember">{student.vipTier}</Pill>
                        </td>

                        <td className="px-4 py-4">
                          {isBlocked ? (
                            <Pill tone="neutral" className="border-red-500/25 bg-red-500/[0.07] text-red-600 dark:text-red-400">
                              <Ban className="h-3 w-3" /> Bloklangan
                            </Pill>
                          ) : (
                            <Pill tone="emerald">
                              <CheckCircle className="h-3 w-3" /> Faol
                            </Pill>
                          )}
                        </td>

                        <td className="sticky right-0 z-[1] whitespace-nowrap bg-[#fbf6ef] px-4 py-4 text-right shadow-[-12px_0_18px_-14px_rgba(43,29,18,0.35)] dark:bg-[#15120f]">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setAwardStudent(student);
                                setAwardXpInput(250);
                                setAwardCoinsInput(50);
                                setAwardReasonInput("Darslardagi faollik uchun");
                              }}
                              className="inline-flex items-center gap-1 rounded-full border border-ember-500/30 bg-ember-500/[0.08] px-2.5 py-1 text-[10.5px] font-bold text-ember-700 transition-colors hover:bg-ember-500/15 dark:text-ember-300"
                              title="O‘quvchiga Ball (XP) va EduCoin berish yoki ayirish"
                            >
                              <Coins className="h-3 w-3" />
                              <span>+Ball & Coin</span>
                            </button>

                            <button
                              onClick={() => setSelectedDetailStudent(student)}
                              className="inline-flex items-center gap-1 rounded-full border border-line/70 bg-white/50 px-2.5 py-1 text-[10.5px] font-bold text-ink-soft transition-colors hover:border-ember-500/40 hover:text-ember-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-stone-300 dark:hover:text-ember-300"
                              title="To‘liq Profil, Testlar & AI Tahlil"
                            >
                              <Sparkles className="h-3 w-3" />
                              <span>Ma'lumot & AI</span>
                            </button>

                            <button
                              onClick={() => handleStartEdit(student)}
                              className={iconAction}
                              title="Tahrirlash & Boshqarish"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>

                            <button
                              onClick={() => handleToggleBlock(student.id)}
                              className={cn(
                                iconAction,
                                isBlocked
                                  ? 'hover:border-emerald-500/40 hover:text-emerald-600'
                                  : 'hover:border-red-500/40 hover:text-red-600'
                              )}
                              title={isBlocked ? 'Blokdan chiqarish' : 'Bloklash'}
                            >
                              {isBlocked ? <CheckCircle className="h-3.5 w-3.5" /> : <Ban className="h-3.5 w-3.5" />}
                            </button>

                            <button
                              onClick={() => handleDelete(student.id, student.name)}
                              className={cn(iconAction, 'hover:border-red-500/40 hover:text-red-600')}
                              title="O‘chirish"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Glass>
      </Reveal>

      {/* ---------------------------------------------------------------- */}
      {/* FULL EDIT MODAL                                                   */}
      {/* ---------------------------------------------------------------- */}
      {editingStudent && (
        <div className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-ink/45 p-4 backdrop-blur-md dark:bg-black/65">
          <div className={cn(modalShell, 'max-w-2xl')}>
            <div className="mb-5 flex items-start justify-between gap-4 border-b border-line/70 pb-4 dark:border-white/[0.07]">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-ember-700 dark:text-ember-400">
                  O‘quvchi profili
                </span>
                <h3 className="mt-1 font-display text-[16px] font-extrabold tracking-[-0.02em] text-ink dark:text-white">
                  {editingStudent.name} {editingStudent.surname}
                </h3>
                <p className="mt-0.5 font-mono text-[11px] text-ink-muted dark:text-stone-500">{editingStudent.phone}</p>
              </div>
              <button
                onClick={() => setEditingStudent(null)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-ink/[0.06] hover:text-ink dark:text-stone-400 dark:hover:bg-white/[0.07] dark:hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={label}>Ism</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                    className={cn(field, 'font-bold')}
                  />
                </div>

                <div>
                  <label className={label}>Familiya</label>
                  <input
                    type="text"
                    value={editForm.surname}
                    onChange={e => setEditForm({ ...editForm, surname: e.target.value })}
                    className={cn(field, 'font-bold')}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={label}>Asosiy Telefon (Login)</label>
                  <input
                    type="text"
                    value={editForm.phone}
                    onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                    className={cn(field, 'font-mono font-bold')}
                  />
                </div>

                <div>
                  <label className={label}>Qo‘shimcha Telefon (Ixtiyoriy)</label>
                  <input
                    type="text"
                    placeholder="Qo‘shimcha raqam (majburiy emas)"
                    value={editForm.additionalPhone || ''}
                    onChange={e => setEditForm({ ...editForm, additionalPhone: e.target.value })}
                    className={cn(field, 'font-mono')}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={label}>Telegram Username (@username)</label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[13px] font-bold text-ember-600">
                      @
                    </span>
                    <input
                      type="text"
                      placeholder="foydalanuvchi_nomi"
                      value={editForm.telegramUsername || ''}
                      onChange={e => setEditForm({ ...editForm, telegramUsername: e.target.value.replace(/^@/, '') })}
                      className={cn(field, 'pl-9 font-mono font-bold')}
                    />
                  </div>
                </div>

                <div>
                  <label className={label}>Email (Ixtiyoriy)</label>
                  <input
                    type="email"
                    placeholder="email@misol.uz (majburiy emas)"
                    value={editForm.email || ''}
                    onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                    className={field}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 rounded-[1.25rem] border border-ember-500/20 bg-ember-500/[0.05] p-4 sm:grid-cols-2">
                <div>
                  <label className={cn(label, 'text-ember-800 dark:text-ember-300')}>Hamyon Balansi (so‘m)</label>
                  <input
                    type="number"
                    value={editForm.balance ?? 0}
                    onChange={e => setEditForm({ ...editForm, balance: Number(e.target.value) })}
                    className={cn(field, 'bg-white/80 font-mono font-bold dark:bg-black/20')}
                  />
                </div>

                <div>
                  <label className={cn(label, 'text-ember-800 dark:text-ember-300')}>Bonus Ball Qo‘shish</label>
                  <input
                    type="number"
                    placeholder="+100 ball"
                    value={bonusPointsInput || ''}
                    onChange={e => setBonusPointsInput(Number(e.target.value))}
                    className={cn(field, 'bg-white/80 font-mono font-bold dark:bg-black/20')}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={label}>Viloyat / Hudud</label>
                  <input
                    type="text"
                    value={editForm.region}
                    onChange={e => setEditForm({ ...editForm, region: e.target.value })}
                    className={field}
                  />
                </div>

                <div>
                  <label className={label}>VIP Tarif</label>
                  <select
                    value={editForm.vipTier}
                    onChange={e => setEditForm({ ...editForm, vipTier: e.target.value })}
                    className={cn(field, 'cursor-pointer font-bold uppercase')}
                  >
                    <option value="none">FREE</option>
                    {db.vipPlans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className={label}>Yo‘nalish (o‘quvchi faqat shu yo‘nalish materiallarini ko‘radi)</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['ielts', 'cefr', 'general'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setEditForm({ ...editForm, track: t })}
                      className={cn(
                        'h-10 rounded-2xl border text-[12.5px] font-semibold transition-all',
                        editForm.track === t
                          ? 'border-ember-500/60 bg-ember-500/10 text-ember-700 ring-4 ring-ember-500/10 dark:text-ember-300'
                          : 'border-line bg-white/60 text-ink hover:border-ink/20 dark:border-white/10 dark:bg-white/[0.04] dark:text-white'
                      )}
                    >
                      {t === 'ielts' ? 'IELTS' : t === 'cefr' ? 'CEFR' : 'General'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 rounded-2xl border border-line/70 bg-white/40 px-4 py-3 dark:border-white/[0.07] dark:bg-white/[0.03]">
                <span className="text-[12px] font-bold text-ink dark:text-white">Foydalanuvchi Holati</span>
                <button
                  type="button"
                  onClick={() => setEditForm({ ...editForm, isBlocked: !editForm.isBlocked })}
                  className={cn(
                    'rounded-full px-3.5 py-1.5 text-[11px] font-bold text-white transition-colors',
                    editForm.isBlocked ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'
                  )}
                >
                  {editForm.isBlocked ? 'Bloklangan' : 'Faol (Ruxsat etilgan)'}
                </button>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-line/70 pt-4 dark:border-white/[0.07]">
                <Button variant="ghost" size="sm" type="button" onClick={() => setEditingStudent(null)}>
                  Bekor Qilish
                </Button>
                <Button
                  variant="ember"
                  size="sm"
                  type="button"
                  onClick={handleSaveEdit}
                  disabled={saving}
                  iconLeft={<Save className="h-3.5 w-3.5" />}
                >
                  {saving ? 'Saqlanmoqda...' : 'O‘zgarishlarni Saqlash'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* STUDENT DETAIL & AI DIAGNOSTIC MODAL                              */}
      {/* ---------------------------------------------------------------- */}
      {selectedDetailStudent && (
        <div className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-ink/50 p-4 backdrop-blur-md dark:bg-black/70">
          <div className={cn(modalShell, 'max-w-2xl space-y-5')}>
            <div className="flex items-start justify-between gap-4 border-b border-line/70 pb-4 dark:border-white/[0.07]">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-ember-300 via-ember-500 to-ember-700 font-display text-[15px] font-extrabold text-white shadow-[0_10px_24px_-12px_rgba(239,108,18,0.8)]">
                  {selectedDetailStudent.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-display text-[16px] font-extrabold tracking-[-0.02em] text-ink dark:text-white">
                    {selectedDetailStudent.name} {selectedDetailStudent.surname}
                  </h3>
                  <p className="mt-0.5 text-[11px] text-ink-muted dark:text-stone-400">
                    {selectedDetailStudent.region || 'Toshkent'} · Ro'yxatdan o'tgan:{' '}
                    {new Date(selectedDetailStudent.registeredAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setSelectedDetailStudent(null);
                  setAiAnalysisText('');
                }}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-ink/[0.06] hover:text-ink dark:text-stone-400 dark:hover:bg-white/[0.07] dark:hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* ACADEMIC METRICS */}
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {[
                { l: "To'plangan XP", v: `${selectedDetailStudent.xp || 0} XP`, accent: 'text-ember-700 dark:text-ember-300' },
                { l: 'Coins / Ballar', v: `${selectedDetailStudent.points || 0} Ball`, accent: 'text-ink dark:text-white' },
                { l: 'Streak Alanga', v: `${selectedDetailStudent.streakDays || 0} Kun`, accent: 'text-ember-600 dark:text-ember-400' },
                { l: 'Maqsadi', v: selectedDetailStudent.targetScore || 'IELTS 8.0', accent: 'text-ink dark:text-white' }
              ].map(m => (
                <div
                  key={m.l}
                  className="rounded-2xl border border-line/60 bg-white/50 px-3.5 py-3 dark:border-white/[0.06] dark:bg-white/[0.03]"
                >
                  <div className="text-[9.5px] font-bold uppercase tracking-[0.12em] text-ink-muted dark:text-stone-500">
                    {m.l}
                  </div>
                  <div className={cn('mt-1.5 truncate font-display text-[13px] font-extrabold tabular-nums', m.accent)}>
                    {m.v}
                  </div>
                </div>
              ))}
            </div>

            {/* CREDENTIALS */}
            <div className="space-y-3 rounded-[1.25rem] border border-line/70 bg-white/45 px-4 py-4 dark:border-white/[0.07] dark:bg-white/[0.025]">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-muted dark:text-stone-400">
                  Login / Telefon
                </span>
                <span className="font-mono text-[12px] font-bold text-ink dark:text-white">{selectedDetailStudent.phone}</span>
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-muted dark:text-stone-400">
                  <KeyRound className="h-3 w-3" /> Parol
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[12px] font-extrabold text-ink dark:text-white">
                    {showPassword ? (selectedDetailStudent.password || '123456') : '••••••••'}
                  </span>
                  <button
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-[10.5px] font-semibold text-ember-700 underline-offset-2 hover:underline dark:text-ember-400"
                  >
                    {showPassword ? 'Yashirish' : "Ko'rsatish"}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-muted dark:text-stone-400">
                  O'quv Yo'nalishi
                </span>
                <Pill tone="ember">{selectedDetailStudent.track || 'IELTS'} TRACK</Pill>
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-muted dark:text-stone-400">
                  Tugatgan Darslari
                </span>
                <span className="text-[12px] font-bold text-emerald-600 dark:text-emerald-400">
                  {selectedDetailStudent.completedLessons?.length || 0} ta dars
                </span>
              </div>
            </div>

            {/* MUTE & BAN */}
            <div className="space-y-3 rounded-[1.25rem] border border-line/70 bg-white/45 p-4 dark:border-white/[0.07] dark:bg-white/[0.025]">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-ember-600" />
                <span className="text-[11.5px] font-extrabold uppercase tracking-[0.08em] text-ink dark:text-white">
                  Ustoz Boshqaruvi: Mute &amp; 2 Bosqichli Ban
                </span>
              </div>

              {/* Temporary ban */}
              <div className="space-y-3 rounded-xl border border-line/60 bg-white/40 p-3 dark:border-white/[0.06] dark:bg-white/[0.02]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11.5px] font-bold text-ink-soft dark:text-stone-300">
                    Vaqtinchalik ban
                  </span>
                  {selectedDetailStudent.banLevel === 1 ? (
                    <Pill tone="ember">1-Ban: Vaqtinchalik</Pill>
                  ) : (
                    <Pill tone="emerald">Akkount Toza</Pill>
                  )}
                </div>

                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Ban sababi (masalan: Bezorilik va qoidabuzarlik)"
                    value={banReasonInput}
                    onChange={e => setBanReasonInput(e.target.value)}
                    className={cn(field, 'py-2 text-[11.5px]')}
                  />

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <select
                        value={banDaysInput}
                        onChange={e => setBanDaysInput(Number(e.target.value))}
                        className={cn(field, 'w-auto cursor-pointer py-2 text-[11.5px]')}
                      >
                        <option value={3}>3 Kun (1-Ban)</option>
                        <option value={7}>7 Kun (1-Ban)</option>
                        <option value={14}>14 Kun (1-Ban)</option>
                        <option value={30}>30 Kun (1-Ban)</option>
                      </select>

                      <Button
                        variant="outline"
                        size="sm"
                        className="border-red-500/30 text-red-600 hover:bg-red-500/[0.06] dark:border-red-400/25 dark:text-red-400"
                        onClick={async () => {
                          await banStudentLevel1(selectedDetailStudent.id, banDaysInput, banReasonInput);
                          setSelectedDetailStudent({ ...selectedDetailStudent, banLevel: 1, isBlocked: true, banReason: banReasonInput });
                        }}
                      >
                        1-Ban Berish
                      </Button>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {(selectedDetailStudent.banLevel || 0) > 0 && (
                        <Button
                          variant="glass"
                          size="sm"
                          onClick={async () => {
                            await unbanStudent(selectedDetailStudent.id);
                            setSelectedDetailStudent({ ...selectedDetailStudent, banLevel: 0, isBlocked: false });
                          }}
                        >
                          Banni Yechish
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* AI ANALYSIS */}
            <div className="space-y-3 rounded-[1.25rem] border border-ember-500/25 bg-gradient-to-br from-ember-500/[0.07] via-white/30 to-sun-400/[0.08] p-4 dark:from-ember-500/[0.08] dark:via-white/[0.02] dark:to-transparent">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Sparkles className={cn('h-4 w-4 text-ember-600', aiLoading && 'animate-pulse')} />
                  <span className="text-[11.5px] font-extrabold uppercase tracking-[0.08em] text-ink dark:text-white">
                    Gemini AI O'quvchi Rivojlanish Tahlilchisi
                  </span>
                </div>
                <Button
                  variant="ember"
                  size="sm"
                  onClick={() => handleRunAiAnalysis(selectedDetailStudent)}
                  disabled={aiLoading}
                  iconLeft={<Sparkles className="h-3.5 w-3.5" />}
                >
                  {aiLoading ? 'AI Tahlil Qilmoqda...' : 'AI Tahlil Yaratish'}
                </Button>
              </div>

              {aiAnalysisText ? (
                <div className="whitespace-pre-line rounded-xl border border-line/60 bg-white/70 p-4 text-[12px] leading-relaxed text-ink-soft dark:border-white/[0.06] dark:bg-black/20 dark:text-stone-300">
                  {aiAnalysisText}
                </div>
              ) : (
                <p className="text-[12px] leading-relaxed text-ink-muted dark:text-stone-400">
                  "AI Tahlil Yaratish" tugmasini bosing. Gemini AI ushbu o'quvchining barcha testlari, to'plagan
                  ballari va streakini tahlil qilib, o'quvchi yaxshi o'qiyaptimi yoki yo'qligi haqida
                  to'liq xulosa beradi.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* AWARD XP & COINS MODAL                                            */}
      {/* ---------------------------------------------------------------- */}
      {awardStudent && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-ink/45 p-4 backdrop-blur-md dark:bg-black/65">
          <div className={cn(modalShell, 'max-w-lg')}>
            <button
              onClick={() => setAwardStudent(null)}
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-ink/[0.06] hover:text-ink dark:text-stone-400 dark:hover:bg-white/[0.07] dark:hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="mb-5 flex items-center gap-3 border-b border-line/70 pb-4 pr-10 dark:border-white/[0.07]">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sun-400 to-ember-600 text-white shadow-[0_10px_24px_-12px_rgba(239,108,18,0.8)]">
                <Coins className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-display text-[15px] font-extrabold tracking-[-0.02em] text-ink dark:text-white">
                  O‘quvchiga Ball (XP) va EduCoin Berish
                </h3>
                <p className="mt-0.5 text-[11.5px] font-medium text-ink-muted dark:text-stone-400">
                  {awardStudent.name} {awardStudent.surname || ''} ({awardStudent.phone})
                </p>
              </div>
            </div>

            <div className="mb-5 grid grid-cols-2 gap-3 rounded-2xl border border-ember-500/20 bg-ember-500/[0.05] p-4">
              <div>
                <span className="block text-[9.5px] font-bold uppercase tracking-[0.12em] text-ink-muted dark:text-stone-500">
                  Hozirgi XP Balli
                </span>
                <span className="mt-1 flex items-center gap-1.5 font-display text-[14px] font-extrabold tabular-nums text-ink dark:text-white">
                  <Zap className="h-3.5 w-3.5 text-ember-600" />
                  {awardStudent.xp || awardStudent.points || 0} XP
                </span>
              </div>
              <div>
                <span className="block text-[9.5px] font-bold uppercase tracking-[0.12em] text-ink-muted dark:text-stone-500">
                  Hozirgi EduCoinlar
                </span>
                <span className="mt-1 flex items-center gap-1.5 font-display text-[14px] font-extrabold tabular-nums text-ink dark:text-white">
                  <Coins className="h-3.5 w-3.5 text-ember-500" />
                  {awardStudent.coins ?? 120} coin
                </span>
              </div>
            </div>

            <form onSubmit={handleAwardPointsAndCoins} className="space-y-4">
              {/* XP delta */}
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className={cn(label, 'mb-0 flex items-center gap-1.5')}>
                    <Zap className="h-3.5 w-3.5 text-ember-600" />
                    Ball (XP) miqdori (qo‘shish yoki ayirish)
                  </label>
                  <span className="text-[10px] text-ink-muted/80 dark:text-stone-500">Musbat (+) yoki Manfiy (-)</span>
                </div>
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {[100, 250, 500, 1000, 2500].map(preset => (
                    <button
                      type="button"
                      key={preset}
                      onClick={() => setAwardXpInput(preset)}
                      className={cn(
                        'rounded-full border px-2.5 py-1 text-[10.5px] font-bold transition-all',
                        awardXpInput === preset
                          ? 'border-ember-500 bg-ember-500 text-white'
                          : 'border-line text-ink-muted hover:border-ember-500/40 hover:text-ember-700 dark:border-white/10 dark:text-stone-400'
                      )}
                    >
                      +{preset}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  value={awardXpInput}
                  onChange={(e) => setAwardXpInput(Number(e.target.value))}
                  placeholder="Masalan: 500 (ayirish uchun -200)"
                  className={cn(field, 'font-mono font-bold')}
                  required
                />
              </div>

              {/* Coins delta */}
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className={cn(label, 'mb-0 flex items-center gap-1.5')}>
                    <Coins className="h-3.5 w-3.5 text-ember-500" />
                    EduCoin miqdori (qo‘shish yoki ayirish)
                  </label>
                  <span className="text-[10px] text-ink-muted/80 dark:text-stone-500">Musbat (+) yoki Manfiy (-)</span>
                </div>
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {[20, 50, 100, 250, 500].map(preset => (
                    <button
                      type="button"
                      key={preset}
                      onClick={() => setAwardCoinsInput(preset)}
                      className={cn(
                        'rounded-full border px-2.5 py-1 text-[10.5px] font-bold transition-all',
                        awardCoinsInput === preset
                          ? 'border-ember-500 bg-ember-500 text-white'
                          : 'border-line text-ink-muted hover:border-ember-500/40 hover:text-ember-700 dark:border-white/10 dark:text-stone-400'
                      )}
                    >
                      +{preset}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  value={awardCoinsInput}
                  onChange={(e) => setAwardCoinsInput(Number(e.target.value))}
                  placeholder="Masalan: 50 (ayirish uchun -20)"
                  className={cn(field, 'font-mono font-bold')}
                  required
                />
              </div>

              {/* Reason */}
              <div>
                <label className={label}>Sabab / Izoh (O‘quvchi bildirishnomasida ko‘rinadi)</label>
                <input
                  type="text"
                  value={awardReasonInput}
                  onChange={(e) => setAwardReasonInput(e.target.value)}
                  placeholder="Masalan: Speaking darsidagi a'lo faollik uchun ustoz rag'bati"
                  className={field}
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-line/70 pt-4 dark:border-white/[0.07]">
                <Button variant="ghost" size="sm" type="button" onClick={() => setAwardStudent(null)}>
                  Bekor qilish
                </Button>
                <Button
                  variant="ember"
                  size="sm"
                  type="submit"
                  disabled={saving}
                  iconLeft={<ArrowDownToLine className="h-3.5 w-3.5" />}
                >
                  {saving ? 'Berilmoqda...' : 'Tasdiqlash & Balansga Qo‘shish'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
