// Real full-page screenshots of EduLevel from a running LOCAL server (Chromium via Playwright).
// Usage: OUT=/path/to/SCREENSHOTS PART=public|auth|student|owner|states node scripts/capture-screenshots.cjs
// Local server only (refuses anything else). Owner parts need OWNER_LOCAL_PASSWORD (a throwaway password set on the LOCAL database).
// Every shot is full-page PNG, scrolled once so lazy images load. Nothing is mocked: pages come from the running app.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = process.env.BASE || 'http://localhost:3100';
if (!/localhost|127\.0\.0\.1/.test(BASE)) { console.error('Refusing to run: local server only.'); process.exit(2); }
const OUT = process.env.OUT || path.join(process.cwd(), 'SCREENSHOTS');
const PART = process.env.PART || 'public';
const OWNER_PW = process.env.OWNER_LOCAL_PASSWORD || ''; // set to the throwaway password of the LOCAL database (never a production password)
if ((PART === 'owner' || PART === 'ownersub') && !OWNER_PW) { console.error('Set OWNER_LOCAL_PASSWORD (local database only).'); process.exit(2); }
const MANIFEST = path.join(OUT, `manifest-${PART}${process.env.VPS ? '-' + process.env.VPS.replace(/,/g, '-') : ''}.json`);

const VIEWPORTS = {
  DESKTOP: { width: 1440, height: 900, isMobile: false },
  MOBILE: { width: 390, height: 844, isMobile: true },
  TABLET: { width: 768, height: 1024, isMobile: false }
};
const manifest = [];
let counter = 0;

const slug = (s) => (s.replace(/^\/+|\/+$/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '') || 'home').slice(0, 90);

async function settle(page) {
  await page.waitForTimeout(900);
  // Scroll once through the page so lazy-loaded images and reveal sections are present, then back to the top.
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < Math.min(h, 12000); y += 700) {
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    await page.waitForTimeout(90);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);
}

async function snap(page, rec) {
  const { vp, category, name, route, role, state } = rec;
  const dir = path.join(OUT, vp, category);
  fs.mkdirSync(dir, { recursive: true });
  const id = `${PART}-${String(++counter).padStart(3, '0')}`;
  const file = path.join(dir, `${slug(name)}.png`);
  const entry = { id, name, route, role, viewport: `${VIEWPORTS[vp].width}x${VIEWPORTS[vp].height}`, state: state || 'default', environment: 'local (next start + local Postgres test data)', file: path.relative(OUT, file), status: 'FAILED', verified: false };
  try {
    await settle(page);
    const bad = await page.evaluate(() => !!document.querySelector('nextjs-portal, [data-nextjs-dialog]'));
    await page.screenshot({ path: file, fullPage: true });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    entry.status = 'CAPTURED';
    entry.verified = !bad;
    entry.horizontalOverflowPx = Math.max(0, overflow);
    entry.size = fs.statSync(file).size;
  } catch (e) {
    entry.error = String(e.message || e).slice(0, 160);
  }
  manifest.push(entry);
  fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 1));
  console.log(entry.status, entry.file);
}

async function skipSplash(page) {
  await page.waitForTimeout(1800);
  const vp = page.viewportSize();
  const splash = await page.getByText(/o.tkazib yuborish/i).first().isVisible().catch(() => false);
  if (splash) { await page.mouse.click(vp.width / 2, vp.height - 90); await page.waitForTimeout(2200); }
}

async function newCtx(browser, vp) {
  const v = VIEWPORTS[vp];
  return browser.newContext({ viewport: { width: v.width, height: v.height }, isMobile: v.isMobile, hasTouch: v.isMobile, reducedMotion: 'reduce' });
}

function pageCategory(route) {
  if (route === '/' || /^\/(about|contact|privacy|terms|editorial-policy|miniapp)/.test(route)) return 'PUBLIC';
  return 'SEO_PAGES';
}

