import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { BookOpen, Download, Lock, Eye, X, ChevronLeft, ChevronRight, CheckCircle2, ZoomIn, ZoomOut, Sparkles } from 'lucide-react';
import { Reveal } from '../ui/motion-primitives';
import { SectionHeader, Button } from '../ui';
import { cn } from '../ui/styles';
import { DigitalBook } from '../../types';

interface PublicBooksPreviewSectionProps {
  onOpenAuth?: (mode: 'login' | 'register') => void;
}

export const PublicBooksPreviewSection: React.FC<PublicBooksPreviewSectionProps> = ({ onOpenAuth }) => {
  const { db, currentUser } = useApp();
  const [selectedBook, setSelectedBook] = useState<DigitalBook | null>(null);
  const [activePageIdx, setActivePageIdx] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [promptRegisterModal, setPromptRegisterModal] = useState<DigitalBook | null>(null);

  const books = db.digitalBooks || [];
  // For guests: first 4 books are free
  // For registered free users: first 6 books are free
  const guestLimit = 4;
  const registeredLimit = 6;

  const handleOpenBook = (book: DigitalBook, index: number) => {
    if (!currentUser && index >= guestLimit) {
      setPromptRegisterModal(book);
      return;
    }
    if (currentUser && currentUser.vipTier === 'none' && index >= registeredLimit) {
      setPromptRegisterModal(book);
      return;
    }
    setSelectedBook(book);
    setActivePageIdx(0);
  };

  const handleDownloadPdf = (book: DigitalBook) => {
    const textData = `EDU LEVEL DIGITAL LIBRARY — ${book.title.toUpperCase()}
Author: ${book.author}
Level: ${book.level} | Category: ${book.category.toUpperCase()}

=======================================================
TABLE OF CONTENTS & EXCERPTS:
=======================================================
${book.pages.map((p) => `\n--- PAGE ${p.pageNumber}: ${p.title || 'Chapter'} ---\n${p.content}\n`).join('\n')}

© Edu Level English Learning Ecosystem 2026.`;

    const blob = new Blob([textData], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${book.title.replace(/[^a-zA-Z0-9]/g, '_')}_EduLevel.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section id="books" className="relative border-t border-line/70 py-20 sm:py-28 dark:border-white/10">
      <div className="mx-auto w-full max-w-[1240px] px-5 sm:px-8 lg:px-10">
        <Reveal>
          <SectionHeader
            label="Raqamli Kutubxona & In-App Reader"
            align="center"
            title="Mehmonlar Uchun 4 Ta Mutlaqo Bepul Kitob"
            lead="IELTS, CEFR, Grammatika va C1 asarlar. Hech qanday ro'yxatdan o'tmasdan saytning o'zida ochib o'qing yoki yuklab oling! (Ro'yxatdan o'tgach yana 2 ta bepul kitob ochiladi)."
            footer={
              <span className="inline-flex items-center gap-2 text-[11.5px] font-semibold tracking-wide text-ink-muted/80 dark:text-stone-500">
                <Sparkles className="h-3.5 w-3.5 text-[#ef6c12] dark:text-[#ffb45c]" />
                In-app reader • Yuklab olish • Sertifikatlangan nashrlar
              </span>
            }
          />
        </Reveal>

        <div className="mt-14 grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 lg:grid-cols-4">
          {books.slice(0, 4).map((book, idx) => {
            const isGuestFree = idx < guestLimit;
            const isRegisteredFree = idx < registeredLimit;
            const isLocked = !currentUser ? !isGuestFree : currentUser.vipTier === 'none' ? !isRegisteredFree : false;

            return (
              <Reveal key={book.id} delay={idx * 70} amount={0.12}>
                <article data-reveal="rise" data-reveal-delay={idx * 110} className="group flex h-full flex-col">
                  <button
                    type="button"
                    onClick={() => handleOpenBook(book, idx)}
                    className="relative block w-full cursor-pointer rounded-[22px] text-left"
                    aria-label={book.title}
                  >
                    {/* Cover */}
                    <div className="relative aspect-[3/4] w-full overflow-hidden rounded-[1.25rem] border border-line/70 bg-ink shadow-[0_24px_48px_-26px_rgba(18,16,14,0.55)] transition-all duration-500 group-hover:-translate-y-1.5 group-hover:shadow-[0_34px_60px_-26px_rgba(18,16,14,0.6)] dark:border-white/10">
                      <img
                        src={book.coverUrl}
                        alt={book.title}
                        className="h-full w-full object-cover transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.06]"
                      />

                      {/* Scrim */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-black/40" />

                      {/* Top row: level + access */}
                      <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-2">
                        <span className="rounded-full border border-white/20 bg-black/35 px-2.5 py-1 text-[9.5px] font-bold uppercase tracking-[0.14em] text-white/90 backdrop-blur-md">
                          {book.level}
                        </span>
                        {isLocked ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-[#ffd0a3]/40 bg-[#ff8a2b]/90 px-2.5 py-1 text-[9.5px] font-bold uppercase tracking-[0.1em] text-[#231201] backdrop-blur-md">
                            <Lock className="h-2.5 w-2.5" strokeWidth={2.6} />
                            <span>Registratsiya</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300/30 bg-emerald-500/90 px-2.5 py-1 text-[9.5px] font-bold uppercase tracking-[0.1em] text-white backdrop-blur-md">
                            <CheckCircle2 className="h-2.5 w-2.5" strokeWidth={2.6} />
                            <span>Bepul</span>
                          </span>
                        )}
                      </div>

                      {/* Bottom caption */}
                      <div className="absolute inset-x-4 bottom-4">
                        <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#ffcf8f]">
                          {book.category.toUpperCase()}
                        </div>
                        <h4 className="mt-1.5 font-display text-[14px] font-extrabold leading-[1.25] tracking-[-0.02em] text-white line-clamp-2">
                          {book.title}
                        </h4>
                      </div>

                      {/* Hover read affordance */}
                      <div className="absolute inset-0 flex items-center justify-center bg-ink/35 opacity-0 backdrop-blur-[2px] transition-opacity duration-300 group-hover:opacity-100">
                        <span className="inline-flex items-center gap-2 rounded-full bg-white/95 px-4 py-2 text-[11.5px] font-bold text-ink shadow-lg">
                          <Eye className="h-3.5 w-3.5 text-[#ef6c12]" />
                          {isLocked ? "Ro'yxatdan o'tish" : "Saytda O'qish"}
                        </span>
                      </div>
                    </div>
                  </button>

                  {/* Meta */}
                  <div className="mt-4 flex flex-1 flex-col">
                    <div className="text-[11px] font-medium text-ink-muted dark:text-stone-500">
                      Muallif:{' '}
                      <span className="font-bold text-ink-soft dark:text-stone-200">{book.author}</span>
                    </div>
                    <p className="mt-1.5 flex-1 text-[12px] leading-relaxed text-ink-muted/90 line-clamp-2 dark:text-stone-500">
                      {book.description}
                    </p>

                    <div className="mt-4 flex items-center gap-2 border-t border-line/70 pt-3 dark:border-white/10">
                      <button
                        onClick={() => handleOpenBook(book, idx)}
                        className={cn(
                          'group/btn flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-full px-3 py-2 text-[11.5px] font-bold transition-all duration-300',
                          isLocked
                            ? 'border border-line/90 bg-transparent text-ink hover:bg-ink hover:text-white dark:border-white/15 dark:text-white dark:hover:bg-white dark:hover:text-ink'
                            : 'bg-ink text-white hover:bg-[#23201c] dark:bg-white dark:text-ink dark:hover:bg-stone-100'
                        )}
                      >
                        <Eye className="h-3 w-3" strokeWidth={2.2} />
                        <span>{isLocked ? "Ochish (Ro'yxat)" : "Saytda O'qish"}</span>
                      </button>

                      {book.downloadAllowed && !isLocked && (
                        <button
                          onClick={() => handleDownloadPdf(book)}
                          title="Yuklab olish"
                          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-line/90 text-ink-muted transition-colors hover:border-ink/30 hover:text-ink dark:border-white/15 dark:text-stone-400 dark:hover:border-white/30 dark:hover:text-white"
                        >
                          <Download className="h-3 w-3" strokeWidth={2.2} />
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              </Reveal>
            );
          })}
        </div>
      </div>

      {/* IN-APP READER MODAL */}
      {selectedBook && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center overflow-hidden bg-ink/70 p-3 backdrop-blur-xl sm:p-6">
          <div className="glass-4 relative flex h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-[1.75rem] shadow-[0_60px_120px_-40px_rgba(0,0,0,0.65)]">
            {/* Reader Header */}
            <div className="flex items-center justify-between gap-4 border-b border-line/70 px-5 py-4 dark:border-white/10">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ink/[0.05] text-[#ef6c12] dark:bg-white/[0.06] dark:text-[#ffb45c]">
                  <BookOpen className="h-4 w-4" strokeWidth={2} />
                </div>
                <div className="min-w-0">
                  <h3 className="truncate font-display text-[14px] font-extrabold tracking-[-0.015em] text-ink dark:text-white">
                    {selectedBook.title}
                  </h3>
                  <div className="mt-0.5 flex items-center gap-2 text-[10.5px] text-ink-muted dark:text-stone-500">
                    <span className="truncate">{selectedBook.author}</span>
                    <span className="h-0.5 w-0.5 rounded-full bg-ink-muted/50" />
                    <span className="font-bold uppercase tracking-[0.1em] text-[#ef6c12] dark:text-[#ffb45c]">
                      {selectedBook.level}
                    </span>
                  </div>
                </div>
              </div>

              {/* Reader Controls */}
              <div className="flex shrink-0 items-center gap-1.5">
                <div className="hidden items-center gap-0.5 rounded-full border border-line/80 bg-white/50 p-0.5 sm:flex dark:border-white/10 dark:bg-white/[0.04]">
                  <button
                    onClick={() => setZoomLevel((z) => Math.max(80, z - 10))}
                    title="Shriftni kichraytirish"
                    className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-ink/[0.06] hover:text-ink dark:text-stone-400 dark:hover:bg-white/10 dark:hover:text-white"
                  >
                    <ZoomOut className="h-3.5 w-3.5" />
                  </button>
                  <span className="w-10 text-center font-mono text-[10.5px] font-bold text-ink-muted dark:text-stone-500">
                    {zoomLevel}%
                  </span>
                  <button
                    onClick={() => setZoomLevel((z) => Math.min(140, z + 10))}
                    title="Shriftni kattalashtirish"
                    className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-ink/[0.06] hover:text-ink dark:text-stone-400 dark:hover:bg-white/10 dark:hover:text-white"
                  >
                    <ZoomIn className="h-3.5 w-3.5" />
                  </button>
                </div>
                <button
                  onClick={() => setSelectedBook(null)}
                  className="ml-1 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-line/80 text-ink-muted transition-colors hover:border-ink/25 hover:text-ink dark:border-white/10 dark:text-stone-400 dark:hover:border-white/25 dark:hover:text-white"
                  aria-label="Yopish"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Reader Page Content */}
            <div className="flex-1 overflow-y-auto bg-[#efeae1]/60 px-4 py-8 sm:px-10 sm:py-12 dark:bg-black/20">
              <div
                className="mx-auto flex min-h-[500px] max-w-2xl flex-col justify-between rounded-[1.5rem] border border-line/80 bg-[#fdfbf8] p-8 shadow-[0_24px_50px_-30px_rgba(18,16,14,0.35)] sm:p-12 dark:border-white/10 dark:bg-[#15130f]"
                style={{ fontSize: `${zoomLevel}%` }}
              >
                <div>
                  <div className="mb-6 flex items-center justify-between border-b border-line/60 pb-4 font-mono text-[10.5px] uppercase tracking-[0.1em] text-ink-muted/70 dark:border-white/10 dark:text-stone-500">
                    <span>
                      Sahifa {selectedBook.pages[activePageIdx]?.pageNumber || activePageIdx + 1} / {selectedBook.pages.length}
                    </span>
                    <span className="truncate pl-4">{selectedBook.pages[activePageIdx]?.title || 'Bob'}</span>
                  </div>

                  <h4 className="mb-6 font-display text-[20px] font-extrabold leading-tight tracking-[-0.025em] text-ink dark:text-white">
                    {selectedBook.pages[activePageIdx]?.title}
                  </h4>

                  <div className="space-y-4 text-justify font-serif text-[13.5px] leading-[1.85] text-ink-soft sm:text-[14.5px] dark:text-stone-200">
                    {selectedBook.pages[activePageIdx]?.content
                      ?.split('\n')
                      .filter(Boolean)
                      .map((para, pI) => (
                        <p key={pI}>{para}</p>
                      ))}
                  </div>
                </div>

                <div className="pt-8 text-center text-[10px] uppercase tracking-[0.16em] text-ink-muted/60 dark:text-stone-600">
                  Edu Level Digital Book Reader • In-App Verified Copy
                </div>
              </div>
            </div>

            {/* Reader Footer Navigation */}
            <div className="flex items-center justify-between border-t border-line/70 px-4 py-3.5 dark:border-white/10">
              <button
                disabled={activePageIdx === 0}
                onClick={() => setActivePageIdx((p) => p - 1)}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-2 text-[11.5px] font-semibold text-ink-muted transition-colors hover:bg-ink/[0.05] hover:text-ink disabled:pointer-events-none disabled:opacity-30 dark:text-stone-400 dark:hover:bg-white/[0.06] dark:hover:text-white"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Oldingi Sahifa</span>
              </button>

              <span className="font-mono text-[11px] font-bold tracking-[0.08em] text-ink-muted dark:text-stone-500">
                {activePageIdx + 1} / {selectedBook.pages.length}
              </span>

              <button
                disabled={activePageIdx >= selectedBook.pages.length - 1}
                onClick={() => setActivePageIdx((p) => p + 1)}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-[11.5px] font-bold text-white transition-all hover:bg-[#23201c] disabled:pointer-events-none disabled:opacity-30 dark:bg-white dark:text-ink dark:hover:bg-stone-100"
              >
                <span className="hidden sm:inline">Keyingi Sahifa</span>
                <span className="sm:hidden">Keyingi</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PROMPT REGISTRATION MODAL FOR 5th/6th BOOKS */}
      {promptRegisterModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-ink/65 p-4 backdrop-blur-xl">
          <div className="glass-4 relative w-full max-w-md overflow-hidden rounded-[1.75rem] p-7 text-center shadow-[0_60px_120px_-40px_rgba(0,0,0,0.6)] sm:p-9">
            <div className="pointer-events-none absolute -top-24 left-1/2 h-52 w-52 -translate-x-1/2 rounded-full bg-[#ff8a2b]/20 soft-blob" />

            <div className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-[#ffd0a3]/50 bg-gradient-to-b from-[#fff3e6] to-[#ffe4c7] text-[#ef6c12] shadow-[0_16px_30px_-14px_rgba(239,108,18,0.5)] dark:border-[#ff8a2b]/25 dark:from-[#ff8a2b]/15 dark:to-[#ff8a2b]/5 dark:text-[#ffb45c]">
              <BookOpen className="h-6 w-6" strokeWidth={1.9} />
            </div>

            <h3 className="mt-6 font-display text-[21px] font-extrabold leading-tight tracking-[-0.03em] text-ink dark:text-white">
              Yana 2 Ta Bepul Kitobni Oching!
            </h3>

            <p className="mx-auto mt-3 max-w-[340px] text-[13px] leading-relaxed text-ink-muted dark:text-stone-400">
              Siz mehmonlar uchun ajratilgan <strong className="font-bold text-ink dark:text-white">4 ta bepul kitob</strong> kvotasidan foydalanmoqdasiz. Bepul ro'yxatdan o'ting va{' '}
              <strong className="font-bold text-ink dark:text-white">"{promptRegisterModal.title}"</strong> hamda qolgan kitoblarni darhol oching!
            </p>

            <div className="mt-6 space-y-2.5 rounded-2xl border border-line/80 bg-white/55 px-4 py-4 text-left dark:border-white/10 dark:bg-white/[0.04]">
              <div className="flex items-center gap-2.5 text-[12px] font-medium text-ink-soft dark:text-stone-300">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[#ef6c12] dark:text-[#ffb45c]" strokeWidth={2.4} />
                <span>Ro'yxatdan o'tganlarga: 6 ta bepul kitob</span>
              </div>
              <div className="flex items-center gap-2.5 text-[12px] font-medium text-ink-soft dark:text-stone-300">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[#ef6c12] dark:text-[#ffb45c]" strokeWidth={2.4} />
                <span>PDF yuklab olish va eslatmalar qo'yish</span>
              </div>
            </div>

            <div className="mt-6 space-y-2">
              <Button
                onClick={() => {
                  setPromptRegisterModal(null);
                  if (onOpenAuth) onOpenAuth('register');
                }}
                variant="ember"
                size="lg"
                className="w-full"
              >
                Bepul Ro'yxatdan O'tish
              </Button>
              <button
                onClick={() => setPromptRegisterModal(null)}
                className="w-full cursor-pointer rounded-full px-4 py-2.5 text-[12px] font-semibold text-ink-muted transition-colors hover:text-ink dark:text-stone-400 dark:hover:text-white"
              >
                Keyinroq
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
