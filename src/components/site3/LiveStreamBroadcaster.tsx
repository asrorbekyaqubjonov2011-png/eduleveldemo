import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Radio,
  ExternalLink,
  CheckCircle2,
  Tv,
  Power,
  RadioTower,
  Link2,
  Users
} from 'lucide-react';
import { Glass, Button, Pill } from '../ui';
import { Reveal } from '../ui/motion-primitives';
import { field, label, cn } from '../ui/styles';

export const LiveStreamBroadcaster: React.FC = () => {
  const { db, broadcastLiveStream } = useApp();
  const live = db.liveStream || {
    isLive: false,
    title: '',
    telegramChannel: 'https://t.me/edulevel',
    streamUrl: ''
  };

  const [isLive, setIsLive] = useState(live.isLive);
  const [title, setTitle] = useState(live.title || 'IELTS Mock Test Masterclass & Live Q&A');
  const [telegramChannel, setTelegramChannel] = useState(live.telegramChannel || 'https://t.me/edulevel');
  const [streamUrl, setStreamUrl] = useState(live.streamUrl || 'https://t.me/edulevel?livestream');
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);

  const handleToggleBroadcast = async (newLiveStatus: boolean) => {
    setSaving(true);
    try {
      setIsLive(newLiveStatus);
      await broadcastLiveStream(newLiveStatus, title, telegramChannel, streamUrl);
      setSuccessMsg(true);
      setTimeout(() => setSuccessMsg(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await broadcastLiveStream(isLive, title, telegramChannel, streamUrl);
      setSuccessMsg(true);
      setTimeout(() => setSuccessMsg(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-7">
      {/* ---------------------------------------------------------------- */}
      {/* HEADER + STATUS                                                   */}
      {/* ---------------------------------------------------------------- */}
      <Reveal>
        <section className="relative overflow-hidden rounded-[2rem] border border-line/70 bg-paper-raised/70 p-5 shadow-[0_24px_48px_-28px_rgba(18,16,14,0.18)] backdrop-blur-xl sm:p-7 dark:border-white/10 dark:bg-white/[0.035]">
          <div
            className={cn(
              'pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full soft-blob transition-opacity duration-700',
              isLive
                ? 'bg-gradient-to-br from-ember-500/35 via-ember-400/20 to-transparent'
                : 'bg-gradient-to-br from-sun-400/25 to-transparent'
            )}
          />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent dark:via-white/15" />

          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-xl">
              <Pill tone={isLive ? 'ember' : 'neutral'}>
                <Radio className={cn('h-3 w-3', isLive && 'animate-pulse')} />
                Telegram Jonli Efir Studiyasi
              </Pill>
              <h1 className="mt-4 font-display text-[clamp(1.5rem,3vw,2rem)] font-extrabold leading-[1.08] tracking-[-0.035em] text-ink dark:text-white">
                O‘quvchilar Uchun Jonli Efirni E’lon Qilish
              </h1>
              <p className="mt-2 text-[13px] leading-relaxed text-ink-muted dark:text-stone-400">
                Efirni yoqsangiz, barcha o‘quvchilarning Boshqaruv Panelida (Dashboard) qizil yonib turuvchi jonli
                efir baneri va Telegramga o‘tish tugmasi paydo bo‘ladi.
              </p>
            </div>

            {/* Live status control */}
            <div className="glass-2 shrink-0 rounded-[1.5rem] p-4">
              <div className="mb-3 flex items-center gap-2">
                <span
                  className={cn(
                    'h-2 w-2 rounded-full',
                    isLive ? 'animate-pulse bg-ember-500 shadow-[0_0_0_4px_rgba(255,138,43,0.18)]' : 'bg-ink/25 dark:bg-white/25'
                  )}
                />
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-muted dark:text-stone-400">
                  Efir Holati
                </span>
              </div>
              <div
                className={cn(
                  'font-display text-[15px] font-extrabold tracking-[-0.01em]',
                  isLive ? 'text-ember-700 dark:text-ember-300' : 'text-ink-muted dark:text-stone-400'
                )}
              >
                {isLive ? 'EFIR YOQILGAN' : 'EFIR O‘CHIRILGAN'}
              </div>
              <Button
                variant={isLive ? 'primary' : 'ember'}
                size="sm"
                className="mt-3 w-full"
                onClick={() => handleToggleBroadcast(!isLive)}
                disabled={saving}
                iconLeft={<Power className="h-3.5 w-3.5" />}
              >
                {isLive ? 'Efirni To‘xtatish' : 'Efirni Boshlash'}
              </Button>
            </div>
          </div>
        </section>
      </Reveal>

      {successMsg && (
        <Reveal>
          <div className="flex items-center gap-2.5 rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.08] px-4 py-3 text-[12.5px] font-semibold text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>Efir ma’lumotlari muvaffaqiyatli saqlandi va barcha o‘quvchilarga yuborildi!</span>
          </div>
        </Reveal>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* CONFIG FORM                                                       */}
      {/* ---------------------------------------------------------------- */}
      <Reveal delay={90}>
        <Glass level={2} className="p-5 sm:p-7">
          <form onSubmit={handleSaveInfo} className="space-y-6">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-ember-500/10 text-ember-600 dark:bg-ember-500/15 dark:text-ember-400">
                <Tv className="h-4 w-4" />
              </span>
              <h2 className="font-display text-[15px] font-extrabold tracking-[-0.02em] text-ink dark:text-white">
                Jonli Efir Tafsilotlari
              </h2>
            </div>

            <div>
              <label className={label}>Efir Mavzusi / Sarlavhasi</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Masalan: IELTS Writing Task 2 Masterclass & 8.5 Model Insholar Tahlili"
                className={field}
                required
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={label}>Telegram Kanal Havolasi</label>
                <div className="relative">
                  <Link2 className="pointer-events-none absolute left-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-muted/60 dark:text-stone-500" />
                  <input
                    type="text"
                    value={telegramChannel}
                    onChange={e => setTelegramChannel(e.target.value)}
                    placeholder="https://t.me/edulevel"
                    className={cn(field, 'pl-10 font-mono text-[12.5px]')}
                  />
                </div>
              </div>

              <div>
                <label className={label}>To‘g‘ridan-to‘g‘ri Stream / Video Havola</label>
                <div className="relative">
                  <Link2 className="pointer-events-none absolute left-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-muted/60 dark:text-stone-500" />
                  <input
                    type="text"
                    value={streamUrl}
                    onChange={e => setStreamUrl(e.target.value)}
                    placeholder="https://t.me/edulevel?livestream yoki YouTube live"
                    className={cn(field, 'pl-10 font-mono text-[12.5px]')}
                  />
                </div>
              </div>
            </div>

            {/* Live preview */}
            <div className="rounded-[1.5rem] border border-line/60 bg-white/40 p-4 dark:border-white/[0.06] dark:bg-white/[0.02]">
              <span className="mb-3 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-ink-muted dark:text-stone-400">
                <Users className="h-3 w-3" />
                Talaba panelida ko‘rinishi (Jonli Preview)
              </span>
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#2a1208] via-[#3b1509] to-[#1d1008] p-4 text-white shadow-[0_18px_40px_-20px_rgba(201,84,10,0.7)]">
                <div className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-ember-500/30 soft-blob" />
                <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 backdrop-blur-md">
                      <Radio className="h-4 w-4 text-ember-300" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-ember-500 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.1em] text-white">
                          Jonli Efir
                        </span>
                        <span className="truncate text-[11.5px] font-medium text-white/70">Muxtorov Jasurbek</span>
                      </div>
                      <div className="mt-1 truncate text-[12.5px] font-bold">{title || 'Efir sarlavhasi'}</div>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5 rounded-full bg-white/95 px-3.5 py-1.5 text-[11.5px] font-bold text-[#c9540a]">
                    <span>Telegramda Ulanish</span>
                    <ExternalLink className="h-3 w-3" />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end border-t border-line/60 pt-5 dark:border-white/[0.06]">
              <Button variant="primary" size="md" type="submit" disabled={saving} iconLeft={<RadioTower className="h-4 w-4" />}>
                {saving ? 'Saqlanmoqda...' : 'Ma’lumotlarni Saqlash'}
              </Button>
            </div>
          </form>
        </Glass>
      </Reveal>
    </div>
  );
};
