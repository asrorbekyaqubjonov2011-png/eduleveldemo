'use client';
import Script from 'next/script';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { useState } from 'react';

/**
 * Telegram Mini App: a light launcher inside Telegram. It shows no personal data and needs no sign-in; every shortcut
 * opens a public page of the site. Colours follow the user's Telegram theme when it is available.
 */
const LINKS = [
  { href: '/english/level-test', title: 'Daraja testi', hint: 'Darajangizni aniqlang' },
  { href: '/ielts/mock-test', title: 'IELTS mock test', hint: 'Imtihon formatida mashq' },
  { href: '/cefr/mock-test', title: 'CEFR mock test', hint: 'A1–C2 bo‘yicha sinov' },
  { href: '/edubek-ai', title: 'EduBek AI', hint: 'Suhbat va tushuntirish' },
  { href: '/english/vocabulary', title: 'Lug‘at', hint: 'Mavzular bo‘yicha so‘zlar' },
  { href: '/english/grammar', title: 'Grammatika', hint: 'Qoidalar va mashqlar' }
];

interface TgWebApp {
  ready?: () => void;
  expand?: () => void;
  colorScheme?: 'light' | 'dark';
  initData?: string;
}

export default function MiniAppPage() {
  const [dark, setDark] = useState(false);
  const [verified, setVerified] = useState(false);
  const init = () => {
    const tg = (window as unknown as { Telegram?: { WebApp?: TgWebApp } }).Telegram?.WebApp;
    if (!tg) return;
    tg.ready?.();
    tg.expand?.();
    setDark(tg.colorScheme === 'dark');
    if (tg.initData) {
      void fetch('/api/telegram/miniapp', {
        method: 'POST',
        headers: { 'x-telegram-init-data': tg.initData },
      }).then((response) => setVerified(response.status === 204)).catch(() => setVerified(false));
    }
  };
  return (
    <main className={dark ? 'vision-mini-app dark' : 'vision-mini-app'}>
      <Script src="https://telegram.org/js/telegram-web-app.js" strategy="afterInteractive" onReady={init} />
      <div className="vision-mini-app-inner">
        <h1>EduLevel</h1>
        <p>Ingliz tilini bosqichma-bosqich o‘rganing.</p>
        {verified && <p role="status">Telegram ochilishi tasdiqlandi.</p>}
        <nav aria-label="Ta’lim yo‘nalishlari">
          {LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="vision-path">
              <span><strong>{link.title}</strong><small>{link.hint}</small></span>
              <ArrowUpRight className="vision-arrow" size={18} aria-hidden="true" />
            </Link>
          ))}
        </nav>
      </div>
    </main>
  );
}
