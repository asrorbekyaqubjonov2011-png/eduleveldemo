export interface ParsedQuestion {
  prompt: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}

/** Splits CSV text into rows of cells. Handles quotes ("a, b"), doubled quotes, and `,` `;` or tab separators. */
export function parseCsv(text: string): string[][] {
  const clean = text.replace(/^﻿/, '').replace(/\r\n?/g, '\n');
  const firstLine = clean.split('\n', 1)[0] || '';
  const counts: Record<string, number> = { ',': 0, ';': 0, '\t': 0 };
  let q = false;
  for (const ch of firstLine) {
    if (ch === '"') q = !q;
    else if (!q && ch in counts) counts[ch] += 1;
  }
  const sep = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQ = false;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (inQ) {
      if (ch === '"' && clean[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') inQ = false;
      else cell += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === sep) {
      row.push(cell.trim());
      cell = '';
    } else if (ch === '\n') {
      row.push(cell.trim());
      if (row.some((c) => c)) rows.push(row);
      row = [];
      cell = '';
    } else cell += ch;
  }
  row.push(cell.trim());
  if (row.some((c) => c)) rows.push(row);
  return rows;
}

/**
 * Turns CSV rows into questions. Columns: savol, A, B, C, D, to‘g‘ri javob (A-D or 1-4), izoh (optional).
 * A header row (first cell "savol"/"question"/"prompt") is skipped. Bad rows are reported by line number.
 */
export function questionsFromCsv(text: string): { questions: ParsedQuestion[]; errors: string[] } {
  const rows = parseCsv(text);
  const questions: ParsedQuestion[] = [];
  const errors: string[] = [];
  rows.forEach((r, i) => {
    if (i === 0 && /^(savol|question|prompt)/i.test(r[0] || '')) return;
    const line = i + 1;
    const [prompt, a, b, c, d, correct, explanation = ''] = r;
    if (!prompt) return errors.push(`${line}-qator: savol matni yo‘q`);
    if (!a || !b) return errors.push(`${line}-qator: kamida A va B variantlari kerak`);
    const options = [a, b, c || '', d || ''].filter((o, idx) => idx < 2 || o);
    const letter = (correct || '').trim().toUpperCase();
    const idx = /^[A-D]$/.test(letter) ? letter.charCodeAt(0) - 65 : /^[1-4]$/.test(letter) ? Number(letter) - 1 : -1;
    if (idx < 0 || idx >= options.length) return errors.push(`${line}-qator: to‘g‘ri javob (A–D yoki 1–4) noto‘g‘ri`);
    questions.push({ prompt: prompt.slice(0, 600), options: options.map((o) => o.slice(0, 250)), correctAnswerIndex: idx, explanation: explanation.slice(0, 600) });
  });
  return { questions: questions.slice(0, 200), errors: errors.slice(0, 20) };
}

export const CSV_SAMPLE = 'savol,A,B,C,D,togri_javob,izoh\n"She ___ to school every day.",go,goes,going,gone,B,"Uchinchi shaxs birlik: -es"\n"They ___ football on Sundays.",plays,play,playing,played,B,"Ko‘plik: fe’l o‘zgarmaydi"\n';
