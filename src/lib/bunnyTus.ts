/**
 * Minimal browser TUS upload to Bunny Stream (creation + chunked PATCH). The signature comes from the server for one
 * video only; the Stream API key is never in the browser.
 */
export interface BunnyUploadInit {
  videoId: string;
  libraryId: string;
  expire: number;
  signature: string;
  endpoint: string;
}

const CHUNK = 8 * 1024 * 1024;

const b64 = (s: string) => btoa(unescape(encodeURIComponent(s)));

export async function tusUpload(file: File, title: string, init: BunnyUploadInit, onProgress: (pct: number) => void): Promise<void> {
  const auth = { AuthorizationSignature: init.signature, AuthorizationExpire: String(init.expire), VideoId: init.videoId, LibraryId: init.libraryId };
  const created = await fetch(init.endpoint, {
    method: 'POST',
    headers: { 'Tus-Resumable': '1.0.0', 'Upload-Length': String(file.size), 'Upload-Metadata': `filetype ${b64(file.type || 'video/mp4')},title ${b64(title)}`, ...auth }
  });
  if (!created.ok) throw new Error(`Yuklash boshlanmadi (HTTP ${created.status})`);
  const location = created.headers.get('Location');
  if (!location) throw new Error('Bunny yuklash manzilini bermadi');
  const url = new URL(location, init.endpoint).toString();
  let offset = 0;
  while (offset < file.size) {
    const end = Math.min(offset + CHUNK, file.size);
    const res = await fetch(url, {
      method: 'PATCH',
      headers: { 'Tus-Resumable': '1.0.0', 'Upload-Offset': String(offset), 'Content-Type': 'application/offset+octet-stream', ...auth },
      body: file.slice(offset, end)
    });
    if (!res.ok) throw new Error(`Yuklash uzildi (HTTP ${res.status})`);
    const next = Number(res.headers.get('Upload-Offset'));
    offset = Number.isFinite(next) && next > offset ? next : end;
    onProgress(Math.min(100, Math.round((offset / file.size) * 100)));
  }
}
