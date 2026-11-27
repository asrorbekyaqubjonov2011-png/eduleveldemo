/**
 * Google Workspace APIs (Google Drive, Docs, Slides, Gmail)
 * All operations execute with user permission and in-memory OAuth tokens.
 */

export interface WorkspaceFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  iconLink?: string;
  modifiedTime?: string;
  size?: string;
}

export interface WorkspaceEmail {
  id: string;
  threadId: string;
  snippet: string;
  from?: string;
  subject?: string;
  date?: string;
}

/**
 * 1. GOOGLE DRIVE APIS
 */
export async function listDriveFiles(accessToken: string, query?: string): Promise<WorkspaceFile[]> {
  const qParam = query ? `&q=${encodeURIComponent(query)}` : '';
  const url = `https://www.googleapis.com/drive/v3/files?pageSize=20&fields=files(id,name,mimeType,webViewLink,iconLink,modifiedTime,size)${qParam}&orderBy=modifiedTime desc`;
  
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json'
    }
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `Google Drive xatolik: ${res.statusText}`);
  }

  const data = await res.json();
  return data.files || [];
}

export async function uploadTextFileToDrive(
  accessToken: string,
  fileName: string,
  content: string,
  mimeType: string = 'text/plain'
): Promise<WorkspaceFile> {
  const metadata = {
    name: fileName,
    mimeType: mimeType
  };

  const boundary = 'foo_bar_baz';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    `Content-Type: ${mimeType}\r\n\r\n` +
    content +
    closeDelimiter;

  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,webViewLink', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`
    },
    body: multipartRequestBody
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || 'Drive faylini yuklashda xatolik yuz berdi');
  }

  return await res.json();
}

export async function deleteDriveFile(accessToken: string, fileId: string): Promise<boolean> {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || 'Drive faylini o‘chirishda xatolik');
  }

  return true;
}

/**
 * 2. GOOGLE DOCS APIS
 */
export async function createGoogleDocument(
  accessToken: string,
  title: string,
  initialContent?: string
): Promise<{ documentId: string; title: string; docUrl: string }> {
  // Step 1: Create the empty document
  const createRes = await fetch('https://docs.googleapis.com/v1/documents', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ title })
  });

  if (!createRes.ok) {
    const err = await createRes.json().catch(() => ({}));
    throw new Error(err?.error?.message || 'Google Doc yaratishda xatolik yuz berdi');
  }

  const doc = await createRes.json();
  const documentId = doc.documentId;
  const docUrl = `https://docs.google.com/document/d/${documentId}/edit`;

  // Step 2: Insert initial text if provided
  if (initialContent && initialContent.trim().length > 0) {
    try {
      await fetch(`https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          requests: [
            {
              insertText: {
                location: { index: 1 },
                text: initialContent + '\n\n'
              }
            }
          ]
        })
      });
    } catch (e) {
      console.warn('Initial content insert warning:', e);
    }
  }

  return { documentId, title: doc.title, docUrl };
}

/**
 * 3. GOOGLE SLIDES APIS
 */
export async function createGooglePresentation(
  accessToken: string,
  title: string,
  subtitle?: string
): Promise<{ presentationId: string; title: string; presentationUrl: string }> {
  const createRes = await fetch('https://slides.googleapis.com/v1/presentations', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ title })
  });

  if (!createRes.ok) {
    const err = await createRes.json().catch(() => ({}));
    throw new Error(err?.error?.message || 'Google Slides prezentatsiya yaratishda xatolik');
  }

  const pres = await createRes.json();
  const presentationId = pres.presentationId;
  const presentationUrl = `https://docs.google.com/presentation/d/${presentationId}/edit`;

  return { presentationId, title: pres.title, presentationUrl };
}

/**
 * 4. GMAIL APIS
 */
export async function sendGmailMessage(
  accessToken: string,
  params: { to: string; subject: string; body: string }
): Promise<{ id: string; threadId: string }> {
  const utf8Subject = `=?utf-8?B?${btoa(unescape(encodeURIComponent(params.subject)))}?=`;
  const messageParts = [
    `To: ${params.to}`,
    'Content-Type: text/html; charset=utf-8',
    'MIME-Version: 1.0',
    `Subject: ${utf8Subject}`,
    '',
    params.body
  ];
  const message = messageParts.join('\r\n');

  // Base64url encode the message
  const encodedMessage = btoa(unescape(encodeURIComponent(message)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ raw: encodedMessage })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || 'Xat yuborishda xatolik yuz berdi');
  }

  return await res.json();
}

export async function listGmailMessages(accessToken: string): Promise<WorkspaceEmail[]> {
  const listRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=10', {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!listRes.ok) {
    const err = await listRes.json().catch(() => ({}));
    throw new Error(err?.error?.message || 'Xatlarni olishda xatolik yuz berdi');
  }

  const listData = await listRes.json();
  const messages = listData.messages || [];

  const results: WorkspaceEmail[] = [];
  for (const m of messages.slice(0, 8)) {
    try {
      const detailRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (detailRes.ok) {
        const detail = await detailRes.json();
        const headers = detail.payload?.headers || [];
        const subject = headers.find((h: any) => h.name.toLowerCase() === 'subject')?.value || '(Mavzusiz)';
        const from = headers.find((h: any) => h.name.toLowerCase() === 'from')?.value || 'Noma‘lum';
        const date = headers.find((h: any) => h.name.toLowerCase() === 'date')?.value || '';
        results.push({
          id: detail.id,
          threadId: detail.threadId,
          snippet: detail.snippet || '',
          subject,
          from,
          date
        });
      }
    } catch {
      // Continue fetching others
    }
  }

  return results;
}
