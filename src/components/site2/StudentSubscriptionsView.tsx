import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { takePendingPlan } from '../../lib/vipHandoff';
import { useApp } from '../../context/AppContext';
import {
  Check,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  Wallet,
  CheckCircle2,
  Lock,
  ExternalLink
} from 'lucide-react';
import { AnimatedSticker } from '../common/AnimatedSticker';
import { VIPPlan } from '../../types';

export const StudentSubscriptionsView: React.FC<{
  onNavigateTab?: (tab: string) => void;
}> = ({ onNavigateTab }) => {
  const { db, currentUser, purchaseVIPPlan } = useApp();
  const [purchasingPlan, setPurchasingPlan] = useState<VIPPlan | null>(null);
  const [insufficientModal, setInsufficientModal] = useState<any | null>(null);
  const [successModal, setSuccessModal] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [promoInput, setPromoInput] = useState('');
  const [promoQuote, setPromoQuote] = useState<{ code: string | null; percent: number; discount: number; price: number } | null>(null);
  const [promoError, setPromoError] = useState('');

  const currentVIP = currentUser?.vipTier || 'start';
  const currentBalance = currentUser?.balance || 0;

  const handleSelectPlan = async (plan: VIPPlan) => {
    if (!currentUser) return;

    if (currentVIP === plan.id) return;

    // Check balance first
    if (plan.priceMonthly > 0 && currentBalance < plan.priceMonthly) {
      const missing = plan.priceMonthly - currentBalance;
      setInsufficientModal({
        plan,
        price: plan.priceMonthly,
        currentBalance,
        missing
      });
      return;
    }

    // Balance is enough, open confirmation modal
    setPromoInput('');
    setPromoQuote(null);
    setPromoError('');
    setPurchasingPlan(plan);
  };

  const applyPromo = async () => {
    if (!purchasingPlan || !promoInput.trim()) return;
    const res = await api.checkPromo(promoInput.trim(), purchasingPlan.id);
    if (res.success) {
      setPromoQuote({ code: res.code, percent: res.percent, discount: res.discount, price: res.price });
      setPromoError('');
    } else {
      setPromoQuote(null);
      setPromoError(res.message || 'Promo kod qo‘llanmadi.');
    }
  };

  const handleConfirmPurchase = async () => {
    if (!purchasingPlan) return;

    setLoading(true);
    try {
      const res = await purchaseVIPPlan(purchasingPlan.id, promoQuote?.code || undefined);
      if (res.success) {
        setSuccessModal({
          plan: purchasingPlan,
          user: res.user
        });
        setPurchasingPlan(null);
      } else if (res.reason === 'insufficient_balance') {
        setPurchasingPlan(null);
        setInsufficientModal({
          plan: purchasingPlan,
          price: res.price,
          currentBalance: res.currentBal,
          missing: res.missing
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleGoToDeposit = () => {
    setInsufficientModal(null);
    if (onNavigateTab) {
      onNavigateTab('profile');
    }
  };

  // Plan picked on the landing page: start its purchase flow once the student is signed in.
  useEffect(() => {
    const id = takePendingPlan();
    const plan = id ? db.vipPlans.find((p) => p.id === id) : undefined;
    if (plan && currentUser) void handleSelectPlan(plan);
    // Runs once on mount; the handoff is cleared as soon as it is read.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-7 max-w-6xl mx-auto">
      {/* Top Banner */}
      <div data-reveal="rise" className="relative overflow-hidden p-7 rounded-[28px] bg-gradient-to-br from-[#fff4ea] via-white to-[#fbeeff] dark:from-[#1d140e] dark:via-stone-900 dark:to-[#1a1024] border border-orange-200/60 dark:border-white/10 shadow-[0_24px_60px_-34px_rgba(242,101,15,0.45)] flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <span aria-hidden className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-[radial-gradient(closest-side,rgba(255,180,92,0.45),transparent)] blur-2xl" />
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs font-bold uppercase tracking-wider mb-2">
            <AnimatedSticker symbol="👑" size="sm" />
            <span>VIP Obuna & Rasmiy Tariflar</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-white flex items-center gap-2">
            <span>Tariflarni Boshqarish va Xarid Qilish</span>
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 mt-1 max-w-2xl leading-relaxed">
            Tarifga o‘tish uchun avval hisobingizda yetarli depozit mablag‘i bo‘lishi lozim. Balansingiz yetarli bo‘lgach bitta tugma orqali faollashtirishingiz mumkin.
          </p>
        </div>

        {/* Balance badge */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-[#ffa149] to-[#f2650f] text-white shadow-[0_18px_40px_-18px_rgba(242,101,15,0.7)] shrink-0 flex flex-col justify-between">
          <div className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-100">
            Joriy Balansingiz:
          </div>
          <div className="text-xl font-black tabular-nums font-mono my-0.5">
            {currentBalance.toLocaleString()} so‘m
          </div>
          <button
            onClick={() => onNavigateTab && onNavigateTab('profile')}
            className="mt-1 text-[11px] font-bold text-emerald-100 hover:text-white underline flex items-center gap-1 cursor-pointer"
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>+ Balansni to‘ldirish (Depozit)</span>
          </button>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {db.vipPlans.map((plan, idx) => {
          const isCurrent = currentVIP === plan.id;
          const isAffordable = currentBalance >= plan.priceMonthly || plan.priceMonthly === 0;

          return (
            <div
              key={plan.id}
              data-reveal="rise"
              data-reveal-delay={idx * 110}
              className={`group relative overflow-hidden rounded-[28px] p-6 flex flex-col justify-between border backdrop-blur-xl transition-transform duration-500 hover:-translate-y-1.5 bg-white/90 dark:bg-white/[0.04] shadow-[0_18px_50px_-30px_rgba(124,45,18,0.35)] ${
                isCurrent
                  ? 'border-2 border-emerald-500 ring-2 ring-emerald-500/20'
                  : 'border-orange-100 dark:border-white/10 hover:border-orange-300 dark:hover:border-orange-400/40'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-black text-stone-900 dark:text-white flex items-center gap-1.5">
                    <AnimatedSticker
                      symbol={
                        (plan.id as string) === 'start' || (plan.id as string) === 'free' ? '✨' :
                        (plan.id as string) === 'premium' || (plan.id as string) === 'legend' ? '🏆' : '👑'
                      }
                      size="sm"
                    />
                    <span>{plan.name}</span>
                  </h3>

                  {isCurrent && (
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                      Faol Tarif
                    </span>
                  )}
                </div>

                <div className="text-2xl font-black text-stone-900 dark:text-white tabular-nums mb-1 font-mono">
                  {plan.priceMonthly.toLocaleString()} <span className="text-xs text-stone-500 font-normal">so‘m</span>
                </div>
                <div className="text-[11px] text-stone-400 mb-4">
                  {plan.durationDays} kunlik doimiy kirish
                </div>

                <ul className="space-y-2.5 text-xs text-stone-600 dark:text-stone-300 mb-6 border-t border-stone-100 dark:border-stone-800 pt-4">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                  <li className="flex items-center gap-2 pt-2 border-t border-stone-100 dark:border-stone-800 font-medium text-stone-900 dark:text-white">
                    <AnimatedSticker symbol="🤖" size="sm" />
                    <span>AI: {plan.hasAI ? `${plan.aiDailyLimit > 500 ? 'Cheksiz' : `${plan.aiDailyLimit} ta/kun`}` : 'Mavjud emas'}</span>
                  </li>
                </ul>
              </div>

              {/* Action Button */}
              <button
                disabled={isCurrent}
                onClick={() => handleSelectPlan(plan)}
                className={`w-full min-h-[46px] py-3 text-[13px] font-semibold rounded-full transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  isCurrent
                    ? 'bg-stone-100 dark:bg-white/5 text-stone-400 cursor-not-allowed border border-stone-200 dark:border-white/10'
                    : isAffordable
                    ? 'bg-gradient-to-r from-[#ffa149] to-[#f2650f] hover:-translate-y-0.5 hover:shadow-[0_14px_30px_-12px_rgba(242,101,15,0.7)] text-white'
                    : 'bg-stone-900 dark:bg-white text-white dark:text-stone-900 hover:-translate-y-0.5'
                }`}
              >
                {isCurrent ? (
                  <span>Sizning Faol Tarifingiz ✓</span>
                ) : isAffordable ? (
                  <>
                    <span>Shu Tarifga O‘tish</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    <span>Depozit Qilish & O‘tish</span>
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* MODAL 1: INSUFFICIENT BALANCE (DEPOSIT REQUIRED) */}
      {insufficientModal && (
        <div className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative animate-in fade-in zoom-in duration-200 space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="text-center">
              <h3 className="text-xl font-black text-stone-900 dark:text-white">
                Balansingizda Mablag‘ Yetarli Emas!
              </h3>
              <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                Ushbu VIP tarifga o‘tish uchun avval hisobingizni Telegram Bot orqali depozit kiritib to‘ldirishingiz va tasdiqlashingiz lozim.
              </p>
            </div>

            {/* Calculations Box */}
            <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/80 border border-stone-200/80 dark:border-stone-700/60 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-stone-500 font-medium">Tanlangan Tarif:</span>
                <span className="font-extrabold text-stone-900 dark:text-white">
                  {insufficientModal.plan.name}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-stone-500 font-medium">Tarif Narxi:</span>
                <span className="font-extrabold text-stone-900 dark:text-white font-mono">
                  {insufficientModal.price.toLocaleString()} so‘m
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-stone-500 font-medium">Joriy Balansingiz:</span>
                <span className="font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                  {insufficientModal.currentBalance.toLocaleString()} so‘m
                </span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-stone-200 dark:border-stone-700">
                <span className="text-amber-600 dark:text-amber-400 font-bold">Kamchilik Summa:</span>
                <span className="font-black text-amber-600 dark:text-amber-400 text-sm font-mono">
                  {insufficientModal.missing.toLocaleString()} so‘m
                </span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={handleGoToDeposit}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Wallet className="w-4 h-4" />
                <span>💰 Hamyonga O‘tish & Depozit Kiritish</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setInsufficientModal(null)}
                className="w-full py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 font-bold text-xs hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
              >
                Bekor Qilish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: CONFIRMATION BEFORE PURCHASE */}
      {purchasingPlan && (
        <div className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative animate-in fade-in zoom-in duration-200 space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
              <AnimatedSticker symbol="👑" size="lg" />
            </div>

            <div className="text-center">
              <h3 className="text-xl font-black text-stone-900 dark:text-white">
                VIP Tarif Xaridini Tasdiqlaysizmi?
              </h3>
              <p className="text-xs text-stone-500 mt-1">
                Tanlangan tarif balansingizdan avtomatik yechiladi va {purchasingPlan.durationDays} kunlik obuna faollashadi.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/80 border border-stone-200/80 dark:border-stone-700/60 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-stone-500 font-medium">Tarif Nomi:</span>
                <span className="font-extrabold text-stone-900 dark:text-white">
                  {purchasingPlan.name}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-stone-500 font-medium">Yechiladigan Summa:</span>
                <span className="font-extrabold text-rose-600 dark:text-rose-400 font-mono">
                  {(promoQuote ? promoQuote.price : purchasingPlan.priceMonthly).toLocaleString()} so‘m
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-stone-500 font-medium">Xariddan Keyingi Balans:</span>
                <span className="font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                  {Math.max(0, currentBalance - (promoQuote ? promoQuote.price : purchasingPlan.priceMonthly)).toLocaleString()} so‘m
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500">Promo kod (ixtiyoriy)</label>
              <div className="flex gap-2">
                <input
                  value={promoInput}
                  onChange={(e) => {
                    setPromoInput(e.target.value.toUpperCase());
                    setPromoQuote(null);
                  }}
                  placeholder="Masalan: YANGI2026"
                  maxLength={32}
                  aria-label="Promo kod"
                  className="flex-1 rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-mono dark:border-stone-700 dark:bg-stone-900 dark:text-white"
                />
                <button type="button" onClick={applyPromo} disabled={!promoInput.trim()} className="rounded-xl border border-stone-300 px-4 py-2 text-xs font-bold text-stone-800 disabled:opacity-40 dark:border-stone-600 dark:text-stone-100">
                  Qo‘llash
                </button>
              </div>
              {promoQuote ? (
                <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                  {promoQuote.code} qo‘llandi: −{promoQuote.percent}% (−{promoQuote.discount.toLocaleString()} so‘m)
                </p>
              ) : null}
              {promoError ? <p className="text-xs font-semibold text-rose-700 dark:text-rose-400">{promoError}</p> : null}
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={handleConfirmPurchase}
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <span>Faollashtirilmoqda...</span>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>✓ Balansdan Yechish va Tarifni Ochish</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setPurchasingPlan(null)}
                className="w-full py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 font-bold text-xs hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
              >
                Orqaga
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: PURCHASE SUCCESS */}
      {successModal && (
        <div className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative animate-in fade-in zoom-in duration-200 space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="text-center">
              <h3 className="text-xl font-black text-stone-900 dark:text-white">
                Tabriklaymiz! VIP Tarif Faol!
              </h3>
              <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                Sizning akkauntingiz muvaffaqiyatli <strong>{successModal.plan.name}</strong> tarifiga yangilandi. Barcha yopiq video darslar va AI yordamchisi (Edubek) ochildi!
              </p>
            </div>

            <button
              type="button"
              onClick={() => setSuccessModal(null)}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md transition-colors"
            >
              Darslarni Boshlash
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
