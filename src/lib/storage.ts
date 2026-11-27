import { randomBytes } from 'crypto';
import { saveUpload } from './uploadStore';

/**
 * Uploads (images, study PDFs, receipts).
 * - With SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY set, files go to Supabase Storage (public bucket).
 * - Otherwise, or if Supabase refuses the file, the bytes are kept in the application database
 *   (table public.uploads, created on first use) and served from /api/uploads/<id>.
 * Either way the upload succeeds, so deposits, photos and books never depend on one service being configured.
 */

const BUCKET = (process.env.SUPABASE_STORAGE_BUCKET || 'edulevel-media').trim();
export const MAX_IMAGE_BYTES = 6 * 1024 * 1024;
/** Study PDFs (digital books). The bucket limit is set to this size when the bucket is created. */
export const MAX_PDF_BYTES = 25 * 1024 * 1024;

export class StorageError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export interface UploadOptions {
  /** Who uploaded the file (used for private files). */
  ownerId?: string;
  /** Private files (receipts) are served only to the owner and the uploader. */
  visibility?: 'public' | 'private';
}

/** Detects the image type from its first bytes, so a renamed file cannot pass as an image. */
export function detectImageType(bytes: Buffer): { mime: string; ext: string } | null {
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return { mime: 'image/png', ext: 'png' };
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { mime: 'image/jpeg', ext: 'jpg' };
  }
  if (bytes.length >= 12 && bytes.subarray(0, 4).toString('ascii') === 'RIFF' && bytes.subarray(8, 12).toString('ascii') === 'WEBP') {
    return { mime: 'image/webp', ext: 'webp' };
  }
  if (bytes.length >= 6 && ['GIF87a', 'GIF89a'].includes(bytes.subarray(0, 6).toString('ascii'))) {
    return { mime: 'image/gif', ext: 'gif' };
  }
  return null;
}

/** Supabase settings, or null when they are not configured. */
function supabaseConfig(): { url: string; key: string } | null {
  const url = (process.env.SUPABASE_URL || '').trim().replace(/\/$/, '');
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  return url && key ? { url, key } : null;
}

/**
 * Auth headers for the Supabase REST gateway. A legacy service_role key is a JWT and goes in both headers. The newer
 * `sb_secret_...` keys are not JWTs: they go only in `apikey` (an Authorization: Bearer with them is rejected by some endpoints).
 */
export function supabaseAuthHeaders(key: string): Record<string, string> {
  return key.startsWith('sb_') ? { apikey: key } : { authorization: `Bearer ${key}`, apikey: key };
}

let bucketReady: Promise<void> | null = null;

async function ensureBucket(url: string, key: string): Promise<void> {
  const headers = supabaseAuthHeaders(key);
  const res = await fetch(`${url}/storage/v1/bucket/${BUCKET}`, { headers });
  if (res.ok) return;
  if (res.status !== 400 && res.status !== 404) {
    throw new StorageError('Rasm saqlash xizmatiga ulanib bo‘lmadi.', 502);
  }
  const created = await fetch(`${url}/storage/v1/bucket`, {
    method: 'POST',
    headers: { ...headers, 'content-type': 'application/json' },
    body: JSON.stringify({ id: BUCKET, name: BUCKET, public: true, file_size_limit: MAX_PDF_BYTES })
  });
  // 409 means another instance created it first, which is fine.
  if (!created.ok && created.status !== 409) throw new StorageError('Rasm saqlash bo‘limini yaratib bo‘lmadi.', 502);
}

/** True when the bytes start with the PDF signature. */
export function isPdf(bytes: Buffer): boolean {
  return bytes.length >= 5 && bytes.subarray(0, 5).toString('ascii') === '%PDF-';
}

/** Tries Supabase first; falls back to the database store. Returns a URL the site can show. */
async function uploadObject(bytes: Buffer, filenameHint: string, mime: string, ext: string, opts: UploadOptions): Promise<string> {
  // Private files (deposit receipts) never go to the public bucket: they stay in the database store,
  // where only the owner and the uploader can read them.
  const isPublic = (opts.visibility ?? 'public') === 'public';
  const cfg = isPublic ? supabaseConfig() : null;
  if (cfg) {
    try {
      if (!bucketReady) bucketReady = ensureBucket(cfg.url, cfg.key).catch((err) => { bucketReady = null; throw err; });
      await bucketReady;
      const base = filenameHint.replace(/\.[^.]*$/, '').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 60) || 'file';
      const path = `${new Date().toISOString().slice(0, 7)}/${base}-${randomBytes(6).toString('hex')}.${ext}`;
      const res = await fetch(`${cfg.url}/storage/v1/object/${BUCKET}/${path}`, {
        method: 'POST',
        headers: { ...supabaseAuthHeaders(cfg.key), 'content-type': mime, 'cache-control': '3600' },
        body: new Uint8Array(bytes)
      });
      if (res.ok) return `${cfg.url}/storage/v1/object/public/${BUCKET}/${path}`;
      console.error('[storage] Supabase refused the file:', res.status);
    } catch (err) {
      console.error('[storage] Supabase upload failed, using the database store:', (err as Error).message);
    }
  }
  return saveUpload(bytes, mime, opts.ownerId || 'system', opts.visibility ?? 'public');
}

/** Uploads a validated image and returns its URL. */
export async function uploadImage(bytes: Buffer, filenameHint: string, opts: UploadOptions = {}): Promise<string> {
  if (bytes.length === 0) throw new StorageError("Rasm ma'lumoti bo‘sh", 400);
  if (bytes.length > MAX_IMAGE_BYTES) throw new StorageError('Rasm hajmi 6 MB dan oshmasligi kerak', 413);
  const type = detectImageType(bytes);
  if (!type) throw new StorageError('Faqat PNG, JPG, WEBP yoki GIF rasm yuklash mumkin', 400);
  return uploadObject(bytes, filenameHint, type.mime, type.ext, opts);
}

/** Uploads a validated study PDF and returns its URL. */
export async function uploadPdf(bytes: Buffer, filenameHint: string, opts: UploadOptions = {}): Promise<string> {
  if (bytes.length === 0) throw new StorageError('PDF fayl bo‘sh', 400);
  if (bytes.length > MAX_PDF_BYTES) throw new StorageError('PDF hajmi 25 MB dan oshmasligi kerak', 413);
  if (!isPdf(bytes)) throw new StorageError('Faqat PDF fayl yuklash mumkin', 400);
  return uploadObject(bytes, filenameHint, 'application/pdf', 'pdf', opts);
}
