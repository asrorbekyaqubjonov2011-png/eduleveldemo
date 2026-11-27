/**
 * Edubek's tools that need no AI: an IELTS band calculator, a word counter for Writing, and small study data.
 * Pure functions, so they can be tested without a browser.
 */

/**
 * IELTS overall band: the average of the four skills, rounded to the nearest half band.
 * A fraction of .25 rounds up to .5 and .75 rounds up to the next whole band.
 */
export function overallBand(reading: number, listening: number, writing: number, speaking: number): number | null {
  const parts = [reading, listening, writing, speaking];
  if (parts.some((p) => !Number.isFinite(p) || p < 0 || p > 9)) return null;
  const avg = Math.round((parts.reduce((a, b) => a + b, 0) / 4) * 100) / 100;
  const whole = Math.floor(avg);
  const frac = Math.round((avg - whole) * 100) / 100;
  if (frac < 0.25) return whole;
  if (frac < 0.75) return whole + 0.5;
  return whole + 1;
}

/** Valid IELTS band values are whole or half bands (0–9). */
export function isBandStep(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= 9 && Math.round(value * 2) === value * 2;
}

/** Words in a text: sequences of letters, digits and apostrophes. */
export function countWords(text: string): number {
  const matches = text.trim().match(/[\p{L}\p{N}’'`-]+/gu);
  return matches ? matches.length : 0;
}

/** Minimum words for each Writing task (IELTS). */
export const WRITING_TARGET = { task1: 150, task2: 250 } as const;

/** Seconds for each Writing task and for the whole paper (IELTS timings). */
export const WRITING_SECONDS = { task1: 20 * 60, task2: 40 * 60, full: 60 * 60 } as const;

/** Speaking Part 2: one minute to prepare, then up to two minutes to speak. */
export const SPEAKING_SECONDS = { prep: 60, speak: 120 } as const;

/** Minimal pairs: sounds students often confuse. The browser reads them aloud. */
export const MINIMAL_PAIRS: Array<[string, string, string]> = [
  ['ship', 'sheep', 'short i / long ee'],
  ['bit', 'beat', 'short i / long ee'],
  ['full', 'fool', 'short u / long oo'],
  ['cot', 'caught', 'short o / aw'],
  ['think', 'sink', 'th / s'],
  ['very', 'berry', 'v / b'],
  ['light', 'right', 'l / r'],
  ['cat', 'cut', 'short a / short u']
];

/** Short daily words for the study card: English, Uzbek, an example. */
export const DAILY_WORDS: Array<{ en: string; uz: string; example: string }> = [
  { en: 'reliable', uz: 'ishonchli', example: 'She is a reliable colleague.' },
  { en: 'approach', uz: 'yondashuv', example: 'We need a new approach to this problem.' },
  { en: 'significant', uz: 'sezilarli', example: 'There was a significant increase in sales.' },
  { en: 'hesitate', uz: 'ikkilanmoq', example: 'Do not hesitate to ask questions.' },
  { en: 'evidence', uz: 'dalil', example: 'The report provides strong evidence.' },
  { en: 'sustainable', uz: 'barqaror', example: 'Cities need sustainable transport.' },
  { en: 'benefit', uz: 'foyda', example: 'Reading has many benefits.' },
  { en: 'criticise', uz: 'tanqid qilmoq', example: 'Critics criticised the new plan.' }
];

/** Speaking Part 2 cue cards: the student speaks about the topic for two minutes. */
export const CUE_TOPICS: string[] = [
  'Describe a place you would like to visit. Say where it is, what you would do there and why.',
  'Describe a person who has influenced you. Say who they are, how you met and what they taught you.',
  'Describe a book or film that you enjoyed. Say what it was about and why you liked it.',
  'Describe a skill you would like to learn. Say why, how you would learn it and how it would help you.'
];
