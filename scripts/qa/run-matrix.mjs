#!/usr/bin/env node
// QA matrix runner. Visits every public route (app/**/page.tsx), opens every sidebar item of the student cabinet
// and of the owner panel, at 1440, 1024, 768 and 390 px, in light and dark theme (the theme toggle is used).
// Each view gets a PASS or FAIL verdict with the reasons, and a screenshot.
//
// Usage: node scripts/qa/run-matrix.mjs --out <dir> [--base http://localhost:3000] [options]   (see --help)
// Credentials for the student and owner areas come from QA_STUDENT_LOGIN, QA_STUDENT_PASSWORD, QA_OWNER_LOGIN
// (default jasurbek) and QA_OWNER_PASSWORD. Nothing is written to the output that contains them.
// Exit codes: 0 every view PASS, 1 at least one view FAIL, 2 setup error (arguments, credentials, browser, login).
import fs from 'node:fs';
import path from 'node:path';
import {
  REPO_ROOT,
  DEFAULT_BASE,
  parseArgs,
  discoverRoutes,
  judgeView,
  classifyConsole,
  slugify,
  sleep,
  launchBrowser,
} from './lib.mjs';

const USAGE = `Usage: node scripts/qa/run-matrix.mjs --out <dir> [options]

  --out <dir>          folder for summary.json, summary.md and shots/ (required)
  --base <url>         server to test (default ${DEFAULT_BASE})
  --widths <list>      widths in px (default 1440,1024,768,390)
  --themes <list>      light, dark (default light,dark); dark needs the theme toggle on the page
  --areas <list>       public, student, owner (default all three)
  --routes <list>      public paths to visit, e.g. /,/ielts-tayyorgarlik (default: every page.tsx route)
  --concurrency <n>    browser contexts at once (default 2)
  --no-full            skip the full-page screenshots of public routes

Environment: QA_STUDENT_LOGIN, QA_STUDENT_PASSWORD (student area), QA_OWNER_LOGIN (default jasurbek),
QA_OWNER_PASSWORD (owner area), QA_CHROMIUM_PATH and QA_PLAYWRIGHT_DIR (see scripts/qa/lib.mjs).
Exit codes: 0 every view PASS, 1 at least one view FAIL, 2 setup error.`;

const ALL_WIDTHS = [1440, 1024, 768, 390];
const HEIGHTS = { 1440: 900, 1024: 768, 768: 1024, 390: 844 };
const ALL_THEMES = ['light', 'dark'];
const ALL_AREAS = ['public', 'student', 'owner'];
const SETTLE_MS = 800; // after a sidebar click
const LANDING_SETTLE_MS = 1200; // after a public page loads (entrance animations)
const NOT_FOUND_PATH = '/__qa_missing_route__';
// HTTP answers that are not failures. Add { status, path, areas: [...] } when an endpoint must answer 401, 403 or 429
// for a view. Empty by default: every status >= 400 on a same-origin request is reported.
const EXPECTED_HTTP = [];

class SetupError extends Error {}

const SPEC = {
  out: 'string',
  base: 'string',
  widths: 'list',
  themes: 'list',
  areas: 'list',
  routes: 'list',
  concurrency: 'string',
  'no-full': 'bool',
  help: 'bool',
};

let args;
try {
  args = parseArgs(process.argv.slice(2), SPEC);
} catch (e) {
  console.error(e.message);
  console.error(USAGE);
  process.exit(2);
}
if (args.help) {
  console.log(USAGE);
  process.exit(0);
}
if (!args.out) {
  console.error('--out <dir> is required');
  console.error(USAGE);
  process.exit(2);
}

const base = (args.base || DEFAULT_BASE).replace(/\/$/, '');
const origin = new URL(base).origin;
const widths = (args.widths || ALL_WIDTHS.map(String)).map(Number);
const themes = args.themes || ALL_THEMES;
const areas = args.areas || ALL_AREAS;
const concurrency = Math.max(1, Number(args.concurrency || 2));
const withFull = !args['no-full'];
const outDir = path.resolve(args.out);
const shotsDir = path.join(outDir, 'shots');

