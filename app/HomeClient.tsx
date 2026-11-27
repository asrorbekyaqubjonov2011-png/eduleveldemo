'use client';

import { createContext, useContext } from 'react';
import dynamic from 'next/dynamic';
import { HeroStatic } from '@/src/components/site1/HeroStatic';
import type { HeroPublicData } from '@/src/lib/seo/heroPhoto';

// The hero data read on the server (owner's saved settings). Passed down so the server-rendered first screen and the
// client app show the same numbers and photo.
const HeroDataContext = createContext<HeroPublicData | null>(null);

/**
 * The interactive app runs only in the browser. While its code loads, the server-rendered hero is shown in the same
 * place (so the page already has its visible content and its main heading in the first HTML response).
 */
function HeroWhileLoading() {
  const data = useContext(HeroDataContext);
  return <HeroStatic data={data} />;
}

const App = dynamic(() => import('@/src/App'), { ssr: false, loading: () => <HeroWhileLoading /> });

export default function HomeClient({ hero }: { hero: HeroPublicData }) {
  return (
    <HeroDataContext.Provider value={hero}>
      <App />
    </HeroDataContext.Provider>
  );
}
