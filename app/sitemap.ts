import { getSiteUrl } from '../src/components/seo/siteUrl';
import type { MetadataRoute } from 'next';
import { SEO_PAGES } from '../src/lib/seo/pages';
import { listPublishedSeoRecords } from '../src/lib/seo/dbPages';

// Owner-written pages come from the database; a publish refreshes this at once, otherwise every 10 minutes.
export const revalidate = 600;

const SITE = getSiteUrl();

/**
 * Only public, indexable pages. Dashboards, sign-in, profiles and the API are never listed.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const updated = new Date('2026-11-21T00:00:00Z');
  const owned = (await listPublishedSeoRecords()).filter((r) => !r.noindex);
  return [
    { url: SITE, lastModified: updated, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE}/ielts-tayyorgarlik`, lastModified: updated, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${SITE}/cefr-tayyorgarlik`, lastModified: updated, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${SITE}/ingliz-tili-darslari`, lastModified: updated, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE}/cefr/c1-yol-xaritasi`, lastModified: updated, changeFrequency: 'monthly', priority: 0.7 },
    // Content pages: drafts (legal texts awaiting the owner's approval) are never listed.
    ...SEO_PAGES.filter((p) => !p.draft).map((p) => ({ url: `${SITE}${p.path}`, lastModified: p.updated ? new Date(`${p.updated}T00:00:00Z`) : updated, changeFrequency: 'monthly' as const, priority: p.path.split('/').length > 2 ? 0.6 : 0.7 })),
    ...owned.map((r) => ({ url: `${SITE}/${r.id}`, lastModified: new Date(r.updatedAt), changeFrequency: 'monthly' as const, priority: 0.6 }))
  ];
}
