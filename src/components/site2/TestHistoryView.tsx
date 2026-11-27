import React from 'react';
import { useApp } from '../../context/AppContext';
import { Award, Clock, Calendar, CheckCircle2, FileDown } from 'lucide-react';
import { getRankByXp } from '../../lib/eduLogic';

export const TestHistoryView: React.FC = () => {
  const { db, currentUser } = useApp();
  const attempts = db.testAttempts.filter(a => a.userId === currentUser?.id);

  /** Opens the browser's print dialog for the report; "Save as PDF" there gives the file. */
  const printReport = () => {
    document.body.classList.add('printing-report');
    const done = () => {
      document.body.classList.remove('printing-report');
      window.removeEventListener('afterprint', done);
    };
    window.addEventListener('afterprint', done);
    window.print();
  };
  const best = attempts.length ? Math.max(...attempts.map((a) => Math.round((a.score / (a.maxScore || 1)) * 100))) : 0;
  const avg = attempts.length ? Math.round(attempts.reduce((s, a) => s + (a.score / (a.maxScore || 1)) * 100, 0) / attempts.length) : 0;

  return (
    <div className="bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-stone-900 dark:text-white">
          Testlar va Imtihonlar Tarixi
        </h2>
        <p className="text-xs sm:text-sm text-stone-500 mt-1">
          Barcha topshirilgan quiz va mock sinovlarining to‘liq hisoboti
        </p>
        </div>
        <button type="button" onClick={printReport} className="inline-flex h-10 items-center gap-2 rounded-full border border-stone-200 bg-white px-4 text-[13px] font-semibold text-stone-900 transition-colors hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-800 dark:text-white">
          <FileDown className="h-4 w-4" /> PDF hisobot
        </button>
      </div>

      <div id="print-report" style={{ fontFamily: 'sans-serif', color: '#12100e', padding: 24 }}>
        <h1 style={{ fontSize: 24, margin: 0 }}>Edu Level — o‘quv hisoboti</h1>
        <p style={{ margin: '4px 0 16px', color: '#555' }}>{new Date().toLocaleDateString('uz-UZ')}</p>
        <p><b>{currentUser?.name} {currentUser?.surname || ''}</b> · {currentUser?.phone}</p>
        <p>Daraja: {getRankByXp(currentUser?.xp || 0).title} · XP: {currentUser?.xp || 0} · Ketma-ket kunlar: {currentUser?.streakDays || 0} · Tugatilgan darslar: {currentUser?.completedLessons?.length || 0}</p>
        <p>Topshirilgan testlar: {attempts.length} · O‘rtacha natija: {avg}% · Eng yaxshi: {best}%</p>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 12, fontSize: 13 }}>
          <thead><tr>{['Test', 'Natija', 'To‘g‘ri javob', 'Vaqt', 'Sana'].map((h) => <th key={h} style={{ textAlign: 'left', borderBottom: '2px solid #12100e', padding: '6px 4px' }}>{h}</th>)}</tr></thead>
          <tbody>
            {attempts.slice(0, 40).map((a) => (
              <tr key={a.id}>
                <td style={{ padding: '6px 4px', borderBottom: '1px solid #ddd' }}>{a.testTitle}</td>
                <td style={{ padding: '6px 4px', borderBottom: '1px solid #ddd' }}>{a.score}/{a.maxScore} ({Math.round((a.score / (a.maxScore || 1)) * 100)}%)</td>
                <td style={{ padding: '6px 4px', borderBottom: '1px solid #ddd' }}>{a.correctCount}/{a.totalQuestions}</td>
                <td style={{ padding: '6px 4px', borderBottom: '1px solid #ddd' }}>{Math.round(a.timeSpentSeconds / 60)} daq</td>
                <td style={{ padding: '6px 4px', borderBottom: '1px solid #ddd' }}>{new Date(a.createdAt).toLocaleDateString('uz-UZ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p style={{ marginTop: 18, fontSize: 11, color: '#777' }}>AI baholari taxminiy amaliyot natijasi: rasmiy IELTS/CEFR bahosi emas.</p>
      </div>

      {attempts.length === 0 ? (
        <div className="text-center py-12 bg-stone-50 dark:bg-stone-800/40 rounded-2xl border border-stone-200/60 dark:border-stone-800">
          <Award className="w-10 h-10 text-stone-400 mx-auto mb-2" />
          <p className="text-xs sm:text-sm text-stone-500">
            Siz hozircha birorta ham test sinovini topshirmadingiz.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-stone-200 dark:border-stone-800 text-stone-400 text-xs">
                <th className="py-3 px-3 font-semibold">Test Nomi</th>
                <th className="py-3 px-3 font-semibold">Ball / Natija</th>
                <th className="py-3 px-3 font-semibold">To‘g‘ri Javoblar</th>
                <th className="py-3 px-3 font-semibold">Sarflangan Vaqt</th>
                <th className="py-3 px-3 font-semibold">Sana</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
              {attempts.map(a => {
                const percent = Math.round((a.score / a.maxScore) * 100);
                return (
                  <tr key={a.id} className="hover:bg-stone-50 dark:hover:bg-stone-800/40 transition-colors">
                    <td className="py-3.5 px-3 font-bold text-stone-900 dark:text-white">
                      {a.testTitle}
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="font-extrabold text-rose-600 dark:text-rose-400 tabular-nums">
                        {a.score} ball ({percent}%)
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-stone-600 dark:text-stone-300">
                      {a.correctCount} / {a.totalQuestions} ta
                    </td>
                    <td className="py-3.5 px-3 text-stone-500 tabular-nums">
                      {Math.round(a.timeSpentSeconds / 60)} daqiqa
                    </td>
                    <td className="py-3.5 px-3 text-stone-500 text-xs tabular-nums">
                      {new Date(a.createdAt).toLocaleDateString('uz-UZ')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
