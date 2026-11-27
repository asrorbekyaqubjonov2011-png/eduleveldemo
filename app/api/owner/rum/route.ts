import { NextRequest, NextResponse } from 'next/server';
import { withDatabase } from '@/src/lib/dbStore';
import { requireOwner } from '@/src/lib/auth/guards';
import { rumSummary, THRESHOLDS } from '@/src/lib/rum';

export const dynamic = 'force-dynamic';

/** Owner-only: real-user Core Web Vitals (75th percentile) collected by this server since it started. */
async function handleGet(req: NextRequest) {
  const auth = requireOwner(req);
  if (auth instanceof NextResponse) return auth;
  return NextResponse.json({ success: true, thresholds: THRESHOLDS, summary: rumSummary() });
}

export const GET = withDatabase(handleGet);