const badOption = (name, value, allowed) => value.filter((v) => !allowed.includes(v)).map((v) => `--${name} ${v}`);
const invalid = [
  ...widths.filter((w) => !Number.isInteger(w) || w < 320).map((w) => `--widths ${w}`),
  ...badOption('themes', themes, ALL_THEMES),
  ...badOption('areas', areas, ALL_AREAS),
].filter(Boolean);
if (invalid.length || !Number.isFinite(concurrency)) {
  console.error(`Invalid option value: ${invalid.join(', ') || '--concurrency'}`);
  process.exit(2);
}

const CREDS = {
  student: {
    loginInput: process.env.QA_STUDENT_LOGIN,
    password: process.env.QA_STUDENT_PASSWORD,
    names: ['QA_STUDENT_LOGIN', 'QA_STUDENT_PASSWORD'],
  },
  owner: {
    loginInput: process.env.QA_OWNER_LOGIN || 'jasurbek',
    password: process.env.QA_OWNER_PASSWORD,
    names: ['QA_OWNER_PASSWORD'],
  },
};
const missingEnv = [];
for (const area of areas.filter((a) => a !== 'public')) {
  if (!CREDS[area].password) missingEnv.push(`QA_${area.toUpperCase()}_PASSWORD`);
  if (area === 'student' && !CREDS.student.loginInput) missingEnv.push('QA_STUDENT_LOGIN');
}
if (missingEnv.length) {
  console.error(`Missing environment variables: ${[...new Set(missingEnv)].join(', ')}`);
  process.exit(2);
}

const allRoutes = discoverRoutes(path.join(REPO_ROOT, 'app'));
const skippedDynamic = allRoutes.filter((r) => r.dynamic).map((r) => r.url);
const publicPaths = allRoutes
  .filter((r) => !r.dynamic && (!args.routes || args.routes.includes(r.url)))
  .map((r) => r.url);
if (!args.routes) publicPaths.push(NOT_FOUND_PATH);

