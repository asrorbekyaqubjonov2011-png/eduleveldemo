'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Search,
  BookOpen,
  PlayCircle,
  Award,
  PenTool,
  Mic,
  Headphones,
  Sparkles,
  Languages,
  ArrowRight,
  X,
  Compass,
  Trophy,
  Wallet,
  ShieldCheck,
  User
} from 'lucide-react';

interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateLmsTab?: (tab: string) => void;
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  isOpen,
  onClose,
  onNavigateLmsTab
}) => {
  const {
    db,
    currentUser,
    activeSite,
    setActiveSite,
    setActiveCourseId,
    setActiveTestId
  } = useApp();

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const allItems = useMemo(() => {
    const list: {
      id: string;
      title: string;
      subtitle: string;
      category: string;
      badge?: string;
      icon: React.FC<{ className?: string }>;
      action: () => void;
    }[] = [];

    // 2. Core Simulators
    const simulators = [
      {
        id: 'sim-mashqlar',
        title: 'Mashqlar',
        subtitle: 'Reading, Listening, Speaking va Writing — bitta bo‘limda',
        tab: 'mashqlar',
        badge: 'Mashq',
        icon: PenTool
      },
      {
        id: 'sim-translator',
        title: '3-Darajali Akademik Lug‘at & SM-2 Flashcards',
        subtitle: 'B1 / B2 / C1 sinonimlar va tezkor xotira kartochkalari',
        tab: 'translator',
        badge: 'B1-C1',
        icon: Languages
      },
      {
        id: 'sim-ai',
        title: 'Edubek AI (GoPrep) Shaxsiy Ustoz',
        subtitle: '24/7 savol-javob, grammatika va insho tahlili',
        tab: 'ai_studio',
        badge: 'AI Tutor',
        icon: Sparkles
      }
    ];

    simulators.forEach((s) => {
      list.push({
        id: s.id,
        title: s.title,
        subtitle: s.subtitle,
        category: '4-Skill Arena & AI',
        badge: s.badge,
        icon: s.icon,
        action: async () => {
          if (!currentUser) {
            setActiveSite('auth');
          } else {
            setActiveSite('site2_lms');
          }
          if (onNavigateLmsTab) onNavigateLmsTab(s.tab);
          onClose();
        }
      });
    });

    // 3. Reading Tests
    (db.readingTests || []).forEach((rt) => {
      list.push({
        id: `rt-${rt.id}`,
        title: rt.title,
        subtitle: `${rt.track.toUpperCase()} Reading · ${rt.durationMinutes} daqiqa · ${rt.passages.length} qism`,
        category: 'Reading Testlar',
        badge: rt.track === 'cefr' ? 'CEFR 75 Ball' : 'IELTS Band',
        icon: BookOpen,
        action: async () => {
          if (!currentUser) {
            setActiveSite('auth');
          } else {
            setActiveSite('site2_lms');
          }
          if (onNavigateLmsTab) onNavigateLmsTab('mashqlar');
          onClose();
        }
      });
    });

    // 4. Courses
    (db.courses || []).forEach((c) => {
      list.push({
        id: `course-${c.id}`,
        title: c.title,
        subtitle: `${c.level} · ${c.track?.toUpperCase() || 'IELTS'} video kurs`,
        category: 'Video Kurslar',
        badge: c.requiredVIP && c.requiredVIP !== 'none' && c.requiredVIP !== 'free' ? 'VIP' : 'Ochiq',
        icon: PlayCircle,
        action: async () => {
          if (!currentUser) {
            setActiveSite('auth');
          }
          setActiveCourseId(c.id);
          setActiveSite('site2_lms');
          if (onNavigateLmsTab) onNavigateLmsTab('courses');
          onClose();
        }
      });
    });

    return list;
  }, [db.readingTests, db.courses, currentUser, onNavigateLmsTab, onClose, setActiveCourseId, setActiveSite]);

  const filteredItems = useMemo(() => {
    if (!query.trim()) return allItems.slice(0, 10);
    const q = query.toLowerCase();
    return allItems.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
    );
  }, [allItems, query]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredItems.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + Math.max(1, filteredItems.length)) % Math.max(1, filteredItems.length));
      } else if (e.key === 'Enter' && filteredItems[selectedIndex]) {
        e.preventDefault();
        filteredItems[selectedIndex].action();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredItems, selectedIndex, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center pt-16 sm:pt-24 px-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-stone-950/75 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Window */}
      <div className="relative z-10 w-full max-w-2xl bg-white dark:bg-[#0B0F19] border border-stone-200 dark:border-stone-800 rounded-2xl shadow-2xl overflow-hidden animate-site-fade-in">
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-stone-200 dark:border-stone-800">
          <Search className="w-5 h-5 text-cyan-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="CEFR Reading, IELTS Mock, Video dars yoki lug‘at qidiring..."
            className="w-full bg-transparent text-sm sm:text-base text-stone-900 dark:text-white placeholder-stone-400 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-xs text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 px-1.5 py-0.5 rounded"
            >
              Tozalash
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
            aria-label="Yopish"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-[65vh] overflow-y-auto p-2 divide-y divide-stone-100 dark:divide-stone-800/60">
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm font-semibold text-stone-700 dark:text-stone-300">
                Hech narsa topilmadi
              </p>
              <p className="text-xs text-stone-400 mt-1">
                &ldquo;CEFR&rdquo;, &ldquo;Reading&rdquo;, &ldquo;Writing&rdquo; yoki &ldquo;IELTS&rdquo; deb qidirib ko‘ring
              </p>
            </div>
          ) : (
            <div className="space-y-1 py-1">
              {filteredItems.map((item, idx) => {
                const Icon = item.icon;
                const isSelected = idx === selectedIndex;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={item.action}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`w-full text-left px-3.5 py-3 rounded-xl flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-cyan-500/10 dark:bg-cyan-500/15 text-stone-900 dark:text-white'
                        : 'text-stone-700 dark:text-stone-300 hover:bg-stone-100/70 dark:hover:bg-stone-900/60'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                          isSelected
                            ? 'bg-cyan-500 text-stone-950'
                            : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs sm:text-sm font-bold text-stone-900 dark:text-white truncate">
                          {item.title}
                        </div>
                        <div className="text-[11px] text-stone-500 dark:text-stone-400 truncate mt-0.5">
                          <span>{item.category}</span>
                          <span className="mx-1.5">·</span>
                          <span>{item.subtitle}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {item.badge && (
                        <span className="text-[11px] font-mono text-cyan-600 dark:text-cyan-400">
                          {item.badge}
                        </span>
                      )}
                      <ArrowRight
                        className={`w-4 h-4 transition-transform ${
                          isSelected ? 'text-cyan-500 translate-x-0.5' : 'text-stone-400'
                        }`}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Hints */}
        <div className="px-4 py-2.5 bg-stone-50 dark:bg-stone-900/90 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between text-[11px] text-stone-500 dark:text-stone-400">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-stone-200 dark:bg-stone-800 font-mono text-[10px]">↑↓</kbd> Tanlash
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-stone-200 dark:bg-stone-800 font-mono text-[10px]">Enter</kbd> Ochish
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-stone-200 dark:bg-stone-800 font-mono text-[10px]">Esc</kbd> Yopish
            </span>
          </div>
          <span className="font-mono text-[10px] text-cyan-600 dark:text-cyan-400">
            Edu Level Smart Navigator
          </span>
        </div>
      </div>
    </div>
  );
};
