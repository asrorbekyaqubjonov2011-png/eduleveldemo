import { getSiteUrl } from './siteUrl';
import Link from 'next/link';
import { SEO_PAGES } from '@/src/lib/seo/pages';

const SITE = getSiteUrl();

export interface EduFaq {
  q: string;
  a: string;
}

export interface EduExercise {
  prompt: string;
  /** Multiple-choice options, when the exercise has them. */
  options?: string[];
  answer: string;
  explanation?: string;
}

export interface EduSection {
  heading: string;
  paragraphs: string[];
  items?: string[];
}

/**
 * A real educational page for search engines and visitors. It is server-rendered (plain HTML), so the text is in the
 * first response. It links back to the main site, and carries a breadcrumb for Google.
 */
export function EduPage({
  path,
  name,
  h1,
  lead,
  sections,
  related = [],
  faq = [],
  exercises = [],
  updated,
  level,
  extraLinks = []
}: {
  path: string;
  name: string;
  h1: string;
  lead: string;
  sections: EduSection[];
  /** Paths of closely related pages, linked from this page (internal linking). */
  related?: string[];
  faq?: EduFaq[];
  exercises?: EduExercise[];
  updated?: string;
  level?: string;
  /** Published owner-written pages: listed in the site navigation so none is an orphan. */
  extraLinks?: { path: string; name: string }[];
}) {
  const relatedPages = related.map((r) => SEO_PAGES.find((p) => p.path === r)).filter((p): p is (typeof SEO_PAGES)[number] => Boolean(p) && !p!.draft);
  const otherPages = SEO_PAGES.filter((p) => !p.draft && p.path !== path && !related.includes(p.path));
  const crumbs = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'EduLevel', item: `${SITE}/` },
      { '@type': 'ListItem', position: 2, name, item: `${SITE}${path}` }
    ]
  };
  // Blog articles also get BlogPosting. Only facts the page itself shows. No datePublished yet: the articles have no
  // real publication date in the data, and an invented one would be wrong.
  const isArticle = path.startsWith('/blog/');
  const article = isArticle
    ? {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: h1.slice(0, 110),
        description: lead.slice(0, 300),
        inLanguage: 'uz',
        url: `${SITE}${path}`,
        mainEntityOfPage: `${SITE}${path}`,
        author: { '@type': 'Organization', name: 'EduLevel', url: `${SITE}/` },
        publisher: {
          '@type': 'Organization',
          name: 'EduLevel',
          url: `${SITE}/`,
          logo: { '@type': 'ImageObject', url: `${SITE}/brand/edulevel-logo-512.png`, width: 512, height: 512 }
        }
      }
    : null;
  // FAQPage only from questions that are visible on this page; LearningResource only where the page has practice items.
  const faqLd = faq.length
    ? { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) }
    : null;
  const resourceLd = exercises.length
    ? {
        '@context': 'https://schema.org',
        '@type': 'LearningResource',
        name: h1,
        description: lead.slice(0, 300),
        inLanguage: 'uz',
        url: `${SITE}${path}`,
        learningResourceType: 'Practice problems',
        ...(level ? { educationalLevel: level } : {}),
        ...(updated ? { dateModified: updated } : {}),
        provider: { '@type': 'Organization', name: 'EduLevel', url: `${SITE}/` }
      }
    : null;
  return (
    <main className="mx-auto max-w-3xl px-5 py-10 text-[16px] leading-relaxed text-neutral-900">
      {faqLd ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd).replace(/</g, '\\u003c') }} /> : null}
      {resourceLd ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(resourceLd).replace(/</g, '\\u003c') }} /> : null}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs).replace(/</g, '\\u003c') }} />
      {article ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(article).replace(/</g, '\\u003c') }} /> : null}
      <nav aria-label="Breadcrumb" className="text-sm text-neutral-600">
        <Link href="/" className="underline">EduLevel</Link> <span aria-hidden="true">/</span> <span>{name}</span>
      </nav>
      <h1 className="mt-6 text-3xl font-extrabold tracking-tight">{h1}</h1>
      <p className="mt-4 text-lg text-neutral-700">{lead}</p>
      {updated ? <p className="mt-2 text-sm text-neutral-500">Yangilangan: <time dateTime={updated}>{updated}</time></p> : null}
      {sections.map((s) => (
        <section key={s.heading} className="mt-8">
          <h2 className="text-2xl font-bold">{s.heading}</h2>
          {s.paragraphs.map((p) => (
            <p key={p.slice(0, 40)} className="mt-3">{p}</p>
          ))}
          {s.items ? (
            <ul className="mt-3 list-disc space-y-2 pl-6">
              {s.items.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
          ) : null}
        </section>
      ))}
      {exercises.length ? (
        <section className="mt-10" aria-label="Mashqlar">
          <h2 className="text-2xl font-bold">Mashqlar</h2>
          <p className="mt-2 text-neutral-700">Avval o‘zingiz javob bering, keyin «Javobni ko‘rish» ni oching.</p>
          <ol className="mt-4 space-y-4">
            {exercises.map((e, i) => (
              <li key={i} className="rounded-xl border border-neutral-200 p-4">
                <p className="font-semibold">{i + 1}. {e.prompt}</p>
                {e.options ? (
                  <ul className="mt-2 space-y-1">
                    {e.options.map((o, k) => (
                      <li key={k}>{String.fromCharCode(65 + k)}) {o}</li>
                    ))}
                  </ul>
                ) : null}
                <details className="mt-3">
                  <summary className="cursor-pointer font-semibold text-orange-700">Javobni ko‘rish</summary>
                  <p className="mt-2"><strong>Javob:</strong> {e.answer}</p>
                  {e.explanation ? <p className="mt-1 text-neutral-700">{e.explanation}</p> : null}
                </details>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
      {faq.length ? (
        <section className="mt-10" aria-label="Savol-javoblar">
          <h2 className="text-2xl font-bold">Ko‘p beriladigan savollar</h2>
          <div className="mt-4 space-y-4">
            {faq.map((f) => (
              <div key={f.q}>
                <h3 className="text-lg font-semibold">{f.q}</h3>
                <p className="mt-1">{f.a}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}
      <section className="mt-10 rounded-2xl border border-neutral-200 p-6">
        <h2 className="text-xl font-bold">EduLevel saytida davom eting</h2>
        <p className="mt-2">Ro‘yxatdan o‘tib, darslar va mashqlarni saytda ko‘ring. Telegram botimiz orqali ham dars kodlari va yangiliklar bilan tanishing.</p>
        <p className="mt-4">
          <Link href="/" className="inline-block rounded-full bg-orange-700 px-5 py-3 font-semibold text-white hover:bg-orange-800">EduLevel bosh sahifasi</Link>
        </p>
      </section>
      {relatedPages.length ? (
        <section className="mt-10">
          <h2 className="text-xl font-bold">Shu mavzuga bog‘liq sahifalar</h2>
          <ul className="mt-3 list-disc space-y-2 pl-6">
            {relatedPages.map((r) => (
              <li key={r.path}><Link href={r.path} className="underline">{r.name}</Link></li>
            ))}
          </ul>
        </section>
      ) : null}
      <nav aria-label="Barcha o‘quv sahifalari" className="mt-10 border-t border-neutral-200 pt-6 text-sm text-neutral-700">
        <p className="font-semibold">Boshqa o‘quv sahifalari</p>
        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
          {otherPages.map((p) => (
            <li key={p.path}><Link href={p.path} className="underline">{p.name}</Link></li>
          ))}
          {extraLinks.map((p) => (
            <li key={p.path}><Link href={p.path} className="underline">{p.name}</Link></li>
          ))}
        </ul>
      </nav>
      <p className="mt-8 text-sm text-neutral-600">
        Boshqa sahifalar: <Link href="/ielts-tayyorgarlik" className="underline">IELTS tayyorgarlik</Link> ·{' '}
        <Link href="/cefr-tayyorgarlik" className="underline">CEFR tayyorgarlik</Link> ·{' '}
        <Link href="/ingliz-tili-darslari" className="underline">Ingliz tili darslari</Link>
      </p>
    </main>
  );
}
