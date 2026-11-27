import { NextResponse } from 'next/server';
import { loadState } from '@/src/lib/indexnow';

export const dynamic = 'force-dynamic';

/** The IndexNow verification file: its whole body is the key, as the protocol requires (the key is public by design). */
export async function GET() {
  try {
    const { key } = await loadState();
    return new NextResponse(key, { status: 200, headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=300' } });
  } catch {
    return new NextResponse('not available', { status: 503 });
  }
}
