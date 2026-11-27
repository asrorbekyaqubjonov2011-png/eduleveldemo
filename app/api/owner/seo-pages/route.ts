import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { notifyIndexNow } from '@/src/lib/indexnow';
import { getSiteUrl } from '@/src/components/seo/siteUrl';
import { getDatabase, logAudit, withDatabase } from '@/src/lib/dbStore';
import { requireOwner } from '@/src/lib/auth/guards';
import { SEO_PAGES } from '@/src/lib/seo/pages';
import { bodyText, normalizeRecord, validateRecord, type OtherPage, type SeoRecord } from '@/src/lib/seo/records';
import { dropSeoPageCache } from '@/src/lib/seo/dbPages';

export const dynamic = 'force-dynamic';

const codePaths = () => SEO_PAGES.filter((p) => !p.draft).map((p) => p.path);
const codeOthers = (): OtherPage[] => SEO_PAGES.map((p) => ({ path: p.path, title: p.title, description: p.description, h1: p.h1, body: bodyText({ lead: p.lead, sections: p.sections, faq: p.faq }) }));
const recordOthers = (list: SeoRecord[]): OtherPage[] => list.map((r) => ({ path: '/' + r.id, title: r.title, description: r.description, h1: r.h1, body: bodyText(r) }));

const refresh = (id: string) => {
  dropSeoPageCache();
  // Every SEO page lists the published owner pages in its navigation, so all of them are refreshed.
  try { revalidatePath('/[...seoPath]', 'page'); } catch { /* not in a cacheable context */ }
  for (const p of ['/' + id, '/sitemap.xml']) {
    try { revalidatePath(p); } catch { /* not in a cacheable context */ }
  }
};

function view(list: SeoRecord[]) {
  const others = [...codeOthers(), ...recordOthers(list)];
  return {
    success: true,
    codePaths: codePaths(),
    pages: list.map((r) => ({ ...r, validation: validateRecord(r, others, codePaths()) }))
  };
}

/** Owner's SEO content manager: list, save (draft or publish) and delete owner-written pages. */
async function handleGet(req: NextRequest) {
  const auth = requireOwner(req);
  if (auth instanceof NextResponse) return auth;
  return NextResponse.json(view(getDatabase().seoPages || []));
}

async function handlePost(req: NextRequest) {
  const auth = requireOwner(req);
  if (auth instanceof NextResponse) return auth;
  const body = (await req.json().catch(() => ({}))) as { page?: unknown; originalId?: unknown };
  const db = getDatabase();
  const list = db.seoPages || (db.seoPages = []);
  const originalId = typeof body.originalId === 'string' ? body.originalId : '';
  const previous = list.find((r) => r.id === (originalId || (body.page as { id?: string })?.id));
  const rec = normalizeRecord(body.page, new Date().toISOString(), previous);
  if (!rec.id) return NextResponse.json({ success: false, message: 'Manzil (slug) kiriting.' }, { status: 400 });
  const wasPublished = previous?.status === 'published';
  // Publishing needs a clean validation; saving a draft never does.
  const others = [...codeOthers(), ...recordOthers(list.filter((r) => r !== previous))];
  const check = validateRecord(rec, others, codePaths());
  if (rec.status === 'published' && check.errors.length) {
    return NextResponse.json({ success: false, message: 'Nashr qilib bo‘lmaydi: ' + check.errors[0], validation: check }, { status: 400 });
  }
  if (rec.id !== (previous?.id ?? rec.id) || (!previous && list.some((r) => r.id === rec.id))) {
    return NextResponse.json({ success: false, message: 'Bu manzil bilan sahifa allaqachon bor.' }, { status: 409 });
  }
  const at = rec.updatedAt;
  if (rec.status === 'published' && !wasPublished) { rec.publishedAt = at; rec.history = [...rec.history, { at, action: 'published' }].slice(-30); }
  else if (rec.status === 'draft' && wasPublished) rec.history = [...rec.history, { at, action: 'unpublished' }].slice(-30);
  else rec.history = [...rec.history, { at, action: previous ? 'edited' : 'created' }].slice(-30);
  if (previous) list.splice(list.indexOf(previous), 1, rec);
  else list.push(rec);
  logAudit('owner', 'seo_page_' + (rec.status === 'published' ? 'publish' : 'save'), 'seo_page', `/${rec.id}: ${rec.status}`);
  refresh(rec.id);
  // A published page, or one that was just taken down, is announced to IndexNow (free; not an indexing guarantee).
  if ((rec.status === 'published' && !check.errors.length) || wasPublished) notifyIndexNow('/' + rec.id, getSiteUrl(), rec.status === 'published' ? 'published' : 'unpublished');
  return NextResponse.json({ ...view(list), saved: rec.id });
}

async function handleDelete(req: NextRequest) {
  const auth = requireOwner(req);
  if (auth instanceof NextResponse) return auth;
  const id = (req.nextUrl.searchParams.get('id') || '').toLowerCase();
  const db = getDatabase();
  const list = db.seoPages || [];
  const target = list.find((r) => r.id === id);
  if (!target) return NextResponse.json({ success: false, message: 'Sahifa topilmadi.' }, { status: 404 });
  db.seoPages = list.filter((r) => r !== target);
  logAudit('owner', 'seo_page_delete', 'seo_page', `/${id}`);
  refresh(id);
  if (target.status === 'published') notifyIndexNow('/' + id, getSiteUrl(), 'deleted');
  return NextResponse.json(view(db.seoPages));
}

export const GET = withDatabase(handleGet);
export const POST = withDatabase(handlePost);
export const DELETE = withDatabase(handleDelete);
