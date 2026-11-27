import { NextRequest, NextResponse } from 'next/server';
import { withDatabase } from '@/src/lib/dbStore';
import { requireOwner } from '@/src/lib/auth/guards';
import { bunnyListVideos, readBunnyApiConfig } from '@/src/lib/bunnyApi';

export const dynamic = 'force-dynamic';

/** Owner-only: videos of the Bunny Stream library (title, length, encoding status). The API key stays on the server. */
async function handleGet(req: NextRequest) {
  const auth = requireOwner(req);
  if (auth instanceof NextResponse) return auth;
  const cfg = readBunnyApiConfig();
  if (!cfg) {
    return NextResponse.json({ success: false, message: 'Bunny sozlanmagan: Render’da BUNNY_STREAM_ENABLED=1, BUNNY_LIBRARY_ID va BUNNY_API_KEY (Stream API kaliti) kerak.' }, { status: 503 });
  }
  const page = Math.max(1, Number(req.nextUrl.searchParams.get('page')) || 1);
  const search = (req.nextUrl.searchParams.get('search') || '').trim();
  try {
    return NextResponse.json({ success: true, ...(await bunnyListVideos(cfg, page, search)) });
  } catch (e) {
    return NextResponse.json({ success: false, message: e instanceof Error ? e.message : 'Bunny xatosi' }, { status: 502 });
  }
}

export const GET = withDatabase(handleGet);
