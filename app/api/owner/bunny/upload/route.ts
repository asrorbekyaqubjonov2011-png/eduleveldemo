import { NextRequest, NextResponse } from 'next/server';
import { logAudit, withDatabase } from '@/src/lib/dbStore';
import { requireOwner } from '@/src/lib/auth/guards';
import { BunnyError, bunnyCreateVideo, readBunnyApiConfig, tusSignature } from '@/src/lib/bunnyApi';

export const dynamic = 'force-dynamic';

/**
 * Owner-only: creates an empty video in the Bunny library and returns a one-video, one-hour upload signature, so the
 * browser can upload the file straight to Bunny (TUS). The Stream API key is never sent to the browser.
 */
async function handlePost(req: NextRequest) {
  const auth = requireOwner(req);
  if (auth instanceof NextResponse) return auth;
  const cfg = readBunnyApiConfig();
  if (!cfg) {
    return NextResponse.json({ success: false, message: 'Bunny sozlanmagan: Render’da BUNNY_STREAM_ENABLED=1, BUNNY_LIBRARY_ID va BUNNY_API_KEY (Stream API kaliti) kerak.' }, { status: 503 });
  }
  const body = (await req.json().catch(() => ({}))) as { title?: unknown };
  const title = typeof body.title === 'string' ? body.title.trim().slice(0, 120) : '';
  if (!title) return NextResponse.json({ success: false, message: 'Video nomini kiriting.' }, { status: 400 });
  try {
    const videoId = await bunnyCreateVideo(cfg, title);
    const expire = Math.floor(Date.now() / 1000) + 3600;
    logAudit('owner', 'bunny_video_create', 'bunny', `Yangi video yaratildi: ${title}`);
    return NextResponse.json({
      success: true,
      videoId,
      libraryId: cfg.libraryId,
      expire,
      signature: tusSignature(cfg.libraryId, cfg.apiKey, expire, videoId),
      endpoint: 'https://video.bunnycdn.com/tusupload'
    });
  } catch (e) {
    return NextResponse.json({ success: false, message: e instanceof BunnyError || e instanceof Error ? e.message : 'Bunny xatosi' }, { status: 502 });
  }
}

export const POST = withDatabase(handlePost);
