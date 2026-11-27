/** Saves rows as a CSV file (opens fine in Excel and Google Sheets: UTF-8 with a byte-order mark). */
export function downloadCsv(filename: string, rows: Array<Array<string | number | null | undefined>>): void {
  const cell = (v: string | number | null | undefined) => {
    const s = String(v ?? '');
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const blob = new Blob(['﻿' + rows.map((r) => r.map(cell).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
