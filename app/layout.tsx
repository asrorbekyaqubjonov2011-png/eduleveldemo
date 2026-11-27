import type { Metadata, Viewport } from 'next';
import './globals.css';

import { getSiteUrl, isIndexableDeployment } from '@/src/components/seo/siteUrl';
import { RumReporter } from '@/src/components/seo/RumReporter';

const SITE = getSiteUrl();

export const viewport: Viewport = { themeColor: [{ media: '(prefers-color-scheme: light)', color: '#fbf6ef' }, { media: '(prefers-color-scheme: dark)', color: '#0d0f14' }], width: 'device-width', initialScale: 1 };

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  alternates: { canonical: `${SITE}/` },
  // Google Search Console ownership tag: rendered in the first HTML response. Do not remove.
  verification: { google: '_u08Kkq1h8VS32m-r67AED0jhoWVGv_Hj4EfFYR34uQ' },
  keywords: ['EduLevel', 'IELTS ga tayyorgarlik', 'IELTS tayyorlov', 'CEFR tayyorgarlik', 'CEFR imtihoniga tayyorlanish', 'IELTS mock test', 'IELTS Speaking practice', 'IELTS Writing practice', 'Ingliz tilini online o‘rganish', 'Ingliz tili darslari', 'IELTS', 'CEFR', 'ingliz tili', 'mock test', 'Edu Level', 'O‘zbekiston'],
  robots: isIndexableDeployment() ? { index: true, follow: true } : { index: false, follow: false, nocache: true },
  title: 'EduLevel — IELTS va CEFR tayyorgarlik | Ingliz tilini o‘rganish',
  description: 'EduLevel bilan IELTS va CEFR imtihonlariga tayyorlaning. Ingliz tili darslari, mock testlar, Speaking, Writing va EduBek AI yordamchisi.',
  openGraph: {
    title: 'EduLevel — IELTS va CEFR tayyorgarlik | Ingliz tilini o‘rganish',
    description: 'EduLevel bilan IELTS va CEFR imtihonlariga tayyorlaning. Ingliz tili darslari, mock testlar, Speaking, Writing va EduBek AI yordamchisi.',
    type: 'website',
    locale: 'uz_UZ',
    siteName: 'Edu Level',
    url: '/',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'EduLevel — IELTS va CEFR tayyorgarlik | Ingliz tilini o‘rganish',
    description: 'EduLevel bilan IELTS va CEFR imtihonlariga tayyorlaning. Ingliz tili darslari, mock testlar, Speaking, Writing va EduBek AI yordamchisi.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uz" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&family=Plus+Jakarta+Sans:ital,wght@0,200..800;1,200..800&family=Space+Grotesk:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body suppressHydrationWarning className="antialiased min-h-screen">
        {/* The page itself is drawn in the browser, so search engines are given the essentials here. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([
              {
                '@context': 'https://schema.org',
                '@type': 'EducationalOrganization',
                name: 'EduLevel',
                alternateName: 'Edu Level',
                url: SITE,
                // A square logo (512 px) is what Google's logo rules prefer; it must be reachable by Googlebot.
                logo: { '@type': 'ImageObject', url: `${SITE}/brand/edulevel-logo-512.png`, width: 512, height: 512 },
                image: `${SITE}/brand/edulevel-logo-512.png`,
                sameAs: ['https://t.me/edu_levelbot'],
                description: 'IELTS, CEFR va General English: video darslar, mock testlar, AI yordamchi Edubek va raqamli kutubxona.',
                areaServed: 'UZ',
                knowsLanguage: ['uz', 'en']
              },
              { '@context': 'https://schema.org', '@type': 'WebSite', name: 'EduLevel', url: SITE, inLanguage: 'uz' }
            ])
          }}
        />
        <noscript>
          <main style={{ padding: 24, fontFamily: 'sans-serif' }}>
            <p style={{ fontSize: 22, fontWeight: 700 }}>Edu Level — IELTS, CEFR va General English</p>
            <p>Video darslar, mock testlar, AI yordamchi Edubek va raqamli kutubxona. Saytni ko‘rish uchun JavaScript yoqilgan bo‘lishi kerak.</p>
          </main>
        </noscript>
        {children}
        <RumReporter />
      </body>
    </html>
  );
}
