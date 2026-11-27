/**
 * Pure business logic for Edu Level platform
 * Used by 4-skill testing suites, SM-2 flashcard engine, and VIP gating
 */

/**
 * Official IELTS Raw Score to Band Conversion Table (Academic Reading)
 * Grounded in Section 8.3 of official specification
 */
export function calculateIeltsBand(rawReadingScore: number): number {
  if (rawReadingScore >= 39) return 9.0;
  if (rawReadingScore >= 37) return 8.5;
  if (rawReadingScore >= 35) return 8.0;
  if (rawReadingScore >= 33) return 7.5;
  if (rawReadingScore >= 30) return 7.0;
  if (rawReadingScore >= 27) return 6.5;
  if (rawReadingScore >= 23) return 6.0;
  if (rawReadingScore >= 19) return 5.5;
  if (rawReadingScore >= 15) return 5.0;
  if (rawReadingScore >= 13) return 4.5;
  if (rawReadingScore >= 10) return 4.0;
  return 3.5;
}

/**
 * Official IELTS Raw Score to Band Conversion Table (Listening)
 */
export function calculateIeltsListeningBand(rawListeningScore: number): number {
  if (rawListeningScore >= 39) return 9.0;
  if (rawListeningScore >= 37) return 8.5;
  if (rawListeningScore >= 35) return 8.0;
  if (rawListeningScore >= 32) return 7.5;
  if (rawListeningScore >= 30) return 7.0;
  if (rawListeningScore >= 26) return 6.5;
  if (rawListeningScore >= 23) return 6.0;
  if (rawListeningScore >= 18) return 5.5;
  if (rawListeningScore >= 15) return 5.0;
  if (rawListeningScore >= 10) return 4.5;
  return 4.0;
}

/**
 * Official IELTS Overall Band Calculation & Rounding Rule
 * 6.25 -> 6.5; 6.125 -> 6.0; 6.75 -> 7.0; 6.875 -> 7.0
 */
export function calculateIeltsOverallBand(scores: {
  listening: number;
  reading: number;
  writing: number;
  speaking: number;
}): { overallBand: number; rawAverage: number } {
  const rawAverage = (scores.listening + scores.reading + scores.writing + scores.speaking) / 4;
  const base = Math.floor(rawAverage);
  const remainder = rawAverage - base;

  let overallBand = base;
  if (remainder < 0.25) {
    overallBand = base;
  } else if (remainder < 0.75) {
    overallBand = base + 0.5;
  } else {
    overallBand = base + 1.0;
  }

  return {
    overallBand: Math.min(9.0, Math.max(0, overallBand)),
    rawAverage: Math.round(rawAverage * 100) / 100
  };
}

/**
 * Official Multilevel CEFR (Bilimni baholash agentligi - UzBMB) Scale
 * 65-75: C1 (Murakkab va abstrakt mavzularni yuqori darajada tushunish va ifodalash)
 * 51-64: B2 (Mustaqil va nisbatan murakkab muloqot)
 * 38-50: B1 (Tanish mavzularda mustaqil muloqot)
 * 0-37: B1 dan quyi (B1 talablari hali barqaror bajarilmagan)
 * 
 * Note: Raw score out of 35 is converted to 75-point standardized Rasch estimate.
 */
