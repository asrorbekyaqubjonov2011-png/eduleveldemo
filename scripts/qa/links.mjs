#!/usr/bin/env node
// Link and anchor check for the public site. Starts at the landing, renders each page with Playwright (the landing
// is drawn in the browser), and follows same-origin links up to --max-pages pages. Reports:
//   - every internal link that does not return 200 (redirects are followed);
//   - every #anchor whose id does not exist on the page it points to;
//   - the section ids the landing needs for its menu and buttons, when one is missing.
// External links (other sites, mailto:, tel:) and /api/ and /_next/ paths are not checked.
//
// Usage: node scripts/qa/links.mjs [--base <url>] [--out <dir>] [--max-pages 8] [--ids a,b,c]
// Exit codes: 0 no problems, 1 problems found, 2 setup error.
import fs from 'node:fs';
import path from 'node:path';
import { REPO_ROOT, DEFAULT_BASE, parseArgs, classifyHref, missingIds, launchBrowser, sleep, discoverRoutes } from './lib.mjs';

const USAGE = `Usage: node scripts/qa/links.mjs [options]

  --base <url>        server to check (default ${DEFAULT_BASE})
  --out <dir>         also write links.json there
  --max-pages <n>     pages to render, the landing included (default 8)
  --ids <list>        section ids the landing must contain (default: ${'top,books,results,testimonials,vip,teacher-bio,faq,contact'})

Exit codes: 0 no problems, 1 problems found, 2 setup error.`;

// Ids the landing menu and buttons scroll to (src/components/common/Header.tsx navLinks, HeroSection, ContactSupportSection).
const DEFAULT_SECTION_IDS = ['top', 'books', 'results', 'testimonials', 'vip', 'teacher-bio', 'faq', 'contact'];

let args;
try {
  args = parseArgs(process.argv.slice(2), { base: 'string', out: 'string', 'max-pages': 'string', ids: 'list', help: 'bool' });
} catch (e) {
  console.error(`${e.message}\n${USAGE}`);
  process.exit(2);
}
if (args.help) {
  console.log(USAGE);
  process.exit(0);
}

const base = (args.base || DEFAULT_BASE).replace(/\/$/, '');
const origin = new URL(base).origin;
const maxPages = Math.max(1, Number(args['max-pages'] || 8));
const requiredIds = args.ids || DEFAULT_SECTION_IDS;

const problems = [];
const notes = [];
const counts = { renderedPages: 0, internalLinks: 0, anchors: 0, skipped: 0 };

const isPageLike = (pathname) => !/\.[a-z0-9]+$/i.test(pathname);

async function httpStatus(url) {
  try {
    const res = await fetch(url, { redirect: 'follow' });
    await res.text().catch(() => {});
    return res.status;
  } catch (e) {
    return `error ${e.cause?.code || e.message}`;
  }
}

async function render(page, pagePath) {
  const response = await page.goto(base + pagePath, { waitUntil: 'load', timeout: 60000 }).catch(() => null);
  await page
    .waitForFunction(() => (document.body ? document.body.innerText || '' : '').length >= 40, null, { timeout: 15000 })
    .catch(() => {});
  await sleep(1000);
  const data = await page.evaluate(() => ({
    ids: [...document.querySelectorAll('[id]')].map((e) => e.id),
    anchors: [...document.querySelectorAll('a[href]')].map((a) => ({ href: a.getAttribute('href') })),
  }));
  counts.renderedPages++;
  return { status: response ? response.status() : null, ids: new Set(data.ids), anchors: data.anchors };
}

