import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { EduPage } from '@/src/components/seo/EduPage';
import { SEO_PAGES, findSeoPage, type SeoPage } from '@/src/lib/seo/pages';
import { findPublishedSeoRecord, listPublishedSeoRecords } from '@/src/lib/seo/dbPages';
import { recordToPage } from '@/src/lib/seo/records';
import { isIndexableDeployment } from '@/src/components/seo/siteUrl';

// Only the listed pages exist: any other path gets notFound() (a normal 404; the static folders are matched before this route).
export const dynamicParams = true;
// Owner-written pages are read from the database; a publish or unpublish refreshes the page at once, otherwise within 5 minutes.
export const revalidate = 300;

/** A page written in code, or an owner-written published page. */
async function resolvePage(segments: string[]): Promise<SeoPage | undefined> {
  const code = findSeoPage(segments);
  if (code) return code;
  const rec = await findPublishedSeoRecord('/' + segments.filter(Boolean).join('/'));
  return rec ? recordToPage(rec) : undefined;
}

export function generateStaticParams() {
  return SEO_PAGES.map((p) => ({ seoPath: p.path.split('/').filter(Boolean) }));
}

type Params = { params: Promise<{ seoPath: string[] }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { seoPath } = await params;
  const page = await resolvePage(seoPath);
  if (!page) return {};
  const indexable = isIndexableDeployment() && !page.draft && !page.noindexOverride;
  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: page.path },
    robots: indexable ? undefined : { index: false, follow: true },
    openGraph: { title: page.title, description: page.description, url: page.path, type: 'article', locale: 'uz_UZ', siteName: 'EduLevel' },
    twitter: { card: 'summary_large_image', title: page.title, description: page.description }
  };
}

export default async function Page({ params }: Params) {
  const { seoPath } = await params;
  const page = await resolvePage(seoPath);
  if (!page) notFound();
  const extra = (await listPublishedSeoRecords()).filter((r) => !r.noindex && '/' + r.id !== page.path).slice(0, 40).map((r) => ({ path: '/' + r.id, name: r.h1.length > 40 ? r.title.split('|')[0].trim().slice(0, 40) : r.h1 }));
  return <EduPage extraLinks={extra} path={page.path} name={page.name} h1={page.h1} lead={page.lead} sections={page.sections} related={page.related} faq={page.faq} exercises={page.exercises} updated={page.updated} level={page.level} />;
}