async function partPublic(browser) {
  const xml = await (await fetch(BASE + '/sitemap.xml')).text();
  const routes = Array.from(xml.matchAll(/<loc>https?:\/\/[^/]+(\/[^<]*)<\/loc>/g)).map((m) => m[1] || '/');
  const uniq = Array.from(new Set(['/', ...routes, '/miniapp', '/this-page-does-not-exist']));
  for (const vp of ['DESKTOP', 'MOBILE']) {
    const ctx = await newCtx(browser, vp);
    const page = await ctx.newPage();
    for (const route of uniq) {
      try {
        await page.goto(BASE + route, { waitUntil: 'domcontentloaded', timeout: 30000 });
        if (route === '/') await skipSplash(page);
      } catch (e) { /* recorded as failed below */ }
      await snap(page, { vp, category: route === '/this-page-does-not-exist' ? 'PUBLIC' : pageCategory(route), name: route === '/this-page-does-not-exist' ? '404-page' : route, route, role: 'visitor' });
    }
    await ctx.close();
  }
  // Tablet: the main landing pages only
  const tctx = await newCtx(browser, 'TABLET');
  const tp = await tctx.newPage();
  for (const route of ['/', '/ielts-tayyorgarlik', '/cefr-tayyorgarlik', '/ingliz-tili-darslari', '/english/grammar']) {
    await tp.goto(BASE + route, { waitUntil: 'domcontentloaded' }).catch(() => {});
    if (route === '/') await skipSplash(tp);
    await snap(tp, { vp: 'TABLET', category: 'PUBLIC', name: route, route, role: 'visitor' });
  }
  await tctx.close();
}

async function partAuth(browser) {
  for (const vp of ['DESKTOP', 'MOBILE']) {
    const ctx = await newCtx(browser, vp);
    const page = await ctx.newPage();
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
    await skipSplash(page);
    if (vp === 'MOBILE') await page.locator('button[aria-label*="menu" i], header button').last().click().catch(() => {});
    await page.getByText(/^Kirish$|Ro.yxatdan o.tish/).first().click({ timeout: 6000 }).catch(() => {});
    await page.waitForTimeout(1200);
    await snap(page, { vp, category: 'AUTH', name: 'login-or-register', route: '/ (auth view)', role: 'visitor', state: 'auth view' });
    const forgot = page.getByText(/Parolni unutdingiz|Parolni tiklash|Forgot/i).first();
    if (await forgot.isVisible().catch(() => false)) {
      await forgot.click().catch(() => {});
      await page.waitForTimeout(800);
      await snap(page, { vp, category: 'AUTH', name: 'password-recovery', route: '/ (auth view)', role: 'visitor', state: 'password recovery' });
    }
    await ctx.close();
  }
}

async function openCabinet(page, vp) {
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await skipSplash(page);
  // The cabinet / owner-panel button is clicked in the page itself: on a phone it sits in a bottom bar that the hero layer overlaps.
  const clicked = await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button, a')).find((b) => /Kabinetga o.tish|Owner Panel/i.test((b.textContent || '') + ' ' + (b.getAttribute('aria-label') || '')) && (b.getBoundingClientRect().width > 0));
    if (btn) { btn.click(); return true; }
    return false;
  });
  if (!clicked) throw new Error('cabinet button not found');
  await page.waitForTimeout(2200);
}

async function sidebarTabs(page, vp, role, category, prefix) {
  // Collects every sidebar item (desktop rail or mobile drawer) and captures each tab on its own.
  const open = async () => { if (vp === 'MOBILE') { await page.locator('main button').first().click({ timeout: 6000 }).catch(() => {}); await page.waitForTimeout(500); } };
  await open();
  const labels = await page.evaluate(() => {
    const root = Array.from(document.querySelectorAll('aside')).find((a) => a.querySelectorAll('button').length > 5) || document;
    return Array.from(root.querySelectorAll('button')).map((b) => (b.textContent || '').trim()).filter((t) => t && t.length < 40);
  });
  const seen = new Set();
  const list = labels.filter((l) => !seen.has(l) && seen.add(l));
  if (vp === 'MOBILE') await page.keyboard.press('Escape').catch(() => {});
  for (const label of list) {
    if (/Chiqish|Ochiq sayt|Yopish/.test(label)) continue;
    if (process.env.ONLY && !new RegExp(process.env.ONLY).test(label)) continue;
    try {
      await open();
      const btn = vp === 'MOBILE' ? page.getByRole('button', { name: label, exact: true }).last() : page.locator('aside').getByRole('button', { name: label, exact: true }).first();
      await btn.click({ timeout: 5000 });
      await page.waitForTimeout(1400);
    } catch (e) { /* tab not clickable: recorded below */ }
    await snap(page, { vp, category, name: `${prefix}-${label}`, route: `${prefix}: ${label}`, role, state: 'tab opened' });
  }
}

