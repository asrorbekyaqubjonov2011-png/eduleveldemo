/**
 * Owner-written SEO pages (stored in content_items, kind "seo_page"). The owner writes or edits a page here; a page
 * becomes public only after the owner confirms they read it ("reviewed") and it passes the quality checks. Text only:
 * no HTML is accepted, and the page template escapes everything.
 */
import { similarity } from '../aiQuestions';
import type { EduFaq, EduSection } from '@/src/components/seo/EduPage';
import type { SeoPage } from './pages';

export interface SeoRecord {
  /** Slug without a leading slash, e.g. "blog/ielts-writing-xatolari". Also the row id. */
  id: string;
  title: string;
  description: string;
  h1: string;
  lead: string;
  sections: EduSection[];
  faq: EduFaq[];
  /** Paths of code pages to link to (internal links). */
  related: string[];
  status: 'draft' | 'published';
  /** Hidden from search engines and the sitemap even when published. */
  noindex: boolean;
  /** The text was written with AI: it needs the owner's review before publishing. */
  aiGenerated: boolean;
  /** The owner confirmed they read the text and checked the facts. */
  reviewed: boolean;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  history: { at: string; action: string }[];
}

export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)?$/;
const RESERVED_FIRST = new Set(['api', '_next', 'static', 'brand', 'uploads', 'admin', 'sitemap.xml', 'robots.txt', 'icon.png', 'opengraph-image.png', 'favicon.ico']);
/** Top-level folders that already have their own pages in the app. */
const APP_FOLDERS = new Set(['ielts-tayyorgarlik', 'cefr-tayyorgarlik', 'ingliz-tili-darslari']);

const HTML = /<\/?[a-z][^>]*>/i;
const clip = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, max) : '');
const words = (t: string) => t.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean);

/** Cleans what the owner typed into a record. Unknown fields are dropped; lists and lengths are bounded. */
export function normalizeRecord(input: unknown, now = new Date().toISOString(), previous?: SeoRecord): SeoRecord {
  const r = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const sections: EduSection[] = (Array.isArray(r.sections) ? r.sections : []).slice(0, 12).map((s) => {
    const x = (s && typeof s === 'object' ? s : {}) as Record<string, unknown>;
    const items = (Array.isArray(x.items) ? x.items : []).map((i) => clip(i, 400)).filter(Boolean).slice(0, 12);
    return { heading: clip(x.heading, 120), paragraphs: (Array.isArray(x.paragraphs) ? x.paragraphs : []).map((p) => clip(p, 2000)).filter(Boolean).slice(0, 8), ...(items.length ? { items } : {}) };
  }).filter((s) => s.heading && (s.paragraphs.length || s.items?.length));
  const faq: EduFaq[] = (Array.isArray(r.faq) ? r.faq : []).slice(0, 10).map((f) => {
    const x = (f && typeof f === 'object' ? f : {}) as Record<string, unknown>;
    return { q: clip(x.q, 200), a: clip(x.a, 1200) };
  }).filter((f) => f.q && f.a);
  const related = Array.from(new Set((Array.isArray(r.related) ? r.related : []).map((p) => clip(p, 120)).filter((p) => p.startsWith('/')))).slice(0, 10);
  return {
    id: clip(r.id, 90).replace(/^\/+|\/+$/g, '').toLowerCase(),
    title: clip(r.title, 120),
    description: clip(r.description, 300),
    h1: clip(r.h1, 160),
    lead: clip(r.lead, 600),
    sections,
    faq,
    related,
    status: r.status === 'published' ? 'published' : 'draft',
    noindex: r.noindex === true,
    aiGenerated: r.aiGenerated === true,
    reviewed: r.reviewed === true,
    createdAt: previous?.createdAt ?? now,
    updatedAt: now,
    publishedAt: previous?.publishedAt,
    history: previous?.history ?? []
  };
}

export interface OtherPage { path: string; title: string; description: string; h1: string; body: string }

export const bodyText = (p: { lead: string; sections: EduSection[]; faq?: EduFaq[] }) =>
  [p.lead, ...p.sections.flatMap((s) => [s.heading, ...s.paragraphs, ...(s.items || [])]), ...(p.faq || []).flatMap((f) => [f.q, f.a])].join(' ');

export interface Validation { errors: string[]; warnings: string[]; words: number }

/**
 * Quality checks. Errors block publishing; warnings are advice. Duplicates are checked against every other page
 * (code pages and the owner's other pages), so two pages cannot compete for the same title or repeat each other's text.
 */