export function calculateMultilevelCefrScore(rawScore35: number): {
  rawScore: number;
  maxRawScore: number;
  standardizedScore75: number;
  cefrLevel: 'C1' | 'B2' | 'B1' | 'B1 dan quyi';
  levelDescription: string;
} {
  const clamped = Math.max(0, Math.min(35, rawScore35));
  let standardizedScore75 = 0;
  let cefrLevel: 'C1' | 'B2' | 'B1' | 'B1 dan quyi' = 'B1 dan quyi';
  let levelDescription = "B1 talablari hali barqaror bajarilmagan";

  if (clamped >= 31) {
    cefrLevel = 'C1';
    standardizedScore75 = Math.min(75, Math.round(65 + ((clamped - 31) / 4) * 10));
    levelDescription = "Murakkab va abstrakt mavzularni yuqori darajada tushunish va ifodalash";
  } else if (clamped >= 23) {
    cefrLevel = 'B2';
    standardizedScore75 = Math.round(51 + ((clamped - 23) / 7) * 13);
    levelDescription = "Mustaqil va nisbatan murakkab muloqot";
  } else if (clamped >= 15) {
    cefrLevel = 'B1';
    standardizedScore75 = Math.round(38 + ((clamped - 15) / 7) * 12);
    levelDescription = "Tanish mavzularda mustaqil muloqot";
  } else {
    cefrLevel = 'B1 dan quyi';
    standardizedScore75 = Math.round((clamped / 14) * 37);
    levelDescription = "B1 talablari hali barqaror bajarilmagan";
  }

  return {
    rawScore: clamped,
    maxRawScore: 35,
    standardizedScore75,
    cefrLevel,
    levelDescription
  };
}

export function calculateCefrLevel(scorePercent: number): 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2' {
  if (scorePercent >= 90) return 'C2';
  if (scorePercent >= 75) return 'C1';
  if (scorePercent >= 60) return 'B2';
  if (scorePercent >= 45) return 'B1';
  if (scorePercent >= 30) return 'A2';
  return 'A1';
}

/**
 * SuperMemo SM-2 Spaced Repetition Algorithm
 * grade: 0-5 (0=blackout, 3=pass with effort, 5=perfect recall)
 */
export function calculateNextSm2Review(
  prevInterval: number,
  prevRepetitions: number,
  prevEaseFactor: number,
  grade: number
): { interval: number; repetitions: number; easeFactor: number; nextDueDate: string } {
  const clampedGrade = Math.max(0, Math.min(5, grade));
  let repetitions = prevRepetitions;
  let interval = prevInterval;
  let easeFactor = prevEaseFactor + (0.1 - (5 - clampedGrade) * (0.08 + (5 - clampedGrade) * 0.02));

  if (easeFactor < 1.3) {
    easeFactor = 1.3;
  }

  if (clampedGrade >= 3) {
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
    repetitions += 1;
  } else {
    repetitions = 0;
    interval = 1;
  }

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + interval);

  return {
    interval,
    repetitions,
    easeFactor: Math.round(easeFactor * 100) / 100,
    nextDueDate: dueDate.toISOString(),
  };
}

export const VIP_HIERARCHY: Record<string, number> = {
  free: 0,
  start: 1,
  gold: 2,
  plus: 3,
  pro: 4,
  premium: 5,
  legend: 6,
  individual: 7,
};

export function checkVipFeatureAccess(userTier: string = 'free', requiredTier: string = 'start'): boolean {
  const userRank = VIP_HIERARCHY[userTier.toLowerCase()] ?? 0;
  const requiredRank = VIP_HIERARCHY[requiredTier.toLowerCase()] ?? 1;
  return userRank >= requiredRank;
}

export const COMMON_FILLERS = new Set([
  'um', 'uh', 'er', 'ah', 'like', 'you know', 'basically', 'actually', 'literally', 'so to speak'
]);

export function calculateWpmAndFillers(transcript: string, durationSeconds: number): {
  wpm: number;
  wordCount: number;
  fillerCount: number;
  fillerRate: number;
} {
  if (!transcript || durationSeconds <= 0) {
    return { wpm: 0, wordCount: 0, fillerCount: 0, fillerRate: 0 };
  }

  const words = transcript.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const minutes = durationSeconds / 60;
  const wpm = minutes > 0 ? Math.round(wordCount / minutes) : 0;

  let fillerCount = 0;
  for (const word of words) {
    if (COMMON_FILLERS.has(word)) {
      fillerCount++;
    }
  }

  const fillerRate = wordCount > 0 ? Math.round((fillerCount / wordCount) * 100) : 0;

  return {
    wpm,
    wordCount,
    fillerCount,
    fillerRate,
  };
}

