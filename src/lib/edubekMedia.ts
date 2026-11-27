/** Chat attachments: voice notes and files are uploaded privately (only the student and the owner can open them). */

export function blobToDataUrl(blob: Blob, mime: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).replace(/^data:[^;]*;base64,/, `data:${mime};base64,`));
    r.onerror = () => reject(new Error('Faylni o‘qib bo‘lmadi'));
    r.readAsDataURL(blob);
  });
}

/** Uploads a recorded or picked file for the chat. Returns the private URL, or null when it fails. */
export async function uploadChatFile(file: Blob, name: string): Promise<string | null> {
  const mime = (file.type || 'application/octet-stream').split(';')[0];
  const dataUrl = await blobToDataUrl(file, mime);
  const { api } = await import('../services/api');
  const res = await api.uploadAsset(dataUrl, name, 'chat');
  return res?.success && res.url ? String(res.url) : null;
}

export const STICKERS = ['😀', '🤩', '😢', '😠', '😲', '😴', '👍', '🎉', '💪', '📚', '🌟', '🙏'];
