import { BunnyVideoPicker } from './BunnyVideoPicker';
import React, { useState } from 'react';
import { detectVideoProvider, isPlaceholderVideo, VIDEO_PROVIDER_LABEL } from '../../lib/video';
import { lessonBotCode } from '../../lib/telegramLessons';
import { api } from '../../services/api';
import { LessonVideo } from '../common/LessonVideo';
import { useApp } from '../../context/AppContext';
import { Course, Lesson, CourseLevel, VIPTier } from '../../types';
import { Plus, Trash2, PlayCircle, X, Clock, FileText, Sigma, Layers, Video, Copy } from 'lucide-react';
import { Glass, Button, Pill } from '../ui';
import { Reveal } from '../ui/motion-primitives';
import { field, label, cn } from '../ui/styles';
import { AiQuickMock } from './AiQuickMock';

export const CoursesManager: React.FC = () => {
  const { db, createCourse, updateCourse, deleteCourse, createLesson, updateLesson, deleteLesson, refreshDb } = useApp();

  const [selectedCourseId, setSelectedCourseId] = useState<string>(db.courses[0]?.id || '');
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [showLessonModal, setShowLessonModal] = useState(false);

  // Form states for Course
  const [courseTitle, setCourseTitle] = useState('');
  const [courseDesc, setCourseDesc] = useState('');
  const [courseLevel, setCourseLevel] = useState<CourseLevel>('ielts');
  const [coursePrice, setCoursePrice] = useState(390000);
  const [courseVIP, setCourseVIP] = useState<VIPTier>('start');
  const [courseTrack, setCourseTrack] = useState<'ielts' | 'cefr' | 'general'>('ielts');
  const [trackFilter, setTrackFilter] = useState<'all' | 'ielts' | 'cefr' | 'general'>('all');
  const visibleCourses = db.courses.filter((c) => trackFilter === 'all' || (c.track || 'ielts') === trackFilter);
  const TRACK_LABEL: Record<string, string> = { ielts: 'IELTS', cefr: 'CEFR', general: 'General' };

  // Form states for Lesson
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonCode, setLessonCode] = useState('');
  const [lessonError, setLessonError] = useState<string | null>(null);
  const [copiedLessonId, setCopiedLessonId] = useState<string | null>(null);
  const [lessonDesc, setLessonDesc] = useState('');
  const [lessonVideo, setLessonVideo] = useState('');
  const [lessonVideoTiers, setLessonVideoTiers] = useState<string[]>([]);
  const [lessonBunnyId, setLessonBunnyId] = useState('');
  const [lessonDuration, setLessonDuration] = useState(30);
  const [lessonFormula, setLessonFormula] = useState('');
  const [lessonNotes, setLessonNotes] = useState('');
  const [lessonHomework, setLessonHomework] = useState('');
  const [quizBusy, setQuizBusy] = useState(false);
  const [quizMsg, setQuizMsg] = useState<string | null>(null);

  const activeCourse = db.courses.find(c => c.id === selectedCourseId) || db.courses[0];
  const activeLessons = db.lessons
    .filter(l => l.courseId === activeCourse?.id)
    .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [lessonSubtitle, setLessonSubtitle] = useState('');
  const [lessonPdf, setLessonPdf] = useState('');
  const [lessonResources, setLessonResources] = useState('');
  const [lessonPublished, setLessonPublished] = useState(true);
  const [previewLessonId, setPreviewLessonId] = useState<string | null>(null);

  const openLessonEditor = (lesson?: (typeof db.lessons)[number]) => {
    setEditingLessonId(lesson?.id || null);
    setLessonTitle(lesson?.title || '');
    setLessonDesc(lesson?.description || '');
    setLessonVideo(lesson?.videoUrl || '');
    setLessonVideoTiers(lesson?.videoTiers || []);
    setLessonBunnyId(lesson?.bunnyVideoId || '');
    setLessonCode(lesson?.lessonCode || '');
    setLessonError(null);
    setLessonDuration(lesson?.durationMinutes || 30);
    setLessonFormula(lesson?.mathFormula || '');
    setLessonNotes(lesson?.notesMarkdown || '');
    setLessonHomework(lesson?.homework || '');
    setQuizMsg(null);
    setLessonSubtitle(lesson?.subtitleUrl || '');
    setLessonPdf(lesson?.pdfUrl || '');
    setLessonResources((lesson?.resources || []).map((r) => `${r.title} | ${r.url}`).join('\n'));
    setLessonPublished(lesson ? lesson.isPublished !== false : true);
    setShowLessonModal(true);
  };

  const moveLesson = async (idx: number, dir: -1 | 1) => {
    const a = activeLessons[idx];
    const b = activeLessons[idx + dir];
    if (!a || !b) return;
    // Normalise order indexes, then swap the two neighbours.
    await Promise.all(
      activeLessons.map((l, i) => {
        const order = i === idx ? idx + dir + 1 : i === idx + dir ? idx + 1 : i + 1;
        return l.orderIndex === order ? null : updateLesson(l.id, { orderIndex: order });
      })
    );
  };

  // Drag a lesson row onto another to move it there; the arrows stay for keyboards and phones.
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const dropLesson = async (to: number) => {
    const from = dragFrom;
    setDragFrom(null);
    setDragOver(null);
    if (from === null || from === to) return;
    const next = [...activeLessons];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    await Promise.all(next.map((l, i) => (l.orderIndex === i + 1 ? null : updateLesson(l.id, { orderIndex: i + 1 }))));
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseTitle) return;

    await createCourse({
      title: courseTitle,
      description: courseDesc,
      level: courseLevel,
      track: courseTrack,
      price: coursePrice,
      requiredVIP: courseVIP,
      published: true
    });
    setShowCourseModal(false);
    setCourseTitle('');
    setCourseDesc('');
  };

  const generateLessonTest = async () => {
    if (!editingLessonId) return;
    setQuizBusy(true);
    setQuizMsg(null);
    try {
      const res = await api.generateLessonQuiz(editingLessonId, 5);
      if (res.success) {
        await refreshDb();
        setQuizMsg(`Test yaratildi: ${res.questions} ta savol. O‘quvchi videoni ko‘rgach shu test chiqadi.`);
      } else {
        setQuizMsg(res.message || 'Test yaratilmadi.');
      }
    } catch {
      setQuizMsg('Server bilan bog‘lanib bo‘lmadi.');
    } finally {
      setQuizBusy(false);
    }
  };

  const handleCreateLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCourse || !lessonTitle) return;
    const resources = lessonResources
      .split('\n')
      .map((line) => line.split('|').map((x) => x.trim()))
      .filter(([t, u]) => t && u && /^(https?:\/\/|\/)/.test(u))
      .map(([title, url]) => ({ title, url }));
    const payload = {
      title: lessonTitle,
      description: lessonDesc,
      videoUrl: lessonVideo,
      videoTiers: lessonVideoTiers,
      bunnyVideoId: lessonBunnyId.trim() || undefined,
      durationMinutes: lessonDuration,
      mathFormula: lessonFormula,
      notesMarkdown: lessonNotes,
      homework: lessonHomework,
      subtitleUrl: lessonSubtitle || undefined,
      pdfUrl: lessonPdf || undefined,
      resources,
      isPublished: lessonPublished,
      lessonCode: lessonCode.trim().toUpperCase() || undefined
    };
    setLessonError(null);
    const res = editingLessonId
      ? await updateLesson(editingLessonId, payload)
      : await createLesson({
          ...payload,
          courseId: activeCourse.id,
          moduleId: activeCourse.modules[0]?.id || 'mod-1',
          orderIndex: activeLessons.length + 1
        });
    if (res && res.success === false) {
      setLessonError(res.message || 'Dars saqlanmadi. Qayta urinib ko‘ring.');
      return;
    }
    setShowLessonModal(false);
    setEditingLessonId(null);
  };

  return (
    <div className="space-y-7">
      {/* Header */}
      <Reveal>
        <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <Pill tone="ember">
              <PlayCircle className="h-3 w-3" />
              Kurslar &amp; Video Darslar
            </Pill>
            <h1 className="mt-4 font-display text-[clamp(1.6rem,3.2vw,2.25rem)] font-extrabold leading-[1.07] tracking-[-0.035em] text-ink text-balance dark:text-white">
              Kurslar va Video Darslar Boshqaruvi
            </h1>
            <p className="mt-2 text-[13.5px] leading-relaxed text-ink-muted dark:text-stone-400">
              Yangi kurslar yaratish, video darslar yuklash, konspekt va formulalar biriktirish
            </p>
          </div>

          <Button
            variant="ember"
            size="md"
            onClick={() => setShowCourseModal(true)}
            className="shrink-0 self-start sm:self-end"
            iconLeft={<Plus className="h-4 w-4" />}
          >
            Yangi Kurs Qo‘shish
          </Button>
        </header>
      </Reveal>

      {/* Course selector */}
      <Reveal delay={60}>
        <div className="glass-subtle inline-flex rounded-full p-1">
          {(['all', 'ielts', 'cefr', 'general'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTrackFilter(t)}
              className={cn(
                'rounded-full px-4 py-1.5 text-[12px] font-semibold transition-all',
                trackFilter === t
                  ? 'bg-gradient-to-b from-[#ffa149] to-[#f2650f] text-white shadow-[0_8px_18px_-8px_rgba(242,101,15,0.8)]'
                  : 'text-ink-muted hover:text-ink dark:text-stone-400 dark:hover:text-white'
              )}
            >
              {t === 'all' ? 'Barchasi' : TRACK_LABEL[t]} ({t === 'all' ? db.courses.length : db.courses.filter((c) => (c.track || 'ielts') === t).length})
            </button>
          ))}
        </div>
      </Reveal>

      <Reveal delay={70}>
        <div className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-1">
          {visibleCourses.map(course => {
            const isActive = course.id === activeCourse?.id;
            return (
              <div
                key={course.id}
                className={cn(
                  'flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full border px-1 py-1 pl-3.5 text-[11.5px] font-semibold transition-all duration-200',
                  isActive
                    ? 'border-ember-500/40 bg-ink text-white shadow-[0_12px_24px_-14px_rgba(18,16,14,0.65)] dark:bg-white dark:text-ink'
                    : 'border-line/70 bg-white/50 text-ink-muted hover:border-ember-500/30 hover:text-ink dark:border-white/10 dark:bg-white/[0.04] dark:text-stone-400 dark:hover:text-white'
                )}
              >
                <button onClick={() => setSelectedCourseId(course.id)} className="max-w-[220px] truncate">
                  {course.title}
                </button>
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (confirm(`"${course.title}" kursini rostdan ham o‘chirasizmi?`)) {
                      await deleteCourse(course.id);
                      const remaining = db.courses.filter(c => c.id !== course.id);
                      if (remaining.length > 0) {
                        setSelectedCourseId(remaining[0].id);
                      }
                    }
                  }}
                  title="O‘chirish"
                  className={cn(
                    'flex h-6 w-6 items-center justify-center rounded-full transition-colors',
                    isActive
                      ? 'text-white/60 hover:bg-white/15 hover:text-white dark:text-ink/50 dark:hover:bg-ink/10 dark:hover:text-ink'
                      : 'text-ink-muted/60 hover:bg-red-500/10 hover:text-red-600 dark:text-stone-500'
                  )}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            );
          })}
          {db.courses.length === 0 && (
            <span className="text-[12px] text-ink-muted dark:text-stone-400">Hozircha kurslar yo‘q.</span>
          )}
        </div>
      </Reveal>

      {activeCourse ? (
        <Reveal delay={110}>
          <Glass level={2} className="p-5 sm:p-7">
            <div className="flex flex-col gap-5 border-b border-line/70 pb-5 sm:flex-row sm:items-start sm:justify-between dark:border-white/[0.06]">
              <div className="max-w-2xl">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Pill tone="ember">{TRACK_LABEL[activeCourse.track || 'ielts']}</Pill>
                  <Pill tone="neutral">{activeCourse.level}</Pill>
                  <Pill tone="neutral">VIP: {activeCourse.requiredVIP.toUpperCase()}</Pill>
                  <Pill tone="neutral">{activeCourse.price.toLocaleString()} so‘m</Pill>
                </div>
                <h2 className="mt-3 font-display text-[clamp(1.15rem,2.2vw,1.5rem)] font-extrabold leading-tight tracking-[-0.03em] text-ink dark:text-white">
                  {activeCourse.title}
                </h2>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-muted dark:text-stone-400">
                  {activeCourse.description}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateCourse(activeCourse.id, { published: activeCourse.published === false })}
                  title="O‘quvchilarga ko‘rinishini almashtirish"
                >
                  {activeCourse.published === false ? 'Qoralama — nashr qilish' : 'Nashrda — yashirish'}
                </Button>
                <Button variant="ember" size="sm" onClick={() => openLessonEditor()} iconLeft={<Plus className="h-3.5 w-3.5" />}>
                  Dars Qo‘shish
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-red-500/25 px-3 text-red-600 hover:bg-red-500/[0.06] dark:border-red-400/25 dark:text-red-400"
                  onClick={async () => {
                    if (confirm('Ushbu kurs va uning barcha darslarini rostdan ham o‘chirasizmi?')) {
                      await deleteCourse(activeCourse.id);
                      const remaining = db.courses.filter(c => c.id !== activeCourse.id);
                      if (remaining.length > 0) {
                        setSelectedCourseId(remaining[0].id);
                      }
                    }
                  }}
                  title="Kursni o‘chirish"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Lessons */}
            <div className="mt-5">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-muted dark:text-stone-400">
                  Kurs Darslari
                </span>
                <Pill tone="neutral">{activeLessons.length} ta</Pill>
              </div>

              {activeLessons.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-line bg-white/30 px-6 py-12 text-center dark:border-white/10 dark:bg-white/[0.02]">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-ember-500/10 text-ember-600 dark:bg-ember-500/15 dark:text-ember-400">
                    <Video className="h-6 w-6" />
                  </div>
                  <p className="mt-4 font-display text-[14px] font-bold tracking-tight text-ink dark:text-white">
                    Bu kursda hozircha darslar mavjud emas.
                  </p>
                  <p className="mt-1 max-w-sm text-[12px] text-ink-muted dark:text-stone-400">
                    Yuqoridagi "Dars Qo‘shish" tugmasi orqali birinchi video darsni qo‘shing.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {activeLessons.map((lesson, idx) => (
                    <div
                      key={lesson.id}
                      draggable
                      onDragStart={(e) => { setDragFrom(idx); e.dataTransfer.effectAllowed = 'move'; }}
                      onDragOver={(e) => { e.preventDefault(); setDragOver(idx); }}
                      onDragLeave={() => setDragOver((v) => (v === idx ? null : v))}
                      onDrop={(e) => { e.preventDefault(); void dropLesson(idx); }}
                      onDragEnd={() => { setDragFrom(null); setDragOver(null); }}
                      className={`group flex cursor-grab items-center justify-between gap-4 rounded-2xl border bg-white/40 p-3.5 transition-all duration-200 active:cursor-grabbing ${dragOver === idx && dragFrom !== idx ? 'border-ember-500 ring-2 ring-ember-500/30' : 'border-line/60'} ${dragFrom === idx ? 'opacity-50' : ''} hover:border-ember-500/30 hover:bg-white/70 dark:border-white/[0.06] dark:bg-white/[0.025] dark:hover:bg-white/[0.05]`}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ember-500/[0.08] font-mono text-[11px] font-black text-ember-700 dark:bg-ember-500/10 dark:text-ember-300">
                          {String(idx + 1).padStart(2, '0')}
                        </div>
                        <div className="min-w-0">
                          <h3 className="truncate text-[12.5px] font-bold text-ink dark:text-white">{lesson.title}</h3>
                          <div className="mt-1 flex flex-wrap items-center gap-3 text-[10.5px] text-ink-muted dark:text-stone-500">
                            <span className="inline-flex items-center gap-1">
                              <Clock className="h-2.5 w-2.5" />
                              {lesson.durationMinutes} daqiqa
                            </span>
                            <span className="inline-flex items-center gap-1 font-mono font-bold text-ember-700 dark:text-ember-300">
                              {lessonBotCode(lesson)}
                              <span
                                role="button"
                                tabIndex={0}
                                aria-label="Dars kodini nusxalash"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigator.clipboard?.writeText(lessonBotCode(lesson)).then(() => {
                                    setCopiedLessonId(lesson.id);
                                    setTimeout(() => setCopiedLessonId(null), 1500);
                                  }).catch(() => undefined);
                                }}
                                className="ml-0.5 inline-flex rounded px-1 py-0.5 hover:bg-ember-500/10"
                              >
                                <Copy className="h-2.5 w-2.5" />
                              </span>
                              {copiedLessonId === lesson.id ? <span className="text-emerald-600 dark:text-emerald-400">nusxalandi</span> : null}
                            </span>
                            {lesson.mathFormula && (
                              <span className="inline-flex items-center gap-1 font-semibold text-ember-700 dark:text-ember-400">
                                <Sigma className="h-2.5 w-2.5" />
                                Formula bor
                              </span>
                            )}
                            {lesson.pdfUrl && (
                              <span className="inline-flex items-center gap-1">
                                <FileText className="h-2.5 w-2.5" />
                                PDF Konspekt
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-1">
                        {lesson.isPublished === false ? (
                          <span className="rounded-full bg-ink/[0.06] px-2.5 py-1 text-[10.5px] font-semibold text-ink-muted dark:bg-white/10 dark:text-stone-400">Qoralama</span>
                        ) : null}
                        <button onClick={() => moveLesson(idx, -1)} disabled={idx === 0} className="flex h-8 w-8 items-center justify-center rounded-full text-ink-muted hover:bg-ink/[0.06] disabled:opacity-30 dark:text-stone-400 dark:hover:bg-white/10" title="Yuqoriga" aria-label="Yuqoriga">↑</button>
                        <button
                          onClick={async () => {
                            // A copy goes to the end of the course as a draft, so the original stays untouched.
                            if (!activeCourse) return;
                            await createLesson({ ...lesson, id: undefined, title: `${lesson.title} (nusxa)`, isPublished: false, courseId: activeCourse.id, moduleId: lesson.moduleId || activeCourse.modules[0]?.id || 'mod-1', orderIndex: activeLessons.length + 1 } as any);
                          }}
                          title="Darsni nusxalash (qoralama)"
                          aria-label={`${lesson.title} darsini nusxalash`}
                          className="flex h-8 w-8 items-center justify-center rounded-full text-ink-muted hover:bg-ink/[0.06] dark:text-stone-400 dark:hover:bg-white/10"
                        >
                          ⧉
                        </button>
                        <button onClick={() => moveLesson(idx, 1)} disabled={idx === activeLessons.length - 1} className="flex h-8 w-8 items-center justify-center rounded-full text-ink-muted hover:bg-ink/[0.06] disabled:opacity-30 dark:text-stone-400 dark:hover:bg-white/10" title="Pastga" aria-label="Pastga">↓</button>
                        <button
                          onClick={() => updateLesson(lesson.id, { isPublished: lesson.isPublished === false })}
                          className="rounded-full px-2.5 py-1.5 text-[11px] font-semibold text-ink-muted hover:bg-ink/[0.06] dark:text-stone-400 dark:hover:bg-white/10"
                        >
                          {lesson.isPublished === false ? 'Nashr' : 'Yashirish'}
                        </button>
                        <button onClick={() => setPreviewLessonId(lesson.id)} className="rounded-full px-2.5 py-1.5 text-[11px] font-semibold text-ink-muted hover:bg-ink/[0.06] dark:text-stone-400 dark:hover:bg-white/10">
                          Ko‘rish
                        </button>
                        <button onClick={() => openLessonEditor(lesson)} className="rounded-full px-2.5 py-1.5 text-[11px] font-semibold text-ember-700 hover:bg-ember-500/10 dark:text-ember-300">
                          Tahrirlash
                        </button>
                      <button
                        onClick={async () => {
                          if (confirm('Ushbu darsni o‘chirasizmi? Talabalarning to‘lov va imtihon yozuvlari saqlanib qoladi.')) {
                            await deleteLesson(lesson.id);
                          }
                        }}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-red-500/[0.08] hover:text-red-600 dark:text-stone-500"
                        title="Darsni o‘chirish"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Glass>
        </Reveal>
      ) : (
        <Reveal delay={110}>
          <Glass level={1} radius="rounded-[1.75rem]">
            <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-ember-500/10 text-ember-600 dark:bg-ember-500/15 dark:text-ember-400">
                <Layers className="h-6 w-6" />
              </div>
              <p className="mt-4 font-display text-[15px] font-bold tracking-tight text-ink dark:text-white">
                Hozircha kurslar yo‘q.
              </p>
              <p className="mt-1 max-w-sm text-[12.5px] text-ink-muted dark:text-stone-400">
                Yuqoridagi "Yangi Kurs Qo‘shish" tugmasini bosing.
              </p>
            </div>
          </Glass>
        </Reveal>
      )}

      {/* Add Course Modal */}
      {showCourseModal && (
        <div className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-ink/45 p-4 backdrop-blur-md dark:bg-black/65">
          <div className="glass-4 my-8 w-full max-w-lg rounded-[1.75rem] p-5 sm:p-7">
            <div className="mb-5 flex items-start justify-between gap-4 border-b border-line/70 pb-4 dark:border-white/[0.07]">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-ember-700 dark:text-ember-400">
                  Kurslar
                </span>
                <h3 className="mt-1 font-display text-[16px] font-extrabold tracking-[-0.02em] text-ink dark:text-white">
                  Yangi Kurs Yaratish
                </h3>
              </div>
              <button
                onClick={() => setShowCourseModal(false)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-ink/[0.06] hover:text-ink dark:text-stone-400 dark:hover:bg-white/[0.07] dark:hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCourse} className="space-y-4">
              <div>
                <label className={label}>Kurs Nomi *</label>
                <input
                  type="text"
                  required
                  value={courseTitle}
                  onChange={e => setCourseTitle(e.target.value)}
                  placeholder="Masalan, Milliy Sertifikat A+ Yangi Dastur"
                  className={cn(field, 'font-semibold')}
                />
              </div>

              <div>
                <label className={label}>Tavsifi</label>
                <textarea
                  rows={3}
                  value={courseDesc}
                  onChange={e => setCourseDesc(e.target.value)}
                  placeholder="Kurs kimlar uchun va nimalar o‘rgatiladi..."
                  className={cn(field, 'resize-y')}
                />
              </div>

              <div>
                <label className={label}>Yo‘nalish (faqat shu yo‘nalish o‘quvchilari ko‘radi) *</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['ielts', 'cefr', 'general'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setCourseTrack(t)}
                      className={cn(
                        'h-11 rounded-2xl border text-[13px] font-semibold transition-all',
                        courseTrack === t
                          ? 'border-ember-500/60 bg-ember-500/10 text-ember-700 ring-4 ring-ember-500/10 dark:text-ember-300'
                          : 'border-line bg-white/60 text-ink hover:border-ink/20 dark:border-white/10 dark:bg-white/[0.04] dark:text-white'
                      )}
                    >
                      {TRACK_LABEL[t]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className={label}>Bosqich / Daraja</label>
                  <select
                    value={courseLevel}
                    onChange={e => setCourseLevel(e.target.value as any)}
                    className={cn(field, 'cursor-pointer')}
                  >
                    <option value="ielts">IELTS Academic & GT</option>
                    <option value="cefr">CEFR Multilevel B2-C1</option>
                    <option value="general">General English Mastery</option>
                    <option value="grammar">Advanced Grammar</option>
                    <option value="vocabulary">C1/C2 Lexical Resource</option>
                    <option value="masterclass">Band 8.5+ Masterclass</option>
                  </select>
                </div>

                <div>
                  <label className={label}>Talab Etiladigan VIP</label>
                  <select
                    value={courseVIP}
                    onChange={e => setCourseVIP(e.target.value as any)}
                    className={cn(field, 'cursor-pointer')}
                  >
                    {db.vipPlans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className={label}>Narxi (so‘m)</label>
                <input
                  type="number"
                  value={coursePrice}
                  onChange={e => setCoursePrice(parseInt(e.target.value, 10))}
                  className={cn(field, 'font-mono font-bold')}
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className={label}>Subtitr (.vtt havola, ixtiyoriy)</label>
                  <input type="url" value={lessonSubtitle} onChange={(e) => setLessonSubtitle(e.target.value)} placeholder="https://…/en.vtt" className={field} />
                </div>
                <div>
                  <label className={label}>PDF konspekt havolasi</label>
                  <input type="url" value={lessonPdf} onChange={(e) => setLessonPdf(e.target.value)} placeholder="https://…" className={field} />
                </div>
              </div>
              <div>
                <label className={label}>Qo‘shimcha materiallar (har qatorda: Nomi | havola)</label>
                <textarea rows={2} value={lessonResources} onChange={(e) => setLessonResources(e.target.value)} placeholder="Lug‘at ro‘yxati | https://…" className={cn(field, 'resize-y font-mono text-[12px]')} />
              </div>
              <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-line/70 bg-white/40 px-4 py-3 text-[13px] font-semibold text-ink dark:border-white/10 dark:bg-white/[0.03] dark:text-white">
                <input type="checkbox" checked={lessonPublished} onChange={(e) => setLessonPublished(e.target.checked)} className="h-4 w-4 accent-[#f2650f]" />
                O‘quvchilarga ko‘rinadi (nashr qilingan)
              </label>
              <Button variant="ember" size="md" type="submit" className="mt-1 w-full">
                Kursni Saqlash
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* Add Lesson Modal */}
      {showLessonModal && (
        <div className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-ink/45 p-4 backdrop-blur-md dark:bg-black/65">
          <div className="glass-4 my-8 w-full max-w-lg rounded-[1.75rem] p-5 sm:p-7">
            <div className="mb-5 flex items-start justify-between gap-4 border-b border-line/70 pb-4 dark:border-white/[0.07]">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-ember-700 dark:text-ember-400">
                  Yangi dars
                </span>
                <h3 className="mt-1 line-clamp-2 font-display text-[15px] font-extrabold leading-snug tracking-[-0.02em] text-ink dark:text-white">
                  {activeCourse.title}
                </h3>
              </div>
              <button
                onClick={() => setShowLessonModal(false)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-ink/[0.06] hover:text-ink dark:text-stone-400 dark:hover:bg-white/[0.07] dark:hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateLesson} className="space-y-4">
              {editingLessonId ? <p className="text-[12px] font-semibold text-ember-700 dark:text-ember-300">Tahrirlash rejimi</p> : null}
              <div>
                <label className={label}>Dars Mavzusi *</label>
                <input
                  type="text"
                  required
                  value={lessonTitle}
                  onChange={e => setLessonTitle(e.target.value)}
                  placeholder="Masalan, 3. Trigonometrik ayniyatlar va tenglamalar"
                  className={cn(field, 'font-semibold')}
                />
              </div>

              <div>
                <label className={label}>Dars kodi (Telegram bot uchun)</label>
                <input
                  type="text"
                  value={lessonCode}
                  onChange={e => setLessonCode(e.target.value.toUpperCase().replace(/\s+/g, ''))}
                  placeholder="Bo‘sh qoldirsangiz avtomatik: EDU-L01"
                  maxLength={20}
                  className={cn(field, 'font-mono')}
                />
                <p className="mt-1.5 text-[11.5px] text-ink-muted dark:text-stone-400">Talaba shu kodni Telegram botga yozadi va dars havolasini oladi. Har bir dars kodi boshqacha bo‘lsin.</p>
              </div>
              {lessonError ? <p role="alert" className="text-[12.5px] font-semibold text-rose-600 dark:text-rose-300">{lessonError}</p> : null}

              <div>
                <label className={label}>Video havolasi (YouTube, Google Drive, Vimeo yoki MP4) *</label>
                <input
                  type="text"
                  required={!lessonBunnyId.trim()}
                  value={lessonVideo}
                  onChange={e => setLessonVideo(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=... yoki https://drive.google.com/file/d/..."
                  className={cn(field, 'font-mono text-[12px]')}
                />
                {lessonVideo.trim() ? (
                  <p
                    className={cn(
                      'mt-1.5 text-[11.5px] font-semibold',
                      detectVideoProvider(lessonVideo) === 'none' || isPlaceholderVideo(lessonVideo)
                        ? 'text-rose-600'
                        : 'text-emerald-700 dark:text-emerald-400'
                    )}
                  >
                    {isPlaceholderVideo(lessonVideo)
                      ? 'Bu namunaviy havola — talabalar uni ko‘rmaydi. Haqiqiy video havolasini kiriting.'
                      : detectVideoProvider(lessonVideo) === 'none'
                        ? 'Havola https:// bilan boshlanishi kerak.'
                        : 'Aniqlandi: ' + VIDEO_PROVIDER_LABEL[detectVideoProvider(lessonVideo)]}
                  </p>
                ) : (
                  <p className="mt-1.5 text-[11.5px] text-ink-muted">
                    Google Drive uchun faylni “Havolasi borlar ko‘ra oladi” qilib ulashing. Video serverga yuklanmaydi.
                  </p>
                )}
              </div>

              <div>
                <label className={label}>Ko‘rish huquqi: VIP tariflar</label>
                <p className="mb-2 text-[11.5px] text-ink-muted">Hech biri tanlanmasa, video barcha talabalarga ochiq. Tanlansa, faqat shu tariflar ko‘radi. Tekshiruv serverda bajariladi.</p>
                <div className="flex flex-wrap gap-2" role="group" aria-label="VIP tariflar">
                  {(db.vipPlans || []).map(plan => {
                    const on = lessonVideoTiers.includes(plan.id);
                    return (
                      <button
                        key={plan.id}
                        type="button"
                        aria-pressed={on}
                        onClick={() => setLessonVideoTiers(on ? lessonVideoTiers.filter(t => t !== plan.id) : [...lessonVideoTiers, plan.id])}
                        className={cn(
                          'min-h-[40px] rounded-full border px-3.5 text-[12.5px] font-bold transition-colors',
                          on ? 'border-amber-500/50 bg-amber-500/15 text-amber-700 dark:text-amber-300' : 'border-black/10 bg-white/60 text-ink-muted hover:text-ink dark:border-white/10 dark:bg-white/5'
                        )}
                      >
                        {on ? '✓ ' : ''}{plan.name || plan.id.toUpperCase()}
                      </button>
                    );
                  })}
                </div>
                <label className={cn(label, 'mt-3 block')}>Bunny Stream video ID (ixtiyoriy)</label>
                <input
                  type="text"
                  value={lessonBunnyId}
                  onChange={e => setLessonBunnyId(e.target.value)}
                  placeholder="Video ID (GUID)"
                  className={cn(field, 'font-mono text-[12px]')}
                />
                <p className="mt-1.5 text-[11.5px] text-ink-muted">Bunny ID kiritilsa, video serverda imzolangan havola orqali ochiladi. Bunny o‘chiq bo‘lsa, video ko‘rinmaydi.</p>
                <BunnyVideoPicker current={lessonBunnyId} onPick={setLessonBunnyId} />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className={label}>Davomiyligi (Daqiqa)</label>
                  <input
                    type="number"
                    value={lessonDuration}
                    onChange={e => setLessonDuration(parseInt(e.target.value, 10))}
                    className={cn(field, 'font-mono font-bold')}
                  />
                </div>
                <div>
                  <label className={label}>Asosiy Formula (LaTeX)</label>
                  <input
                    type="text"
                    value={lessonFormula}
                    onChange={e => setLessonFormula(e.target.value)}
                    placeholder="\sin^2 x + \cos^2 x = 1"
                    className={cn(field, 'font-mono text-[12px]')}
                  />
                </div>
              </div>

              <div>
                <label className={label}>Dars Konspekti / Tavsif</label>
                <p className="mb-1.5 text-[11.5px] leading-relaxed text-ink-muted">Bu konspekt Edubek AI uchun dars materiali bo‘ladi: talaba shu darsni tanlasa, AI javoblarini aynan shu matnga tayanib beradi.</p>
                <textarea
                  rows={3}
                  value={lessonNotes}
                  onChange={e => setLessonNotes(e.target.value)}
                  placeholder="Qoidalar, teoremalar va eslatmalar..."
                  className={cn(field, 'resize-y')}
                />
              </div>

              <div>
                <label className={label}>Uyga vazifa (ixtiyoriy)</label>
                <textarea
                  rows={2}
                  value={lessonHomework}
                  onChange={e => setLessonHomework(e.target.value)}
                  placeholder="Masalan: 10 ta gap yozing, Present Simple ishlating"
                  className={cn(field, 'resize-y')}
                />
              </div>

              <div className="space-y-2 rounded-2xl border border-line/70 p-4 dark:border-white/10">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className={label}>Dars testi</label>
                  <span className="text-[12px] text-ink-muted dark:text-stone-400">
                    {(() => {
                      const current = db.lessons.find((l) => l.id === editingLessonId);
                      const n = current?.testId ? db.questions.filter((q) => q.testId === current.testId).length : 0;
                      return n ? `Hozirgi test: ${n} ta savol` : 'Test yo‘q';
                    })()}
                  </span>
                </div>
                <p className="text-[12.5px] text-ink-muted dark:text-stone-400">
                  Konspekt yoki tavsif asosida AI test tuzadi. Darsni avval saqlang, so‘ng testni yarating.
                </p>
                <Button variant="outline" size="sm" type="button" onClick={generateLessonTest} disabled={!editingLessonId || quizBusy}>
                  {quizBusy ? 'Test tuzilmoqda…' : 'AI bilan test yaratish'}
                </Button>
                {quizMsg ? <p role="status" className="text-[12.5px] text-ink dark:text-stone-200">{quizMsg}</p> : null}
                <div className="space-y-2 border-t border-line/70 pt-3 dark:border-white/10">
                  <p className="text-[12.5px] font-semibold text-ink dark:text-white">Yoki hujjatdan test</p>
                  <p className="text-[12px] text-ink-muted dark:text-stone-400">Word (.docx) yoki matn yuklang: AI o‘qib, shu darsga test tuzadi va darsga biriktiradi.</p>
                  {editingLessonId ? (
                    <AiQuickMock
                      track={((activeCourse as { track?: string } | null)?.track || 'ielts') as 'cefr' | 'general' | 'ielts'}
                      onCreated={async (testId) => {
                        await updateLesson(editingLessonId, { testId });
                        await refreshDb();
                        setQuizMsg('Dars testi hujjatdan yaratildi va darsga biriktirildi.');
                      }}
                    />
                  ) : (
                    <p className="text-[12px] text-ink-muted dark:text-stone-400">Darsni avval saqlang.</p>
                  )}
                </div>
              </div>

              <Button variant="ember" size="md" type="submit" className="mt-1 w-full">
                Darsni Qo‘shish
              </Button>
            </form>
          </div>
        </div>
      )}
      {previewLessonId ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-ink/60 p-4 backdrop-blur-md" onClick={() => setPreviewLessonId(null)}>
          <div className="w-full max-w-3xl overflow-hidden rounded-[24px]" onClick={(e) => e.stopPropagation()}>
            {(() => {
              const l = db.lessons.find((x) => x.id === previewLessonId);
              return l ? <LessonVideo url={l.videoUrl} title={l.title} subtitleUrl={l.subtitleUrl} /> : null;
            })()}
          </div>
        </div>
      ) : null}
    </div>
  );
};
