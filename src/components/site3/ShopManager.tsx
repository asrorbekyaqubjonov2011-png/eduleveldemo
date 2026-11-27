'use client';

import React, { useState } from 'react';
import { DEFAULT_SHOP_ITEMS } from '../../data/shopCatalog';
import { useApp } from '../../context/AppContext';
import { ShoppingBag, Coins, Plus, Trash2, Edit2, BookOpen, Save, X, PackageOpen } from 'lucide-react';
import { ShopItem } from '../../types';
import { Glass, Button, Pill } from '../ui';
import { Reveal } from '../ui/motion-primitives';
import { field, label, cn } from '../ui/styles';

const CATEGORY_LABEL: Record<string, string> = {
  book: 'PDF Kitob',
  frame: 'Ramka',
  color: 'Ism Rangi',
  badge: 'Unvon',
  booster: 'Booster'
};

export const ShopManager: React.FC = () => {
  const { db, refreshDb, updateShopItems } = useApp();
  void refreshDb;

  // Start from the owner's catalog, or the default one the shop currently shows.
  const [items, setItems] = useState<ShopItem[]>(db.shopItems && db.shopItems.length ? db.shopItems : DEFAULT_SHOP_ITEMS);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  // Add Item Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<'frame' | 'color' | 'book' | 'booster' | 'badge'>('book');
  const [pricePoints, setPricePoints] = useState(250);
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('📚');
  const [fileUrl, setFileUrl] = useState('');
  const [colorClass, setColorClass] = useState('');
  const [styleValue, setStyleValue] = useState('');

  const handleCreateOrUpdateItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (editingItemId) {
      const updated = items.map(item => {
        if (item.id === editingItemId) {
          return {
            ...item,
            title,
            category,
            pricePoints: Number(pricePoints),
            description,
            icon,
            fileUrl,
            colorClass,
            styleValue
          };
        }
        return item;
      });
      setItems(updated);
      void updateShopItems(updated);
    } else {
      const newItem: ShopItem = {
        id: `shop-${Date.now()}`,
        title,
        category,
        pricePoints: Number(pricePoints),
        description,
        icon,
        fileUrl,
        colorClass,
        styleValue,
        isAvailable: true
      };
      const updated = [newItem, ...items];
      setItems(updated);
      void updateShopItems(updated);
    }

    setShowAddModal(false);
    setEditingItemId(null);
    resetForm();
  };

  const resetForm = () => {
    setTitle('');
    setCategory('book');
    setPricePoints(250);
    setDescription('');
    setIcon('📚');
    setFileUrl('');
    setColorClass('');
    setStyleValue('');
  };

  const handleEdit = (item: ShopItem) => {
    setEditingItemId(item.id);
    setTitle(item.title);
    setCategory(item.category);
    setPricePoints(item.pricePoints);
    setDescription(item.description);
    setIcon(item.icon);
    setFileUrl(item.fileUrl || '');
    setColorClass(item.colorClass || '');
    setStyleValue(item.styleValue || '');
    setShowAddModal(true);
  };

  const handleDelete = (id: string) => {
    if (!confirm("Ushbu mahsulotni do'kondan o'chirishni tasdiqlaysizmi?")) return;
    const updated = items.filter(i => i.id !== id);
    setItems(updated);
    void updateShopItems(updated);
  };

  const toggleAvailability = (id: string) => {
    const updated = items.map(i => {
      if (i.id === id) return { ...i, isAvailable: !i.isAvailable };
      return i;
    });
    setItems(updated);
    void updateShopItems(updated);
  };

  const activeCount = items.filter(i => i.isAvailable).length;

  return (
    <div className="space-y-7">
      {/* HEADER */}
      <Reveal>
        <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <Pill tone="ember">
              <Coins className="h-3 w-3" />
              Owner Do'kon Boshqaruvi
            </Pill>
            <h1 className="mt-4 font-display text-[clamp(1.6rem,3.2vw,2.25rem)] font-extrabold leading-[1.07] tracking-[-0.035em] text-ink text-balance dark:text-white">
              Edu Coin Do'koni Narxlari{' '}
              <span className="text-ember-gradient-static">&amp; Mahsulotlari</span>
            </h1>
            <p className="mt-2 text-[13.5px] leading-relaxed text-ink-muted dark:text-stone-400">
              O'quvchilar sotib olishi mumkin bo'lgan ramkalar, PDF kitoblar, unvonlar va boosterlarni to'liq
              boshqaring.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="glass-1 hidden items-center gap-2.5 rounded-full px-4 py-2.5 sm:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span className="font-display text-[14px] font-extrabold tabular-nums text-ink dark:text-white">
                {activeCount}
              </span>
              <span className="text-[11px] font-medium text-ink-muted dark:text-stone-400">/ {items.length} faol</span>
            </div>
            <Button
              variant="ember"
              size="md"
              onClick={() => {
                resetForm();
                setEditingItemId(null);
                setShowAddModal(true);
              }}
              iconLeft={<Plus className="h-4 w-4" />}
            >
              Yangi Mahsulot Qo'shish
            </Button>
          </div>
        </header>
      </Reveal>

      {/* ITEMS GRID */}
      {items.length === 0 ? (
        <Reveal delay={80}>
          <Glass level={1} radius="rounded-[1.75rem]">
            <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-ember-500/10 text-ember-600 dark:bg-ember-500/15 dark:text-ember-400">
                <PackageOpen className="h-6 w-6" />
              </div>
              <p className="mt-4 font-display text-[15px] font-bold tracking-tight text-ink dark:text-white">
                Do'kon hozircha bo'sh
              </p>
              <p className="mt-1 max-w-sm text-[12.5px] text-ink-muted dark:text-stone-400">
                Birinchi mahsulotni qo'shib, o'quvchilar uchun Edu Coin do'konini jonlantiring.
              </p>
            </div>
          </Glass>
        </Reveal>
      ) : (
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item, index) => (
            <Reveal key={item.id} delay={Math.min(index * 40, 200)}>
              <Glass
                level={item.isAvailable ? 1 : 2}
                radius="rounded-[1.5rem]"
                className={cn(
                  'flex h-full flex-col justify-between p-5 transition-all duration-300 hover:shadow-[0_24px_44px_-26px_rgba(18,16,14,0.28)]',
                  !item.isAvailable && 'opacity-60'
                )}
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-line/60 bg-white/60 text-[20px] leading-none dark:border-white/10 dark:bg-white/[0.05]">
                      {item.icon}
                    </span>
                    <span className="inline-flex items-baseline gap-1 rounded-full border border-ember-500/25 bg-ember-500/[0.08] px-3 py-1">
                      <span className="font-display text-[13.5px] font-extrabold tabular-nums text-ember-700 dark:text-ember-300">
                        {item.pricePoints}
                      </span>
                      <span className="text-[9.5px] font-bold uppercase tracking-[0.1em] text-ember-700/70 dark:text-ember-300/70">
                        Ball
                      </span>
                    </span>
                  </div>

                  <div className="mt-4 flex items-center gap-2">
                    <span className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-ink-muted dark:text-stone-500">
                      {CATEGORY_LABEL[item.category] || item.category}
                    </span>
                    {item.isAvailable ? (
                      <span className="inline-flex items-center gap-1 text-[9.5px] font-bold uppercase tracking-[0.1em] text-emerald-600 dark:text-emerald-400">
                        <span className="h-1 w-1 rounded-full bg-emerald-500" /> Faol
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[9.5px] font-bold uppercase tracking-[0.1em] text-ink-muted">
                        <span className="h-1 w-1 rounded-full bg-ink/30 dark:bg-white/30" /> Yashirilgan
                      </span>
                    )}
                  </div>

                  <h2 className="mt-1.5 line-clamp-2 font-display text-[14.5px] font-extrabold leading-snug tracking-[-0.02em] text-ink dark:text-white">
                    {item.title}
                  </h2>
                  <p className="mt-1.5 line-clamp-2 text-[11.5px] leading-relaxed text-ink-muted dark:text-stone-400">
                    {item.description}
                  </p>
                </div>

                <div className="mt-5 flex items-center justify-between gap-2 border-t border-line/60 pt-3.5 dark:border-white/[0.06]">
                  <button
                    onClick={() => toggleAvailability(item.id)}
                    className={cn(
                      'rounded-full px-3 py-1.5 text-[10.5px] font-bold transition-colors',
                      item.isAvailable
                        ? 'bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-400'
                        : 'bg-ink/[0.05] text-ink-muted hover:bg-ink/[0.08] dark:bg-white/[0.06] dark:text-stone-400'
                    )}
                  >
                    {item.isAvailable ? 'Faol (Active)' : 'Nofaol (Hidden)'}
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleEdit(item)}
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-line/70 text-ink-muted transition-all hover:border-ember-500/40 hover:bg-ember-500/[0.06] hover:text-ember-700 dark:border-white/10 dark:text-stone-400 dark:hover:text-ember-300"
                      title="Tahrirlash"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-line/70 text-ink-muted transition-all hover:border-red-500/40 hover:bg-red-500/[0.06] hover:text-red-600 dark:border-white/10 dark:text-stone-400 dark:hover:text-red-400"
                      title="O'chirish"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </Glass>
            </Reveal>
          ))}
        </section>
      )}

      {/* CREATE / EDIT MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-ink/45 p-4 backdrop-blur-md dark:bg-black/65">
          <div className="glass-4 my-8 w-full max-w-lg rounded-[1.75rem] p-5 sm:p-7">
            <div className="mb-5 flex items-start justify-between gap-4 border-b border-line/70 pb-4 dark:border-white/[0.07]">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-sun-400 to-ember-600 text-white shadow-[0_10px_24px_-12px_rgba(239,108,18,0.8)]">
                  <ShoppingBag className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="font-display text-[15px] font-extrabold tracking-[-0.02em] text-ink dark:text-white">
                    {editingItemId ? 'Mahsulotni Tahrirlash' : "Yangi Do'kon Mahsuloti Yaratish"}
                  </h3>
                  <p className="mt-0.5 text-[11.5px] text-ink-muted dark:text-stone-400">
                    Nomi, narxi va ko'rinishini belgilang
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-ink/[0.06] hover:text-ink dark:text-stone-400 dark:hover:bg-white/[0.07] dark:hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateOrUpdateItem} className="space-y-4">
              <div>
                <label className={label}>Nomi / Sarlavha *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Masalan: IELTS Band 9 Speaking Secrets PDF"
                  className={cn(field, 'font-semibold')}
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className={label}>Kategoriya</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value as any)}
                    className={cn(field, 'cursor-pointer')}
                  >
                    <option value="book">PDF Kitob</option>
                    <option value="frame">Ramka</option>
                    <option value="color">Ism Rangi</option>
                    <option value="badge">Unvon</option>
                    <option value="booster">Booster</option>
                  </select>
                </div>

                <div>
                  <label className={label}>Narxi (Ballarda) *</label>
                  <input
                    type="number"
                    required
                    min={10}
                    value={pricePoints}
                    onChange={e => setPricePoints(Number(e.target.value))}
                    className={cn(field, 'font-mono font-bold')}
                  />
                </div>
              </div>

              <div>
                <label className={label}>Tavsif (Description)</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Mahsulot haqida qisqacha ma'lumot..."
                  className={cn(field, 'resize-y')}
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className={label}>Emoji / Icon</label>
                  <input
                    type="text"
                    value={icon}
                    onChange={e => setIcon(e.target.value)}
                    placeholder="📚"
                    className={cn(field, 'text-center text-[16px]')}
                  />
                </div>

                <div>
                  <label className={label}>Unvon / Style Qiymati</label>
                  <input
                    type="text"
                    value={styleValue}
                    onChange={e => setStyleValue(e.target.value)}
                    placeholder="Masalan: Grammar Master ⚡"
                    className={field}
                  />
                </div>
              </div>

              {category === 'book' && (
                <div>
                  <label className={cn(label, 'flex items-center gap-1.5')}>
                    <BookOpen className="h-3 w-3" />
                    PDF Fayl / Havola URL
                  </label>
                  <input
                    type="url"
                    value={fileUrl}
                    onChange={e => setFileUrl(e.target.value)}
                    placeholder="https://example.com/handbook.pdf"
                    className={cn(field, 'font-mono text-[12px]')}
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 border-t border-line/70 pt-4 dark:border-white/[0.07]">
                <Button variant="ghost" size="sm" type="button" onClick={() => setShowAddModal(false)}>
                  Bekor qilish
                </Button>
                <Button variant="ember" size="sm" type="submit" iconLeft={<Save className="h-3.5 w-3.5" />}>
                  {editingItemId ? 'Saqlash' : "Qo'shish"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
