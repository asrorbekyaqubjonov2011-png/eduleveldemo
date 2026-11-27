import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/src/lib/auth/rateLimit';
import { cleanRum, recordRum } from '@/src/lib/rum';

export const dynamic = 'force-dynamic';

/**
 * Receives one page view's Core Web Vitals from a visitor's browser: numbers and two labels only, no URL and no id.
 * Same-site browsers only, a small per-address limit, and nothing is stored in the database.
 */
export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin');
  const host = (req.headers.get('x-forwarded-host') || req.headers.get('host') || '').split(',')[0].trim().toLowerCase();
  if (origin) {
    try {
      if (new URL(origin).host.toLowerCase() !== host) return new NextResponse(null, { status: 204 });
    } catch {
      return new NextResponse(null, { status: 204 });
    }
  }
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
  if (!rateLimit(`rum:${ip}`, 60, 60 * 60 * 1000).allowed) return new NextResponse(null, { status: 204 });
  const body = await req.json().catch(() => null);
  const sample = cleanRum(body);
  if (sample) recordRum(sample);
  return new NextResponse(null, { status: 204 });
}