const pathOf = (url) => new URL(url).pathname;
const plain = (text) => String(text || '').replace(/\x1b\[[0-9;]*m/g, '');
const firstLine = (text) => plain(text).split('\n')[0].slice(0, 240);
// Playwright names the blocking element in its call log ("... intercepts pointer events"); keep that line.
const clickReason = (e) => {
  const lines = plain(e.message).split('\n').map((l) => l.trim());
  const why = lines.find((l) => /intercepts pointer events|not visible|outside of the viewport|not stable|not enabled/.test(l));
  return (why || lines[0] || 'click failed').slice(0, 240);
};

function isExpected(status, urlPath, area) {
  return EXPECTED_HTTP.some((r) => r.status === status && urlPath.startsWith(r.path) && r.areas.includes(area));
}

// Runs in the page. Plain JavaScript only: it is serialised and sent to the browser.
function domFacts() {
  const text = document.body ? document.body.innerText || '' : '';
  const rawMarkup = [];
  for (const m of text.matchAll(/<\/?[a-zA-Z][a-zA-Z0-9-]*(\s[^<>]{0,160})?\/?>/g)) rawMarkup.push(m[0].slice(0, 80));
  for (const m of text.matchAll(/&(amp|lt|gt|quot|#\d+);/g)) rawMarkup.push(m[0]);
  const badTokens = [...text.matchAll(/\bundefined\b|\bNaN\b|\[object Object\]/g)].map((m) => m[0]);
  const brokenImages = [...document.images]
    .filter((img) => img.complete && img.naturalWidth === 0 && img.currentSrc && !/\.svg([?#]|$)/i.test(img.currentSrc))
    .map((img) => img.currentSrc.slice(0, 120));
  // Header controls must receive clicks: report any that another element covers.
  const coveredControls = [];
  for (const label of ['Light/Dark rejim', 'Menyu']) {
    const el = document.querySelector(`button[aria-label="${label}"]`);
    if (!el || !el.offsetParent) continue;
    const r = el.getBoundingClientRect();
    const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    if (top && top !== el && !el.contains(top)) {
      const host = top.closest('button, a') || top;
      coveredControls.push(`${label} covered by ${host.tagName.toLowerCase()} "${(host.textContent || '').trim().slice(0, 30)}"`);
    }
  }
  return {
    coveredControls,
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    textLen: text.length,
    badTokens: badTokens.slice(0, 5),
    rawMarkup: rawMarkup.slice(0, 5),
    brokenImages: brokenImages.slice(0, 5),
    title: document.title || '',
    dark: document.documentElement.classList.contains('dark'),
  };
}

function attachCollectors(page, area) {
  const live = { console: [], pageErrors: [], http: [], failed: [] };
  page.on('console', (m) => {
    if (m.type() === 'error') live.console.push(m.text());
  });
  page.on('pageerror', (e) => live.pageErrors.push(e.message));
  page.on('response', (r) => {
    const url = r.url();
    if (!url.startsWith(origin) || r.status() < 400 || r.request().isNavigationRequest()) return;
    live.http.push({ status: r.status(), path: pathOf(url), area });
  });
  page.on('requestfailed', (r) => {
    const url = r.url();
    const reason = r.failure() ? r.failure().errorText : 'failed';
    if (url.startsWith(origin) && url.includes('/api/') && !reason.includes('ABORTED')) {
      live.failed.push(`${r.method()} ${pathOf(url)} (${reason})`);
    }
  });
  live.take = () => ({
    console: live.console.splice(0),
    pageErrors: live.pageErrors.splice(0),
    http: live.http.splice(0),
    failed: live.failed.splice(0),
  });
  return live;
}

function factsFrom(snap, dom, area, navError, httpStatus) {
  return {
    navError,
    httpStatus,
    pageErrors: snap.pageErrors,
    consoleErrors: snap.console.filter((t) => classifyConsole(t) === 'error').map((t) => t.slice(0, 200)),
    httpErrors: snap.http
      .filter((h) => !isExpected(h.status, h.path, area))
      .map((h) => `${h.status} ${h.path}`),
    requestFailures: snap.failed,
    ...dom,
  };
}

async function waitForContent(page, minChars, timeout) {
  await page
    .waitForFunction((min) => (document.body ? document.body.innerText || '' : '').length >= min, minChars, { timeout })
    .catch(() => {});
}

async function isDark(page) {
  return page.evaluate(() => document.documentElement.classList.contains('dark'));
}

// Brings the page to the requested theme with the toggle, when the toggle is on the page.
async function ensureTheme(page, theme) {
  const toggle = page.locator('button[aria-label="Light/Dark rejim"]').first();
  const present = (await toggle.count()) > 0;
  let dark = await isDark(page);
  let error;
  if (present && (theme === 'dark') !== dark) {
    try {
      await toggle.click({ timeout: 5000 });
    } catch (e) {
      error = `theme toggle could not be clicked: ${clickReason(e)}`;
    }
    await sleep(400);
    dark = await isDark(page);
  }
  return { present, dark, error };
}

async function takeShot(page, id, full) {
  const rel = `shots/${id}${full ? '-full' : ''}.png`;
  await page.screenshot({ path: path.join(outDir, rel), fullPage: full }).catch(() => {});
  return rel;
}

async function sweep(page) {
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < height; y += 700) {
    await page.evaluate((v) => window.scrollTo(0, v), y);
    await sleep(50);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(400);
}

function themeIssues(theme, info) {
  const issues = info.error ? [info.error] : [];
  if (theme !== 'dark') return issues;
  if (!info.present) return [...issues, 'theme toggle (Light/Dark rejim) not found, so the dark view could not be set'];
  if (!info.dark && !info.error) issues.push('dark theme did not apply after the toggle was clicked');
  return issues;
}

async function publicView(page, live, group, urlPath, index) {
  const { width, theme } = group;
  const notFound = urlPath === NOT_FOUND_PATH;
  const name = notFound ? 'not-found (404)' : urlPath;
  const id = `public-${width}-${theme}-${String(index).padStart(2, '0')}-${slugify(urlPath === '/' ? 'home' : urlPath, 40)}`;
  const t0 = Date.now();
  live.take();
  let httpStatus;
  let navError;
  let themeInfo = { present: false, dark: false };
  try {
    const response = await page.goto(base + urlPath, { waitUntil: 'load', timeout: 60000 });
    httpStatus = response ? response.status() : undefined;
    await waitForContent(page, 40, 15000);
    await sleep(urlPath === '/' ? LANDING_SETTLE_MS : 600);
    themeInfo = await ensureTheme(page, theme);
  } catch (e) {
    navError = firstLine(e.message);
  }
  // Dark is only a view where the page has the theme toggle (the SEO pages have none).
  if (!navError && theme === 'dark' && !themeInfo.present) {
    return { notApplicable: true, area: 'public', route: urlPath, width, theme, reason: 'no theme toggle on this page' };
  }
  const dom = navError ? {} : await page.evaluate(domFacts).catch(() => ({}));
  const snap = live.take();
  const shot = await takeShot(page, id, false);
  let fullShot;
  if (withFull && !navError) {
    await sweep(page);
    fullShot = await takeShot(page, id, true);
  }
  const issues = judgeView(factsFrom(snap, dom, 'public', navError, httpStatus), {
    status: notFound ? 404 : 200,
    title: !notFound,
  });
  if (!navError) issues.push(...themeIssues(theme, themeInfo));
  return {
    id,
    area: 'public',
    name,
    width,
    theme,
    verdict: issues.length ? 'FAIL' : 'PASS',
    issues,
    httpStatus,
    themeToggle: themeInfo.present,
    durationMs: Date.now() - t0,
    shot,
    ...(fullShot ? { fullShot } : {}),
  };
}

async function clickVisible(page, source) {
  const marked = await page.evaluate((src) => {
    const re = new RegExp(src, 'i');
    const norm = (s) => (s || '').replace(/\s+/g, ' ').trim();
    const el = [...document.querySelectorAll('button, a')].find((b) => {
      if (!re.test(norm(b.textContent))) return false;
      const r = b.getBoundingClientRect();
      return (
        b.offsetParent !== null &&
        r.width > 0 &&
        r.height > 0 &&
        r.right > 0 &&
        r.left < window.innerWidth &&
        r.bottom > 0 &&
        r.top < window.innerHeight
      );
    });
    if (!el) return false;
    el.setAttribute('data-qa-click', '');
    return true;
  }, source);
  if (!marked) return false;
  await page.locator('[data-qa-click]').first().click({ timeout: 5000 });
  await page.evaluate(() => document.querySelectorAll('[data-qa-click]').forEach((e) => e.removeAttribute('data-qa-click')));
  return true;
}

async function waitForPanel(page) {
  try {
    await page.waitForFunction(
      () => [...document.querySelectorAll('button')].some((b) => (b.textContent || '').trim() === 'Ochiq sayt'),
      null,
      { timeout: 15000 }
    );
    return { ok: true };
  } catch {
    return { ok: false, reason: 'panel did not open (no "Ochiq sayt" button in the sidebar)' };
  }
}

// Enters the cabinet (student) or the owner panel. Below 640 px the Menyu drawer is opened first.
async function enterPanel(page, area, width) {
  const drawerName = area === 'owner' ? '^owner paneli$' : '^kabinet$';
  const entryName = area === 'owner' ? '^owner paneli$' : '^kabinetga o.tish$';
  if (width >= 640) {
    if (await clickVisible(page, entryName)) return waitForPanel(page);
    if (width >= 1024) return { ok: false, reason: `no visible entry button for ${area} at ${width} px` };
  }
  const menu = page.locator('button[aria-label="Menyu"]').first();
  await menu.click({ timeout: 5000 });
  await sleep(500);
  if (await clickVisible(page, drawerName)) return waitForPanel(page);
  await menu.click({ timeout: 5000 }).catch(() => {});
  await sleep(400);
  if (await clickVisible(page, entryName)) return waitForPanel(page);
  return { ok: false, reason: `no entry button for ${area} at ${width} px (Kabinetga o‘tish / Owner Paneli / Menyu)` };
}

// Expands collapsed sidebar groups (student cabinet) and marks every visible item with data-qa-item.
async function prepareItems(page) {
  for (let pass = 0; pass < 3; pass++) {
    const clicked = await page.evaluate(() => {
      let n = 0;
      for (const nav of document.querySelectorAll('nav')) {
        for (const group of nav.children) {
          const header = group.querySelector(':scope > button');
          if (header && !group.querySelector(':scope > .space-y-0\\.5')) {
            header.click();
            n++;
          }
        }
      }
      return n;
    });
    if (!clicked) break;
    await sleep(300);
  }
  return page.evaluate(() => {
    document.querySelectorAll('[data-qa-item]').forEach((e) => e.removeAttribute('data-qa-item'));
    const items = [...document.querySelectorAll('nav div.space-y-0\\.5 > button')].filter((b) => b.offsetParent !== null);
    return items.map((b, i) => {
      b.setAttribute('data-qa-item', String(i));
      return (b.textContent || '').replace(/\s+/g, ' ').trim();
    });
  });
}

async function drawerOpen(page) {
  return page.evaluate(() => {
    const el = document.querySelector('[data-qa-item]');
    const panel = el ? el.closest('.absolute.left-0') : null;
    return !!panel && panel.getBoundingClientRect().left >= -1;
  });
}

async function openDrawer(page) {
  if (await drawerOpen(page)) return;
  await page.locator('main > div.lg\\:hidden > button').first().click({ timeout: 5000 });
  await page.waitForFunction(
    () => {
      const el = document.querySelector('[data-qa-item]');
      const panel = el ? el.closest('.absolute.left-0') : null;
      return !!panel && panel.getBoundingClientRect().left >= -1;
    },
    null,
    { timeout: 3000 }
  );
}

async function itemView(page, live, group, index, label, themeInfo) {
  const { area, width, theme } = group;
  const name = label.replace(/(\p{L})\d+$/u, '$1').trim();
  const id = `${area}-${width}-${theme}-${String(index).padStart(2, '0')}-${slugify(name, 40)}`;
  const t0 = Date.now();
  live.take();
  let navError;
  try {
    if (width < 1024) await openDrawer(page);
    await page.locator(`[data-qa-item="${index}"]`).click({ timeout: 6000 });
  } catch (e) {
    navError = `click failed: ${clickReason(e)}`;
  }
  await sleep(SETTLE_MS);
  const dom = await page.evaluate(domFacts).catch(() => ({}));
  // The clicked item must be the active one (the app marks it with the orange gradient).
  const active = await page
    .evaluate((i) => {
      const el = document.querySelector(`[data-qa-item="${i}"]`);
      return !!el && el.className.includes('from-[#ffa149]');
    }, index)
    .catch(() => false);
  const snap = live.take();
  const shot = await takeShot(page, id, false);
  const issues = judgeView(factsFrom(snap, dom, area, navError, undefined), { status: 200, title: false });
  if (!navError && !active) issues.push('item did not become the active sidebar item after the click');
  issues.push(...themeIssues(theme, themeInfo));
  return {
    id,
    area,
    name,
    width,
    theme,
    verdict: issues.length ? 'FAIL' : 'PASS',
    issues,
    httpStatus: undefined,
    themeToggle: themeInfo.present,
    durationMs: Date.now() - t0,
    shot,
  };
}

function failView(group, name, reason) {
  return {
    id: `${group.area}-${group.width}-${group.theme}-${slugify(name, 30)}`,
    area: group.area,
    name,
    width: group.width,
    theme: group.theme,
    verdict: 'FAIL',
    issues: [reason],
    themeToggle: false,
    durationMs: 0,
  };
}

async function panelViews(page, live, group) {
  const views = [];
  await page.goto(`${base}/`, { waitUntil: 'load', timeout: 60000 });
  await waitForContent(page, 40, 15000);
  await sleep(LANDING_SETTLE_MS);
  const themeInfo = await ensureTheme(page, group.theme);
  const entered = await enterPanel(page, group.area, group.width);
  if (!entered.ok) {
    const shot = await takeShot(page, `${group.area}-${group.width}-${group.theme}-entry-failed`, false);
    views.push({ ...failView(group, 'entry', entered.reason), shot });
    return views;
  }
  const labels = await prepareItems(page);
  if (!labels.length) {
    const shot = await takeShot(page, `${group.area}-${group.width}-${group.theme}-sidebar-missing`, false);
    views.push({ ...failView(group, 'sidebar', 'no sidebar items found after entering the panel'), shot });
    return views;
  }
  for (let i = 0; i < labels.length; i++) {
    views.push(await itemView(page, live, group, i, labels[i], themeInfo));
  }
  return views;
}

async function runGroup(browser, group) {
  const { area, width, theme } = group;
  const ctx = await browser.newContext({
    viewport: { width, height: HEIGHTS[width] || 900 },
    deviceScaleFactor: 1,
    isMobile: width <= 390,
    hasTouch: width <= 768,
  });
  try {
    await ctx.addInitScript(() => {
      try {
        sessionStorage.setItem('edulevel_intro_seen', '1');
      } catch {}
    });
    if (area !== 'public') {
      const creds = CREDS[area];
      const res = await ctx.request.post(`${base}/api/auth/login`, {
        data: { loginInput: creds.loginInput, password: creds.password },
      });
      if (res.status() !== 200) {
        throw new SetupError(`${area} login refused (HTTP ${res.status()}); check ${creds.names.join(' and ')}`);
      }
    }
    const page = await ctx.newPage();
    page.setDefaultTimeout(15000);
    const live = attachCollectors(page, area);
    if (area === 'public') {
      const views = [];
      for (let i = 0; i < publicPaths.length; i++) {
        views.push(await publicView(page, live, group, publicPaths[i], i));
      }
      return views;
    }
    return await panelViews(page, live, group);
  } finally {
    await ctx.close().catch(() => {});
  }
}

const AREA_ORDER = Object.fromEntries(ALL_AREAS.map((a, i) => [a, i]));
const THEME_ORDER = Object.fromEntries(ALL_THEMES.map((t, i) => [t, i]));
const WIDTH_ORDER = Object.fromEntries(ALL_WIDTHS.map((w, i) => [w, i]));

function toMarkdown(summary) {
  const { meta, totals } = summary;
  const cell = (s) => String(s).replace(/\|/g, '\\|').replace(/\n/g, ' ');
  const lines = [
    `# QA matrix: ${meta.base}`,
    '',
    `Started ${meta.startedAt}, ${meta.durationSec} s. Widths ${meta.widths.join(', ')}; themes ${meta.themes.join(', ')}; areas ${meta.areas.join(', ')}.`,
    '',
    `**Verdict: ${totals.fail ? 'FAIL' : 'PASS'}** (${totals.pass} PASS, ${totals.fail} FAIL of ${totals.views} views).`,
    '',
    '| # | Area | View | Width | Theme | Verdict | Issues | Screenshot |',
    '|---|---|---|---|---|---|---|---|',
  ];
  summary.views.forEach((v, i) => {
    const shot = v.shot ? `[png](${v.shot})${v.fullShot ? ` · [full](${v.fullShot})` : ''}` : '';
    lines.push(
      `| ${i + 1} | ${v.area} | ${cell(v.name)} | ${v.width} | ${v.theme} | ${v.verdict} | ${v.issues.length} | ${shot} |`
    );
  });
  const failing = summary.views.filter((v) => v.verdict === 'FAIL');
  if (failing.length) {
    lines.push('', '## Failures', '');
    for (const v of failing) {
      lines.push(`### ${v.id}`, '');
      for (const issue of v.issues) lines.push(`- ${cell(issue)}`);
      lines.push('');
    }
  }
  if (meta.notApplicable.length) {
    lines.push('', '## Not applicable', '');
    for (const n of meta.notApplicable) lines.push(`- ${n.area} ${n.route}, ${n.width} px, ${n.theme}: ${n.reason}`);
  }
  if (skippedDynamic.length) {
    lines.push('', `Not visited (dynamic routes need a real value): ${skippedDynamic.join(', ')}`, '');
  }
  return lines.join('\n') + '\n';
}

async function main() {
  const startedAt = new Date();
  fs.mkdirSync(shotsDir, { recursive: true });
  const groups = [];
  for (const area of areas) for (const width of widths) for (const theme of themes) groups.push({ area, width, theme });

  let browser;
  try {
    browser = await launchBrowser();
  } catch (e) {
    console.error(`Could not start the browser: ${firstLine(e.message)}`);
    process.exit(2);
  }

  const views = [];
  const notApplicable = [];
  let aborted = null;
  let done = 0;
  const queue = [...groups];
  const worker = async () => {
    while (queue.length && !aborted) {
      const group = queue.shift();
      const t0 = Date.now();
      let got;
      try {
        got = await runGroup(browser, group);
      } catch (e) {
        if (e instanceof SetupError) {
          aborted = e;
          return;
        }
        got = [failView(group, 'group', `unexpected error: ${firstLine(e.message)}`)];
      }
      for (const v of got) {
        if (v.notApplicable) notApplicable.push({ area: v.area, route: v.route, width: v.width, theme: v.theme, reason: v.reason });
        else views.push({ ...v, _key: [AREA_ORDER[v.area], WIDTH_ORDER[v.width], THEME_ORDER[v.theme]] });
      }
      done++;
      const real = got.filter((v) => !v.notApplicable);
      const fails = real.filter((v) => v.verdict === 'FAIL').length;
      console.log(
        `[${done}/${groups.length}] ${group.area} ${group.width} ${group.theme}: ${real.length} views, ${fails} FAIL (${((Date.now() - t0) / 1000).toFixed(1)} s)`
      );
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, groups.length) }, worker));
  await browser.close().catch(() => {});

  if (aborted) {
    console.error(`Stopped: ${aborted.message}`);
    process.exit(2);
  }

  views.sort((a, b) => {
    for (let i = 0; i < 3; i++) if (a._key[i] !== b._key[i]) return a._key[i] - b._key[i];
    return a.id.localeCompare(b.id);
  });
  const outViews = views.map(({ _key, ...rest }) => rest);
  const pass = outViews.filter((v) => v.verdict === 'PASS').length;
  const summary = {
    meta: {
      base,
      startedAt: startedAt.toISOString(),
      durationSec: Math.round((Date.now() - startedAt.getTime()) / 100) / 10,
      widths,
      themes,
      areas,
      concurrency,
      publicRoutes: publicPaths,
      skippedDynamicRoutes: skippedDynamic,
      notApplicable: notApplicable.sort((a, b) => a.route.localeCompare(b.route) || a.width - b.width),
    },
    totals: { views: outViews.length, pass, fail: outViews.length - pass },
    views: outViews,
  };
  fs.writeFileSync(path.join(outDir, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
  fs.writeFileSync(path.join(outDir, 'summary.md'), toMarkdown(summary));
  console.log(
    `${summary.totals.fail ? 'FAIL' : 'PASS'}: ${pass} of ${outViews.length} views PASS in ${summary.meta.durationSec} s. ` +
      `Report: ${path.join(outDir, 'summary.md')}`
  );
  process.exit(summary.totals.fail ? 1 : 0);
}

main().catch((e) => {
  console.error(`Runner error: ${firstLine(e.message)}`);
  process.exit(2);
});
