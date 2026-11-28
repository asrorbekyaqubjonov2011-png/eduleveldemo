import { NextRequest, NextResponse } from 'next/server';
import { withDatabase } from '@/src/lib/dbStore';
import { requireOwner } from '@/src/lib/auth/guards';
import { changedUrls, loadState, submitUrls } from '@/src/lib/indexnow';
import sitemap from '../../../sitemap';
import { CANONICAL_SITE_URL, getSiteUrl } from '@/src/components/seo/siteUrl';

export const dynamic = 'force-dynamic';

const site = () => getSiteUrl();
const host = () => new URL(site()).hostname;

async function entries() {
  const list = await sitemap();
  return list.map((e) => ({ url: e.url, lastModified: e.lastModified as string | Date | undefined }));
}

/** Owner only. GET: status. POST { action: 'submit' | 'retry' | 'urls', urls? }. Nothing is sent unless the owner asks (or a page is published). */
async function handleGet(req: NextRequest) {
  const auth = requireOwner(req);
  if (auth instanceof NextResponse) return auth;
  const state = await loadState();
  const all = await entries();
  const pending = changedUrls(all, state.submitted);
  return NextResponse.json({
    success: true,
    host: host(),
    keyLocation: `${site()}/api/indexnow/key`,
    totalUrls: all.length,
    submittedUrls: Object.keys(state.submitted).length,
    pending: pending.length,
    pendingSample: pending.slice(0, 20),
    failed: state.failed.length,
    lastAttemptAt: state.lastAttemptAt || null,
    history: state.history.slice(-15).reverse(),
    note: 'Qabul qilinishi indekslanish kafolati emas.'
  });
}

async function handlePost(req: NextRequest) {
  const auth = requireOwner(req);
  if (auth instanceof NextResponse) return auth;
  if (site() !== CANONICAL_SITE_URL) {
    return NextResponse.json({ success: false, message: 'IndexNow faqat edulevel.uz domenida ishlaydi.', code: 'INDEXNOW_PREVIEW' }, { status: 409 });
  }
  const body = (await req.json().catch(() => ({}))) as { action?: string; urls?: unknown };
  const all = await entries();
  const mods = Object.fromEntries(all.map((e) => [e.url, e.lastModified ? new Date(e.lastModified).toISOString().slice(0, 10) : '']));
  const state = await loadState();
  let urls: string[] = [];
  if (body.action === 'retry') urls = state.failed;
  else if (body.action === 'urls' && Array.isArray(body.urls)) urls = body.urls.filter((u): u is string => typeof u === 'string').slice(0, 200);
  else urls = changedUrls(all, state.submitted);
  const result = await submitUrls(host(), site(), urls, body.action || 'submit', mods);
  return NextResponse.json({ success: result.ok, ...result });
}

export const GET = withDatabase(handleGet);
export const POST = withDatabase(handlePost);
