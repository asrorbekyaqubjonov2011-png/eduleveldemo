import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Shield, Clock, FileText, Activity } from 'lucide-react';
import { Glass, Pill } from '../ui';
import { Reveal } from '../ui/motion-primitives';
import { downloadCsv } from '../../lib/csvDownload';
import { Download } from 'lucide-react';

export const AuditLogViewer: React.FC = () => {
  const { db } = useApp();
  const [q, setQ] = useState('');
  const allLogs = db.auditLogs || [];
  const needle = q.trim().toLowerCase();
  const logs = needle ? allLogs.filter((l) => `${l.action} ${l.entity} ${l.details} ${l.actor}`.toLowerCase().includes(needle)) : allLogs;

  return (
    <div className="space-y-7">
      <Reveal>
        <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-line/80 bg-white/60 px-3.5 py-1.5 text-[10.5px] font-bold uppercase tracking-[0.16em] text-ink-muted backdrop-blur-md dark:border-white/10 dark:bg-white/[0.04] dark:text-stone-400">
              <Shield className="h-3.5 w-3.5 text-ember-600" />
              Xavfsizlik
            </span>
            <h1 className="mt-4 font-display text-[clamp(1.6rem,3.4vw,2.25rem)] font-extrabold leading-[1.06] tracking-[-0.035em] text-ink dark:text-white">
              Xavfsizlik va Administrator Audit Jurnali
            </h1>
            <p className="mt-2 text-[13.5px] leading-relaxed text-ink-muted dark:text-stone-400">
              Platformada amalga oshirilgan barcha tizim o‘zgarishlari, loginlar va yangilanishlar tarixi
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => downloadCsv(`audit-${new Date().toISOString().slice(0, 10)}.csv`, [['Vaqt', 'Kim', 'Harakat', 'Obyekt', 'Tafsilot'], ...logs.map((l) => [l.timestamp, l.actor, l.action, l.entity, l.details])])}
              disabled={logs.length === 0}
              className="inline-flex h-10 items-center gap-2 rounded-full border border-line bg-white/70 px-4 text-[13px] font-semibold text-ink disabled:opacity-40 dark:border-white/10 dark:bg-white/[0.05] dark:text-white"
            >
              <Download className="h-4 w-4" /> CSV
            </button>
            <div className="glass-1 flex items-center gap-2.5 rounded-full px-4 py-2.5">
              <Activity className="h-4 w-4 text-ember-600" />
              <span className="font-display text-[15px] font-extrabold tabular-nums tracking-tight text-ink dark:text-white">
                {logs.length}
              </span>
              <span className="text-[11px] font-medium text-ink-muted dark:text-stone-400">yozuv</span>
            </div>
          </div>
        </header>
      </Reveal>

      <Reveal delay={60}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Jurnaldan qidirish: harakat, kim, tafsilot…" aria-label="Jurnalni qidirish" className="w-full rounded-full border border-line bg-white/70 px-5 py-3 text-[13.5px] text-ink outline-none focus:border-ember-500/70 dark:border-white/10 dark:bg-white/[0.04] dark:text-white" />
      </Reveal>

      <Reveal delay={90}>
        <Glass level={2} className="overflow-hidden">
          {logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-ember-500/10 text-ember-600 dark:bg-ember-500/15 dark:text-ember-400">
                <FileText className="h-6 w-6" />
              </div>
              <p className="mt-4 font-display text-[15px] font-bold tracking-tight text-ink dark:text-white">
                Jurnal hozircha bo‘sh
              </p>
              <p className="mt-1 max-w-sm text-[12.5px] text-ink-muted dark:text-stone-400">
                Administrator amallari bajarilgach, ular shu yerda avtomatik qayd etiladi.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-left">
                <thead className="glass-1 sticky top-0 z-10">
                  <tr className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-muted dark:text-stone-400">
                    <th className="px-5 py-3.5 font-bold">Vaqt</th>
                    <th className="px-5 py-3.5 font-bold">Bajaruvchi</th>
                    <th className="px-5 py-3.5 font-bold">Amal Turi</th>
                    <th className="px-5 py-3.5 font-bold">Bo‘lim / Obyekt</th>
                    <th className="px-5 py-3.5 font-bold">Batafsil Tafsilot</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/70 dark:divide-white/5">
                  {logs.map(log => (
                    <tr
                      key={log.id}
                      className="group transition-colors duration-200 hover:bg-ember-500/[0.04] dark:hover:bg-white/[0.02]"
                    >
                      <td className="whitespace-nowrap px-5 py-4 font-mono text-[11.5px] tabular-nums text-ink-muted dark:text-stone-400">
                        <span className="inline-flex items-center gap-1.5">
                          <Clock className="h-3 w-3 opacity-60" />
                          {new Date(log.timestamp).toLocaleString('uz-UZ')}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-[12.5px] font-bold text-ink dark:text-white">
                        {log.actor}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4">
                        <Pill tone="ember" className="font-mono">
                          {log.action}
                        </Pill>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-[12.5px] font-medium text-ink-soft dark:text-stone-300">
                        {log.entity}
                      </td>
                      <td className="px-5 py-4 text-[12.5px] leading-relaxed text-ink-muted dark:text-stone-400">
                        {log.details}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Glass>
      </Reveal>
    </div>
  );
};
