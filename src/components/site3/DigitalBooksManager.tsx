import React, { useState } from 'react';
import { downloadCsv } from '../../lib/csvDownload';
import { useApp } from '../../context/AppContext';
import { DigitalBook, VIPTier, LearningTrack } from '../../types';
import {
  BookOpen,
  Plus,
  Trash2,
  CheckCircle,
  Search,
  Save,
  X,
  Library,
  Lock,
  Unlock
} from 'lucide-react';
import { Glass, Button, Pill } from '../ui';
import { Reveal } from '../ui/motion-primitives';
import { field, label, cn } from '../ui/styles';
import { api } from '../../services/api';

export const DigitalBooksManager: React.FC = () => {
  const { db, createBook, deleteBook, refreshDb } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');
  const [selectedVipFilter, setSelectedVipFilter] = useState('all');
  const [editingBook, setEditingBook] = useState<DigitalBook | null>(null);
  const [isAddingBook, setIsAddingBook] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const [bookForm, setBookForm] = useState<Partial<DigitalBook>>({
    title: '',
    author: 'Cambridge English Assessment',
    category: 'ielts',
    track: 'ielts',
    level: 'B2',
    pageCount: 160,
    requiredVIP: 'start',
    coverUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=600',
    description: "IELTS va CEFR imtihonlariga tayyorlanish uchun professional o'quv qo'llanma.",
    downloadAllowed: true,
    isFreeGuest: false,
    isFreeRegistered: false,
    pages: [
      {
        pageNumber: 1,
        title: 'Kirish va Metodika',
        content: 'Edu Level platformasining rasmiy elektron kitoblar fondi. Ushbu qo‘llanma akademik ingliz tilini o‘zlashtirish uchun mo‘ljallangan.'
      },
      {
        pageNumber: 2,
        title: '1-Bob: Academic Reading Strategiyalari',
        content: 'Skimming, scanning va context clues yordamida tezkor o‘qish usullari.'
      }
    ]
  });

  const books = db.digitalBooks || [];

  const filteredBooks = books.filter(b => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      b.title.toLowerCase().includes(q) ||
      b.author.toLowerCase().includes(q) ||
      b.level.toLowerCase().includes(q);
    const matchesCategory = selectedCategoryFilter === 'all' || b.category === selectedCategoryFilter;
    const matchesVip = selectedVipFilter === 'all' || (b.requiredVIP || 'free') === selectedVipFilter;
    return matchesSearch && matchesCategory && matchesVip;
  });

  const [uploadState, setUploadState] = useState<{ busy: boolean; error: string }>({ busy: false, error: '' });

  /** Reads a picked file as base64 (without the data: prefix). */
  const readAsBase64 = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });

  const handlePdfPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.type && file.type !== 'application/pdf') {
      setUploadState({ busy: false, error: 'Faqat PDF fayl tanlang.' });
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setUploadState({ busy: false, error: 'PDF hajmi 25 MB dan oshmasligi kerak.' });
      return;
    }
    setUploadState({ busy: true, error: '' });
    try {
      const res = await api.uploadPdf(await readAsBase64(file), file.name);
      if (res?.success && res.url) {
        setBookForm((f) => ({ ...f, pdfUrl: res.url }));
        setUploadState({ busy: false, error: '' });
      } else {
        setUploadState({ busy: false, error: res?.message || 'PDF yuklanmadi. Qayta urinib ko‘ring.' });
      }
    } catch {
      setUploadState({ busy: false, error: 'Server bilan bog‘lanib bo‘lmadi.' });
    }
  };

  const handleCoverPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setUploadState({ busy: false, error: 'Muqova uchun rasm tanlang (PNG, JPG, WEBP).' });
      return;
    }
    setUploadState({ busy: true, error: '' });
    try {
      const res = await api.uploadAsset(await readAsBase64(file), file.name);
      if (res?.success && res.url) {
        setBookForm((f) => ({ ...f, coverUrl: res.url }));
        setUploadState({ busy: false, error: '' });
      } else {
        setUploadState({ busy: false, error: res?.message || 'Muqova yuklanmadi.' });
      }
    } catch {
      setUploadState({ busy: false, error: 'Server bilan bog‘lanib bo‘lmadi.' });
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookForm.title?.trim()) {
      alert("Iltimos, kitob nomini kiriting");
      return;
    }

    await createBook({
      ...bookForm,
      id: `book-${Date.now()}`
    });

    setSuccessMsg(`"${bookForm.title}" kitobi muvaffaqiyatli qo‘shildi!`);
    setIsAddingBook(false);
    setBookForm({
      title: '',
      author: 'Cambridge English Assessment',
      category: 'ielts',
      track: 'ielts',
      level: 'B2',
      pageCount: 160,
      requiredVIP: 'start',
      coverUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=600',
      description: "IELTS va CEFR imtihonlariga tayyorlanish uchun professional o'quv qo'llanma.",
      downloadAllowed: true,
      isFreeGuest: false,
      isFreeRegistered: false,
      pages: [
        {
          pageNumber: 1,
          title: 'Kirish',
          content: 'Yangi elektron qo‘llanma matni.'
        }
      ]
    });
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleUpdateVipRequirement = async (bookId: string, newVipTier: VIPTier) => {
    const target = books.find(b => b.id === bookId);
    if (!target) return;
    await createBook({
      ...target,
      requiredVIP: newVipTier
    });
    setSuccessMsg(`"${target.title}" uchun VIP ruxsat darajasi [${newVipTier.toUpperCase()}] ga o‘zgartirildi!`);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleDeleteBook = async (bookId: string, title: string) => {
    if (confirm(`"${title}" kitobini butunlay o‘chirmoqchimisiz?`)) {
      await deleteBook(bookId);
      setSuccessMsg(`"${title}" muvaffaqiyatli o‘chirildi!`);
      setTimeout(() => setSuccessMsg(''), 3000);
    }
  };

  const vipTiersList: { id: VIPTier; label: string; badgeColor: string }[] = [
    { id: 'free', label: 'Barchaga Ochiq (Tekin)', badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
    { id: 'start', label: 'START VIP+', badgeColor: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' },
    { id: 'gold', label: 'GOLD VIP+', badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
    { id: 'plus', label: 'PLUS VIP+', badgeColor: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
    { id: 'pro', label: 'PRO VIP+', badgeColor: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
    { id: 'premium', label: 'PREMIUM VIP+', badgeColor: 'bg-pink-500/20 text-pink-400 border-pink-500/30' },
    { id: 'legend', label: 'LEGEND VIP+', badgeColor: 'bg-rose-500/20 text-rose-400 border-rose-500/30' },
    { id: 'individual', label: 'INDIVIDUAL VIP', badgeColor: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' }
  ];

  const freeCount = books.filter(b => (b.requiredVIP || 'free') === 'free').length;

  return (
    <div className="space-y-7">
      {/* Header */}
      <Reveal>
        <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <Pill tone="ember">
              <BookOpen className="h-3 w-3" />
              Kutubxona &amp; VIP Ruxsatlar
            </Pill>
            <h1 className="mt-4 font-display text-[clamp(1.6rem,3.2vw,2.25rem)] font-extrabold leading-[1.07] tracking-[-0.035em] text-ink text-balance dark:text-white">
              Raqamli Kitoblar va VIP Cheklovlar Boshqaruvi
            </h1>
            <p className="mt-2 text-[13.5px] leading-relaxed text-ink-muted dark:text-stone-400">
              Barcha Cambridge, CEFR, Grammatika va Lug‘at kitoblarini qo‘shish, o‘chirish hamda har bir kitob qaysi
              VIP tarifga ochiqligini (yoki tekinligini) belgilash.
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2.5">
            <div className="glass-1 flex items-center gap-2.5 rounded-full px-4 py-2.5">
              <span className="font-display text-[14px] font-extrabold tabular-nums text-ink dark:text-white">
                {books.length}
              </span>
              <span className="text-[11px] font-medium text-ink-muted dark:text-stone-400">
                kitob · {freeCount} tekin
              </span>
            </div>
            <Button variant="ember" size="md" onClick={() => setIsAddingBook(true)} iconLeft={<Plus className="h-4 w-4" />}>
              Yangi Kitob Yuklash
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

      {/* Filters */}
      <Reveal delay={70}>
        <Glass level={1} radius="rounded-[1.5rem]" className="flex flex-col gap-3 p-3.5 md:flex-row md:items-center md:justify-between md:p-4">
          <div className="relative w-full md:max-w-xs">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-muted/60 dark:text-stone-500" />
            <input
              type="text"
              placeholder="Kitob nomi, muallif yoki daraja..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className={cn(field, 'py-2.5 pl-10 text-[12.5px]')}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedCategoryFilter}
              onChange={e => setSelectedCategoryFilter(e.target.value)}
              className={cn(field, 'w-auto cursor-pointer py-2.5 text-[12px] font-semibold')}
            >
              <option value="all">Barcha kategoriya</option>
              <option value="ielts">IELTS</option>
              <option value="cefr">CEFR</option>
              <option value="grammar">Grammatika</option>
              <option value="vocabulary">Lug‘at</option>
              <option value="readers">Mutolaa</option>
            </select>

            <select
              value={selectedVipFilter}
              onChange={e => setSelectedVipFilter(e.target.value)}
              className={cn(field, 'w-auto cursor-pointer py-2.5 text-[12px] font-semibold')}
            >
              <option value="all">Barcha tariflar</option>
              <option value="free">Tekin (Free)</option>
              <option value="start">START</option>
              <option value="gold">GOLD</option>
              <option value="plus">PLUS</option>
              <option value="pro">PRO</option>
              <option value="premium">PREMIUM</option>
              <option value="legend">LEGEND</option>
            </select>

            <Pill tone="neutral">{filteredBooks.length} kitob</Pill>
            <button
              type="button"
              onClick={() => downloadCsv(`kitoblar-${new Date().toISOString().slice(0, 10)}.csv`, [['Nomi', 'Muallif', 'Daraja', 'VIP tarifi', 'Kategoriya', 'Fayl'], ...books.map((x) => [x.title, x.author, x.level, x.requiredVIP, x.category, x.pdfUrl || ''])])}
              disabled={books.length === 0}
              className="inline-flex h-8 items-center rounded-full border border-line px-3 text-[12px] font-semibold text-ink disabled:opacity-40 dark:border-white/10 dark:text-white"
            >
              CSV
            </button>
          </div>
        </Glass>
      </Reveal>

      {/* Books table */}
      <Reveal delay={100}>
        <Glass level={2} className="overflow-hidden">
          {filteredBooks.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-ember-500/10 text-ember-600 dark:bg-ember-500/15 dark:text-ember-400">
                <Library className="h-6 w-6" />
              </div>
              <p className="mt-4 font-display text-[15px] font-bold tracking-tight text-ink dark:text-white">
                Kitoblar topilmadi.
              </p>
              <p className="mt-1 max-w-sm text-[12.5px] text-ink-muted dark:text-stone-400">
                Filtrlarni o‘zgartiring yoki yangi elektron kitob qo‘shing.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] border-collapse text-left">
                <thead className="glass-1 sticky top-0 z-10">
                  <tr className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted dark:text-stone-400">
                    <th className="px-5 py-3.5 font-bold">Muqova &amp; Kitob Nomi</th>
                    <th className="px-5 py-3.5 font-bold">Muallif &amp; Kategoriya</th>
                    <th className="px-5 py-3.5 font-bold">Daraja</th>
                    <th className="px-5 py-3.5 font-bold">Sahifalar</th>
                    <th className="px-5 py-3.5 font-bold">VIP Talab</th>
                    <th className="px-5 py-3.5 text-right font-bold">Amallar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/70 dark:divide-white/5">
                  {filteredBooks.map(book => {
                    const currentVip = book.requiredVIP || 'free';
                    const isFree = currentVip === 'free' || currentVip === 'none';

                    return (
                      <tr
                        key={book.id}
                        className="group transition-colors duration-200 hover:bg-ember-500/[0.04] dark:hover:bg-white/[0.02]"
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3.5">
                            <img
                              src={book.coverUrl || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=200'}
                              alt={book.title}
                              className="h-14 w-10 shrink-0 rounded-md object-cover shadow-[0_8px_18px_-10px_rgba(18,16,14,0.5)] ring-1 ring-line/70 dark:ring-white/10"
                            />
                            <div className="min-w-0">
                              <div className="line-clamp-1 text-[12.5px] font-extrabold text-ink dark:text-white">
                                {book.title}
                              </div>
                              <div className="mt-0.5 line-clamp-1 text-[10.5px] text-ink-muted dark:text-stone-500">
                                {book.description}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <div className="text-[12px] font-medium text-ink-soft dark:text-stone-300">{book.author}</div>
                          <span className="mt-1 inline-block font-mono text-[9.5px] font-bold uppercase tracking-[0.1em] text-ink-muted dark:text-stone-500">
                            {book.category}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <Pill tone="neutral" className="font-mono">
                            {book.level}
                          </Pill>
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 font-mono text-[11.5px] tabular-nums text-ink-muted dark:text-stone-400">
                          {book.pageCount || book.pages?.length || 1} bet
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                'flex h-6 w-6 items-center justify-center rounded-full',
                                isFree
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                  : 'bg-ember-500/10 text-ember-600 dark:text-ember-400'
                              )}
                            >
                              {isFree ? <Unlock className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                            </span>
                            <select
                              value={currentVip}
                              onChange={e => handleUpdateVipRequirement(book.id, e.target.value as VIPTier)}
                              className={cn(field, 'w-auto cursor-pointer py-1.5 text-[11px] font-bold')}
                            >
                              <option value="free">Barchaga Ochiq (Tekin)</option>
                              <option value="start">START VIP+</option>
                              <option value="gold">GOLD VIP+</option>
                              <option value="plus">PLUS VIP+</option>
                              <option value="pro">PRO VIP+</option>
                              <option value="premium">PREMIUM VIP+</option>
                              <option value="legend">LEGEND VIP+</option>
                              <option value="individual">INDIVIDUAL VIP</option>
                            </select>
                          </div>
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-right">
                          <button
                            onClick={() => handleDeleteBook(book.id, book.title)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-line/70 text-ink-muted transition-all hover:border-red-500/40 hover:bg-red-500/[0.06] hover:text-red-600 dark:border-white/10 dark:text-stone-400 dark:hover:text-red-400"
                            title="O‘chirish"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
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

      {/* Add book modal */}
      {isAddingBook && (
        <div className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-ink/45 p-4 backdrop-blur-md dark:bg-black/65">
          <div className="glass-4 my-8 w-full max-w-xl rounded-[1.75rem] p-5 sm:p-7">
            <div className="mb-5 flex items-start justify-between gap-4 border-b border-line/70 pb-4 dark:border-white/[0.07]">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sun-400 to-ember-600 text-white shadow-[0_10px_24px_-12px_rgba(239,108,18,0.8)]">
                  <BookOpen className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="font-display text-[15px] font-extrabold tracking-[-0.02em] text-ink dark:text-white">
                    Yangi Elektron Kitob Qo‘shish
                  </h3>
                  <p className="mt-0.5 text-[11.5px] text-ink-muted dark:text-stone-400">
                    Cambridge, CEFR yoki grammatika kitobini kutubxonaga biriktiring.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddingBook(false)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-ink/[0.06] hover:text-ink dark:text-stone-400 dark:hover:bg-white/[0.07] dark:hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className={label}>Kitob Nomi</label>
                <input
                  type="text"
                  required
                  placeholder="Masalan: Cambridge IELTS 19 Academic with Answers"
                  value={bookForm.title}
                  onChange={e => setBookForm({ ...bookForm, title: e.target.value })}
                  className={cn(field, 'font-bold')}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={label}>Muallif / Nashriyot</label>
                  <input
                    type="text"
                    required
                    value={bookForm.author}
                    onChange={e => setBookForm({ ...bookForm, author: e.target.value })}
                    className={field}
                  />
                </div>

                <div>
                  <label className={label}>Kategoriya</label>
                  <select
                    value={bookForm.category}
                    onChange={e => setBookForm({ ...bookForm, category: e.target.value as any })}
                    className={cn(field, 'cursor-pointer')}
                  >
                    <option value="ielts">IELTS</option>
                    <option value="cefr">CEFR</option>
                    <option value="grammar">Grammatika</option>
                    <option value="vocabulary">Lug‘at</option>
                    <option value="readers">Mutolaa</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className={label}>Daraja</label>
                  <select
                    value={bookForm.level}
                    onChange={e => setBookForm({ ...bookForm, level: e.target.value as any })}
                    className={cn(field, 'cursor-pointer font-bold')}
                  >
                    <option value="A1">A1</option>
                    <option value="A2">A2</option>
                    <option value="B1">B1</option>
                    <option value="B2">B2</option>
                    <option value="C1">C1</option>
                    <option value="C2">C2</option>
                  </select>
                </div>

                <div>
                  <label className={label}>Sahifalar</label>
                  <input
                    type="number"
                    value={bookForm.pageCount}
                    onChange={e => setBookForm({ ...bookForm, pageCount: Number(e.target.value) })}
                    className={cn(field, 'font-mono')}
                  />
                </div>

                <div>
                  <label className={label}>VIP Talab</label>
                  <select
                    value={bookForm.requiredVIP}
                    onChange={e => setBookForm({ ...bookForm, requiredVIP: e.target.value as VIPTier })}
                    className={cn(field, 'cursor-pointer font-bold')}
                  >
                    <option value="free">Tekin (Free)</option>
                    <option value="start">START VIP+</option>
                    <option value="gold">GOLD VIP+</option>
                    <option value="plus">PLUS VIP+</option>
                    <option value="pro">PRO VIP+</option>
                    <option value="premium">PREMIUM VIP+</option>
                    <option value="legend">LEGEND VIP+</option>
                  </select>
                </div>
              </div>

              <div>
                <label className={label}>Muqova Rasmi URL</label>
                <input
                  type="text"
                  value={bookForm.coverUrl}
                  onChange={e => setBookForm({ ...bookForm, coverUrl: e.target.value })}
                  className={cn(field, 'font-mono text-[11.5px]')}
                />
              </div>

              <div className="space-y-2">
                <label className={label}>PDF fayl (o‘qish uchun)</label>
                <input type="file" accept="application/pdf" onChange={handlePdfPick} disabled={uploadState.busy} className="block w-full text-[12.5px] text-ink-muted file:mr-3 file:rounded-full file:border-0 file:bg-ink file:px-4 file:py-2 file:text-[12.5px] file:font-semibold file:text-white dark:text-stone-300 dark:file:bg-white dark:file:text-ink" />
                {bookForm.pdfUrl ? (
                  <p className="text-[12px] font-semibold text-emerald-700 dark:text-emerald-300">PDF yuklandi: kitob o‘quvchi kutubxonasida o‘qiladi.</p>
                ) : (
                  <p className="text-[12px] text-ink-muted dark:text-stone-400">PDF yuklanmaguncha kitob faqat ma’lumot sifatida ko‘rinadi.</p>
                )}
                <input
                  type="url"
                  value={bookForm.pdfUrl || ''}
                  onChange={(e) => setBookForm((f) => ({ ...f, pdfUrl: e.target.value.trim() }))}
                  placeholder="yoki PDF havolasi: https://…"
                  aria-label="PDF havolasi"
                  className="h-10 w-full rounded-xl border border-line bg-white/70 px-3 text-[13px] text-ink outline-none focus:border-[#f2650f] dark:border-white/10 dark:bg-white/[0.05] dark:text-white"
                />
                {bookForm.pdfUrl && !/^(https?:\/\/|\/)/i.test(bookForm.pdfUrl) ? <p className="text-[12px] font-semibold text-rose-700 dark:text-rose-300">Havola https:// bilan boshlanishi kerak.</p> : null}
                {uploadState.busy ? <p className="text-[12px] text-ink-muted">Yuklanmoqda…</p> : null}
                {uploadState.error ? <p role="alert" className="text-[12px] font-semibold text-rose-700 dark:text-rose-300">{uploadState.error}</p> : null}
              </div>

              <div className="space-y-2">
                <label className={label}>Muqova rasmini fayldan yuklash</label>
                <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={handleCoverPick} disabled={uploadState.busy} className="block w-full text-[12.5px] text-ink-muted file:mr-3 file:rounded-full file:border-0 file:bg-ink/10 file:px-4 file:py-2 file:text-[12.5px] file:font-semibold file:text-ink dark:text-stone-300 dark:file:bg-white/10 dark:file:text-white" />
              </div>

              <div>
                <label className={label}>Tavsif</label>
                <textarea
                  rows={2}
                  value={bookForm.description}
                  onChange={e => setBookForm({ ...bookForm, description: e.target.value })}
                  className={cn(field, 'resize-y')}
                />
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-line/70 pt-4 dark:border-white/[0.07]">
                <Button variant="ghost" size="sm" type="button" onClick={() => setIsAddingBook(false)}>
                  Bekor qilish
                </Button>
                <Button variant="ember" size="sm" type="submit" iconLeft={<Save className="h-3.5 w-3.5" />}>
                  Kitobni Saqlash
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
