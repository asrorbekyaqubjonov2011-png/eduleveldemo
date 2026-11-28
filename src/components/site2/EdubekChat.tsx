'use client';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUp, BookOpen, Check, ClipboardList, Copy, Download, MessageSquare, Mic, MoreHorizontal, Paperclip, Pencil, Plus, RefreshCw, Search, Smile, Sparkles, Square, Trash2, Volume2, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import { cn } from '../ui/styles';
import { EdubekAvatar, type EdubekMood } from './EdubekAvatar';
import { EdubekGames, type GameKind } from './EdubekGames';
import { STICKERS, uploadChatFile } from '../../lib/edubekMedia';
import { EdubekSettingsDialog } from './EdubekSettingsDialog';
import { getEdubekSettings } from '../../lib/edubekSettings';
import { EdubekTalk, type TalkResult } from './EdubekTalk';
import { EDUBEK_SCENARIOS, scenarioById } from '../../lib/edubekScenarios';
import { useEdubekMood } from '../../lib/edubekMood';
import { EdubekVoicePanel } from './EdubekVoicePanel';
import { PronunciationCoach } from './PronunciationCoach';
import { wordOfToday } from '../../lib/wordOfDay';
import { speakSentence, stopSpeech } from '../../lib/edubekSpeech';
import { canSpeak as voiceAvailable } from '../../lib/edubekVoice';

type Level = 'A2' | 'B1' | 'B2' | 'C1';
const LEVELS: Level[] = ['A2', 'B1', 'B2', 'C1'];

interface Msg {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  /** Chat attachment: a voice note, a sticker or a file. Plain messages have no kind. */
  kind?: 'voice' | 'sticker' | 'file';
  mediaUrl?: string;
  mediaName?: string;
  durationSec?: number;
}

interface Thread {
  id: string;
  title: string;
  updatedAt: string;
  /** The lesson whose konspekt Edubek answers from in this conversation. */
  lessonId?: string;
  /** Practice mode (see edubekScenarios). */
  scenario?: string;
  messages: Msg[];
}

const MAX_THREADS = 30;
const MAX_MESSAGES = 100;
const newId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const now = () => new Date().toISOString();
const levelForTrack = (track?: string): Level => (track === 'ielts' ? 'B2' : track === 'cefr' ? 'B1' : 'A2');

/** Small markdown subset used by the tutor: headings, bullets, bold, inline code and code fences. */
const Rich: React.FC<{ text: string }> = ({ text }) => {
  const inline = (t: string, key: string) =>
    t.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) return <strong key={key + i} className="font-semibold">{part.slice(2, -2)}</strong>;
      if (part.startsWith('`') && part.endsWith('`'))
        return <code key={key + i} className="rounded-md bg-[#f2650f]/10 px-1.5 py-0.5 text-[12.5px] text-[#9a3f0a] dark:bg-[#ffa149]/15 dark:text-[#ffc08a]">{part.slice(1, -1)}</code>;
      return <React.Fragment key={key + i}>{part}</React.Fragment>;
    });
  const out: React.ReactNode[] = [];
  let code: string[] | null = null;
  text.split('\n').forEach((line, i) => {
    if (line.trim().startsWith('```')) {
      if (code) {
        out.push(
          <pre key={i} className="my-2 overflow-x-auto rounded-2xl bg-[#12100e] p-3.5 text-[12.5px] text-[#fbf6ef]">
            <code>{code.join('\n')}</code>
          </pre>
        );
        code = null;
      } else code = [];
      return;
    }
    if (code) {
      code.push(line);
      return;
    }
    const h = line.match(/^#{1,4}\s+(.*)$/);
    if (h) out.push(<div key={i} className="mt-3 text-[15px] font-bold first:mt-0">{inline(h[1], 'h' + i)}</div>);
    else if (/^\s*[-*•]\s+/.test(line))
      out.push(
        <div key={i} className="flex gap-2.5 pl-0.5">
          <span aria-hidden className="mt-[0.6em] h-1.5 w-1.5 shrink-0 rounded-full bg-[#f2650f]" />
          <span>{inline(line.replace(/^\s*[-*•]\s+/, ''), 'b' + i)}</span>
        </div>
      );
    else if (line.trim()) out.push(<div key={i}>{inline(line, 'p' + i)}</div>);
    else out.push(<div key={i} className="h-2" />);
  });
  return <div className="space-y-1.5">{out}</div>;
};

/**
 * Edubek: the student's English assistant. Remembers the conversation, and when a lesson is
 * picked it answers from that lesson's konspekt written by the teacher.
 */
