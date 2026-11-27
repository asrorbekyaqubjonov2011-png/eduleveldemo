import React, { useState } from 'react';
import { DEFAULT_SHOP_ITEMS } from '../../data/shopCatalog';
import { useApp } from '../../context/AppContext';
import {
  ShoppingBag,
  Coins,
  Sparkles,
  Check,
  Download,
  Shield,
  BookOpen,
  Palette,
  Award,
  Zap,
  Flame,
  Star,
  CheckCircle2,
  Lock,
  ArrowRight
} from 'lucide-react';
import { ShopItem } from '../../types';
import confetti from 'canvas-confetti';

export const StudentCoinShop: React.FC = () => {
  const { db, currentUser, economy } = useApp();
  const [activeCategory, setActiveCategory] = useState<'all' | 'frame' | 'color' | 'book' | 'booster' | 'badge'>('all');
  const [purchaseMsg, setPurchaseMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const defaultShopItems: ShopItem[] = DEFAULT_SHOP_ITEMS;

  const shopItems = db.shopItems && db.shopItems.length > 0 ? db.shopItems : defaultShopItems;

  const filteredItems = shopItems.filter(item => {
    if (!item.isAvailable) return false;
    if (activeCategory === 'all') return true;
    return item.category === activeCategory;
  });

  const myPoints = currentUser?.points || 0;
  const purchasedIds = currentUser?.purchasedItemIds || [];

  const handleBuyItem = async (item: ShopItem) => {
    if (!currentUser) return;
    setPurchaseMsg(null);
    if (purchasedIds.includes(item.id)) {
      setPurchaseMsg({ type: 'error', text: 'Ushbu mahsulotni allaqachon xarid qilgansiz!' });
      return;
    }
    if (myPoints < item.pricePoints) {
      setPurchaseMsg({
        type: 'error',
        text: `Mablag‘ yetarli emas! Sizda ${myPoints} ball bor, bu mahsulot esa ${item.pricePoints} ball.`
      });
      return;
    }
    const res = await economy({ action: 'shop_purchase', itemId: item.id });
    if (!res?.success) {
      setPurchaseMsg({ type: 'error', text: res?.message || 'Xarid amalga oshmadi.' });
      return;
    }
    confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
    setPurchaseMsg({
      type: 'success',
      text: `Tabriklaymiz! "${item.title}" muvaffaqiyatli xarid qilindi va hisobingizga qo‘shildi!`
    });
  };

  const handleEquipItem = async (item: ShopItem) => {
    if (!currentUser) return;
    const current =
      item.category === 'frame' ? currentUser.avatarFrame : item.category === 'color' ? currentUser.nameColor : currentUser.customTitle;
    const value = item.styleValue === current ? '' : item.styleValue || '';
    const res = await economy({ action: 'equip', category: item.category, value });
    if (!res?.success) setPurchaseMsg({ type: 'error', text: res?.message || 'O‘rnatib bo‘lmadi.' });
  };

  return (
    <div className="space-y-8">
      {/* HEADER BANNER */}
      <div className="page-hero rounded-3xl p-6 sm:p-8 relative overflow-hidden">
        <div className="max-w-2xl relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold uppercase tracking-wider mb-3 border border-amber-500/30">
            <Coins className="w-4 h-4 text-amber-400" />
            <span>Edu Coin & Sovg'alar Do'koni</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-stone-900 dark:text-white tracking-tight">
            To'plagan Ballaringizni Eksklyuziv Buyumlarga Almashtiring
          </h2>
          <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 mt-2 leading-relaxed">
            Darslar ko'rish, testlar topshirish va streaklar evaziga yig'ilgan ballaringizdan unumli foydalaning! Profildagi nurlanuvchi ramkalar, unvonlar, ism ranglari va PDF qo'llanmalarni ushbu do'kondan olishingiz mumkin.
          </p>

          {/* User Current Coin Balance */}
          <div className="mt-5 inline-flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-stone-900/90 text-white border border-amber-500/50 shadow-lg">
            <Coins className="w-6 h-6 text-amber-400 animate-bounce" />
            <div>
              <div className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">Mavjud Ballaringiz:</div>
              <div className="text-xl font-black text-amber-400 tabular-nums font-mono">{myPoints} Ball / Coins</div>
            </div>
          </div>
        </div>
      </div>

      {/* FEEDBACK MSG */}
      {purchaseMsg && (
        <div
          className={`p-4 rounded-2xl border text-xs font-bold flex items-center justify-between ${
            purchaseMsg.type === 'success'
              ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
              : 'bg-rose-500/20 border-rose-500 text-rose-300'
          }`}
        >
          <span>{purchaseMsg.text}</span>
          <button onClick={() => setPurchaseMsg(null)} className="text-stone-400 hover:text-white text-base">
            ×
          </button>
        </div>
      )}

      {/* CATEGORY SWITCHER */}
      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 bg-white/80 dark:bg-stone-900/80 p-2.5 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm">
        {[
          { id: 'all', label: 'Barchasi', icon: ShoppingBag },
          { id: 'frame', label: '🖼️ Ramkalar', icon: Palette },
          { id: 'color', label: '🎨 Ism Ranglari', icon: Palette },
          { id: 'badge', label: '🏅 Unvonlar', icon: Award },
          { id: 'book', label: '📚 PDF Kitoblar', icon: BookOpen },
          { id: 'booster', label: '⚡ Booster & Himoya', icon: Zap }
        ].map(cat => {
          const Icon = cat.icon;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeCategory === cat.id
                  ? 'bg-amber-500 text-stone-950 font-black shadow-md scale-105'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
              }`}
            >
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* SHOP ITEMS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredItems.map(item => {
          const isPurchased = purchasedIds.includes(item.id);
          const isEquipped =
            (item.category === 'frame' && currentUser?.avatarFrame === item.styleValue) ||
            (item.category === 'color' && currentUser?.nameColor === item.styleValue) ||
            (item.category === 'badge' && currentUser?.customTitle === item.styleValue);

          return (
            <div
              key={item.id}
              className={`bg-white/90 dark:bg-stone-900/90 border rounded-3xl p-6 flex flex-col justify-between shadow-sm transition-all hover:border-amber-500/50 group relative overflow-hidden ${
                isPurchased
                  ? 'border-emerald-500/50 bg-emerald-950/10'
                  : 'border-stone-200 dark:border-stone-800'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-2xl flex items-center justify-center shrink-0 shadow-sm">
                    {item.icon}
                  </span>

                  <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 font-mono font-black text-xs flex items-center gap-1 border border-amber-500/30">
                    <Coins className="w-3.5 h-3.5 text-amber-500" />
                    {item.pricePoints} Ball
                  </span>
                </div>

                <h3 className="font-black text-base text-stone-900 dark:text-white mb-2 leading-snug">
                  {item.title}
                </h3>

                <p className="text-xs text-stone-500 leading-relaxed mb-4">{item.description}</p>

                {/* Preview sample if frame or name color */}
                {item.category === 'frame' && (
                  <div className="mb-4 p-3 rounded-2xl bg-stone-950/80 border border-stone-800 flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-full bg-stone-800 border-2 flex items-center justify-center font-bold text-xs text-white ${item.colorClass}`}
                    >
                      {currentUser?.name?.slice(0, 2).toUpperCase() || 'EL'}
                    </div>
                    <span className="text-[11px] text-stone-400">Profilingizdagi nurlanish namunasi</span>
                  </div>
                )}

                {item.category === 'color' && (
                  <div className="mb-4 p-3 rounded-2xl bg-stone-950/80 border border-stone-800">
                    <div className={`text-xs ${item.colorClass}`}>
                      {currentUser?.name || 'Sardor Aliyev'} (Rang Namunasi)
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between">
                {isPurchased ? (
                  item.category === 'book' ? (
                    <a
                      href={item.fileUrl || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2.5 rounded-xl bg-emerald-500 text-stone-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm hover:opacity-90 transition-opacity"
                    >
                      <Download className="w-4 h-4" />
                      <span>PDF Qo'llanmani Yuklab Olish</span>
                    </a>
                  ) : (
                    <button
                      onClick={() => handleEquipItem(item)}
                      className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        isEquipped
                          ? 'bg-emerald-500 text-stone-950 font-black'
                          : 'bg-stone-800 text-amber-300 hover:bg-stone-700'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{isEquipped ? 'Jihozlangan (Equipped)' : 'Jihozlash (Equip)'}</span>
                    </button>
                  )
                ) : (
                  <button
                    onClick={() => handleBuyItem(item)}
                    disabled={myPoints < item.pricePoints}
                    className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      myPoints >= item.pricePoints
                        ? 'bg-amber-500 hover:bg-amber-400 text-stone-950 shadow-md font-black'
                        : 'bg-stone-200 dark:bg-stone-800 text-stone-400 cursor-not-allowed'
                    }`}
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>Sotib Olish ({item.pricePoints} Ball)</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
