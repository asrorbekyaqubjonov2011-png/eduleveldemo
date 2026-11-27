'use client';
import React, { useEffect, useRef, useState } from 'react';
import { Play, Film, RotateCcw, AlertTriangle } from 'lucide-react';
import { isPlaceholderVideo, toEmbedUrl } from '../../lib/video';
import { api } from '../../services/api';
import { cn } from '../ui/styles';

interface LessonVideoProps {
  url?: string;
  title: string;
  poster?: string;
  className?: string;
  /** Text shown when the lesson has no real video yet */
  emptyText?: string;
  /** Enables resume + progress saving for signed-in students */
  lessonId?: string;
  resumeFrom?: number;
  subtitleUrl?: string;
  /** Bunny Stream video id. When set, the signed playback URL comes from POST /api/lessons/playback (server checks access). */
  bunnyVideoId?: string;
  onEnded?: () => void;
}

const YT_RE = /(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{6,})/;
const isDirectFile = (u: string) => /\.(mp4|webm|ogg|ogv|m4v|mov)(\?|#|$)/i.test(u) || u.startsWith('/uploads/');

let ytApiPromise: Promise<any> | null = null;
function loadYouTubeApi(): Promise<any> {
  if (typeof window === 'undefined') return Promise.reject();
  const w = window as any;
  if (w.YT?.Player) return Promise.resolve(w.YT);
  if (!ytApiPromise) {
    ytApiPromise = new Promise((resolve, reject) => {
      const prev = w.onYouTubeIframeAPIReady;
      w.onYouTubeIframeAPIReady = () => {
        prev?.();
        resolve(w.YT);
      };
      const s = document.createElement('script');
      s.src = 'https://www.youtube.com/iframe_api';
      s.async = true;
      s.onerror = () => reject(new Error('YouTube API yuklanmadi'));
      document.head.appendChild(s);
      setTimeout(() => reject(new Error('YouTube API kechikdi')), 12000);
    });
  }
  return ytApiPromise;
}

/**
 * Lesson player.
 * - Direct files (mp4/webm/uploads): native player with speed, volume, fullscreen, subtitles.
 * - YouTube: IFrame API (resume + progress); if the API is blocked, a plain embed starting at the saved position.
 * - Seed placeholders / missing URLs: an honest "video coming soon" state. Load errors show a retry.
 * Progress (position) is saved every ~5 s for signed-in students and on pause/unmount.
 */
export const LessonVideo: React.FC<LessonVideoProps> = ({
  url,
  title,
  poster = '/media/hero-student.webp',
  className,
  emptyText = 'Bu dars videosi tez orada joylanadi',
  lessonId,
  resumeFrom = 0,
  subtitleUrl,
  bunnyVideoId,
  onEnded
}) => {
  const [playingUrl, setPlayingUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [ytFallback, setYtFallback] = useState(false);
  const missing = isPlaceholderVideo(url);
  const playing = !!url && playingUrl === url;
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const ytHost = useRef<HTMLDivElement | null>(null);
  const lastSaved = useRef(0);
  const ytId = url ? (url.match(YT_RE) || [])[1] : undefined;
  const direct = !!url && isDirectFile(url);

  const save = (position: number, duration: number, force = false) => {
    if (!lessonId || !Number.isFinite(position)) return;
    const now = Date.now();
    if (!force && now - lastSaved.current < 5000) return;
    lastSaved.current = now;
    api.saveLessonProgress(lessonId, Math.floor(position), Math.floor(duration || 0)).catch(() => {});
  };

  // YouTube IFrame API player
  useEffect(() => {
    if (!playing || !ytId || ytFallback || !ytHost.current) return;
    let player: any;
    let poll: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;
    loadYouTubeApi()
      .then((YT) => {
        if (cancelled || !ytHost.current) return;
        player = new YT.Player(ytHost.current, {
          videoId: ytId,
          host: 'https://www.youtube-nocookie.com',
          playerVars: { autoplay: 1, rel: 0, modestbranding: 1, start: Math.floor(resumeFrom || 0), playsinline: 1 },
          events: {
            onStateChange: (e: any) => {
              if (e.data === YT.PlayerState.PLAYING && !poll) {
                poll = setInterval(() => save(player.getCurrentTime(), player.getDuration()), 5000);
              } else if (e.data !== YT.PlayerState.PLAYING) {
                if (poll) clearInterval(poll);
                poll = null;
                save(player.getCurrentTime?.() || 0, player.getDuration?.() || 0, true);
                if (e.data === YT.PlayerState.ENDED) onEnded?.();
              }
            },
            onError: () => setFailed(true)
          }
        });
      })
      .catch(() => !cancelled && setYtFallback(true));
    return () => {
      cancelled = true;
      if (poll) clearInterval(poll);
      try {
        if (player?.getCurrentTime) save(player.getCurrentTime(), player.getDuration?.() || 0, true);
        player?.destroy?.();
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, ytId, ytFallback]);

  // Bunny Stream: the server signs a short-lived embed URL for this student. It is renewed before it expires.
  const bunny = !!bunnyVideoId && !!lessonId;
  const [bunnySrc, setBunnySrc] = useState<string | null>(null);
  const [bunnyErr, setBunnyErr] = useState('');
  useEffect(() => {
    if (!bunny) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const load = async () => {
      try {
        const res = await fetch('/api/lessons/playback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lessonId })
        });
        const d = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok || !d.success || !d.url) {
          setBunnySrc(null);
          setBunnyErr(d.message || 'Video hozircha mavjud emas');
          return;
        }
        setBunnyErr('');
        setBunnySrc(d.url);
        // Renew one minute before the signed link ends (expires is a Unix time in seconds).
        const ms = Math.max(30_000, Number(d.expires) * 1000 - Date.now() - 60_000);
        timer = setTimeout(load, ms);
      } catch {
        if (!cancelled) setBunnyErr('Tarmoq xatosi. Sahifani yangilab ko‘ring.');
      }
    };
    void load();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [bunny, lessonId]);

  const frame = cn('relative aspect-video w-full overflow-hidden rounded-[inherit] bg-black', className);

  if (bunny) {
    return (
      <div className={frame}>
        {bunnySrc ? (
          <iframe
            key={bunnySrc.split('expires=')[1]}
            src={bunnySrc}
            title={title}
            className="absolute inset-0 h-full w-full border-0"
            allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            loading="lazy"
          />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center p-6 text-center text-[14px] text-white/80">
            {bunnyErr || 'Video yuklanmoqda…'}
          </span>
        )}
      </div>
    );
  }

  if (missing) {
    return (
      <div className={frame}>
        <img src={poster} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover opacity-60" />
        <span className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/10" />
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="glass-night inline-flex items-center gap-2.5 rounded-full px-5 py-3 text-[13.5px] font-semibold text-white/90">
            <Film className="h-4 w-4 text-[#ffb45c]" />
            {emptyText}
          </span>
        </span>
      </div>
    );
  }

  if (failed) {
    return (
      <div className={cn(frame, 'flex flex-col items-center justify-center gap-3 p-6 text-center text-white')}>
        <AlertTriangle className="h-7 w-7 text-[#ffb45c]" />
        <p className="max-w-sm text-[13.5px] text-white/80">Videoni yuklab bo‘lmadi (tarmoq, format yoki havola muammosi).</p>
        <button
          type="button"
          onClick={() => {
            setFailed(false);
            setPlayingUrl(null);
          }}
          className="inline-flex h-10 items-center gap-2 rounded-full bg-white/10 px-5 text-[13px] font-semibold hover:bg-white/15"
        >
          <RotateCcw className="h-4 w-4" /> Qayta urinish
        </button>
      </div>
    );
  }

  if (!playing) {
    return (
      <div className={frame}>
        <button type="button" onClick={() => setPlayingUrl(url || null)} className="group absolute inset-0 block h-full w-full text-left" aria-label={`${title} — videoni ijro etish`}>
          <img src={poster} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover opacity-70 transition-transform duration-700 group-hover:scale-[1.03]" />
          <span className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/10" />
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-b from-[#ffa149] to-[#f2650f] text-white shadow-[0_20px_50px_-12px_rgba(242,101,15,0.9)] transition-transform duration-500 group-hover:scale-110">
              <Play className="ml-1 h-8 w-8 fill-current" />
            </span>
          </span>
          <span className="absolute inset-x-5 bottom-4 flex items-end justify-between gap-3 sm:inset-x-7 sm:bottom-6">
            <span className="line-clamp-1 font-display text-[15px] font-bold text-white sm:text-[18px]">{title}</span>
            {resumeFrom > 5 ? (
              <span className="glass-night shrink-0 rounded-full px-3 py-1 text-[11.5px] font-semibold text-white">
                Davom ettirish {Math.floor(resumeFrom / 60)}:{String(Math.floor(resumeFrom % 60)).padStart(2, '0')}
              </span>
            ) : null}
          </span>
        </button>
      </div>
    );
  }

  if (direct) {
    return (
      <div className={frame}>
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full"
          src={url}
          controls
          autoPlay
          playsInline
          preload="metadata"
          onLoadedMetadata={(e) => {
            const v = e.currentTarget;
            if (resumeFrom > 5 && resumeFrom < (v.duration || Infinity) - 5) v.currentTime = resumeFrom;
          }}
          onTimeUpdate={(e) => save(e.currentTarget.currentTime, e.currentTarget.duration)}
          onPause={(e) => save(e.currentTarget.currentTime, e.currentTarget.duration, true)}
          onEnded={(e) => {
            save(e.currentTarget.duration, e.currentTarget.duration, true);
            onEnded?.();
          }}
          onError={() => setFailed(true)}
        >
          {subtitleUrl ? <track kind="subtitles" src={subtitleUrl} srcLang="en" label="English" default /> : null}
        </video>
      </div>
    );
  }

  if (ytId && !ytFallback) {
    return (
      <div className={frame}>
        <div ref={ytHost} className="absolute inset-0 h-full w-full [&>iframe]:h-full [&>iframe]:w-full" />
      </div>
    );
  }

  // Other embeddable providers (or YouTube without the IFrame API)
  const embed = toEmbedUrl(url!, true) + (ytId && resumeFrom > 5 ? `&start=${Math.floor(resumeFrom)}` : '');
  return (
    <div className={frame}>
      <iframe
        src={embed}
        title={title}
        className="absolute inset-0 h-full w-full border-0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        allowFullScreen
      />
    </div>
  );
};