async function main() {
  let browser;
  try {
    browser = await launchBrowser();
  } catch (e) {
    console.error(`Could not start the browser: ${String(e.message).split('\n')[0]}`);
    process.exit(2);
  }
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  await ctx.addInitScript(() => {
    try {
      sessionStorage.setItem('edulevel_intro_seen', '1');
    } catch {}
  });
  const page = await ctx.newPage();
  page.setDefaultTimeout(20000);

  // The landing first, then every static public page from app/, so the SEO pages' own links are checked too.
  const seeds = ['/', ...discoverRoutes(path.join(REPO_ROOT, 'app')).filter((r) => !r.dynamic).map((r) => r.url)];
  const seedSet = [...new Set(seeds)];
  const rendered = new Map();
  const queued = new Set(seedSet);
  const queue = [...seedSet];
  const statusCache = new Map();
  const fragments = [];
  let landingIds = new Set();

  while (queue.length) {
    const pagePath = queue.shift();
    const info = await render(page, pagePath);
    rendered.set(pagePath, info);
    if (pagePath === '/') landingIds = info.ids;
    if (info.status !== 200) problems.push({ kind: 'page', from: '(start)', to: pagePath, reason: `HTTP ${info.status}` });

    for (const anchor of info.anchors) {
      const link = classifyHref(anchor.href, base + pagePath, origin);
      if (link.kind === 'skip') {
        counts.skipped++;
        continue;
      }
      if (link.kind === 'fragment') {
        counts.anchors++;
        if (!info.ids.has(link.fragment)) {
          problems.push({ kind: 'anchor', from: pagePath, to: `#${link.fragment}`, reason: 'no element with this id on the same page' });
        }
        continue;
      }
      counts.internalLinks++;
      const target = link.url.pathname + link.url.search;
      if (!statusCache.has(target)) statusCache.set(target, await httpStatus(origin + target));
      const status = statusCache.get(target);
      if (status !== 200) problems.push({ kind: 'link', from: pagePath, to: target, reason: `HTTP ${status}, expected 200` });
      if (link.fragment) {
        counts.anchors++;
        fragments.push({ from: pagePath, target: link.url.pathname, fragment: link.fragment });
      }
      if (status === 200 && isPageLike(link.url.pathname) && !queued.has(link.url.pathname) && queued.size < maxPages) {
        queued.add(link.url.pathname);
        queue.push(link.url.pathname);
      }
    }
  }
  await browser.close().catch(() => {});

  for (const f of fragments) {
    const target = rendered.get(f.target);
    if (!target) {
      notes.push(`#${f.fragment} on ${f.target} (linked from ${f.from}) not checked: page not rendered (raise --max-pages)`);
      continue;
    }
    if (!target.ids.has(f.fragment)) {
      problems.push({ kind: 'anchor', from: f.from, to: `${f.target}#${f.fragment}`, reason: `no element with id "${f.fragment}" on ${f.target}` });
    }
  }
  for (const id of missingIds(requiredIds, landingIds)) {
    problems.push({ kind: 'section', from: '/', to: `#${id}`, reason: 'section id used by the landing menu or buttons is missing' });
  }

  console.log(
    `Rendered ${counts.renderedPages} page(s): ${[...rendered.keys()].join(', ')}. ` +
      `Checked ${counts.internalLinks} internal link(s) and ${counts.anchors} anchor(s); ${counts.skipped} link(s) not checked (external, mail, phone, API).`
  );
  for (const p of problems) console.log(`FAIL ${p.kind} ${p.from} -> ${p.to}: ${p.reason}`);
  for (const n of notes) console.log(`NOTE ${n}`);
  console.log(problems.length ? `FAIL: ${problems.length} problem(s)` : 'PASS: every internal link returns 200 and every anchor resolves');

  if (args.out) {
    fs.mkdirSync(path.resolve(args.out), { recursive: true });
    const report = { base, checkedAt: new Date().toISOString(), counts, problems, notes };
    fs.writeFileSync(path.join(path.resolve(args.out), 'links.json'), JSON.stringify(report, null, 2) + '\n');
  }
  process.exit(problems.length ? 1 : 0);
}

main().catch((e) => {
  console.error(`Link check error: ${String(e.message).split('\n')[0]}`);
  process.exit(2);
});
