import React, { useState } from 'react';
import { downloadCsv } from '../../lib/csvDownload';
import { api } from '../../services/api';
import { TelegramSetup } from './TelegramSetup';
import { useApp } from '../../context/AppContext';
import {
  Wallet,
  Send,
  CheckCircle2,
  DollarSign,
  Search,
  Save,
  Check,
  X,
  ExternalLink,
  RefreshCw,
  Banknote,
  ArrowDownToLine,
  CircleDashed
} from 'lucide-react';
import { DepositTransaction } from '../../types';
import { DepositStatusBadge } from '../common/DepositStatusBadge';
import { Glass, Button, Pill } from '../ui';
import { Reveal } from '../ui/motion-primitives';
import { field, label, cn } from '../ui/styles';

/** botOnly: the same screen, showing only the Telegram bot settings (used by the owner's own Telegram bot section). */
export const DepositsFinanceManager: React.FC<{ botOnly?: boolean }> = ({ botOnly = false }) => {
  const { db, approveDeposit, rejectDeposit, updateBotSettings, updateStudentFull, refreshDb } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<'transactions' | 'bot_settings' | 'manual_adjust'>(botOnly ? 'bot_settings' : 'transactions');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'pending' | 'rejected'>('all');
  const [successMsg, setSuccessMsg] = useState('');
  const [botError, setBotError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [viewingReceipt, setViewingReceipt] = useState<string | null>(null);

  // Auto-poll every 3.5s so new deposit requests arrive in real time
  React.useEffect(() => {
    refreshDb();
    const interval = setInterval(() => {
      refreshDb();
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  const handleManualRefresh = async () => {
    setRefreshing(true);
    await refreshDb();
    setTimeout(() => setRefreshing(false), 600);
  };

  // Bot settings form state
  const currentBot = db.telegramBotSettings || {
    botUsername: '',
    botName: '',
    isActive: false,
    minDepositAmount: 10000,
    cardOrMerchantInfo: '',
    supportTelegram: '',
    autoApprovalDemo: false
  };

  const [botForm, setBotForm] = useState({
    botUsername: currentBot.botUsername,
    channelUsername: currentBot.channelUsername || '',
    ownerTelegram: currentBot.ownerTelegram || '',
    botName: currentBot.botName,
    isActive: currentBot.isActive,
    minDepositAmount: currentBot.minDepositAmount,
    cardOrMerchantInfo: currentBot.cardOrMerchantInfo,
    cardNumber: currentBot.cardNumber || '',
    cardHolder: currentBot.cardHolder || '',
    supportTelegram: currentBot.supportTelegram,
    autoApprovalDemo: !!currentBot.autoApprovalDemo
  });

  // Manual balance adjust state
  const [selectedStudentId, setSelectedStudentId] = useState<string>(db.users.find(u => u.role === 'student')?.id || '');
  const [adjustAmount, setAdjustAmount] = useState<number>(50000);
  const [adjustType, setAdjustType] = useState<'add' | 'subtract'>('add');
  const [adjustNote, setAdjustNote] = useState('');

  const transactions = db.depositTransactions || [];

  const filteredTxs = transactions.filter(t => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      t.userName.toLowerCase().includes(q) ||
      (t.telegramUsername || '').toLowerCase().includes(q) ||
      t.userPhone.includes(q) ||
      t.paymentCode.toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Financial statistics
  const totalCompletedSum = transactions
    .filter(t => t.status === 'completed')
    .reduce((acc, t) => acc + (t.amount || 0), 0);

  const pendingCount = transactions.filter(t => t.status === 'pending').length;
  const totalStudentBalances = db.users
    .filter(u => u.role === 'student')
    .reduce((acc, u) => acc + (u.balance || 0), 0);

  const handleApprove = async (id: string) => {
    setSuccessMsg('Depozit tasdiqlanmoqda...');
    await approveDeposit(id);
    await refreshDb();
    setSuccessMsg('✅ Depozit muvaffaqiyatli tasdiqlandi va o‘quvchi hisobiga qo‘shildi!');
    setTimeout(() => setSuccessMsg(''), 3500);
  };

  const handleReject = async (id: string) => {
    if (confirm('Rostdan ham ushbu depozit so‘rovini rad etmoqchimisiz?')) {
      await rejectDeposit(id);
      await refreshDb();
      setSuccessMsg('Depozit rad etildi.');
      setTimeout(() => setSuccessMsg(''), 3000);
    }
  };

  const handleSaveBotSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setBotError('');
    const res = await updateBotSettings(botForm);
    if (res?.success === false) {
      setBotError(res.message || 'Sozlamalarni saqlab bo‘lmadi. Qayta urinib ko‘ring.');
      return;
    }
    setSuccessMsg('Telegram Bot sozlamalari muvaffaqiyatli saqlandi!');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleManualAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    const student = db.users.find(u => u.id === selectedStudentId);
    if (!student) return;

    const currentBal = student.balance || 0;
    const finalAmount = adjustType === 'add' ? currentBal + adjustAmount : Math.max(0, currentBal - adjustAmount);

    await updateStudentFull({
      id: student.id,
      balance: finalAmount
    });

    setSuccessMsg(`${student.name} ning hisob balansi yangilandi: ${finalAmount.toLocaleString()} so‘m`);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const tabs = [
    { id: 'transactions' as const, label: `Barcha Depozit Tranzaksiyalari (${transactions.length})`, icon: Wallet },
    { id: 'bot_settings' as const, label: 'Telegram Bot Sozlamalari', icon: Send },
    { id: 'manual_adjust' as const, label: 'Balansni Qo‘lda O‘zgartirish', icon: DollarSign }
  ];

  return (
    <div className="space-y-7">
      {/* ---------------------------------------------------------------- */}
      {/* HEADER                                                            */}
      {/* ---------------------------------------------------------------- */}
      <Reveal>
        <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <Pill tone="emerald">
              <Wallet className="h-3 w-3" />
              Moliya & Depozit Boshqaruvi
            </Pill>
            <h1 className="mt-4 font-display text-[clamp(1.6rem,3.2vw,2.25rem)] font-extrabold leading-[1.07] tracking-[-0.035em] text-ink text-balance dark:text-white">
              Telegram Bot Depozitlari va O‘quvchilar Hamyonini Boshqarish
            </h1>
            <p className="mt-2 text-[13.5px] leading-relaxed text-ink-muted dark:text-stone-400">
              Telegram bot orqali tushgan barcha depozitlarni ko‘ring, tasdiqlang, bot sozlamalarini o‘zgartiring va
              o‘quvchilar balansini qo‘lda to‘g‘rilang.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="glass"
              size="md"
              onClick={handleManualRefresh}
              disabled={refreshing}
              iconLeft={<RefreshCw className={cn('h-4 w-4', refreshing ? 'animate-spin text-ember-600' : 'text-ink-muted')} />}
            >
              {refreshing ? 'Yangilanmoqda...' : 'Depozitlarni Yangilash'}
            </Button>
            <Button
              variant="outline"
              size="md"
              onClick={() =>
                downloadCsv(`depozitlar-${new Date().toISOString().slice(0, 10)}.csv`, [
                  ['Sana', 'O‘quvchi', 'Telefon', 'Summa', 'Holat', 'Kod', 'Chek'],
                  ...(db.depositTransactions || []).map((t) => [t.createdAt.slice(0, 16).replace('T', ' '), t.userName, t.userPhone, t.amount, t.status === 'completed' ? 'tasdiqlandi' : t.status === 'rejected' ? 'rad etildi' : 'kutilmoqda', t.paymentCode, t.receiptUrl || ''])
                ])
              }
            >
              Excel (CSV)
            </Button>
          </div>
        </header>
      </Reveal>

      {successMsg && (
        <Reveal>
          <div className="flex items-center gap-2.5 rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.08] px-4 py-3 text-[12.5px] font-semibold text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
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
              Jami Depozitlar (Bot)
            </span>
            <div className="mt-4 font-display text-[clamp(1.3rem,2.1vw,1.6rem)] font-extrabold leading-none tracking-[-0.03em] text-ink tabular-nums dark:text-white">
              {totalCompletedSum.toLocaleString()}
              <span className="ml-1 text-[12px] font-semibold text-ink-muted dark:text-stone-400">so‘m</span>
            </div>
            <div className="mt-3 flex items-center gap-1.5 border-t border-line/70 pt-2.5 text-[11px] text-ink-muted dark:border-white/5 dark:text-stone-400">
              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
              Tasdiqlangan to‘lovlar
            </div>
          </Glass>

          <Glass level={1} radius="rounded-[1.5rem]" className="p-5">
            <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-muted dark:text-stone-400">
              Mavjud O‘quvchilar Balansi
            </span>
            <div className="mt-4 font-display text-[clamp(1.3rem,2.1vw,1.6rem)] font-extrabold leading-none tracking-[-0.03em] text-ink tabular-nums dark:text-white">
              {totalStudentBalances.toLocaleString()}
              <span className="ml-1 text-[12px] font-semibold text-ink-muted dark:text-stone-400">so‘m</span>
            </div>
            <div className="mt-3 flex items-center gap-1.5 border-t border-line/70 pt-2.5 text-[11px] text-ink-muted dark:border-white/5 dark:text-stone-400">
              <Wallet className="h-3 w-3 text-ember-500" />
              Barcha hamyonlar yig‘indisi
            </div>
          </Glass>

          <Glass level={1} radius="rounded-[1.5rem]" className="p-5">
            <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-muted dark:text-stone-400">
              Kutilayotgan Depozitlar
            </span>
            <div
              className={cn(
                'mt-4 font-display text-[clamp(1.3rem,2.1vw,1.6rem)] font-extrabold leading-none tracking-[-0.03em] tabular-nums',
                pendingCount > 0 ? 'text-ember-700 dark:text-ember-300' : 'text-ink dark:text-white'
              )}
            >
              {pendingCount}
              <span className="ml-1 text-[12px] font-semibold text-ink-muted dark:text-stone-400">ta so‘rov</span>
            </div>
            <div className="mt-3 flex items-center gap-1.5 border-t border-line/70 pt-2.5 text-[11px] text-ink-muted dark:border-white/5 dark:text-stone-400">
              <CircleDashed className="h-3 w-3" />
              Tasdiqlash kutayotgan
            </div>
          </Glass>

          <Glass level={1} radius="rounded-[1.5rem]" className="p-5">
            <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-muted dark:text-stone-400">
              Faol Telegram Bot
            </span>
            <div className="mt-4 flex items-center gap-2 font-display text-[clamp(1rem,1.7vw,1.2rem)] font-extrabold leading-tight tracking-[-0.02em] text-ink dark:text-white">
              <Send className="h-4 w-4 shrink-0 text-ember-600" />
              <span className="truncate font-mono">@{currentBot.botUsername}</span>
            </div>
            <div className="mt-3 flex items-center gap-1.5 border-t border-line/70 pt-2.5 text-[11px] text-ink-muted dark:border-white/5 dark:text-stone-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Bot integratsiyasi faol
            </div>
          </Glass>
        </section>
      </Reveal>

      {/* ---------------------------------------------------------------- */}
      {/* TABS                                                              */}
      {/* ---------------------------------------------------------------- */}
      <Reveal delay={100}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-1.5">
          {tabs.filter((t) => !botOnly || t.id === 'bot_settings').map(tab => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id)}
                className={cn(
                  'inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-[11.5px] font-bold transition-all duration-200',
                  isActive
                    ? 'bg-ink text-white shadow-[0_12px_24px_-14px_rgba(18,16,14,0.65)] dark:bg-white dark:text-ink'
                    : 'text-ink-muted hover:bg-white/60 hover:text-ink dark:text-stone-400 dark:hover:bg-white/[0.05] dark:hover:text-white'
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </Reveal>

      {/* ---------------------------------------------------------------- */}
      {/* TRANSAKSIYALAR                                                    */}
      {/* ---------------------------------------------------------------- */}
      {activeSubTab === 'transactions' && (
        <Reveal delay={130}>
          <Glass level={2} className="overflow-hidden">
            {/* Filters */}
            <div className="flex flex-col gap-3 border-b border-line/60 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5 dark:border-white/[0.06]">
              <div className="relative w-full sm:max-w-sm">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-muted/60 dark:text-stone-500" />
                <input
                  type="text"
                  placeholder="Ism, telefon, @telegram yoki kod orqali qidirish..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className={cn(field, 'py-2.5 pl-10 text-[12.5px]')}
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-muted dark:text-stone-400">
                  Holat
                </span>
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value as any)}
                  className={cn(field, 'w-auto cursor-pointer py-2.5 text-[12px]')}
                >
                  <option value="all">Barchasi</option>
                  <option value="completed">Muvaffaqiyatli</option>
                  <option value="pending">Kutilayotgan</option>
                  <option value="rejected">Rad etilgan</option>
                </select>
              </div>
            </div>

            {filteredTxs.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-ember-500/10 text-ember-600 dark:bg-ember-500/15 dark:text-ember-400">
                  <Banknote className="h-6 w-6" />
                </div>
                <p className="mt-4 font-display text-[15px] font-bold tracking-tight text-ink dark:text-white">
                  Tranzaksiyalar topilmadi.
                </p>
                <p className="mt-1 max-w-sm text-[12.5px] text-ink-muted dark:text-stone-400">
                  Qidiruv so‘zini o‘zgartiring yoki holat filtrini tozalang.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] border-collapse text-left">
                  <thead className="glass-1 sticky top-0 z-10">
                    <tr className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted dark:text-stone-400">
                      <th className="px-4 py-3.5 font-bold">Kod</th>
                      <th className="px-4 py-3.5 font-bold">O‘quvchi</th>
                      <th className="px-4 py-3.5 font-bold">Telegram Username</th>
                      <th className="px-4 py-3.5 font-bold">Miqdor</th>
                      <th className="px-4 py-3.5 font-bold">Usul / Chek</th>
                      <th className="px-4 py-3.5 font-bold">Sana</th>
                      <th className="px-4 py-3.5 font-bold">Holat</th>
                      <th className="px-4 py-3.5 text-right font-bold">Amallar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line/70 dark:divide-white/5">
                    {filteredTxs.map(tx => (
                      <tr
                        key={tx.id}
                        className="group transition-colors duration-200 hover:bg-ember-500/[0.04] dark:hover:bg-white/[0.02]"
                      >
                        <td className="whitespace-nowrap px-4 py-4 font-mono text-[11.5px] font-bold text-ink-muted dark:text-stone-300">
                          {tx.paymentCode}
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-[12.5px] font-bold text-ink dark:text-white">{tx.userName}</div>
                          <div className="font-mono text-[10.5px] text-ink-muted dark:text-stone-500">{tx.userPhone}</div>
                        </td>
                        <td className="px-4 py-4">
                          {tx.telegramUsername ? (
                            <a
                              href={`https://t.me/${tx.telegramUsername}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 font-mono text-[11.5px] font-bold text-ember-700 transition-colors hover:text-ember-600 dark:text-ember-400 dark:hover:text-ember-300"
                            >
                              @{tx.telegramUsername}
                              <ExternalLink className="h-3 w-3 opacity-70" />
                            </a>
                          ) : (
                            <span className="text-[11px] text-ink-muted/60 dark:text-stone-600">—</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-4 font-mono text-[13px] font-extrabold tabular-nums text-emerald-600 dark:text-emerald-400">
                          +{tx.amount.toLocaleString()}
                          <span className="ml-1 text-[10px] font-medium text-ink-muted dark:text-stone-500">so‘m</span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Pill tone="neutral">{tx.method === 'card' ? 'Karta' : 'Telegram'}</Pill>
                            {tx.receiptUrl && (
                              <button
                                type="button"
                                onClick={() => setViewingReceipt(tx.receiptUrl!)}
                                className="inline-flex items-center gap-1 rounded-full border border-ember-500/30 bg-ember-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-ember-700 transition-colors hover:bg-ember-500/20 dark:text-ember-300"
                              >
                                Chek
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-4 font-mono text-[11px] tabular-nums text-ink-muted dark:text-stone-400">
                          {new Date(tx.createdAt).toLocaleDateString()}{' '}
                          {new Date(tx.createdAt).toLocaleTimeString().slice(0, 5)}
                        </td>
                        <td className="px-4 py-4">
                          <DepositStatusBadge status={tx.status} size="sm" showSubtext={false} />
                        </td>
                        <td className="whitespace-nowrap px-4 py-4 text-right">
                          {tx.status === 'pending' ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <Button variant="ember" size="sm" onClick={() => handleApprove(tx.id)}>
                                Tasdiqlash
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleReject(tx.id)}
                                className="border-red-500/25 text-red-600 hover:border-red-500/50 hover:bg-red-500/[0.06] dark:border-red-400/25 dark:text-red-400"
                              >
                                Rad etish
                              </Button>
                            </div>
                          ) : (
                            <span className="text-[11px] font-medium text-ink-muted/70 dark:text-stone-500">
                              Tugallangan
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Glass>
        </Reveal>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* BOT SOZLAMALARI                                                   */}
      {/* ---------------------------------------------------------------- */}
      {activeSubTab === 'bot_settings' && (
        <Reveal delay={130}>
          <Glass level={2} className="max-w-3xl p-5 sm:p-7">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-ember-500/10 text-ember-600 dark:bg-ember-500/15 dark:text-ember-400">
                <Send className="h-4 w-4" />
              </span>
              <h2 className="font-display text-[15px] font-extrabold tracking-[-0.02em] text-ink dark:text-white">
                Telegram Bot Integratsiyasi Sozlamalari
              </h2>
            </div>
            <p className="mt-1.5 text-[12.5px] text-ink-muted dark:text-stone-400">
              O‘quvchilar ushbu botga yo‘naltiriladi va depozit to‘lovlarini amalga oshiradilar.
            </p>

            <form onSubmit={handleSaveBotSettings} className="mt-6 space-y-4">
              <div>
                <label className={label}>Telegram Bot Username (@sizning_botingiz, ixtiyoriy)</label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[13px] font-bold text-ember-600">
                    @
                  </span>
                  <input
                    type="text"
                    value={botForm.botUsername}
                    onChange={e => setBotForm({ ...botForm, botUsername: e.target.value.replace(/^@/, '') })}
                    className={cn(field, 'pl-9 font-mono font-bold')}
                  />
                </div>
              </div>

              <div>
                <label className={label}>Kanal (e’lonlar va obuna tekshiruvi uchun)</label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[13px] font-bold text-ember-600">@</span>
                  <input type="text" value={botForm.channelUsername} onChange={e => setBotForm({ ...botForm, channelUsername: e.target.value.replace(/^@|https?:\/\/t\.me\//g, '') })} placeholder="edulevel_english" className={cn(field, 'pl-9 font-mono')} />
                </div>
                <p className="mt-1.5 text-[11.5px] text-ink-muted dark:text-stone-400">Botni kanalga admin qiling. Shunda obuna tekshiriladi va e’lonlar yuboriladi.</p>
              </div>

              <div>
                <label className={label}>Ustoz Telegram username (statistika uchun)</label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[13px] font-bold text-ember-600">@</span>
                  <input type="text" value={botForm.ownerTelegram} onChange={e => setBotForm({ ...botForm, ownerTelegram: e.target.value.replace(/^@|https?:\/\/t\.me\//g, '') })} placeholder="username" className={cn(field, 'pl-9 font-mono')} />
                </div>
                <p className="mt-1.5 text-[11.5px] text-ink-muted dark:text-stone-400">Bu akkaunt botga /statistika yozsa, obunachilar va natijalar soni chiqadi.</p>
              </div>

              <div>
                <label className={label}>Bot Nomi (Sarlavha, ixtiyoriy)</label>
                <input
                  type="text"
                  value={botForm.botName}
                  onChange={e => setBotForm({ ...botForm, botName: e.target.value })}
                  className={cn(field, 'font-semibold')}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={label}>Minimal Depozit Miqdori (so‘m)</label>
                  <input
                    type="number"
                    required
                    value={botForm.minDepositAmount}
                    onChange={e => setBotForm({ ...botForm, minDepositAmount: Number(e.target.value) })}
                    className={cn(field, 'font-mono font-bold')}
                  />
                </div>

                <div>
                  <label className={label}>Telegram Admin Profil (@admin)</label>
                  <input
                    type="text"
                    value={botForm.supportTelegram}
                    onChange={e => setBotForm({ ...botForm, supportTelegram: e.target.value })}
                    className={cn(field, 'font-mono font-bold')}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={label}>Karta raqami (o‘quvchilar shu kartaga to‘laydi)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={botForm.cardNumber}
                    onChange={e => setBotForm({ ...botForm, cardNumber: e.target.value })}
                    placeholder="Karta raqamini kiriting"
                    maxLength={24}
                    className={field}
                  />
                </div>
                <div>
                  <label className={label}>Karta egasi (ism familiya)</label>
                  <input
                    type="text"
                    value={botForm.cardHolder}
                    onChange={e => setBotForm({ ...botForm, cardHolder: e.target.value })}
                    placeholder="Ism Familiya"
                    maxLength={80}
                    className={field}
                  />
                </div>
              </div>

              <div>
                <label className={label}>To‘lov usullari va ko‘rsatmalar</label>
                <input
                  type="text"
                  value={botForm.cardOrMerchantInfo}
                  onChange={e => setBotForm({ ...botForm, cardOrMerchantInfo: e.target.value })}
                  className={field}
                />
              </div>

              <div className="pt-2">
                <Button variant="ember" size="md" type="submit" iconLeft={<Save className="h-4 w-4" />}>
                  Sozlamalarni Saqlash
                </Button>
                {botError ? <p role="alert" className="mt-3 text-[13px] font-semibold text-rose-600 dark:text-rose-300">{botError}</p> : null}
              </div>
              <TelegramSetup />
            </form>
          </Glass>
        </Reveal>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* BALANSNI QO'LDA O'ZGARTIRISH                                      */}
      {/* ---------------------------------------------------------------- */}
      {activeSubTab === 'manual_adjust' && (
        <Reveal delay={130}>
          <Glass level={2} className="max-w-3xl p-5 sm:p-7">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-ember-500/10 text-ember-600 dark:bg-ember-500/15 dark:text-ember-400">
                <ArrowDownToLine className="h-4 w-4" />
              </span>
              <h2 className="font-display text-[15px] font-extrabold tracking-[-0.02em] text-ink dark:text-white">
                O‘quvchi Balansini Qo‘lda To‘ldirish / O‘zgartirish
              </h2>
            </div>
            <p className="mt-1.5 text-[12.5px] text-ink-muted dark:text-stone-400">
              O‘quvchi hisobiga to‘g‘ridan-to‘g‘ri pul qo‘shing yoki ayiring (masalan mukofot, naqd to‘lov yoki
              kompensatsiya).
            </p>

            <form onSubmit={handleManualAdjust} className="mt-6 space-y-4">
              <div>
                <label className={label}>O‘quvchini tanlang</label>
                <select
                  value={selectedStudentId}
                  onChange={e => setSelectedStudentId(e.target.value)}
                  className={cn(field, 'cursor-pointer font-semibold')}
                >
                  {db.users.filter(u => u.role === 'student').map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.surname} ({s.phone}) — Hozirgi balansi: {(s.balance || 0).toLocaleString()} so‘m
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={label}>Amal turi</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setAdjustType('add')}
                      className={cn(
                        'rounded-2xl border py-3 text-[12px] font-extrabold transition-all',
                        adjustType === 'add'
                          ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] dark:text-emerald-300'
                          : 'border-line bg-white/40 text-ink-muted hover:border-ink/20 dark:border-white/[0.08] dark:bg-white/[0.02] dark:text-stone-400'
                      )}
                    >
                      + Qo‘shish
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdjustType('subtract')}
                      className={cn(
                        'rounded-2xl border py-3 text-[12px] font-extrabold transition-all',
                        adjustType === 'subtract'
                          ? 'border-red-500/50 bg-red-500/10 text-red-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] dark:text-red-300'
                          : 'border-line bg-white/40 text-ink-muted hover:border-ink/20 dark:border-white/[0.08] dark:bg-white/[0.02] dark:text-stone-400'
                      )}
                    >
                      - Ayirish
                    </button>
                  </div>
                </div>

                <div>
                  <label className={label}>Summa (so‘m)</label>
                  <input
                    type="number"
                    required
                    value={adjustAmount}
                    onChange={e => setAdjustAmount(Number(e.target.value))}
                    className={cn(field, 'font-mono font-bold')}
                  />
                </div>
              </div>

              <div>
                <label className={label}>Izoh / Sabab</label>
                <input
                  type="text"
                  placeholder="Masalan: Olimpiada 1-o‘rin mukofoti yoki qo‘lda to‘lov"
                  value={adjustNote}
                  onChange={e => setAdjustNote(e.target.value)}
                  className={field}
                />
              </div>

              <div className="pt-2">
                <Button variant="primary" size="md" type="submit" iconLeft={<Check className="h-4 w-4" />}>
                  Balansni Yangilash
                </Button>
              </div>
            </form>
          </Glass>
        </Reveal>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* RECEIPT MODAL                                                     */}
      {/* ---------------------------------------------------------------- */}
      {viewingReceipt && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-ink/45 p-4 backdrop-blur-md dark:bg-black/65">
          <div className="glass-4 w-full max-w-lg rounded-[1.75rem] p-5 sm:p-6">
            <div className="mb-4 flex items-center justify-between border-b border-line/70 pb-3 dark:border-white/[0.07]">
              <h3 className="font-display text-[13.5px] font-extrabold tracking-[-0.01em] text-ink dark:text-white">
                O‘quvchi To‘lov Kvitansiyasi / Cheki
              </h3>
              <button
                type="button"
                onClick={() => setViewingReceipt(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-ink/[0.06] hover:text-ink dark:text-stone-400 dark:hover:bg-white/[0.07] dark:hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex max-h-[60vh] items-center justify-center overflow-hidden rounded-2xl border border-line/70 bg-white/60 dark:border-white/10 dark:bg-white/[0.03]">
              <img src={viewingReceipt} alt="To'lov cheki" className="h-full w-full object-contain" />
            </div>
            <div className="mt-4 flex justify-end">
              <Button variant="glass" size="sm" type="button" onClick={() => setViewingReceipt(null)}>
                Yopish
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
