'use client';
import React, { useEffect, useState } from 'react';
import { CheckCircle2, Circle, Loader2 } from 'lucide-react';
import { api } from '../../services/api';
import { useApp } from '../../context/AppContext';
import { lessonBotCode } from '../../lib/telegramLessons';

type Status = {
  tokenSet: boolean;
  secretSet: boolean;
  username: string;
  cardSet: boolean;
  webhookUrl: string;
  depositsOn: boolean;
  lessonsReady: number;
  lessonsWithCode: number;
  subscribers?: number;
  referrals?: { invited: number; qualified: number; bundles: number };
};

/**
 * Owner's checklist for the Telegram deposit bot. Each item is ready (✓) or still to do; no secret value is shown.
 * Steps the server cannot see (creating the bot in @BotFather) are listed as instructions.
 */
export const TelegramSetup: React.FC = () => {
  const [st, setSt] = useState<Status | null>(null);
  const [busy, setBusy] = useState<'set' | 'info' | 'broadcast' | 'channel' | null>(null);
  const { db, updateBotSettings } = useApp();
  const [autoAnnounce, setAutoAnnounce] = useState<boolean>(!!db.telegramBotSettings?.autoAnnounce);
  const [bonusLesson, setBonusLesson] = useState<string>(db.telegramBotSettings?.channelLessonId || '');
  const [savedNote, setSavedNote] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [lessonPick, setLessonPick] = useState('');
  const [progress, setProgress] = useState<string | null>(null);
  const channel = (db.telegramBotSettings?.channelUsername || '').replace(/^@/, '');
  const publishedLessons = db.lessons.filter((l) => l.isPublished !== false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = async () => {
    const r = await api.telegramStatus().catch(() => null);
    if (r?.success) setSt(r);
  };
  useEffect(() => {
    void load();
  }, []);

  const run = async (action: 'set' | 'info') => {
    setBusy(action);
    setMsg(null);
    const r = await api.telegramWebhook(action).catch(() => null);
    setBusy(null);
    if (!r) return setMsg({ ok: false, text: 'Server bilan bog‘lanib bo‘lmadi.' });
    if (!r.success) return setMsg({ ok: false, text: r.message || 'Amal bajarilmadi.' });
    if (action === 'set') setMsg({ ok: true, text: `Bot ulandi: ${r.url}` });
    else setMsg({ ok: true, text: `Webhook: ${r.info?.url || 'ulanmagan'}${r.info?.lastError ? ` · xato: ${r.info.lastError}` : ''}` });
    void load();
  };

  /** Sends to every subscriber in batches of 200 so no single request runs long. */
  const sendToSubscribers = async () => {
    const body = text.trim();
    if (!body) return;
    if (!window.confirm(`${st?.subscribers ?? 0} ta obunachiga xabar yuboriladi. Davom etasizmi?`)) return;
    setBusy('broadcast');
    setMsg(null);
    let offset = 0;
    let sent = 0;
    let failed = 0;
    try {
      for (let batch = 0; batch < 500; batch++) {
        const r = await api.telegramBroadcast({ target: 'subscribers', text: body, offset });
        if (!r?.success) return setMsg({ ok: false, text: r?.message || 'Yuborib bo‘lmadi' });
        sent += r.sent;
        failed += r.failed;
        setProgress(`Yuborildi: ${sent} · xato: ${failed}`);
        if (r.done || r.nextOffset == null) break;
        offset = r.nextOffset;
      }
      setMsg({ ok: true, text: `Tayyor. Yuborildi: ${sent}, yetib bormadi: ${failed}` });
    } catch {
      setMsg({ ok: false, text: 'Server bilan bog‘lanib bo‘lmadi.' });
    } finally {
      setBusy(null);
      setProgress(null);
    }
  };

  const sendToChannel = async () => {
    if (!text.trim()) return;
    setBusy('channel');
    setMsg(null);
    const r = await api.telegramBroadcast({ target: 'channel', text: text.trim() }).catch(() => null);
    setBusy(null);
    setMsg(r?.success ? { ok: true, text: r.message } : { ok: false, text: r?.message || 'Kanalga yuborib bo‘lmadi' });
  };

  const announceLesson = async () => {
    if (!lessonPick) return;
    setBusy('channel');
    setMsg(null);
    const r = await api.telegramBroadcast({ target: 'channel_lesson', lessonId: lessonPick }).catch(() => null);
    setBusy(null);
    setMsg(r?.success ? { ok: true, text: r.message } : { ok: false, text: r?.message || 'Kanalga e’lon qilib bo‘lmadi' });
  };

  /** One channel action: a pinned post, a Q&A post, a quiz poll, the digest, or the reminders now. */
  const runAction = async (target: 'channel_pin' | 'channel_qa' | 'channel_quiz' | 'digest' | 'reminders') => {
    setBusy('channel');
    setMsg(null);
    const r = await api.telegramBroadcast({ target }).catch(() => null);
    setBusy(null);
    const done = target === 'reminders' && r?.success ? `Eslatmalar: ${r.sent} ta yuborildi, ${r.skipped} ta o‘tkazib yuborildi.` : r?.message || 'Bajarildi';
    setMsg(r?.success ? { ok: true, text: done } : { ok: false, text: r?.message || 'Bajarib bo‘lmadi' });
  };

  const saveChannelSettings = async () => {
    setSavedNote(null);
    await updateBotSettings({ autoAnnounce, channelLessonId: bonusLesson || undefined } as any);
    setSavedNote('Saqlandi');
  };

  const row = (ok: boolean, text: string) => (
    <li className="flex items-start gap-2 text-[13px]">
      {ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> : <Circle className="mt-0.5 h-4 w-4 shrink-0 text-ink-muted" />}
      <span className={ok ? 'text-ink dark:text-white' : 'text-ink-muted dark:text-stone-400'}>{text}</span>
    </li>
  );

  return (
    <div className="mt-4 space-y-3 rounded-2xl border border-line/70 p-4 dark:border-white/10">
      <p className="text-[13px] font-semibold text-ink dark:text-white">Telegram bot ulanishi</p>
      <ol className="list-decimal space-y-1 pl-5 text-[12px] text-ink-muted dark:text-stone-400">
        <li>Telegram’da @BotFather ga yozing, /newbot buyrug‘i bilan bot yarating va tokenni oling.</li>
        <li>Render → Environment: <b>TELEGRAM_BOT_TOKEN</b> ga tokenni, <b>TELEGRAM_WEBHOOK_SECRET</b> ga 16+ belgili tasodifiy matnni yozing. Saqlang (Render qayta deploy qiladi).</li>
        <li>Quyidagi ro‘yxatda hamma narsa ✓ bo‘lsa, “Botni ulash” ni bosing.</li>
      </ol>
      {st ? (
        <ul className="space-y-1.5">
          {row(st.tokenSet, 'TELEGRAM_BOT_TOKEN Render’da kiritilgan')}
          {row(st.secretSet, 'TELEGRAM_WEBHOOK_SECRET kiritilgan (16+ belgi)')}
          {row(!!st.username, `Bot username bot sozlamalarida${st.username ? `: @${st.username}` : ' yo‘q'}`)}
          {row(st.cardSet, 'Karta raqami kiritilgan')}
          {row(st.depositsOn, 'Depozit qabul qilish yoqilgan')}
          {row(st.lessonsReady > 0, `Botdan ochiladigan darslar: ${st.lessonsReady} ta (kodli: ${st.lessonsWithCode})`)}
        </ul>
      ) : (
        <p className="text-[12px] text-ink-muted">Holat yuklanmoqda…</p>
      )}
      {st ? <p className="break-all text-[12px] text-ink-muted dark:text-stone-400">Webhook manzili: {st.webhookUrl}</p> : null}
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" disabled={!!busy} onClick={() => run('set')} className="h-9 rounded-full bg-ink px-4 text-[12.5px] font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-ink">
          {busy === 'set' ? <Loader2 className="inline h-4 w-4 animate-spin" /> : 'Botni ulash'}
        </button>
        <button type="button" disabled={!!busy} onClick={() => run('info')} className="h-9 rounded-full border border-line px-4 text-[12.5px] font-semibold text-ink disabled:opacity-50 dark:border-white/10 dark:text-white">
          {busy === 'info' ? <Loader2 className="inline h-4 w-4 animate-spin" /> : 'Holatni tekshirish'}
        </button>
      </div>
      {msg ? <p role="status" className={`text-[12.5px] font-semibold ${msg.ok ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}`}>{msg.text}</p> : null}
      <div className="space-y-2.5 border-t border-line/70 pt-4 dark:border-white/10">
        <p className="text-[13px] font-semibold text-ink dark:text-white">Xabar tarqatish</p>
        <p className="text-[12px] text-ink-muted dark:text-stone-400">
          Obunachilar: <b>{st?.subscribers ?? 0}</b> · Kanal: {channel ? <b>@{channel}</b> : 'ulanmagan (Depozitlar → bot sozlamalari)'}
        </p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          maxLength={3500}
          placeholder="Xabar matni, masalan: Yangi test ochildi. Botda /darslar yozing."
          className="w-full rounded-2xl border border-line/80 bg-white/70 px-4 py-3 text-[13px] text-ink outline-none focus:border-ember-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-white"
        />
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={!!busy || !text.trim()} onClick={sendToSubscribers} className="h-9 rounded-full bg-ink px-4 text-[12.5px] font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-ink">
            {busy === 'broadcast' ? <Loader2 className="inline h-4 w-4 animate-spin" /> : 'Obunachilarga yuborish'}
          </button>
          <button type="button" disabled={!!busy || !text.trim() || !channel} onClick={sendToChannel} className="h-9 rounded-full border border-line px-4 text-[12.5px] font-semibold text-ink disabled:opacity-50 dark:border-white/10 dark:text-white">
            Kanalga yuborish
          </button>
        </div>
        {progress ? <p className="text-[12px] font-semibold text-ember-700 dark:text-ember-300">{progress}</p> : null}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <select value={lessonPick} onChange={(e) => setLessonPick(e.target.value)} className="h-9 max-w-full rounded-full border border-line/80 bg-white/70 px-3 text-[12.5px] text-ink dark:border-white/10 dark:bg-white/[0.04] dark:text-white">
            <option value="">Darsni tanlang</option>
            {publishedLessons.map((l) => (
              <option key={l.id} value={l.id}>{lessonBotCode(l)} · {l.title}</option>
            ))}
          </select>
          <button type="button" disabled={!!busy || !lessonPick || !channel} onClick={announceLesson} className="h-9 rounded-full border border-line px-4 text-[12.5px] font-semibold text-ink disabled:opacity-50 dark:border-white/10 dark:text-white">
            Darsni kanalga e’lon qilish
          </button>
        </div>
      </div>
      <div className="space-y-2.5 border-t border-line/70 pt-4 dark:border-white/10">
        <p className="text-[13px] font-semibold text-ink dark:text-white">Kanal va o‘sish</p>
        {st?.referrals ? (
          <p className="text-[12px] text-ink-muted dark:text-stone-400">
            Takliflar: <b>{st.referrals.invited}</b> · malakali (darsni tugatgan): <b>{st.referrals.qualified}</b> · berilgan mukofot: <b>{st.referrals.bundles}</b> marta
          </p>
        ) : null}
        <label className="flex items-center gap-2 text-[12.5px] text-ink dark:text-white">
          <input type="checkbox" checked={autoAnnounce} onChange={(e) => setAutoAnnounce(e.target.checked)} />
          Yangi dars nashr qilinganda kanalga avtomatik e’lon qilinsin
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <select value={bonusLesson} onChange={(e) => setBonusLesson(e.target.value)} className="h-9 max-w-full rounded-full border border-line/80 bg-white/70 px-3 text-[12.5px] text-ink dark:border-white/10 dark:bg-white/[0.04] dark:text-white">
            <option value="">Kanal obunachilari uchun bepul dars: yo‘q</option>
            {publishedLessons.map((l) => (
              <option key={l.id} value={l.id}>{lessonBotCode(l)} · {l.title}</option>
            ))}
          </select>
          <button type="button" disabled={!!busy} onClick={saveChannelSettings} className="h-9 rounded-full bg-ink px-4 text-[12.5px] font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-ink">Sozlamalarni saqlash</button>
          {savedNote ? <span className="text-[12px] font-semibold text-emerald-700 dark:text-emerald-300">{savedNote}</span> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={!!busy || !channel} onClick={() => runAction('channel_pin')} className="h-9 rounded-full border border-line px-4 text-[12.5px] font-semibold text-ink disabled:opacity-50 dark:border-white/10 dark:text-white">Kanalga botni eslatish (mahkamlash)</button>
          <button type="button" disabled={!!busy || !channel} onClick={() => runAction('channel_qa')} className="h-9 rounded-full border border-line px-4 text-[12.5px] font-semibold text-ink disabled:opacity-50 dark:border-white/10 dark:text-white">Kanalga savol-javob posti</button>
          <button type="button" disabled={!!busy || !channel} onClick={() => runAction('channel_quiz')} className="h-9 rounded-full border border-line px-4 text-[12.5px] font-semibold text-ink disabled:opacity-50 dark:border-white/10 dark:text-white">Kanalga test (so‘rovnoma)</button>
          <button type="button" disabled={!!busy || !channel} onClick={() => runAction('digest')} className="h-9 rounded-full border border-line px-4 text-[12.5px] font-semibold text-ink disabled:opacity-50 dark:border-white/10 dark:text-white">Haftalik xulosani yuborish</button>
          <button type="button" disabled={!!busy} onClick={() => runAction('reminders')} className="h-9 rounded-full border border-line px-4 text-[12.5px] font-semibold text-ink disabled:opacity-50 dark:border-white/10 dark:text-white">Kunlik eslatmalarni hozir yuborish</button>
        </div>
        <div className="flex flex-wrap items-center gap-4 pt-1">
          <img src="/api/telegram/qr" alt="Botning QR kodi" width={120} height={120} className="rounded-xl bg-white p-2" />
          <p className="max-w-sm text-[12px] leading-relaxed text-ink-muted dark:text-stone-400">Bot QR kodi: posterlar, kanal va QR kartochkalar uchun. Skanerlansa bot ochiladi.</p>
        </div>
      </div>
    </div>
  );
};
