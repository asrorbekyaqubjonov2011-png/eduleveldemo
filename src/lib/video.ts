/** Known placeholder video left in seed data — never show it to students. */
const PLACEHOLDER_IDS = ['dQw4w9WgXcQ'];

export type VideoProvider = 'youtube' | 'drive' | 'vimeo' | 'direct' | 'other' | 'none';

const YT_RE = /(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{6,})/;
const DRIVE_RE = /drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:export=\w+&)?id=)([A-Za-z0-9_-]{10,})/;
const VIMEO_RE = /(?:vimeo\.com\/(?:video\/)?|player\.vimeo\.com\/video\/)(\d{6,})/;
const DIRECT_RE = /\.(mp4|webm|ogg|ogv|m4v|mov)(\?|#|$)/i;

export function isPlaceholderVideo(url?: string | null): boolean {
  if (!url || !url.trim()) return true;
  return PLACEHOLDER_IDS.some((id) => url.includes(id));
}

export function detectVideoProvider(url?: string | null): VideoProvider {
  const u = (url || '').trim();
  if (!u) return 'none';
  if (YT_RE.test(u)) return 'youtube';
  if (DRIVE_RE.test(u)) return 'drive';
  if (VIMEO_RE.test(u)) return 'vimeo';
  if (DIRECT_RE.test(u) || u.startsWith('/uploads/')) return 'direct';
  return /^https?:\/\//i.test(u) ? 'other' : 'none';
}

export const VIDEO_PROVIDER_LABEL: Record<VideoProvider, string> = {
  youtube: 'YouTube',
  drive: 'Google Drive',
  vimeo: 'Vimeo',
  direct: 'To‘g‘ridan-to‘g‘ri video fayl',
  other: 'Boshqa havola (iframe)',
  none: 'Havola kiritilmagan'
};

/** Converts common video URLs to an embeddable URL (keeps other URLs untouched). */
export function toEmbedUrl(url: string, autoplay = false): string {
  const yt = url.match(YT_RE);
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt[1]}?rel=0&modestbranding=1&playsinline=1${autoplay ? '&autoplay=1' : ''}`;
  const drive = url.match(DRIVE_RE);
  if (drive) return `https://drive.google.com/file/d/${drive[1]}/preview`;
  const vimeo = url.match(VIMEO_RE);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}?dnt=1${autoplay ? '&autoplay=1' : ''}`;
  return url;
}
