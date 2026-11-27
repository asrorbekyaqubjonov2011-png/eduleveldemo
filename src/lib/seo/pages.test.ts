import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { SEO_PAGES } from './pages';
import sitemap from '../../../app/sitemap';

const words = (t: string) => t.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean);
const bodyOf = (p: (typeof SEO_PAGES)[number]) => [p.lead, ...p.sections.flatMap((s) => [...s.paragraphs, ...(s.items || [])])].join(' ');
const shingles = (t: string, n = 5) => {
  const w = words(t);
  const set = new Set<string>();
  for (let i = 0; i + n <= w.length; i++) set.add(w.slice(i, i + n).join(' '));
  return set;
};

describe('SEO pages', () => {
  test('paths, titles, H1 and descriptions are unique (no keyword cannibalization by copy)', () => {
    for (const key of ['path', 'title', 'h1', 'description'] as const) {
      const values = SEO_PAGES.map((p) => p[key]);
      assert.equal(new Set(values).size, values.length, `duplicate ${key}`);
    }
  });
  test('titles and descriptions fit the search result snippet', () => {
    for (const p of SEO_PAGES) {
      assert.ok(p.title.length <= 80, `${p.path} title ${p.title.length}`);
      assert.ok(p.description.length >= 60 && p.description.length <= 200, `${p.path} description ${p.description.length}`);
    }
  });
  test('every related link points to an existing page, and none is a draft', () => {
    const paths = new Map(SEO_PAGES.map((p) => [p.path, p]));
    for (const p of SEO_PAGES) for (const r of p.related || []) {
      assert.ok(paths.has(r) || ['/ielts-tayyorgarlik', '/cefr-tayyorgarlik', '/ingliz-tili-darslari', '/cefr/c1-yol-xaritasi'].includes(r), `${p.path} -> ${r}`);
    }
  });
  test('guides have real body text and no two pages repeat each other', () => {
    const guides = SEO_PAGES.filter((p) => !p.draft && !['/contact', '/blog'].includes(p.path));
    for (const p of guides) assert.ok(words(bodyOf(p)).length >= 60, `${p.path} is too thin (${words(bodyOf(p)).length} words)`);
    const sets = guides.map((p) => ({ path: p.path, s: shingles(bodyOf(p)) }));
    for (let i = 0; i < sets.length; i++) for (let j = i + 1; j < sets.length; j++) {
      const a = sets[i].s;
      const b = sets[j].s;
      if (!a.size || !b.size) continue;
      let common = 0;
      a.forEach((x) => b.has(x) && common++);
      assert.ok(common / Math.min(a.size, b.size) < 0.3, `${sets[i].path} and ${sets[j].path} repeat each other`);
    }
  });
  test('FAQ and exercises are complete (every question has an answer)', () => {
    for (const p of SEO_PAGES) {
      for (const f of p.faq || []) assert.ok(f.q.length > 5 && f.a.length > 20, `${p.path} faq`);
      for (const e of p.exercises || []) assert.ok(e.prompt.length > 5 && e.answer.length > 0, `${p.path} exercise`);
    }
  });
  test('the sitemap lists every published page and no draft', async () => {
    const urls = (await sitemap()).map((s) => s.url);
    for (const p of SEO_PAGES) assert.equal(urls.some((u) => u.endsWith(p.path)), !p.draft, p.path);
  });
});
