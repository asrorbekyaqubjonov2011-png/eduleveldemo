import { NextRequest, NextResponse } from 'next/server';
import { withDatabase } from '@/src/lib/dbStore';
import { requireOwner } from '@/src/lib/auth/guards';
import { fetchModelCatalog } from '@/src/lib/aiModelCatalog';

export const dynamic = 'force-dynamic';

/** Owner only. Reads each provider's own model list (one request per provider) and returns it with unknown fields as null. Keys never leave the server. */
async function handleGet(req: NextRequest) {
  const auth = requireOwner(req);
  if (auth instanceof NextResponse) return auth;
  return NextResponse.json({ success: true, ...(await fetchModelCatalog()) });
}

export const GET = withDatabase(handleGet);
