/**
 * Real, per-student learning analytics derived from stored activity
 * (test attempts, writing and speaking submissions). No invented numbers:
 * when there is no data, values are null/empty and the UI shows an empty state.
 */
import { AppDatabase, TestAttempt, User } from '../types';
import { calculateCefrLevel, calculateIeltsBand } from './eduLogic';

export type Skill = 'Reading' | 'Listening' | 'Writing' | 'Speaking';
export const SKILLS: Skill[] = ['Reading', 'Listening', 'Writing', 'Speaking'];

const DAY_NAMES = ['Yak', 'Dush', 'Sesh', 'Chor', 'Pay', 'Juma', 'Shan'];
const MONTHS = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyun', 'Iyul', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'];

export function attemptPercent(a: TestAttempt): number {
  if (typeof a.percentage === 'number' && !Number.isNaN(a.percentage)) return Math.max(0, Math.min(100, a.percentage));
  if (a.maxScore) return Math.max(0, Math.min(100, Math.round((a.score / a.maxScore) * 100)));
  if (a.totalQuestions) return Math.round((a.correctCount / a.totalQuestions) * 100);
  return 0;
}

export function percentToBand(percent: number): number {
  return calculateIeltsBand(Math.round((percent / 100) * 40));
}

export function inferSkill(title: string): Skill | null {
  const t = (title || '').toLowerCase();
  if (t.includes('reading')) return 'Reading';
  if (t.includes('listening')) return 'Listening';
  if (t.includes('writing')) return 'Writing';
  if (t.includes('speaking')) return 'Speaking';
  return null;
}

const fmtDate = (d: Date) => `${d.getDate()}-${MONTHS[d.getMonth()]}`;

export interface StudentAnalytics {
  attempts: TestAttempt[];
  progression: { date: string; testName: string; score: number; maxScore: number; band: number; cefr: string }[];
  daily: { day: string; dateStr: string; minutes: number; lessonsDone: number; streakActive: boolean }[];
  skills: { skill: Skill; studentScore: number; targetScore: number; band: string; samples: number }[];
  bestBand: number | null;
  latestBand: number | null;
  averagePercent: number | null;
  totalMinutes: number;
  streakDays: number;
  xp: number;
  hasData: boolean;
}

export function computeStudentAnalytics(db: AppDatabase, user: User | null, days = 14): StudentAnalytics {
  const uid = user?.id;
  const attempts = (db.testAttempts || [])
    .filter((a) => uid && a.userId === uid)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const progression = attempts.slice(-10).map((a) => {
    const pct = attemptPercent(a);
    return {
      date: fmtDate(new Date(a.createdAt)),
      testName: a.testTitle,
      score: pct,
      maxScore: 100,
      band: percentToBand(pct),
      cefr: a.cefrLevel || calculateCefrLevel(pct)
    };
  });

  // Daily activity (minutes spent in tests) for the last `days` days
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daily = Array.from({ length: days }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (days - 1 - i));
    const next = new Date(d);
    next.setDate(d.getDate() + 1);
    const dayAttempts = attempts.filter((a) => {
      const t = new Date(a.createdAt).getTime();
      return t >= d.getTime() && t < next.getTime();
    });
    const minutes = Math.round(dayAttempts.reduce((acc, a) => acc + (a.timeSpentSeconds || 0), 0) / 60);
    return {
      day: i === days - 1 ? 'Bugun' : DAY_NAMES[d.getDay()],
      dateStr: fmtDate(d),
      minutes,
      lessonsDone: dayAttempts.length,
      streakActive: dayAttempts.length > 0
    };
  });

  // Skill levels: test attempts by title + AI-graded writing/speaking submissions
  const skillScores: Record<Skill, number[]> = { Reading: [], Listening: [], Writing: [], Speaking: [] };
  attempts.forEach((a) => {
    const s = inferSkill(a.testTitle);
    if (s) skillScores[s].push(attemptPercent(a));
  });
  (db.writingSubmissions || [])
    .filter((w) => w.userId === uid && typeof w.overallBand === 'number')
    .forEach((w) => skillScores.Writing.push(Math.round((w.overallBand / 9) * 100)));
  (db.speakingSubmissions || [])
    .filter((s) => s.userId === uid && typeof s.overallBand === 'number')
    .forEach((s) => skillScores.Speaking.push(Math.round((s.overallBand / 9) * 100)));

  const target = /8\.0|8\.5|C1|C2/i.test(user?.targetScore || '') ? 88 : 80;
  const skills = SKILLS.map((skill) => {
    const list = skillScores[skill].slice(-5);
    const avg = list.length ? Math.round(list.reduce((x, y) => x + y, 0) / list.length) : 0;
    return { skill, studentScore: avg, targetScore: target, band: list.length ? percentToBand(avg).toFixed(1) : '—', samples: list.length };
  });

  const bands = progression.map((p) => p.band);
  const percents = attempts.map(attemptPercent);

  return {
    attempts,
    progression,
    daily,
    skills,
    bestBand: bands.length ? Math.max(...bands) : null,
    latestBand: bands.length ? bands[bands.length - 1] : null,
    averagePercent: percents.length ? Math.round(percents.reduce((x, y) => x + y, 0) / percents.length) : null,
    totalMinutes: daily.reduce((acc, d) => acc + d.minutes, 0),
    streakDays: user?.streakDays ?? 0,
    xp: user?.xp ?? 0,
    hasData: attempts.length > 0 || skills.some((s) => s.samples > 0)
  };
}
