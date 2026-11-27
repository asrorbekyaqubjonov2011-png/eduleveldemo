'use client';
import React, { useCallback, useState } from 'react';
import { tusUpload, type BunnyUploadInit } from '../../lib/bunnyTus';
import { cn } from '../ui/styles';

type Video = { guid: string; title: string; lengthSec: number; status: number; encodeProgress: number };

const STATUS_UZ: Record<number, string> = { 0: 'yaratildi', 1: 'yuklandi', 2: 'qayta ishlanmoqda', 3: 'kodlanmoqda', 4: 'tayyor', 5: 'xato', 6: 'yuklash uzildi' };
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

/**
 * Owner's Bunny library inside the lesson editor: pick an existing video or upload a new one. The upload goes straight
 * from the browser to Bunny with a one-video signature from the server; no API key is ever shown.
 */
export const BunnyVideoPicker: React.FC<{ current: string; onPick: (guid: string) => void }> = ({ current, onPick }) => {
  const [open, setOpen] = useState(false);
  const [videos, setVideos] = useState<Video[]>([]);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [title, setTitle] = useState('');

  const load = useCallback(async () => {
    setBusy(true);
    setMsg('');
    try {
      const res = await fetch('/api/owner/bunny/videos', { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.message || 'Bunny ro‘yxatini olib bo‘lmadi.');
      setVideos(data.items || []);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Xatolik.');
    } finally {
      setBusy(false);
    }
  }, []);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) void load();
  };

  const upload = async (file: File | undefined) => {
    if (!file) return;
    const name = title.trim() || file.name.replace(/\.[^.]+$/, '');
    setBusy(true);
    setProgress(0);
    setMsg('');
    try {
      const res = await fetch('/api/owner/bunny/upload', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: name }) });
      const init = (await res.json().catch(() => ({}))) as BunnyUploadInit & { success?: boolean; message?: string };
      if (!res.ok || !init.success) throw new Error(init.message || 'Yuklashni boshlab bo‘lmadi.');
      await tusUpload(file, name, init, setProgress);
      onPick(init.videoId);
      setMsg('Yuklandi va darsga ulandi. Bunny videoni qayta ishlashi bir necha daqiqa olishi mumkin.');
      setTitle('');
      void load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Yuklash xatosi.');
    } finally {
      setBusy(false);
      setProgress(null);
    }
  };

  return (
    <div className="mt-2">
      <button type="button" onClick={toggle} aria-expanded={open} className="min-h-[44px] rounded-xl border border-black/10 px-4 text-[13px] font-semibold dark:border-white/15">
        {open ? 'Bunny kutubxonasini yopish' : 'Bunny kutubxonasidan tanlash yoki yangi video yuklash'}
      </button>
      {open ? (
        <div className="mt-3 space-y-3 rounded-2xl border border-black/10 p-3 dark:border-white/10">
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-[12px] text-ink-muted">
              Yangi video nomi
              <input aria-label="Yangi video nomi" value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 block min-h-[44px] w-56 rounded-xl border border-black/10 bg-white px-3 text-[14px] text-ink dark:border-white/15 dark:bg-stone-900 dark:text-white" />
            </label>
            <label className={cn('inline-flex min-h-[44px] cursor-pointer items-center rounded-xl bg-ember-500 px-4 text-[13px] font-semibold text-white', busy && 'pointer-events-none opacity-50')}>
              Fayl tanlash va yuklash
              <input type="file" accept="video/*" className="sr-only" aria-label="Video faylni tanlash" disabled={busy} onChange={(e) => upload(e.target.files?.[0])} />
            </label>
            {progress !== null ? <span role="status" className="text-[13px] font-semibold">{progress}%</span> : null}
          </div>
          {msg ? <p role="status" className="text-[12.5px] text-ink-muted">{msg}</p> : null}
          <ul className="max-h-64 space-y-1.5 overflow-y-auto">
            {videos.map((v) => (
              <li key={v.guid} className="flex items-center justify-between gap-2 rounded-xl bg-black/[0.03] px-3 py-2 text-[13px] dark:bg-white/[0.04]">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{v.title || v.guid}</p>
                  <p className="text-[11.5px] text-ink-muted">{STATUS_UZ[v.status] ?? 'noma’lum'}{v.status === 3 ? ` ${v.encodeProgress}%` : ''}{v.lengthSec ? ` · ${fmt(v.lengthSec)}` : ''}</p>
                </div>
                <button type="button" onClick={() => onPick(v.guid)} disabled={v.guid === current} className="min-h-[40px] shrink-0 rounded-lg border border-ember-500 px-3 text-[12.5px] font-semibold text-ember-700 disabled:opacity-40 dark:text-ember-300">{v.guid === current ? 'Tanlangan' : 'Tanlash'}</button>
              </li>
            ))}
            {!videos.length && !busy && !msg ? <li className="text-[12.5px] text-ink-muted">Kutubxonada video yo‘q.</li> : null}
          </ul>
        </div>
      ) : null}
    </div>
  );
};
