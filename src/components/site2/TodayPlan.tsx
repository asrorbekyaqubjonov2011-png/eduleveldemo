'use client';
import React from 'react';
import { BookOpen, ClipboardList, Layers, Award, CheckCircle2, ArrowRight } from 'lucide-react';
import { useApp } from '../../context/AppContext';

/**
 * "Bugungi reja": what is still open for this student, counted from their own records only.
 * Each line opens the place where it is done. A line at zero shows as done.
 */
export const TodayPlan: React.FC<{ onNavigateTab: (tab: string) => void }> = ({ onNavigateTab }) => {
  const { db, currentUser } = useApp();
  if (!currentUser) return null;
  const track = currentUser.track || 'general';
  const done = new Set(currentUser.completedLessons || []);
  const lessonsOpen = (db.lessons || []).filter((l) => (!l.track || l.track === track) && l.isPublished !== false && !done.has(l.id)).length;
  const attempted = new Set((db.exerciseAttempts || []).filter((a) => a.userId === currentUser.id).map((a) => a.exerciseId));
  const exercisesOpen = (db.exercises || []).filter((e) => e.status === 'published' && !attempted.has(e.id)).length;
  const now = Date.now();
  const cardsDue = (db.flashcards || []).filter((c) => c.userId === currentUser.id && Date.parse(c.nextReviewDate) <= now).length;
  const testTaken = new Set((db.testAttempts || []).filter((a) => a.userId === currentUser.id).map((a) => a.testId));
  const testsOpen = (db.tests || []).filter((t) => (t.track || 'ielts') === track && t.published !== false && !testTaken.has(t.id)).length;

  const items = [
    { icon: BookOpen, label: 'Video darslar', count: lessonsOpen, unit: 'ta dars kutmoqda', tab: 'courses' },
    { icon: ClipboardList, label: 'Mashqlar', count: exercisesOpen, unit: 'ta yangi mashq', tab: 'mashqlar' },
    { icon: Layers, label: 'Kartochkalar', count: cardsDue, unit: 'ta so‘z takrorlash vaqti keldi', tab: 'ai_studio' },
    { icon: Award, label: 'Mock imtihonlar', count: testsOpen, unit: 'ta test topshirilmagan', tab: 'tests' }
  ];
  const open = items.filter((i) => i.count > 0).length;

  return (
    <section aria-label="Bugungi reja" className="liquid-glass rounded-[26px] p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-[16px] font-extrabold text-ink dark:text-white">Bugungi reja</h2>
        <span className="rounded-full bg-[#f2650f]/12 px-3 py-1 text-[12px] font-bold text-[#c4520a] dark:text-[#ffc982]">
          {open ? `${open} ta bo‘lim kutmoqda` : 'Hammasi bajarilgan'}
        </span>
      </div>
      <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
        {items.map((i) => (
          <li key={i.label}>
            <button
              type="button"
              onClick={() => onNavigateTab(i.tab)}
              className="group flex w-full items-center gap-3 rounded-2xl border border-line/70 bg-white/60 p-3.5 text-left transition-all hover:-translate-y-0.5 hover:border-[#f2650f]/40 dark:border-white/10 dark:bg-white/[0.04]"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f2650f]/10 text-[#c4520a] dark:text-[#ffc982]"><i.icon className="h-[18px] w-[18px]" /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13.5px] font-bold text-ink dark:text-white">{i.label}</span>
                <span className="block truncate text-[12px] text-ink-muted dark:text-stone-400">
                  {i.count > 0 ? `${i.count} ${i.unit}` : 'Bajarildi ✓'}
                </span>
              </span>
              {i.count > 0 ? <ArrowRight className="h-4 w-4 shrink-0 text-ink-muted transition-transform group-hover:translate-x-0.5" /> : <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
};
