/**
 * The public EduBek helper (landing page, no sign-in) answers from the site's own data, so it costs nothing and never
 * invents facts. This matches a typed question to one of its topics; anything else is sent to the real AI chat.
 */
export type DockTopic = 'level' | 'vip' | 'news' | 'teacher' | 'start' | 'ielts' | 'books';

const RULES: { topic: DockTopic; re: RegExp }[] = [
  { topic: 'vip', re: /\b(vip|tarif|narx|narxi|to['‘’`]?lov|obuna|pul|qancha|price|cost|plan)/i },
  { topic: 'level', re: /(daraja|level|a1|a2|b1|b2|c1|c2|test|sinov|aniqla|mos kel)/i },
  { topic: 'news', re: /(yangilik|aksiya|chegirma|bepul vip|sovg['‘’`]?a|news)/i },
  { topic: 'teacher', re: /(ustoz|o['‘’`]?qituvchi|muallif|teacher|jasurbek|metodist)/i },
  { topic: 'ielts', re: /(ielts|cefr|multilevel|milliy sertifikat|imtihon)/i },
  { topic: 'books', re: /(kitob|book|darslik|elektron|pdf)/i },
  { topic: 'start', re: /(boshla|ro['‘’`]?yxat|kirish|kabinet|register|sign ?up|login|qanday)/i }
];

export function matchDockTopic(text: string): DockTopic | null {
  const t = (text || '').trim().slice(0, 300);
  if (t.length < 2) return null;
  for (const r of RULES) if (r.re.test(t)) return r.topic;
  return null;
}
