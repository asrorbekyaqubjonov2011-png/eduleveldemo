import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  BookOpen,
  Download,
  Lock,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Search,
  CheckCircle2,
  Bookmark,
  ShieldCheck,
  Filter
} from 'lucide-react';
import { DigitalBook } from '../../types';
import { canReadBook, readerTier } from '../../lib/bookAccess';
import { hasVipAccess } from '../../lib/vipAccess';

export const DigitalLibraryView: React.FC = () => {
  const { db, currentUser, readBook } = useApp();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [readingBook, setReadingBook] = useState<DigitalBook | null>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [zoom, setZoom] = useState(100);
  const [bookmarks, setBookmarks] = useState<Record<string, number[]>>({});

  // ADDITION 1: Reader Theme Mode (Light / Sepia / Dark AMOLED)
  const [readerTheme, setReaderTheme] = useState<'light' | 'sepia' | 'dark'>('dark');

  const books = db.digitalBooks || [];
  const registeredQuota = 6;
  // A book with an uploaded PDF is read in the embedded viewer; its page count comes from the book.
  const isPdfBook = !!readingBook?.pdfUrl;
  const totalPages = readingBook ? (readingBook.pdfUrl ? Math.max(1, readingBook.pageCount || 1) : Math.max(1, readingBook.pages.length)) : 1;
  const isVip = hasVipAccess(readerTier(currentUser), 'start');
  const userTrack = currentUser?.track || 'ielts';

  const trackFilteredBooks = books.filter((b) => {
    if (b.id === 'book-official-guide-2026') return true;
    // Books the owner assigned to a specific track are shown only to that track.
    if (b.track && b.track !== userTrack) return false;
    if (userTrack === 'ielts' && b.category === 'cefr') return false;
    if (userTrack === 'cefr' && b.category === 'ielts') return false;
    if (userTrack === 'general' && (b.category === 'ielts' || b.category === 'cefr')) return false;
    return true;
  });

  const filteredBooks = trackFilteredBooks.filter((b) => {
    const matchesCategory = selectedCategory === 'all' || b.category === selectedCategory;
    const matchesSearch =
      b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.level.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleOpenReader = (book: DigitalBook) => {
    if (!canReadBook(book, books.indexOf(book), currentUser)) {
      alert('Bu kitob uchun faol VIP obunasi talab qilinadi.');
      return;
    }
    setReadingBook(book);
    setPageIndex(0);
    readBook(book.id);
  };

  const toggleBookmark = (bookId: string, pageNum: number) => {
    setBookmarks((prev) => {
      const current = prev[bookId] || [];
      if (current.includes(pageNum)) {
        return { ...prev, [bookId]: current.filter((p) => p !== pageNum) };
      }
      return { ...prev, [bookId]: [...current, pageNum] };
    });
  };

  const handleDownload = (book: DigitalBook) => {
    if (book.pdfUrl) {
      const a = document.createElement('a');
      a.href = book.pdfUrl;
      a.download = `${book.title.replace(/\s+/g, '_')}.pdf`;
      a.target = '_blank';
      a.rel = 'noreferrer';
      a.click();
      return;
    }

    const content = `EDU LEVEL DIGITAL LIBRARY — ${book.title}
Author: ${book.author}
Level: ${book.level} | Category: ${book.category}

${book.pages.map((p) => `\n=== Page ${p.pageNumber}: ${p.title || ''} ===\n${p.content}`).join('\n')}`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${book.title.replace(/\s+/g, '_')}_EduLevel.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const categories = [
    { id: 'all', label: 'Barchasi' },
    ...(userTrack !== 'cefr' ? [{ id: 'ielts', label: '🎯 IELTS' }] : []),
    ...(userTrack !== 'ielts' ? [{ id: 'cefr', label: '🇪🇺 CEFR' }] : []),
    { id: 'grammar', label: 'Grammatika' },
    { id: 'vocabulary', label: "Lug'at" },
    { id: 'readers', label: 'Badiiy Qiroat' }
  ];

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Top Banner */}
      <div className="p-6 rounded-3xl page-hero flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold uppercase tracking-wider mb-2">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Edu Level Digital Books Library</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black">
            Raqamli Kutubxona & In-App Reader
          </h2>
          <p className="text-xs text-stone-300 mt-1 max-w-2xl leading-relaxed">
            IELTS 8.0+, CEFR C1, Grammar va Vocabulary bo'yicha nufuzli xalqaro kitoblar. Sayt ichida qulay o'qing, shriftni sozlang va xatcho'plar qo'ying.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/15 text-center shrink-0">
          <span className="text-[10px] text-stone-300 uppercase block">Sizning Kvotangiz</span>
          <span className="text-lg font-black text-emerald-400 font-mono">
            {isVip ? 'Cheksiz VIP' : `${currentUser?.readBookIds?.length || 0} / ${registeredQuota} ta kitob`}
          </span>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1.5">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(c.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedCategory === c.id
                  ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-white shadow-xs'
                  : 'bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Kitob yoki muallifni qidirish..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
        </div>
      </div>

      {filteredBooks.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[1.75rem] border border-dashed border-line/80 bg-white/50 px-6 py-16 text-center dark:border-white/10 dark:bg-white/[0.02]">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-ember-500/10 text-ember-600 dark:bg-ember-500/15 dark:text-ember-400">
            <BookOpen className="h-6 w-6" />
          </div>
          <p className="mt-4 font-display text-[15px] font-bold tracking-tight text-ink dark:text-white">Kitob topilmadi.</p>
          <p className="mt-1 max-w-sm text-[12.5px] text-ink-muted dark:text-stone-400">
            Qidiruvni yoki filtrni o‘zgartirib ko‘ring. Ustoz yangi kitoblarni qo‘shgach, ular shu yerda chiqadi.
          </p>
        </div>
      ) : null}

      {/* Books Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredBooks.map((book) => {
          const isLocked = !canReadBook(book, books.indexOf(book), currentUser);
          const isRead = currentUser?.readBookIds?.includes(book.id);

          return (
            <div
              key={book.id}
              className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl p-5 shadow-xs flex flex-col justify-between hover:shadow-lg hover:border-cyan-500/50 transition-all"
            >
              <div>
                <div className="relative aspect-[3/4] w-full rounded-2xl overflow-hidden mb-4 bg-stone-900 border border-stone-200 dark:border-stone-700">
                  <img src={book.coverUrl} alt={book.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 p-3.5 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded-lg bg-black/60 text-white text-[10px] font-bold">
                        {book.level}
                      </span>
                      {isLocked ? (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500 text-stone-950 text-[10px] font-black uppercase flex items-center gap-1">
                          <Lock className="w-3 h-3" />
                          <span>VIP</span>
                        </span>
                      ) : isRead ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-black uppercase flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>O'qilmoqda</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-cyan-500 text-stone-950 text-[10px] font-black uppercase">
                          Ochiq
                        </span>
                      )}
                    </div>
                    <div>
                      <span className="text-[10px] text-cyan-300 font-bold uppercase tracking-wider">
                        {book.category.toUpperCase()}
                      </span>
                      <h4 className="text-sm font-bold text-white line-clamp-2 leading-snug">
                        {book.title}
                      </h4>
                    </div>
                  </div>
                </div>

                <div className="text-xs text-stone-500 space-y-1 mb-4">
                  <div>
                    Muallif: <strong className="text-stone-900 dark:text-white">{book.author}</strong>
                  </div>
                  <p className="text-[11px] line-clamp-2">{book.description}</p>
                </div>
              </div>

              <div className="pt-3 border-t border-stone-100 dark:border-stone-800 flex items-center gap-2">
                <button
                  onClick={() => handleOpenReader(book)}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:opacity-90 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>{isLocked ? 'VIP bilan ochish' : "Saytda O'qish"}</span>
                </button>

                {(book.downloadAllowed !== false && (book.pdfUrl || book.pages?.length)) && !isLocked && (
                  <button
                    onClick={() => handleDownload(book)}
                    title="Yuklab olish"
                    className="p-2.5 rounded-xl border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300 transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* IN-APP READER MODAL */}
      {readingBook && (
        <div className="fixed inset-0 z-[80] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-hidden">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl max-w-4xl w-full h-[90vh] shadow-2xl flex flex-col overflow-hidden relative">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between gap-4 bg-stone-50 dark:bg-stone-950">
              <div className="flex items-center gap-3 overflow-hidden">
                <BookOpen className="w-5 h-5 text-cyan-500 shrink-0" />
                <div className="overflow-hidden">
                  <h3 className="font-black text-sm sm:text-base text-stone-900 dark:text-white truncate">
                    {readingBook.title}
                  </h3>
                  <span className="text-[11px] text-stone-500">{readingBook.author}</span>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-2 shrink-0">
                {/* Theme Selector (Light / Sepia / Dark) */}
                <div className="flex items-center gap-1 p-1 rounded-xl bg-stone-100 dark:bg-stone-800">
                  {(['light', 'sepia', 'dark'] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => setReaderTheme(t)}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold capitalize transition-all cursor-pointer ${
                        readerTheme === t
                          ? 'bg-cyan-500 text-stone-950 font-black'
                          : 'text-stone-500 hover:text-stone-900 dark:hover:text-white'
                      }`}
                    >
                      {t === 'light' ? '☀️ Oq' : t === 'sepia' ? '📜 Sepia' : '🌙 Tungi'}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() =>
                    toggleBookmark(
                      readingBook.id,
                      readingBook.pages[pageIndex]?.pageNumber || pageIndex + 1
                    )
                  }
                  title="Xatcho'p qo'yish"
                  className={`p-2 rounded-xl transition-colors ${
                    bookmarks[readingBook.id]?.includes(
                      readingBook.pages[pageIndex]?.pageNumber || pageIndex + 1
                    )
                      ? 'bg-amber-500 text-white'
                      : 'bg-stone-100 dark:bg-stone-800 text-stone-500'
                  }`}
                >
                  <Bookmark className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setZoom((z) => Math.max(80, z - 10))}
                  className="p-2 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-xs font-mono font-bold w-12 text-center text-stone-500">
                  {zoom}%
                </span>
                <button
                  onClick={() => setZoom((z) => Math.min(140, z + 10))}
                  className="p-2 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setReadingBook(null)}
                  className="p-2 rounded-xl bg-stone-200 hover:bg-stone-300 dark:bg-stone-800 text-stone-700 dark:text-stone-300 ml-2 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Reading Progress Ribbon */}
            <div className="w-full bg-stone-200 dark:bg-stone-800 h-1">
              <div
                className="bg-cyan-500 h-full transition-all duration-300"
                style={{ width: `${((pageIndex + 1) / totalPages) * 100}%` }}
              />
            </div>

            {/* Content Area with Theme Styling */}
            {isPdfBook && readingBook?.pdfUrl ? (
              <div className="flex-1 min-h-0 bg-stone-950 p-2 sm:p-4">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <a href={readingBook.pdfUrl} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-full border border-white/15 px-4 text-xs font-bold text-white hover:bg-white/10">
                    <Eye className="h-3.5 w-3.5" /> Yangi oynada ochish
                  </a>
                  {readingBook.downloadAllowed !== false && <a href={readingBook.pdfUrl} download className="inline-flex h-9 items-center gap-1.5 rounded-full bg-gradient-to-r from-cyan-500 to-indigo-600 px-4 text-xs font-bold text-white">
                    <Download className="h-3.5 w-3.5" /> Yuklab olish (PDF)
                  </a>}
                </div>
                <iframe
                  title={readingBook.title}
                  src={`${readingBook.pdfUrl}#view=FitH`}
                  className="h-[72vh] w-full rounded-2xl border-0 bg-white sm:h-[78vh]"
                />
              </div>
            ) : null}
            <div hidden={isPdfBook} className={`flex-1 p-6 sm:p-10 overflow-y-auto transition-colors ${
              readerTheme === 'sepia'
                ? 'bg-[#f4ecd8] text-[#433422]'
                : readerTheme === 'light'
                ? 'bg-stone-100 text-stone-900'
                : 'bg-stone-950 text-stone-200'
            }`}>
              <div
                className={`max-w-2xl mx-auto rounded-3xl p-8 sm:p-12 shadow-md min-h-[500px] flex flex-col justify-between transition-colors border ${
                  readerTheme === 'sepia'
                    ? 'bg-[#fbf0d9] border-[#e8dbc3] text-[#3e2e1e]'
                    : readerTheme === 'light'
                    ? 'bg-white border-stone-200 text-stone-900'
                    : 'bg-[#0b101d] border-stone-800 text-stone-200'
                }`}
                style={{ fontSize: `${zoom}%` }}
              >
                <div>
                  <div className="flex items-center justify-between text-xs opacity-60 font-mono pb-4 border-b border-black/10 dark:border-white/10 mb-6">
                    <span>
                      Sahifa {readingBook.pages[pageIndex]?.pageNumber || pageIndex + 1} / {totalPages}
                    </span>
                    <span>Taxminiy: ~{Math.ceil(totalPages * 2)} daqiqa mutolaa</span>
                  </div>

                  <h4 className="text-xl font-bold mb-6">
                    {readingBook.pages[pageIndex]?.title}
                  </h4>

                  {!isPdfBook && readingBook.pages.length === 0 ? (
                    <div className="space-y-3 text-sm opacity-80">
                      <p>Bu kitobning fayli hali yuklanmagan. Ustoz PDF faylini yuklagach, shu yerda o‘qish va yuklab olish mumkin bo‘ladi.</p>
                      {readingBook.description ? <p>{readingBook.description}</p> : null}
                      <p className="text-xs opacity-60">Muallif: {readingBook.author} · Daraja: {readingBook.level}{readingBook.pageCount ? ` · ${readingBook.pageCount} sahifa` : ''}</p>
                    </div>
                  ) : null}
                  <div className="leading-loose text-justify font-serif text-sm sm:text-base space-y-4">
                    {readingBook.pages[pageIndex]?.content
                      ?.split('\n')
                      .filter(Boolean)
                      .map((para, pI) => (
                        <p key={pI}>{para}</p>
                      ))}
                  </div>
                </div>

                <div className="pt-8 border-t border-black/10 dark:border-white/10 text-center text-[11px] opacity-50">
                  Edu Level Digital Book Reader • In-App Verified Copy
                </div>
              </div>
            </div>

            {/* Footer Navigation */}
            <div className="p-4 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between bg-white dark:bg-stone-950">
              <button
                disabled={isPdfBook || pageIndex === 0}
                onClick={() => setPageIndex((p) => p - 1)}
                className="px-4 py-2 rounded-xl text-xs font-bold border border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300 disabled:opacity-30 hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center gap-1.5 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Oldingi Sahifa</span>
              </button>

              <div className="text-xs font-bold text-stone-500 font-mono flex items-center gap-2">
                <span>{pageIndex + 1} / {totalPages}</span>
                <span className="text-[10px] text-cyan-500">
                  ({Math.round(((pageIndex + 1) / totalPages) * 100)}%)
                </span>
              </div>

              <button
                disabled={isPdfBook || pageIndex >= totalPages - 1}
                onClick={() => setPageIndex((p) => p + 1)}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-500 to-indigo-600 text-white disabled:opacity-30 hover:opacity-90 flex items-center gap-1.5 cursor-pointer"
              >
                <span>Keyingi Sahifa</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