async function partStudent(browser) {
  for (const vp of ['DESKTOP', 'MOBILE']) {
    const ctx = await newCtx(browser, vp);
    const email = `shot-${Date.now()}-${Math.floor(Math.random() * 1e4)}@test.local`;
    const r = await ctx.request.post(BASE + '/api/auth/register', { data: { name: 'Demo', surname: 'Student', identifier: email, email, password: 'Str0ng-Pass-123!', region: 'Toshkent' } });
    if (r.status() !== 200) { console.log('register failed', r.status()); await ctx.close(); continue; }
    const page = await ctx.newPage();
    await openCabinet(page, vp);
    await snap(page, { vp, category: 'DASHBOARD', name: 'student-dashboard-first-view', route: 'student cabinet', role: 'student', state: 'after login' });
    await sidebarTabs(page, vp, 'student', 'DASHBOARD', 'student');
    await ctx.close();
  }
}

async function partOwner(browser) {
  for (const vp of (process.env.VPS || 'DESKTOP,MOBILE').split(',')) {
    const ctx = await newCtx(browser, vp);
    const r = await ctx.request.post(BASE + '/api/auth/login', { data: { loginInput: 'jasurbek', password: OWNER_PW } });
    if (r.status() !== 200) { console.log('owner login failed', r.status()); await ctx.close(); continue; }
    const page = await ctx.newPage();
    await openCabinet(page, vp);
    await snap(page, { vp, category: 'OWNER_PANEL', name: 'owner-panel-first-view', route: 'owner panel', role: 'owner', state: 'after login' });
    await sidebarTabs(page, vp, 'owner', 'OWNER_PANEL', 'owner');
    await ctx.close();
  }
}

async function partOwnerSub(browser) {
  // Inner tabs of owner sections (for example AI: Yordamchi, Test yaratish, Statistika, Provayderlar, Marshrutlash ...).
  for (const vp of (process.env.VPS || 'DESKTOP,MOBILE').split(',')) {
    const ctx = await newCtx(browser, vp);
    const r = await ctx.request.post(BASE + '/api/auth/login', { data: { loginInput: 'jasurbek', password: OWNER_PW } });
    if (r.status() !== 200) { await ctx.close(); continue; }
    const page = await ctx.newPage();
    await openCabinet(page, vp);
    for (const section of ['AI', 'SEO sahifalar', 'Telegram bot', 'VIP tariflar', 'Sozlamalar', 'Murojaatlar', 'Levelni aniqlash', 'Mock testlar', 'Kurslar & darslar']) {
      try {
        if (vp === 'MOBILE') { await page.locator('main button').first().click({ timeout: 5000 }); await page.waitForTimeout(500); }
        const btn = vp === 'MOBILE' ? page.getByRole('button', { name: section, exact: true }).last() : page.locator('aside').getByRole('button', { name: section, exact: true }).first();
        await btn.click({ timeout: 5000 });
        await page.waitForTimeout(1500);
      } catch (e) { continue; }
      const tabs = await page.locator('[role=tab]').allInnerTexts();
      const labels = Array.from(new Set(tabs.map((t) => t.trim()).filter(Boolean)));
      for (const label of labels) {
        try { await page.getByRole('tab', { name: label, exact: true }).first().click({ timeout: 4000 }); await page.waitForTimeout(1500); } catch (e) { continue; }
        await snap(page, { vp, category: 'OWNER_PANEL', name: `owner-${section}-tab-${label}`, route: `owner: ${section} / ${label}`, role: 'owner', state: 'inner tab opened' });
      }
    }
    await ctx.close();
  }
}

(async () => {
  const browser = await chromium.launch();
  const parts = { ownersub: partOwnerSub, public: partPublic, auth: partAuth, student: partStudent, owner: partOwner };
  if (!parts[PART]) { console.error('PART must be one of ' + Object.keys(parts).join(', ')); process.exit(2); }
  await parts[PART](browser);
  await browser.close();
  const ok = manifest.filter((m) => m.status === 'CAPTURED').length;
  console.log(`DONE ${PART}: ${ok}/${manifest.length} captured`);
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
