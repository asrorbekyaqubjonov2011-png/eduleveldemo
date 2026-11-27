import { getSiteUrl } from '../src/components/seo/siteUrl';
import type { MetadataRoute } from 'next';

const SITE = getSiteUrl();

/** Search engines may read the landing page; the API and private areas are off limits. */
export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: '*', allow: '/', disallow: ['/api/'] }], sitemap: `${SITE}/sitemap.xml` };
}