export interface RankTierInfo {
  level: number;
  title: string;
  badge: string;
  minXp: number;
  color: string;
  ringColor: string;
}

export const ACADEMIC_RANKS: RankTierInfo[] = [
  { level: 1, title: 'Novice Learner', badge: '🥉 Bronze I', minXp: 0, color: 'text-amber-700', ringColor: 'ring-amber-700/60' },
  { level: 2, title: 'Apprentice Scholar', badge: '🥉 Bronze II', minXp: 500, color: 'text-amber-600', ringColor: 'ring-amber-600/60' },
  { level: 3, title: 'Rising Linguist', badge: '🥈 Silver I', minXp: 1000, color: 'text-slate-300', ringColor: 'ring-slate-300/60' },
  { level: 4, title: 'Fluent Speaker', badge: '🥈 Silver II', minXp: 2000, color: 'text-slate-200', ringColor: 'ring-slate-200/60' },
  { level: 5, title: 'Cambridge Polyglot', badge: '🥇 Gold I', minXp: 3500, color: 'text-yellow-400', ringColor: 'ring-yellow-400/60' },
  { level: 6, title: 'Academic Master', badge: '🥇 Gold II', minXp: 5500, color: 'text-amber-400', ringColor: 'ring-amber-400/60' },
  { level: 7, title: 'Diamond Elite', badge: '💎 Diamond', minXp: 8000, color: 'text-cyan-400', ringColor: 'ring-cyan-400/60' },
  { level: 8, title: 'Grandmaster C2', badge: '👑 Grandmaster', minXp: 12000, color: 'text-purple-400', ringColor: 'ring-purple-400/60' }
];

export function getRankByXp(xp: number = 0): RankTierInfo {
  for (let i = ACADEMIC_RANKS.length - 1; i >= 0; i--) {
    if (xp >= ACADEMIC_RANKS[i].minXp) {
      return ACADEMIC_RANKS[i];
    }
  }
  return ACADEMIC_RANKS[0];
}

export interface AvatarFrameInfo {
  id: string;
  name: string;
  costPoints: number;
  cssBorder: string;
  icon: string;
  description: string;
}

export const AVATAR_FRAMES: AvatarFrameInfo[] = [
  { id: 'default', name: 'Oddiy Hoshiya', costPoints: 0, cssBorder: 'border-2 border-stone-600', icon: '⭕', description: 'Standart akademik hoshiya' },
  { id: 'neon_cyan', name: 'Neon Cyber Cyan', costPoints: 300, cssBorder: 'border-2 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.8)] ring-2 ring-cyan-300', icon: '⚡', description: 'Kiber-fokus nurlanuvchi neon ramka' },
  { id: 'gold_flame', name: 'Oltin Alanga (Flame)', costPoints: 600, cssBorder: 'border-2 border-amber-400 shadow-[0_0_18px_rgba(245,158,11,0.8)] ring-2 ring-amber-300 animate-pulse', icon: '🔥', description: 'Uzluksiz intizom va streak egalari uchun' },
  { id: 'royal_violet', name: 'Qirollik Binafshasi', costPoints: 900, cssBorder: 'border-2 border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.85)] ring-2 ring-indigo-400', icon: '👑', description: 'C2 darajali intellektual xoslik' },
  { id: 'diamond_aurora', name: 'Olmos Aurora (Diamond)', costPoints: 1500, cssBorder: 'border-2 border-emerald-400 shadow-[0_0_25px_rgba(52,211,153,0.9)] ring-2 ring-teal-300', icon: '💎', description: 'Eng yuqori akademik test yutuqlari' }
];

export function getFrameBorderClass(frameId?: string): string {
  const frame = AVATAR_FRAMES.find(f => f.id === frameId);
  return frame ? frame.cssBorder : 'border-2 border-stone-600';
}