export function validateRecord(rec: SeoRecord, others: OtherPage[], codePaths: string[]): Validation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const path = '/' + rec.id;
  if (!SLUG_RE.test(rec.id) || rec.id.length > 80) errors.push('Manzil (slug) noto‘g‘ri: faqat kichik lotin harflar, raqamlar va tire; bitta "/" mumkin (masalan blog/ielts-maslahatlar).');
  else if (RESERVED_FIRST.has(rec.id.split('/')[0]) || APP_FOLDERS.has(rec.id.split('/')[0]) || codePaths.includes(path)) errors.push('Bu manzil band yoki tizim uchun saqlangan.');
  if (rec.title.length < 10) errors.push('Sarlavha (title) kamida 10 belgi bo‘lsin.');
  if (rec.description.length < 50) errors.push('Tavsif (description) kamida 50 belgi bo‘lsin.');
  if (rec.h1.length < 5) errors.push('H1 sarlavha kerak.');
  if (rec.lead.length < 40) errors.push('Kirish matni (lead) kamida 40 belgi bo‘lsin.');
  for (const [name, value] of [['title', rec.title], ['description', rec.description], ['h1', rec.h1], ['lead', rec.lead]] as const) if (HTML.test(value)) errors.push(`${name} ichida HTML teg bor: faqat oddiy matn qabul qilinadi.`);
  for (const s of rec.sections) for (const t of [s.heading, ...s.paragraphs, ...(s.items || [])]) if (HTML.test(t)) { errors.push('Bo‘limlarda HTML teg bor: faqat oddiy matn qabul qilinadi.'); break; }
  const total = words(bodyText(rec)).length;
  if (rec.sections.length < 2) errors.push('Kamida 2 ta bo‘lim kerak.');
  if (total < 250) errors.push(`Matn juda qisqa (${total} so‘z): kamida 250 so‘z kerak.`);
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();
  for (const o of others) {
    if (o.path === path) continue;
    if (norm(o.title) === norm(rec.title)) errors.push(`Sarlavha ${o.path} sahifasi bilan bir xil.`);
    if (norm(o.description) === norm(rec.description)) errors.push(`Tavsif ${o.path} sahifasi bilan bir xil.`);
    if (norm(o.h1) === norm(rec.h1)) errors.push(`H1 ${o.path} sahifasi bilan bir xil.`);
  }
  const mine = new Set<string>();
  const mw = words(bodyText(rec));
  for (let i = 0; i + 5 <= mw.length; i++) mine.add(mw.slice(i, i + 5).join(' '));
  for (const o of others) {
    if (o.path === path || !mine.size) continue;
    const ow = words(o.body);
    const theirs = new Set<string>();
    for (let i = 0; i + 5 <= ow.length; i++) theirs.add(ow.slice(i, i + 5).join(' '));
    let common = 0;
    mine.forEach((x) => theirs.has(x) && common++);
    if (theirs.size && common / Math.min(mine.size, theirs.size) >= 0.3) errors.push(`Matn ${o.path} sahifasini takrorlaydi (takror kontent).`);
    else if (similarity(rec.title, o.title) >= 0.8) warnings.push(`Sarlavha ${o.path} ga juda o‘xshash: bir xil so‘rov uchun raqobat (kannibalizatsiya) bo‘lishi mumkin.`);
  }
  if (rec.title.length > 70) warnings.push('Sarlavha 70 belgidan uzun: qidiruvda qisqartirilishi mumkin.');
  if (rec.description.length > 170) warnings.push('Tavsif 170 belgidan uzun: qidiruvda qisqartirilishi mumkin.');
  if (!rec.faq.length) warnings.push('Savol-javob yo‘q: FAQ bo‘limi foydalanuvchiga va qidiruvga yordam beradi (faqat haqiqiy savollar).');
  if (!rec.related.length) warnings.push('Ichki havolalar yo‘q: kamida 2–3 ta tegishli sahifaga havola bering.');
  for (const r of rec.related) if (!codePaths.includes(r)) warnings.push(`Havola ${r} mavjud sahifa emas.`);
  if (rec.aiGenerated && !rec.reviewed) errors.push('AI yozgan matn: nashrdan oldin o‘zingiz o‘qib chiqib, faktlarni tekshirganingizni tasdiqlang.');
  if (!rec.reviewed) errors.push('Nashr uchun «matnni o‘qib chiqdim va faktlarni tekshirdim» belgisi kerak.');
  return { errors: Array.from(new Set(errors)), warnings: Array.from(new Set(warnings)), words: total };
}

/** The public page for a record. */
export function recordToPage(rec: SeoRecord): SeoPage {
  const name = rec.h1.length > 40 ? rec.title.split('|')[0].trim().slice(0, 40) : rec.h1;
  return { path: '/' + rec.id, name, title: rec.title, description: rec.description, h1: rec.h1, lead: rec.lead, sections: rec.sections, faq: rec.faq, related: rec.related, updated: rec.updatedAt.slice(0, 10), noindexOverride: rec.noindex };
}
