'use client';
import Script from 'next/script';
import { useEffect, useState } from 'react';

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
}

export default function MiniAppPage() {
  const [dark, setDark] = useState(false);
  const init = () => {
    const tg = (window as unknown as { Telegram?: { WebApp?: TgWebApp } }).Telegram?.WebApp;
    if (!tg) return;
    tg.ready?.();
    tg.expand?.();
    setDark(tg.colorScheme === 'dark');
  };
  useEffect(() => {
    init();
  }, []);
  const bg = dark ? '#0f1115' : '#f5f6f8';
  const card = dark ? '#1a1d24' : '#ffffff';
  const fg = dark ? '#f2f3f5' : '#111317';
  const sub = dark ? '#a3a8b3' : '#5b616e';
  return (
    <main style={{ minHeight: '100vh', background: bg, color: fg, padding: '20px 16px 32px', fontFamily: 'system-ui, sans-serif' }}>
      <Script src="https://telegram.org/js/telegram-web-app.js" strategy="afterInteractive" onLoad={init} />
      <h1 style={{ fontSize: 22, margin: '0 0 4px' }}>EduLevel</h1>
      <p style={{ margin: '0 0 16px', color: sub, fontSize: 14 }}>Ingliz tilini bosqichma-bosqich o‘rganing.</p>
      <div style={{ display: 'grid', gap: 10 }}>
        {LINKS.map((l) => (
          <a key={l.href} href={l.href} style={{ display: 'block', background: card, color: fg, borderRadius: 14, padding: '14px 16px', textDecoration: 'none', minHeight: 44 }}>
            <strong style={{ display: 'block', fontSize: 16 }}>{l.title}</strong>
            <span style={{ color: sub, fontSize: 13 }}>{l.hint}</span>
          </a>
        ))}
      </div>
    </main>
  );
}
