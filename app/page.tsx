import HomeClient from './HomeClient';
import { heroPublicData } from '@/src/lib/seo/heroPhoto';
import { imageKitUrl } from '@/src/lib/media/imageUrl';

// Re-rendered at most every 5 minutes, so a changed teacher photo shows up without a deploy.
export const revalidate = 300;

/**
 * Homepage. The first HTML response already contains the visible hero (heading, lead, links and the owner's real
 * numbers) and the links to the main learning pages, so visitors see content at once and search engines do not
 * depend on the browser app loading. The interactive app takes over the same place once it has loaded.
 */
export default async function Page() {
  const hero = await heroPublicData();
  return (
    <>
      {hero.photo ? <link rel="preload" as="image" href={imageKitUrl(hero.photo)} fetchPriority="high" /> : null}
      <nav aria-label="Asosiy bo‘limlar" className="sr-only">
        <ul>
          <li><a href="/ielts-tayyorgarlik">IELTS tayyorgarlik</a></li>
          <li><a href="/cefr-tayyorgarlik">CEFR tayyorgarlik</a></li>
          <li><a href="/ingliz-tili-darslari">Ingliz tili darslari</a></li>
        </ul>
      </nav>
      <HomeClient hero={hero} />
    </>
  );
}
