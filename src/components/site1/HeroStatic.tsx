import Link from 'next/link';
import { ArrowUpRight, ArrowRight, BookOpen, GraduationCap, AudioLines, Layers3 } from 'lucide-react';

const paths = [
  { title: 'IELTS', detail: 'Academic · General Training', href: '/ielts-tayyorgarlik', icon: GraduationCap, tone: 'blue' },
  { title: 'CEFR', detail: 'A1 – B2 · Darajalar', href: '/cefr-tayyorgarlik', icon: Layers3, tone: 'green' },
  { title: 'General English', detail: 'Grammar · Vocabulary', href: '/ingliz-tili-darslari', icon: BookOpen, tone: 'violet' },
];

/** One public hero shared by the first HTML and the interactive landing. No database or animation gate. */
export function HeroStatic({ onStart, signedIn = false }: { onStart?: () => void; signedIn?: boolean }) {
  return (
    <section id="top" aria-label="EduLevel" className="vision-hero" data-no-reveal>
      <div className="vision-wrap">
        <div className="vision-grid">
          <div className="vision-copy">
            <h1>Ingliz tilini o‘rganishning <span>yangi darajasi.</span></h1>
            <p>IELTS, CEFR va General English — bitta platformada. EduBek AI bilan mashq qiling, darajangizni aniqlang va maqsadingiz sari izchil harakat qiling.</p>
            <div className="vision-actions">
              {onStart
                ? <button className="vision-primary" onClick={onStart} type="button">{signedIn ? 'Kabinetga o‘tish' : 'O‘qishni boshlash'} <ArrowUpRight size={18} aria-hidden="true"/></button>
                : <Link className="vision-primary" href="/#/auth">O‘qishni boshlash <ArrowUpRight size={18} aria-hidden="true"/></Link>}
              <Link className="vision-secondary" href="/ingliz-tili-darslari">Darslarni ko‘rish <ArrowRight size={17} aria-hidden="true"/></Link>
            </div>
            <div className="vision-proof"><span>◎ Shaxsiy o‘quv yo‘li</span><span>✓ AI bilan mashq</span><span>✓ Daraja testi</span></div>
          </div>
          <div className="vision-scene" aria-label="EduBek — ingliz tili yordamchisi">
            <div className="vision-orbit vision-orbit-a" aria-hidden="true"/><div className="vision-orbit vision-orbit-b" aria-hidden="true"/>
            <div className="vision-platform" aria-hidden="true"/>
            <div className="vision-robot">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/edubek/body-happy.webp" width="461" height="459" alt="" decoding="async"/>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="vision-head" src="/edubek/head-happy.webp" width="461" height="459" alt="EduBek" fetchPriority="high" decoding="async"/>
            </div>
            <div className="vision-float vision-float-a"><span className="vision-mini blue"><GraduationCap size={21}/></span><div><strong>IELTS</strong><small>Band maqsadi</small></div></div>
            <div className="vision-float vision-float-b"><span className="vision-mini green"><Layers3 size={21}/></span><div><strong>CEFR</strong><small>A1 – B2</small></div></div>
            <div className="vision-float vision-float-c"><span className="vision-mini violet"><AudioLines size={21}/></span><div><strong>EduBek AI</strong><small>Shaxsiy yordamchi</small></div></div>
          </div>
        </div>
        <div className="vision-paths" aria-label="Ta’lim yo‘nalishlari">{paths.map(p =>
          <Link className="vision-path" href={p.href} key={p.title}><span className={'vision-mini '+p.tone}><p.icon size={21} aria-hidden="true"/></span><div><strong>{p.title}</strong><small>{p.detail}</small></div><ArrowUpRight className="vision-arrow" size={19} aria-hidden="true"/></Link>
        )}</div>
      </div>
    </section>
  );
}

export function HeroLoading({ error, onRetry }: { error?: boolean; onRetry?: () => void }) {
  return <div className="vision-shell">
    <nav className="vision-nav" aria-label="Asosiy menyu">
      <Link className="vision-logo" href="/">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/edulevel-mark.webp" alt="" width="34" height="34"/> EduLevel
      </Link>
      <div className="vision-nav-links"><Link href="/ielts-tayyorgarlik">IELTS</Link><Link href="/cefr-tayyorgarlik">CEFR</Link><Link href="/ingliz-tili-darslari">General English</Link></div>
      <a className="vision-login" href="/#/auth">Kirish <ArrowUpRight size={15} aria-hidden="true"/></a>
    </nav>
    <HeroStatic/>
    {error && <div className="vision-notice" role="status">Ba’zi ma’lumotlar yuklanmadi. Ochiq darslarni ko‘rishingiz mumkin. {onRetry && <button type="button" onClick={onRetry}>Qayta urinish</button>}</div>}
  </div>;
}
