'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../../services/api';

export interface ExamReviewItem {
  id: string;
  given: string | number | null;
  isCorrect: boolean;
  correctAnswer?: string;
  correctAnswerIndex?: number;
  explanation?: string;
  evidenceQuote?: string;
  evidenceParagraphLabel?: string;
}

export interface ExamResultSummary {
  correctCount: number;
  totalQuestions: number;
  percentage: number;
  score: number;
  maxScore: number;
  band?: number;
  cefrLevel?: string;
  scaleNote: string;
}

function guestKey(): string {
  try {
    let k = localStorage.getItem('edulevel_guest_key');
    if (!k) {
      k = (crypto.randomUUID?.() || Math.random().toString(36).slice(2) + Date.now().toString(36)).replace(/-/g, '');
      localStorage.setItem('edulevel_guest_key', k);
    }
    return k;
  } catch {
    return 'anon' + Date.now();
  }
}

/**
 * Timed exam session backed by the server:
 * - the deadline comes from the server (refresh-safe, cannot be extended client-side);
 * - answers are mirrored to localStorage instantly and autosaved to the server;
 * - after a refresh the same session (and its answers) is restored;
 * - submit is idempotent and returns the server-computed result and review.
 */
export function useExamSession(testId: string | null, opts: { onExpire?: () => void } = {}) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string | number>>({});
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [status, setStatus] = useState<'idle' | 'starting' | 'active' | 'submitting' | 'done' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'offline'>('saved');
  const endsAtRef = useRef<number>(0);
  const offsetRef = useRef<number>(0);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const expiredRef = useRef(false);
  const onExpireRef = useRef(opts.onExpire);
  useEffect(() => {
    onExpireRef.current = opts.onExpire;
  });

  const isGuestRef = useRef(true);

  const start = useCallback(
    async (isGuest: boolean) => {
      if (!testId) return null;
      isGuestRef.current = isGuest;
      setStatus('starting');
      setError(null);
      expiredRef.current = false;
      const res = await api.startExam(testId, isGuest ? guestKey() : undefined).catch(() => null);
      if (!res?.success) {
        setStatus('error');
        setError(res?.message || 'Testni boshlab bo‘lmadi. Internet aloqasini tekshiring.');
        return null;
      }
      const s = res.session;
      offsetRef.current = new Date(res.serverNow).getTime() - Date.now();
      endsAtRef.current = new Date(s.endsAt).getTime();
      let restored: Record<string, string | number> = s.answers || {};
      try {
        const local = JSON.parse(localStorage.getItem('exam:' + s.id) || 'null');
        if (local && typeof local === 'object') restored = { ...restored, ...local };
      } catch {}
      setSessionId(s.id);
      setAnswers(restored);
      setStatus('active');
      return { sessionId: s.id as string, transcripts: res.transcripts as { sectionId: string; transcript: string }[] | undefined, restored };
    },
    [testId]
  );

  // Ticking countdown from the server deadline
  useEffect(() => {
    if (status !== 'active') return;
    const tick = () => {
      const left = Math.max(0, Math.round((endsAtRef.current - (Date.now() + offsetRef.current)) / 1000));
      setSecondsLeft(left);
      if (left === 0 && !expiredRef.current) {
        expiredRef.current = true;
        onExpireRef.current?.();
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [status]);

  const flush = useCallback(
    async (next: Record<string, string | number>) => {
      if (!testId || !sessionId) return;
      setSaveState('saving');
      const res = await api.saveExam(testId, sessionId, next, isGuestRef.current ? guestKey() : undefined).catch(() => null);
      setSaveState(res?.success ? 'saved' : 'offline');
    },
    [testId, sessionId]
  );

  const setAnswer = useCallback(
    (qid: string, value: string | number) => {
      setAnswers((prev) => {
        const next = { ...prev, [qid]: value };
        if (sessionId) {
          try {
            localStorage.setItem('exam:' + sessionId, JSON.stringify(next));
          } catch {}
          if (saveTimer.current) clearTimeout(saveTimer.current);
          saveTimer.current = setTimeout(() => flush(next), 1200);
        }
        return next;
      });
    },
    [sessionId, flush]
  );

  const submit = useCallback(
    async (override?: Record<string, string | number>) => {
      if (!testId) return null;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      setStatus('submitting');
      const finalAnswers = override || answers;
      const res = await api
        .submitExam(testId, sessionId || undefined, finalAnswers, 0, isGuestRef.current ? guestKey() : undefined)
        .catch(() => null);
      if (!res?.success) {
        setStatus('active');
        setError(res?.message || 'Topshirib bo‘lmadi. Javoblaringiz saqlangan — qayta urinib ko‘ring.');
        return null;
      }
      try {
        if (sessionId) localStorage.removeItem('exam:' + sessionId);
      } catch {}
      setStatus('done');
      return res as { attempt: any; review: ExamReviewItem[]; result: ExamResultSummary; late?: boolean; duplicate?: boolean };
    },
    [testId, sessionId, answers]
  );

  const reset = useCallback(() => {
    setSessionId(null);
    setAnswers({});
    setSecondsLeft(null);
    setStatus('idle');
    setError(null);
  }, []);

  return { sessionId, answers, setAnswer, setAnswers, secondsLeft, status, error, saveState, start, submit, reset };
}

/** Index the server review by question id. */
export function reviewMap(review: ExamReviewItem[] | undefined | null): Record<string, ExamReviewItem> {
  const m: Record<string, ExamReviewItem> = {};
  (review || []).forEach((r) => (m[r.id] = r));
  return m;
}