export const EdubekChat: React.FC = () => {
  const { db, currentUser } = useApp();
  // Owner switches (db.features): a feature set to false is hidden for students.
  const edubekOn = (key: string) => (db.features as Record<string, unknown> | undefined)?.[key] !== false;
  // Owner's Edubek settings: greeting and whether the figure moves.
  const eduSettings = ((db.features as { edubekSettings?: { greeting?: string; animations?: boolean; voiceNotes?: boolean; files?: boolean; stickers?: boolean } } | undefined)?.edubekSettings) || {};
  const [threads, setThreads] = useState<Thread[] | null>(null);
  const [activeId, setActiveId] = useState('');
  const [input, setInput] = useState('');
  // The student's own message being edited: sending then replaces it and the answers after it.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // True from the first word of a streamed answer until it ends.
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState('');
  const [level, setLevel] = useState<Level>(levelForTrack(currentUser?.track));
  const [simple, setSimple] = useState(false);
  const [picker, setPicker] = useState(false);
  const [lessonQuery, setLessonQuery] = useState('');
  const [showThreads, setShowThreads] = useState(false);
  const [speakingNow, setSpeakingNow] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceOn, setVoiceOn] = useState(false);
  const speechRun = useRef<{ cancelled: boolean } | null>(null);
  const stopReading = useCallback(() => {
    if (!speechRun.current) return;
    speechRun.current.cancelled = true;
    speechRun.current = null;
    stopSpeech();
  }, []);
  useEffect(() => stopReading, [stopReading]);
  const [talking, setTalking] = useState(false);
  const [copiedId, setCopiedId] = useState('');
  const abortRef = useRef<AbortController | null>(null);
  const lastAttempt = useRef<{ text: string; mode: 'chat' | 'explain' | 'test'; scenario?: string | null } | null>(null);
  const [canRetry, setCanRetry] = useState(false);
  const moodState = useEdubekMood();
  const [showVoice, setShowVoice] = useState(false);
  const [coach, setCoach] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [game, setGame] = useState<GameKind | null>(null);
  const [recording, setRecording] = useState(false);
  const [stickersOpen, setStickersOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [localSettings, setLocalSettings] = useState(() => getEdubekSettings());
  const animated = eduSettings.animations !== false && localSettings.animations;
  const eduFlag = (key: 'files' | 'stickers' | 'voiceNotes') => eduSettings[key] !== false;
  const voiceNoteRef = useRef<{ rec: MediaRecorder; stream: MediaStream; chunks: Blob[]; sr: any; text: () => string; startedAt: number } | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  // The "more" menu closes on Escape and on any click outside it.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false);
    const onDown = (e: MouseEvent) => {
      const el = e.target as HTMLElement | null;
      if (!el?.closest?.('[aria-haspopup="menu"], [role="menu"]')) setMenuOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
    };
  }, [menuOpen]);
  const [threadQuery, setThreadQuery] = useState('');
  const [saved, setSaved] = useState('');
  const word = wordOfToday();
  const recRef = useRef<any>(null);
  const dirty = useRef(false);
  const endRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const lessons = useMemo(
    () => (db.lessons || []).filter((l) => l.isPublished !== false && (!currentUser?.track || l.track === currentUser.track)),
    [db.lessons, currentUser]
  );

  // Load saved conversations; open a first one when there are none.
  useEffect(() => {
    let alive = true;
    api.getAiThreads().then((res) => {
      if (!alive) return;
      const list: Thread[] = Array.isArray(res?.threads) ? res.threads : [];
      if (list.length === 0) {
        const first: Thread = { id: newId('thread'), title: 'Yangi suhbat', updatedAt: now(), messages: [] };
        setThreads([first]);
        setActiveId(first.id);
      } else {
        // Blank conversations left over from earlier visits are dropped; the newest real one opens.
        const real = list.filter((t) => t.messages.length > 0 || t.lessonId || t.scenario);
        const kept = real.length ? real : list.slice(0, 1);
        setThreads(kept);
        setActiveId(kept[0].id);
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  // Save after the student changes something (not on the initial load). A failed save is retried,
  // and the latest copy is also sent when the page is hidden or closed, so a chat is not lost.
  const threadsRef = useRef<Thread[] | null>(null);
  useEffect(() => { threadsRef.current = threads; }, [threads]);
  const saveRetry = useRef(0);
  const saveThreads = (list: Thread[]) => {
    dirty.current = false;
    api.saveAiThreads(list).then(
      (res) => {
        if (res && res.success === false) throw new Error('save');
        saveRetry.current = 0;
      },
      () => {
        dirty.current = true;
        saveRetry.current += 1;
        setError('Suhbat saqlanmadi. Qayta urinilmoqda…');
        const wait = Math.min(15000, 2000 * saveRetry.current);
        setTimeout(() => {
          if (dirty.current && threadsRef.current) saveThreads(threadsRef.current);
        }, wait);
      }
    );
  };
  useEffect(() => {
    if (!threads || !dirty.current) return;
    const t = setTimeout(() => saveThreads(threads), 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threads]);
  // Leaving the page: the full list is sent with keepalive so the request survives. Keepalive is limited
  // to about 64 KB; when the list is bigger the normal save above (or the retry) takes care of it.
  useEffect(() => {
    const sendLatest = (keepalive: boolean) => {
      const list = threadsRef.current;
      if (!list || !dirty.current) return;
      const body = JSON.stringify({ threads: list });
      if (keepalive && body.length > 60000) return;
      dirty.current = false;
      fetch('/api/student/ai-threads', { method: 'PUT', keepalive, headers: { 'Content-Type': 'application/json' }, body }).catch(() => undefined);
    };
    const onHide = () => { if (document.visibilityState === 'hidden') sendLatest(true); };
    window.addEventListener('pagehide', onHide);
    document.addEventListener('visibilitychange', onHide);
    return () => {
      window.removeEventListener('pagehide', onHide);
      document.removeEventListener('visibilitychange', onHide);
      sendLatest(true);
    };
  }, []);

  const active = threads?.find((t) => t.id === activeId) ?? null;
  const activeLesson = active?.lessonId ? lessons.find((l) => l.id === active.lessonId) ?? null : null;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [active?.messages.length, busy]);

  const update = (fn: (list: Thread[]) => Thread[]) => {
    dirty.current = true;
    setThreads((list) => fn(list || []));
  };

  const appendMessage = (threadId: string, msg: Msg) =>
    update((list) =>
      list.map((t) => {
        if (t.id !== threadId) return t;
        const isFirstUser = msg.sender === 'user' && t.messages.every((m) => m.sender !== 'user');
        const title = isFirstUser ? msg.text.replace(/\s+/g, ' ').slice(0, 40) : t.title;
        return { ...t, title, updatedAt: msg.timestamp, messages: [...t.messages, msg].slice(-MAX_MESSAGES) };
      })
    );

  /** Returns the active conversation id, creating one when needed. */
  const ensureThread = (): string => {
    if (activeId && threads?.some((t) => t.id === activeId)) return activeId;
    const t: Thread = { id: newId('thread'), title: 'Yangi suhbat', updatedAt: now(), messages: [] };
    update((list) => [t, ...list].slice(0, MAX_THREADS));
    setActiveId(t.id);
    return t.id;
  };

  const newThread = () => {
    // An empty conversation is reused instead of stacking up blank ones.
    const blank = (threads || []).find((t) => t.messages.length === 0 && !t.lessonId && !t.scenario);
    if (blank) {
      setActiveId(blank.id);
      setError('');
      setShowThreads(false);
      return;
    }
    const t: Thread = { id: newId('thread'), title: 'Yangi suhbat', updatedAt: now(), messages: [] };
    update((list) => [t, ...list].slice(0, MAX_THREADS));
    setActiveId(t.id);
    setError('');
    setShowThreads(false);
  };

  const deleteThread = (id: string) => {
    if (!window.confirm('Bu suhbatni o‘chirasizmi?')) return;
    const rest = (threads || []).filter((t) => t.id !== id);
    update((list) => list.filter((t) => t.id !== id));
    if (activeId === id) setActiveId(rest[0]?.id ?? '');
  };

  const pickLesson = (lessonId: string) => {
    if (!threads) return;
    const threadId = ensureThread();
    update((list) => list.map((t) => (t.id === threadId ? { ...t, lessonId: lessonId || undefined, updatedAt: now() } : t)));
    setPicker(false);
    setLessonQuery('');
    setError('');
  };

  /** Reads a reply aloud in Edubek's voice (Gemini TTS, browser voice as fallback), sentence by sentence. */
  const speakText = (text: string) => {
    stopReading();
    setSpeakingNow(false);
    const clean = text.replace(/[*#`>_~|-]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 1200);
    if (!clean) return;
    const sentences = clean.match(/[^.!?]+[.!?]*/g)?.map((x) => x.trim()).filter(Boolean) ?? [clean];
    const run = { cancelled: false };
    speechRun.current = run;
    void (async () => {
      try {
        for (const sentence of sentences) {
          if (run.cancelled) break;
          await speakSentence(sentence, moodState.tone, (playing) => {
            if (!run.cancelled) setSpeakingNow(playing);
          });
        }
      } catch {
        if (!run.cancelled) setError('Ovozni ijro etib bo‘lmadi. Qayta urinib ko‘ring.');
      } finally {
        if (speechRun.current === run) {
          speechRun.current = null;
          setSpeakingNow(false);
        }
      }
    })();
  };

  /** Speech input: the student speaks English and the words appear in the message box. */
  const toggleMic = () => {
    const SR = (typeof window !== 'undefined' && ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)) || null;
    if (!SR) {
      setError('Bu brauzerda ovozli kiritish mavjud emas. Chrome yoki Edge’da urinib ko‘ring.');
      return;
    }
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const rec = new SR();
    rec.lang = 'en-US';
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (e: any) => {
      const t = e.results?.[0]?.[0]?.transcript || '';
      setInput((prev) => (prev ? `${prev} ${t}` : t));
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    setListening(true);
    rec.start();
  };

  useEffect(() => () => {
    abortRef.current?.abort();
    const recognition = recRef.current;
    if (!recognition) return;
    recognition.onresult = null;
    recognition.onerror = null;
    recognition.onend = null;
    try { recognition.abort(); } catch { /* already closed */ }
  }, []);

  // Mood follows the conversation: listening, thinking, speaking, praise or a problem.
  const lastAi = active?.messages.filter((m) => m.sender === 'ai').slice(-1)[0];
  const praised = !!lastAi && /(zo‘r|zo'r|barakalla|to‘g‘ri|to'g'ri|ajoyib|yaxshi|tabriklayman)/i.test(lastAi.text);
  const mood: EdubekMood = listening ? 'listening' : busy && !streaming ? 'thinking' : streaming ? 'speaking' : speakingNow ? 'speaking' : error ? 'sad' : praised ? 'happy' : moodState.base;

  const send = async (raw: string, mode: 'chat' | 'explain' | 'test' = 'chat', scenarioOverride?: string | null, extra?: Partial<Msg> & { shown?: string; skipEcho?: boolean }) => {
    const text = raw.trim();
    if (busy || !threads) return;
    // Remembered so a failed answer can be asked again without writing the question twice.
    lastAttempt.current = { text, mode, scenario: scenarioOverride };
    setCanRetry(true);
    if (text.length < 3) {
      setError('Savol yoki matnni yozing (kamida 3 belgi).');
      return;
    }
    setError('');
    const reaction = mode === 'chat' ? moodState.hear(text) : { angry: false, calmed: false };
    const threadId = ensureThread();
    const current = threads.find((t) => t.id === threadId) ?? null;
    const history = (current?.messages ?? []).slice(-10).map((m) => ({ sender: m.sender, text: m.text }));
    const lessonId = current?.lessonId;
    const scenario = scenarioOverride !== undefined ? scenarioOverride || undefined : current?.scenario;

    if (!extra?.skipEcho) appendMessage(threadId, { id: newId('m'), sender: 'user', text: extra?.shown ?? (mode === 'test' ? `Test yasang: ${text}` : text), timestamp: now(), kind: extra?.kind, mediaUrl: extra?.mediaUrl, mediaName: extra?.mediaName, durationSec: extra?.durationSec });
    setInput('');
    setBusy(true);
    try {
      if (mode === 'test') {
        const res = await api.generateStudentTest(text, 5, level);
        if (res?.success && res.test?.questions?.length) {
          const qs = res.test.questions as { prompt: string; options: string[]; correctIndex: number }[];
          const body = qs
            .map((q, i) => `${i + 1}. ${q.prompt}\n${q.options.map((o, j) => `   ${String.fromCharCode(65 + j)}) ${o}`).join('\n')}`)
            .join('\n\n');
          const answers = qs.map((q, i) => `${i + 1}-${String.fromCharCode(65 + q.correctIndex)}`).join('  ');
          appendMessage(threadId, { id: newId('m'), sender: 'ai', text: `${res.test.title}\n\n${body}\n\nJavoblar: ${answers}`, timestamp: now() });
        } else {
          setError(res?.message || 'Test yaratilmadi. Qayta urinib ko‘ring.');
        }
      } else {
        // The answer appears word by word as the model writes it.
        const replyId = newId('m');
        let started = false;
        const controller = new AbortController();
        abortRef.current = controller;
        const res = await api.askEdubekStream(text, { level, simple, lessonId, scenario, mood: reaction.angry ? 'angry' : moodState.tone, context: studentContext, mode: mode === 'explain' ? 'explain' : 'tutor', history }, (soFar) => {
          if (!started) {
            started = true;
            setStreaming(true);
            appendMessage(threadId, { id: replyId, sender: 'ai', text: soFar, timestamp: now() });
          } else {
            update((list) => list.map((t) => (t.id === threadId ? { ...t, messages: t.messages.map((m) => (m.id === replyId ? { ...m, text: soFar } : m)) } : t)));
          }
        }, controller.signal);
        abortRef.current = null;
        if (res.ok) {
          if (!started) appendMessage(threadId, { id: replyId, sender: 'ai', text: res.text, timestamp: now() });
          else update((list) => list.map((t) => (t.id === threadId ? { ...t, messages: t.messages.map((m) => (m.id === replyId ? { ...m, text: res.text } : m)) } : t)));
          if (voiceOn) speakText(res.text);
        } else {
          setError(res.message);
        }
      }
    } catch {
      setError('Server bilan bog‘lanib bo‘lmadi. Internetni tekshirib, qayta urinib ko‘ring.');
    } finally {
      setStreaming(false);
      setBusy(false);
    }
  };

  /** One spoken turn: written into the saved conversation like any other message, in short spoken-English style. */
  const talkTurn = async (text: string, onPiece: (soFar: string) => void, signal: AbortSignal): Promise<TalkResult> => {
    if (!threads) return { ok: false, message: 'Suhbat hali yuklanmadi.' };
    const threadId = ensureThread();
    const current = threads.find((t) => t.id === threadId) ?? null;
    const history = (current?.messages ?? []).slice(-8).map((m) => ({ sender: m.sender, text: m.text }));
    const reaction = moodState.hear(text);
    appendMessage(threadId, { id: newId('m'), sender: 'user', text, timestamp: now() });
    const replyId = newId('m');
    let started = false;
    const res = await api.askEdubekStream(text, { level, simple, talk: true, mood: reaction.angry ? 'angry' : moodState.tone, context: studentContext, scenario: current?.scenario, lessonId: current?.lessonId, mode: 'tutor', history }, (soFar) => {
      onPiece(soFar);
      if (!started) {
        started = true;
        appendMessage(threadId, { id: replyId, sender: 'ai', text: soFar, timestamp: now() });
      } else update((list) => list.map((t) => (t.id === threadId ? { ...t, messages: t.messages.map((m) => (m.id === replyId ? { ...m, text: soFar } : m)) } : t)));
    }, signal).catch(() => ({ ok: false as const, message: 'Server bilan bog‘lanib bo‘lmadi.' }));
    if (res.ok) {
      if (!started) appendMessage(threadId, { id: replyId, sender: 'ai', text: res.text, timestamp: now() });
      else update((list) => list.map((t) => (t.id === threadId ? { ...t, messages: t.messages.map((m) => (m.id === replyId ? { ...m, text: res.text } : m)) } : t)));
      return { ok: true, text: res.text };
    }
    return { ok: false, message: res.message };
  };

  const activeScenario = scenarioById(active?.scenario);

  /** A short factual line about the student, so Edubek can plan and advise from real numbers. */
  const studentContext = (() => {
    if (!currentUser) return undefined;
    const mine = (db.testAttempts || []).filter((a) => a.userId === currentUser.id);
    const avg = mine.length ? Math.round(mine.reduce((s, a) => s + (a.score / (a.maxScore || 1)) * 100, 0) / mine.length) : null;
    return [
      `yo'nalish: ${currentUser.track || 'general'}`,
      `daraja: ${level}`,
      `XP: ${currentUser.xp || 0}`,
      `ketma-ket kunlar: ${currentUser.streakDays || 0}`,
      `tugatilgan darslar: ${currentUser.completedLessons?.length || 0}`,
      `testlar: ${mine.length}${avg !== null ? `, o'rtacha ${avg}%` : ''}`,
      currentUser.targetScore ? `maqsad: ${currentUser.targetScore}` : ''
    ].filter(Boolean).join('; ');
  })();

  /** Starts (or switches to) a practice mode in the open conversation and says its first line. */
  const startScenario = (id: string | null) => {
    if (!threads || busy) return;
    const threadId = ensureThread();
    update((list) => list.map((t) => (t.id === threadId ? { ...t, scenario: id || undefined, updatedAt: now() } : t)));
    const sc = scenarioById(id || undefined);
    if (sc) void send(sc.starter, 'chat', sc.id);
  };

  const stopAnswer = () => abortRef.current?.abort();

  /** Sends a sticker: shown as the emoji, answered as a short message. */
  const sendSticker = (emoji: string) => {
    setStickersOpen(false);
    void send(`${emoji} (stiker orqali xabar)`, 'chat', undefined, { shown: emoji, kind: 'sticker' });
  };

  /** Picks a file: pictures are kept in the chat, .txt/.md/.docx contents are read and answered. */
  const onFilePicked = async (file?: File) => {
    if (!file) return;
    setError('');
    if (file.size > 6 * 1024 * 1024) return setError('Fayl hajmi 6 MB dan oshmasligi kerak.');
    const url = await uploadChatFile(file, file.name).catch(() => null);
    if (!url) return setError('Faylni yuklab bo‘lmadi. Qayta urinib ko‘ring.');
    const name = file.name.toLowerCase();
    if (file.type.startsWith('image/')) {
      const threadId = ensureThread();
      appendMessage(threadId, { id: newId('m'), sender: 'user', text: `📷 ${file.name}`, timestamp: now(), kind: 'file', mediaUrl: url, mediaName: file.name });
      return;
    }
    let text = '';
    if (name.endsWith('.txt') || name.endsWith('.md')) {
      text = (await file.text()).trim();
    } else if (name.endsWith('.docx')) {
      const b64 = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result).replace(/^data:[^;]*;base64,/, ''));
        r.onerror = () => reject(new Error('read'));
        r.readAsDataURL(file);
      });
      const res = await api.extractFileText(b64, file.name).catch(() => null);
      if (!res?.success) return setError(res?.message || 'Fayldan matn o‘qib bo‘lmadi.');
      text = String(res.text || '');
    } else {
      return setError('Bu fayl turini o‘qib bo‘lmaydi. Rasm, .txt, .md yoki .docx yuboring.');
    }
    if (text.length < 3) return setError('Fayldan matn topilmadi.');
    const shown = `📄 ${file.name}`;
    void send(`Men shu faylni yubordim (${file.name}). Matnini tushuntiring yoki savollar tuzing:\n\n${text.slice(0, 4000)}`, 'chat', undefined, { shown, kind: 'file', mediaUrl: url, mediaName: file.name });
  };

  /** Voice note: records the voice; the speech is turned into text and Edubek answers it. */
  const startVoiceNote = async () => {
    if (voiceNoteRef.current || busy) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const chunks: Blob[] = [];
      const rec = new MediaRecorder(stream);
      rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const sr = SR ? new SR() : null;
      let heard = '';
      if (sr) {
        sr.lang = 'en-US';
        sr.continuous = true;
        sr.interimResults = false;
        sr.onresult = (e: any) => { for (let i = e.resultIndex; i < e.results.length; i++) heard += `${e.results[i][0].transcript} `; };
        try { sr.start(); } catch { /* recognition may be unavailable */ }
      }
      rec.start();
      voiceNoteRef.current = { rec, stream, chunks, sr, text: () => heard.trim(), startedAt: Date.now() };
      setRecording(true);
    } catch {
      setError('Mikrofonga ruxsat bering, so‘ng ovozli xabar yuboriladi.');
    }
  };
  const stopVoiceNote = () => {
    const cur = voiceNoteRef.current;
    if (!cur) return;
    voiceNoteRef.current = null;
    setRecording(false);
    cur.rec.onstop = async () => {
      cur.stream.getTracks().forEach((t) => t.stop());
      try { cur.sr?.stop(); } catch { /* already stopped */ }
      await new Promise((r) => setTimeout(r, 400));
      const blob = new Blob(cur.chunks, { type: cur.rec.mimeType || 'audio/webm' });
      const seconds = Math.max(1, Math.round((Date.now() - cur.startedAt) / 1000));
      const heard = cur.text();
      const url = await uploadChatFile(blob, `ovoz-${Date.now()}.webm`).catch(() => null);
      if (!url) return setError('Ovozli xabarni yuklab bo‘lmadi.');
      if (heard.length >= 3) {
        void send(heard, 'chat', undefined, { shown: heard, kind: 'voice', mediaUrl: url, durationSec: seconds });
      } else {
        const threadId = ensureThread();
        appendMessage(threadId, { id: newId('m'), sender: 'user', text: '🎤 Ovozli xabar (matn aniqlanmadi)', timestamp: now(), kind: 'voice', mediaUrl: url, durationSec: seconds });
      }
    };
    cur.rec.stop();
  };

  /** Saves the selected words (or today's word) as a spaced-repetition flashcard. */
  const saveCard = async (key: string, card: { englishWord: string; meaningUz?: string; ipa?: string; exampleEn?: string; exampleUz?: string; level?: string }) => {
    const res = await api.createFlashcard(card).catch(() => null);
    setSaved(res?.success ? key : '');
    if (res?.success) setTimeout(() => setSaved(''), 2200);
    else setError(res?.message || 'Kartochka saqlanmadi.');
  };
  const saveSelection = (messageId: string) => {
    const picked = (window.getSelection?.()?.toString() || '').trim().slice(0, 80);
    if (!picked) {
      setError('Avval javobdan so‘z yoki iborani belgilab (sichqoncha bilan) tanlang, keyin “Lug‘atga” ni bosing.');
      return;
    }
    setError('');
    void saveCard(messageId, { englishWord: picked, level: level === 'A2' ? 'B1' : level === 'C1' ? 'C1' : 'B2' });
  };

  const copyText = (id: string, text: string) => {
    navigator.clipboard?.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(''), 1600);
    }).catch(() => {});
  };

  /** Runs the same question again (the old answer is replaced), or asks for a simpler explanation. */
  const startEdit = (m: Msg) => {
    setEditingId(m.id);
    setInput(m.text);
    setError('');
    window.setTimeout(() => inputRef.current?.focus(), 0);
  };
  const cancelEdit = () => {
    setEditingId(null);
    setInput('');
  };
  /** Sends the composer text. In edit mode it first drops the edited message and everything after it. */
  const submitInput = () => {
    if (editingId && active) {
      if (input.trim().length < 3) {
        setError('Savol yoki matnni yozing (kamida 3 belgi).');
        return;
      }
      const idx = active.messages.findIndex((m) => m.id === editingId);
      const text = input;
      if (idx >= 0) update((list) => list.map((t) => (t.id === active.id ? { ...t, messages: t.messages.slice(0, idx) } : t)));
      setEditingId(null);
      void send(text);
      return;
    }
    void send(input);
  };
  const regenerate = () => {
    if (!active || busy) return;
    const msgs = active.messages;
    const lastUser = [...msgs].reverse().find((m) => m.sender === 'user');
    if (!lastUser) return;
    const lastAi = msgs[msgs.length - 1];
    if (lastAi?.sender === 'ai') update((list) => list.map((t) => (t.id === active.id ? { ...t, messages: t.messages.slice(0, -1) } : t)));
    void send(lastUser.text);
  };
  const simplerAnswer = () => {
    if (!busy) void send('Buni yanada soddaroq va qisqaroq qilib, yana bir misol bilan tushuntiring.');
  };

  const renameThread = (id: string, current: string) => {
    const next = window.prompt('Suhbat nomi', current);
    if (next && next.trim()) update((list) => list.map((t) => (t.id === id ? { ...t, title: next.trim().slice(0, 80) } : t)));
  };
  const exportThread = () => {
    if (!active) return;
    copyText('thread', active.messages.map((m) => `${m.sender === 'user' ? 'Men' : 'Edubek'}: ${m.text}`).join('\n\n'));
  };

  /** Messages the student wrote today, across every conversation. */
  const todayCount = (threads || []).reduce((n, t) => n + t.messages.filter((m) => m.sender === 'user' && m.timestamp.slice(0, 10) === now().slice(0, 10)).length, 0);

  const suggestions = activeLesson
    ? [
        `${activeLesson.title} darsining asosiy g‘oyasi nima?`,
        'Bu dars bo‘yicha 3 ta savol tuzib bering',
        ...(activeLesson.homework ? ['Uy vazifamga yordam bering'] : [])
      ]
    : simple
      ? ['Bu so‘z nima degani?', 'Salom qanday aytiladi?', 'Men bugun nimani o‘rganaman?']
      : level === 'A2' || level === 'B1'
        ? ['Present Simple qachon ishlatiladi?', 'Past Simple va Present Perfect farqi nima?', 'Bu so‘zni misol bilan tushuntiring']
        : ['Conditionals bo‘yicha farqlarni tushuntiring', 'IELTS Writing Task 2 tuzilmasi qanday?', 'Academic so‘zlar bilan 5 ta gap tuzing'];

  const filteredLessons = lessons
    .filter((l) => {
      const q = lessonQuery.trim().toLowerCase();
      return !q || l.title.toLowerCase().includes(q) || (l.lessonCode || '').toLowerCase().includes(q);
    })
    .slice(0, 40);

  const chip = (on: boolean) =>
    cn(
      'rounded-full px-3 py-1.5 text-[12.5px] font-semibold transition-colors',
      on ? 'bg-ink text-white dark:bg-white dark:text-ink' : 'border border-line/80 text-ink-muted hover:text-ink dark:border-white/10 dark:text-stone-300'
    );

  return (
    <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-[260px_1fr]">
      {game ? <EdubekGames kind={game} onClose={() => setGame(null)} /> : null}
      {settingsOpen ? <EdubekSettingsDialog onClose={() => { setSettingsOpen(false); setLocalSettings(getEdubekSettings()); }} /> : null}
      {coach ? <PronunciationCoach onClose={() => setCoach(false)} onDone={(p) => { if (p >= 85) moodState.praise(); }} /> : null}
      {talking ? <EdubekTalk turn={talkTurn} baseMood={moodState.base} tone={moodState.tone} onClose={() => setTalking(false)} modeTitle={activeScenario?.title} opening={activeScenario?.spoken && (active?.messages.length ?? 0) === 0 ? activeScenario.starter : undefined} /> : null}
      {/* Conversations */}
      <aside
        className={cn(
          'space-y-3 rounded-[1.75rem] border border-line/80 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.03] lg:sticky lg:top-24 lg:block lg:self-start',
          showThreads ? 'block' : 'hidden'
        )}
      >
        <button
          type="button"
          onClick={newThread}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-ink px-4 py-2.5 text-[13.5px] font-semibold text-white transition-transform hover:-translate-y-px dark:bg-white dark:text-ink"
        >
          <Plus className="h-4 w-4" /> Yangi suhbat
        </button>
        {(threads || []).length > 4 ? (
          <label className="flex items-center gap-2 rounded-full bg-ink/[0.04] px-3 py-2 dark:bg-white/[0.06]">
            <Search className="h-3.5 w-3.5 text-ink-muted" />
            <input value={threadQuery} onChange={(e) => setThreadQuery(e.target.value)} placeholder="Suhbatlardan qidirish" aria-label="Suhbatlarni qidirish" className="min-w-0 flex-1 bg-transparent text-[12.5px] text-ink outline-none dark:text-white" />
          </label>
        ) : null}
        <ul className="max-h-[320px] space-y-1 overflow-y-auto lg:max-h-[60vh]" aria-label="Suhbatlar">
          {(threads || []).filter((t) => !threadQuery.trim() || `${t.title} ${t.messages.map((m) => m.text).join(' ')}`.toLowerCase().includes(threadQuery.trim().toLowerCase())).map((t) => {
            const lesson = t.lessonId ? lessons.find((l) => l.id === t.lessonId) : null;
            return (
              <li
                key={t.id}
                className={cn(
                  'group flex items-center gap-2 rounded-2xl px-3 py-2.5 transition-colors',
                  t.id === activeId ? 'bg-ink/[0.06] dark:bg-white/[0.08]' : 'hover:bg-ink/[0.03] dark:hover:bg-white/[0.04]'
                )}
              >
                <button
                  type="button"
                  onClick={() => {
                    setActiveId(t.id);
                    setShowThreads(false);
                  }}
                  className="min-w-0 flex-1 text-left"
                >
                  <span className="block truncate text-[13px] font-semibold text-ink dark:text-white">{t.title}</span>
                  <span className="block truncate text-[11.5px] text-ink-muted dark:text-stone-400">
                    {lesson ? `Dars: ${lesson.title}` : scenarioById(t.scenario) ? scenarioById(t.scenario)?.title : `${t.messages.length} ta xabar`}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => renameThread(t.id, t.title)}
                  aria-label={`${t.title} suhbati nomini o‘zgartirish`}
                  className="rounded-full p-1.5 text-ink-muted opacity-0 transition-opacity hover:text-ink group-hover:opacity-100 focus:opacity-100"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => deleteThread(t.id)}
                  aria-label={`${t.title} suhbatini o‘chirish`}
                  className="rounded-full p-1.5 text-ink-muted opacity-0 transition-opacity hover:text-rose-600 group-hover:opacity-100 focus:opacity-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            );
          })}
        </ul>
      </aside>

      {/* Chat */}
      <section className="flex h-[min(720px,calc(100svh-150px))] min-h-[520px] flex-col overflow-hidden rounded-[1.75rem] border border-line/80 bg-white/70 dark:border-white/10 dark:bg-white/[0.03]">
        <header className="space-y-3 border-b border-line/70 px-5 py-4 dark:border-white/10">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowThreads((v) => !v)}
              aria-expanded={showThreads}
              className="flex h-10 items-center rounded-full border border-line/80 px-3 text-[12.5px] font-semibold text-ink-muted lg:hidden dark:border-white/10 dark:text-stone-300"
            >
              <MessageSquare className="mr-1.5 h-3.5 w-3.5" /> Suhbatlar
            </button>
            <EdubekAvatar mood={mood} size={48} typing={input.length > 0} animated={animated} audioPlaying={speakingNow} />
            <div className="min-w-0 flex-1">
              <h2 className="text-[15px] font-bold text-ink dark:text-white">Edubek</h2>
              <p className="truncate text-[12px] text-ink-muted dark:text-stone-400">
                {moodState.note || (activeLesson ? `Javoblar “${activeLesson.title}” konspektiga tayanadi` : 'Ingliz tili bo‘yicha yordamchi')}
              </p>
            </div>
            {edubekOn('edubekVoice') ? (
            <button
              type="button"
              onClick={() => { stopReading(); setSpeakingNow(false); setTalking(true); }}
              className="inline-flex h-10 items-center gap-2 rounded-full bg-ink px-4 text-[13px] font-semibold text-white transition-transform hover:-translate-y-px dark:bg-white dark:text-ink"
            >
              <Mic className="h-4 w-4" /> Suhbat
            </button>
            ) : null}
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                aria-expanded={menuOpen}
                aria-haspopup="menu"
                aria-label="Qo‘shimcha amallar"
                title="Qo‘shimcha amallar"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-line/80 bg-white/70 text-ink-muted hover:text-ink dark:border-white/10 dark:bg-white/[0.05] dark:text-stone-300"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
              {menuOpen ? (
                <div role="menu" className="absolute right-0 top-12 z-30 w-64 space-y-0.5 rounded-2xl border border-line/80 bg-white p-2 shadow-xl dark:border-white/10 dark:bg-[#17171b]">
                  {[
                    { label: 'Talaffuz mashqi', on: false, run: () => setCoach(true), hidden: !edubekOn('edubekPronunciation') },
                    { label: 'Ovoz sozlamalari', on: false, run: () => setShowVoice(true), hidden: !edubekOn('edubekVoice') },
                    { label: '10 yoshli o‘quvchi uchun til', on: simple, run: () => setSimple((v) => !v), hidden: false },
                    { label: 'Edubek sozlamalari', on: false, run: () => setSettingsOpen(true), hidden: false },
                    { label: 'Diktant (eshitib yozish)', on: false, run: () => setGame('dictation'), hidden: !edubekOn('edubekGames') },
                    { label: 'So‘z topish', on: false, run: () => setGame('hangman'), hidden: !edubekOn('edubekGames') },
                    { label: 'Tez test (so‘z ma’nosi)', on: false, run: () => setGame('quiz'), hidden: !edubekOn('edubekGames') },
                    { label: 'Suhbatni nusxalash', on: false, run: exportThread, disabled: !active || active.messages.length === 0, hidden: false }
                  ].filter((item) => !item.hidden).map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      role="menuitem"
                      disabled={item.disabled}
                      onClick={() => {
                        item.run();
                        setMenuOpen(false);
                      }}
                      className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-[13px] font-medium text-ink hover:bg-ink/[0.05] disabled:opacity-40 dark:text-white dark:hover:bg-white/10"
                    >
                      <span>{item.label}</span>
                      {item.on ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : null}
                    </button>
                  ))}
                </div>
              ) : null}
              {showVoice ? <div className="absolute right-0 top-12 z-30"><EdubekVoicePanel onClose={() => setShowVoice(false)} mood={moodState.tone} /></div> : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1" role="group" aria-label="Daraja">
              {LEVELS.map((l) => (
                <button key={l} type="button" aria-pressed={level === l} onClick={() => setLevel(l)} className={chip(level === l)}>
                  {l}
                </button>
              ))}
            </div>
            <div className="ml-auto flex min-w-0 items-center gap-2">
              {activeScenario ? (
                <span className="flex min-w-0 items-center gap-1.5 rounded-full bg-[#e8457a]/10 py-1 pl-3 pr-1 text-[12px] font-semibold text-[#b82a5c]">
                  <Sparkles className="h-3 w-3 shrink-0" />
                  <span className="max-w-[170px] truncate">{activeScenario.title}</span>
                  <button type="button" onClick={() => startScenario(null)} aria-label="Rejimni o‘chirish" className="rounded-full p-1 hover:bg-black/5"><X className="h-3 w-3" /></button>
                </span>
              ) : null}
              {active && active.messages.length > 0 ? (
                <button type="button" onClick={exportThread} aria-label="Suhbatni nusxalash" title="Suhbatni nusxalash" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line/80 text-ink-muted hover:text-ink dark:border-white/10 dark:text-stone-300">
                  {copiedId === 'thread' ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Download className="h-3.5 w-3.5" />}
                </button>
              ) : null}
              {activeLesson ? (
                <span className="flex min-w-0 items-center gap-1.5 rounded-full bg-[#f2650f]/10 py-1 pl-3 pr-1 text-[12px] font-semibold text-[#9a3f0a] dark:bg-[#ffa149]/15 dark:text-[#ffc08a]">
                  <span className="truncate max-w-[180px]">{activeLesson.lessonCode ? `${activeLesson.lessonCode} · ` : ''}{activeLesson.title}</span>
                  <button type="button" onClick={() => pickLesson('')} aria-label="Dars bog‘lanishini olib tashlash" className="rounded-full p-1 hover:bg-black/5 dark:hover:bg-white/10">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ) : null}
              <button
                type="button"
                onClick={() => setPicker((v) => !v)}
                disabled={!threads}
                aria-expanded={picker}
                className="flex shrink-0 items-center gap-1.5 rounded-full border border-line/80 px-3 py-1.5 text-[12.5px] font-semibold text-ink transition-colors hover:border-ink/30 disabled:opacity-50 dark:border-white/10 dark:text-white"
              >
                <BookOpen className="h-3.5 w-3.5" /> {activeLesson ? 'Darsni almashtirish' : 'Dars tanlash'}
              </button>
            </div>
          </div>

          {picker ? (
            <div className="animate-msg space-y-2 rounded-2xl border border-line/70 bg-white/80 p-3 dark:border-white/10 dark:bg-white/[0.04]">
              <label className="flex items-center gap-2 rounded-full bg-ink/[0.04] px-3.5 py-2 dark:bg-white/[0.06]">
                <Search className="h-3.5 w-3.5 text-ink-muted" />
                <input
                  value={lessonQuery}
                  onChange={(e) => setLessonQuery(e.target.value)}
                  placeholder="Dars nomi yoki kodi (masalan, EDU-L01)"
                  aria-label="Darsni qidirish"
                  className="min-w-0 flex-1 bg-transparent text-[13.5px] text-ink outline-none dark:text-white"
                />
              </label>
              <ul className="max-h-56 space-y-1 overflow-y-auto">
                <li>
                  <button type="button" onClick={() => pickLesson('')} className="w-full rounded-xl px-3 py-2 text-left text-[13px] text-ink-muted hover:bg-ink/[0.04] dark:text-stone-400">
                    Darssiz suhbat
                  </button>
                </li>
                {filteredLessons.length === 0 ? (
                  <li className="px-3 py-2 text-[12.5px] text-ink-muted">{lessons.length === 0 ? 'Hozircha nashr etilgan dars yo‘q.' : 'Topilmadi.'}</li>
                ) : null}
                {filteredLessons.map((l) => (
                  <li key={l.id}>
                    <button
                      type="button"
                      onClick={() => pickLesson(l.id)}
                      className={cn(
                        'flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left hover:bg-ink/[0.04] dark:hover:bg-white/[0.06]',
                        active?.lessonId === l.id && 'bg-[#f2650f]/10'
                      )}
                    >
                      <span className="min-w-0 truncate text-[13.5px] font-semibold text-ink dark:text-white">{l.title}</span>
                      <span className="shrink-0 font-mono text-[11px] text-ink-muted">{l.lessonCode || ''}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </header>

        {/* Messages */}
        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-6" aria-live="polite">
          {!threads ? (
            <p className="text-[13px] text-ink-muted dark:text-stone-400">Suhbatlar yuklanmoqda…</p>
          ) : !active || active.messages.length === 0 ? (
            <div className="animate-msg flex min-h-full flex-col items-center justify-center gap-4 py-4 text-center">
              <EdubekAvatar mood={mood} size={96} animated={animated} audioPlaying={speakingNow} />
              <div className="space-y-1.5">
                <p className="text-[17px] font-bold text-ink dark:text-white">
                  {activeLesson ? 'Dars bo‘yicha savol bering' : (eduSettings.greeting || 'Salom! Nimani o‘rganamiz?')}
                </p>
                <p className="mx-auto max-w-sm text-[13.5px] leading-relaxed text-ink-muted dark:text-stone-400">
                  {activeLesson
                    ? 'Edubek shu darsning konspektiga tayanib javob beradi. Savolingizni yozing.'
                    : 'Savolingizni yozing yoki dars tanlab, o‘sha dars bo‘yicha so‘rang.'}
                </p>
              </div>
              {edubekOn('edubekWordOfDay') ? (
              <div className="flex w-full max-w-2xl flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#f2650f]/25 bg-[#f2650f]/[0.06] px-4 py-3 text-left">
                <div className="min-w-0">
                  <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#c4520a] dark:text-[#ffc982]">Kunning so‘zi</div>
                  <div className="text-[15px] font-extrabold text-ink dark:text-white">{word.en} <span className="font-mono text-[12px] font-normal text-ink-muted">{word.ipa}</span> — {word.uz}</div>
                  <div className="text-[12.5px] text-ink-muted dark:text-stone-400">{word.example} · {word.exampleUz}</div>
                </div>
                <button type="button" onClick={() => saveCard('wod', { englishWord: word.en, ipa: word.ipa, meaningUz: word.uz, exampleEn: word.example, exampleUz: word.exampleUz, level: word.level })} className="inline-flex h-9 shrink-0 items-center rounded-full border border-[#f2650f]/40 bg-white/70 px-4 text-[12.5px] font-bold text-[#c4520a] dark:bg-white/5 dark:text-[#ffc982]">{saved === 'wod' ? '✓ Saqlandi' : 'Kartochkaga'}</button>
              </div>
              ) : null}
              {!activeLesson ? (
                <div className="grid w-full max-w-2xl gap-2.5 text-left sm:grid-cols-2">
                  {EDUBEK_SCENARIOS.map((sc) => (
                    <button
                      key={sc.id}
                      type="button"
                      disabled={busy}
                      onClick={() => startScenario(sc.id)}
                      className="group rounded-2xl border border-line/80 bg-white/80 p-3.5 transition-all hover:-translate-y-0.5 hover:border-[#f2650f]/50 hover:shadow-[0_14px_30px_-20px_rgba(242,101,15,0.6)] disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.04]"
                    >
                      <span className="flex items-center gap-2 text-[13.5px] font-bold text-ink dark:text-white"><Sparkles className="h-3.5 w-3.5 text-[#f2650f]" /> {sc.title}</span>
                      <span className="mt-1 block text-[12px] leading-snug text-ink-muted dark:text-stone-400">{sc.hint}</span>
                    </button>
                  ))}
                </div>
              ) : null}
              <div className="flex flex-wrap justify-center gap-2">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setInput(s);
                      inputRef.current?.focus();
                    }}
                    className="rounded-full border border-line/80 bg-white/80 px-3.5 py-2 text-[12.5px] font-semibold text-ink transition-colors hover:border-ink/30 disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-stone-200"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            active.messages.map((m, mi) => (
              <div key={m.id} className={cn('animate-msg flex flex-col gap-1', m.sender === 'user' ? 'items-end' : 'items-start')}>
                <div
                  className={cn(
                    'max-w-[88%] rounded-2xl px-4 py-3 text-[14.5px] leading-relaxed sm:max-w-[74%]',
                    m.sender === 'user'
                      ? 'rounded-br-md bg-ink text-white dark:bg-white dark:text-ink'
                      : 'rounded-bl-md border border-line/70 bg-white text-ink dark:border-white/10 dark:bg-white/[0.05] dark:text-stone-100'
                  )}
                >
                  {m.kind === 'sticker' ? (
                    <span className="text-[44px] leading-none" aria-label={`Stiker ${m.text}`}>{m.text}</span>
                  ) : m.kind === 'voice' ? (
                    <div className="flex min-w-[200px] flex-col gap-1.5">
                      <audio controls preload="none" src={m.mediaUrl} className="h-9 w-full" aria-label="Ovozli xabar" />
                      {m.durationSec ? <span className="text-[11.5px] opacity-70">{m.durationSec} soniya</span> : null}
                      {m.text && !m.text.startsWith('🎤') ? <span className="text-[13px] opacity-85">{m.text}</span> : null}
                    </div>
                  ) : m.kind === 'file' && m.mediaUrl && /\.(png|jpe?g|webp|gif)$/i.test(m.mediaName || '') ? (
                    <a href={m.mediaUrl} target="_blank" rel="noopener noreferrer"><img src={m.mediaUrl} alt={m.mediaName || 'Rasm'} className="max-h-60 rounded-xl" /></a>
                  ) : m.kind === 'file' && m.mediaUrl ? (
                    <a href={m.mediaUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 underline underline-offset-2">{m.text}</a>
                  ) : m.sender === 'ai' ? <Rich text={m.text} /> : m.text}
                </div>
                {m.sender === 'user' && m.kind !== 'sticker' && m.kind !== 'voice' && m.kind !== 'file' && m.text ? (
                  <div className="flex items-center gap-0.5 pr-1 text-ink-muted dark:text-stone-400">
                    <button type="button" onClick={() => copyText(m.id, m.text)} aria-label="Nusxalash" title="Nusxalash" className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-ink/[0.05] dark:hover:bg-white/10">
                      {copiedId === m.id ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                    <button type="button" onClick={() => startEdit(m)} disabled={busy} aria-label="Tahrirlash" title="Tahrirlash" className="rounded-full px-2.5 py-1 text-[11.5px] font-semibold hover:bg-ink/[0.05] disabled:opacity-40 dark:hover:bg-white/10">Tahrirlash</button>
                  </div>
                ) : null}
                {m.sender === 'ai' && !(busy && mi === active.messages.length - 1) ? (
                  <div className="flex items-center gap-0.5 pl-1 text-ink-muted dark:text-stone-400">
                    <button type="button" onClick={() => copyText(m.id, m.text)} aria-label="Nusxalash" title="Nusxalash" className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-ink/[0.05] dark:hover:bg-white/10">
                      {copiedId === m.id ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                    <button type="button" onClick={() => saveSelection(m.id)} className="rounded-full px-2.5 py-1 text-[11.5px] font-semibold hover:bg-ink/[0.05] dark:hover:bg-white/10" title="Javobdan so‘z belgilab, kartochkaga saqlang">{saved === m.id ? '✓ Saqlandi' : 'Lug‘atga'}</button>
                    <button type="button" onClick={() => speakText(m.text)} aria-label="Tinglash" title="Tinglash" className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-ink/[0.05] dark:hover:bg-white/10"><Volume2 className="h-3.5 w-3.5" /></button>
                    {mi === active.messages.length - 1 ? (
                      <>
                        <button type="button" onClick={regenerate} disabled={busy} aria-label="Qayta yozish" title="Qayta yozish" className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-ink/[0.05] disabled:opacity-40 dark:hover:bg-white/10"><RefreshCw className="h-3.5 w-3.5" /></button>
                        <button type="button" onClick={simplerAnswer} disabled={busy} className="ml-1 rounded-full px-2.5 py-1 text-[11.5px] font-semibold hover:bg-ink/[0.05] disabled:opacity-40 dark:hover:bg-white/10">Soddaroq</button>
                      </>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ))
          )}
          {busy && !streaming ? (
            <div className="animate-msg flex items-center gap-2 text-[12.5px] font-medium text-ink-muted dark:text-stone-400" role="status">
              <span className="flex gap-1" aria-hidden>
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#f2650f] [animation-delay:-0.2s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#f2650f] [animation-delay:-0.1s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#f2650f]" />
              </span>
              Edubek javob yozmoqda…
            </div>
          ) : null}
          <div ref={endRef} />
        </div>

        {error ? (
          <p role="alert" className="mx-5 mb-2 rounded-2xl bg-rose-50 px-4 py-2.5 text-[13px] text-rose-800 dark:bg-rose-500/10 dark:text-rose-200">
            {error}
            {canRetry && !busy ? (
              <button type="button" onClick={() => { const a = lastAttempt.current; if (a) void send(a.text, a.mode, a.scenario, { skipEcho: true }); }} className="ml-3 inline-flex min-h-[36px] items-center rounded-full bg-rose-600 px-3.5 text-[12.5px] font-semibold text-white">Qayta urinish</button>
            ) : null}
          </p>
        ) : null}

        {/* Composer */}
        <div className="space-y-3 border-t border-line/70 p-4 dark:border-white/10">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy || !input.trim()}
              onClick={() => send(input, 'explain')}
              className="flex items-center gap-1.5 rounded-full border border-line/80 px-3 py-1.5 text-[12px] font-semibold text-ink-muted transition-colors hover:text-ink disabled:opacity-40 dark:border-white/10 dark:text-stone-300"
              title="Yozgan matningizni sodda tushuntirish"
            >
              <BookOpen className="h-3.5 w-3.5" /> Matnni tushuntir
            </button>
            <button
              type="button"
              disabled={busy || !input.trim()}
              onClick={() => send(input, 'test')}
              className="flex items-center gap-1.5 rounded-full border border-line/80 px-3 py-1.5 text-[12px] font-semibold text-ink-muted transition-colors hover:text-ink disabled:opacity-40 dark:border-white/10 dark:text-stone-300"
              title="Yozgan mavzuingiz bo‘yicha test"
            >
              <ClipboardList className="h-3.5 w-3.5" /> Mavzu bo‘yicha test
            </button>
            {active && active.messages.length >= 2 ? (
              <>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => send('Shu suhbatimizni 5 ta qisqa punktda xulosa qiling va undan 3 ta muhim so‘z ajrating.', 'chat')}
                  className="flex items-center gap-1.5 rounded-full border border-line/80 px-3 py-1.5 text-[12px] font-semibold text-ink-muted transition-colors hover:text-ink disabled:opacity-40 dark:border-white/10 dark:text-stone-300"
                  title="Suhbat mazmunini qisqa xulosa qilish"
                >
                  Suhbat xulosasi
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => send('Mening shu suhbatdagi xabarlarimni tekshiring: har bir xatoni ko‘rsating, to‘g‘ri variantini yozing va qisqa qoida bering.', 'chat')}
                  className="flex items-center gap-1.5 rounded-full border border-line/80 px-3 py-1.5 text-[12px] font-semibold text-ink-muted transition-colors hover:text-ink disabled:opacity-40 dark:border-white/10 dark:text-stone-300"
                  title="Sizning xabarlaringizdagi xatolarni tahlil qilish"
                >
                  Xatolarimni tahlil qil
                </button>
              </>
            ) : null}
            <button
              type="button"
              onClick={toggleMic}
              aria-pressed={listening}
              className={cn('flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-colors', listening ? 'border-[#15a36a] bg-[#15a36a]/10 text-[#0e7a4f]' : 'border-line/80 text-ink-muted hover:text-ink dark:border-white/10 dark:text-stone-300')}
            >
              {listening ? 'Tinglayapman…' : 'Ovoz bilan yozish'}
            </button>
            <button
              type="button"
              onClick={() => {
                const next = !voiceOn;
                setVoiceOn(next);
                if (!next) { stopReading(); setSpeakingNow(false); }
              }}
              aria-pressed={voiceOn}
              className={cn('flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-colors', voiceOn ? 'border-[#e8457a] bg-[#e8457a]/10 text-[#b82a5c]' : 'border-line/80 text-ink-muted hover:text-ink dark:border-white/10 dark:text-stone-300')}
            >
              {voiceOn ? 'Ovozli javob: yoqilgan' : 'Ovozli javob'}
            </button>
          </div>
          {editingId ? (
            <div role="status" className="mx-1 flex items-center justify-between gap-3 rounded-2xl bg-amber-50 px-4 py-2 text-[13px] text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
              <span>Xabarni tahrirlayapsiz. Yuborsangiz, eski xabar va undan keyingi javoblar o‘rniga yangisi yoziladi.</span>
              <button type="button" onClick={cancelEdit} className="shrink-0 font-semibold underline">Bekor</button>
            </div>
          ) : null}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submitInput();
            }}
            className="flex items-end gap-2 rounded-[1.5rem] border border-line/80 bg-white/90 p-2 pl-4 focus-within:border-[#f2650f]/50 dark:border-white/10 dark:bg-white/[0.04]"
          >
{eduFlag('files') ? (
            <>
            <button type="button" onClick={() => fileRef.current?.click()} aria-label="Fayl biriktirish" title="Fayl biriktirish (rasm, .txt, .md, .docx)" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:text-ink dark:text-stone-300">
              <Paperclip className="h-4 w-4" />
            </button>
            <input ref={fileRef} type="file" accept="image/*,.txt,.md,.docx" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => { void onFilePicked(e.target.files?.[0]); e.target.value = ''; }} />
</>
) : null}
            {eduFlag('stickers') ? (
            <div className="relative">
              <button type="button" onClick={() => setStickersOpen((v) => !v)} aria-expanded={stickersOpen} aria-label="Stiker" title="Stiker" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:text-ink dark:text-stone-300">
                <Smile className="h-4 w-4" />
              </button>
              {stickersOpen ? (
                <div role="menu" className="absolute bottom-12 left-0 z-30 grid w-56 grid-cols-6 gap-1 rounded-2xl border border-line/80 bg-white p-2 shadow-xl dark:border-white/10 dark:bg-[#17171b]">
                  {STICKERS.map((e) => (
                    <button key={e} type="button" role="menuitem" onClick={() => sendSticker(e)} className="flex h-8 w-8 items-center justify-center rounded-lg text-[20px] hover:bg-ink/5" aria-label={`Stiker ${e}`}>{e}</button>
                  ))}
                </div>
              ) : null}
            </div>
) : null}
            {eduFlag('voiceNotes') ? (
            <button type="button" onClick={() => (voiceNoteRef.current ? stopVoiceNote() : void startVoiceNote())} aria-pressed={recording} aria-label={recording ? 'Ovozni yuborish' : 'Ovozli xabar yozish'} title={recording ? 'To‘xtatib yuborish' : 'Ovozli xabar'} className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors', recording ? 'animate-pulse bg-rose-500 text-white' : 'text-ink-muted hover:text-ink dark:text-stone-300')}>
              {recording ? <Square className="h-3.5 w-3.5 fill-current" /> : <Mic className="h-4 w-4" />}
            </button>
) : null}
                        <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                e.currentTarget.style.height = 'auto';
                e.currentTarget.style.height = `${Math.min(e.currentTarget.scrollHeight, 140)}px`;
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  submitInput();
                }
              }}
              maxLength={4000}
              placeholder={activeLesson ? `“${activeLesson.title}” bo‘yicha savol…` : simple ? 'Savolingizni yozing…' : 'Savol yoki matnni yozing…'}
              aria-label="Xabar"
              className="max-h-[140px] min-h-[40px] flex-1 resize-none bg-transparent py-2 text-[14.5px] leading-relaxed text-ink outline-none placeholder:text-ink-muted/70 dark:text-white"
            />
            {busy && streaming ? (
              <button type="button" onClick={stopAnswer} aria-label="To‘xtatish" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink text-white transition-transform hover:scale-105 dark:bg-white dark:text-ink"><Square className="h-3.5 w-3.5 fill-current" /></button>
            ) : (
            <button
              type="submit"
              disabled={busy || !input.trim() || !threads}
              aria-label="Yuborish"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-[#ffa149] to-[#f2650f] text-white shadow-[0_10px_24px_-10px_rgba(242,101,15,0.8)] transition-transform hover:scale-105 disabled:opacity-40"
            >
              <ArrowUp className="h-4.5 w-4.5" />
            </button>
            )}
          </form>
          <p className="px-1 text-[11.5px] text-ink-muted dark:text-stone-500">{todayCount > 0 ? `Bugun Edubek bilan ${todayCount} ta xabar yozdingiz.` : 'Bugun hali yozmadingiz: bir savol bering.'} Enter: yuborish, Shift+Enter: yangi qator.</p>
        </div>
      </section>
    </div>
  );
};
