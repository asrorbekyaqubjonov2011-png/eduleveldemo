// Browser E2E of the placement exam against a LOCAL server (Chromium via Playwright). Needs a published level test 'v9-test' with 8 questions in the LOCAL database
// (see PROGRESS.md V9). Checks: fullscreen on the Start tap, navigator, flag, complaint, 5 s warning, re-entry, summary, result, 390px drawer.
// Run: DATABASE_URL=... next start -p 3100, then: node scripts/level-exam-browser-test.cjs
const { chromium } = require('playwright');
const { appReady } = require('./app-ready.cjs');
const BASE = process.env.BASE || 'http://localhost:3100';
if (!['localhost','127.0.0.1'].includes(new URL(BASE).hostname) || !['http:','https:'].includes(new URL(BASE).protocol)) { console.error('Refusing to run: local server only.'); process.exit(2); }
const shot = (page, n) => page.screenshot({ path: `/tmp/claude-0/shots/${n}.png` });
let fails = 0;
const check = (name, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!ok) fails++; };
async function login(ctx) {
  const email = `v9-${Date.now()}-${Math.floor(Math.random()*1e4)}@test.local`;
  const r = await ctx.request.post(BASE + '/api/auth/register', { data: { name: 'Vee', surname: 'Nine', identifier: email, email, password: 'Str0ng-Pass-123!', region: 'Toshkent' } });
  if (r.status() !== 200) throw new Error('register ' + r.status());
}
async function openExam(page, tag) {
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await appReady(page);
  const vp = page.viewportSize();
  await page.getByText(/Kabinetga o.tish/).first().click({ timeout: 8000 });
  await page.waitForTimeout(2000);
  if (vp.width < 1024) { await page.locator('main button').first().click({ timeout: 8000 }); await page.waitForTimeout(600); }
  await (vp.width < 1024 ? page.getByText('Levelni aniqlash').last() : page.getByText('Levelni aniqlash').first()).click({ timeout: 10000 });
  await page.waitForTimeout(1500);
  await page.getByRole('button', { name: /Boshlash|Davom ettirish/ }).first().click({ timeout: 8000 });
  await page.waitForTimeout(400);
  const dlg = page.getByRole('dialog');
  await dlg.getByLabel('Ism').fill('Vee'); await dlg.getByLabel('Familiya').fill('Nine'); await dlg.getByLabel('Sinf').fill('9-A');
  await dlg.getByRole('dialog').count();
  await dlg.getByRole('button', { name: 'Boshlash' }).click();
  await page.waitForTimeout(2500);
}
(async () => {
  const browser = await chromium.launch();
  // ===== Desktop =====
  const ctx = await browser.newContext({ ignoreHTTPSErrors: new URL(BASE).protocol === 'https:', viewport: { width: 1280, height: 800 } });
  await login(ctx);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => { console.log('PAGEERROR', e.message); fails++; });
  await openExam(page, 'd');
  check('fullscreen active right after Start tap', await page.evaluate(() => !!document.fullscreenElement));
  check('side navigator is visible on desktop', await page.getByLabel('Savollar navigatori').isVisible());
  check('header shows fullscreen state', await page.getByText('To‘liq ekran', { exact: true }).first().isVisible());
  await shot(page, 'd-04-exam');
  // answer Q1, flag Q2, skip Q3
  await page.getByRole('radio', { name: /goes/ }).click();
  await page.getByRole('button', { name: /Keyingi savol/ }).click();
  await page.getByRole('button', { name: /Keyin ko.rish/ }).click();
  await page.getByRole('button', { name: /Keyingi savol/ }).click();
  await page.getByRole('button', { name: /Keyingi savol/ }).click();
  await shot(page, 'd-05-navigator');
  const nav = page.getByLabel('Savollar navigatori');
  check('Q1 shows answered', await nav.getByRole('button', { name: /Savol 1: javob berilgan/ }).count() === 1);
  check('Q2 shows flagged', await nav.getByRole('button', { name: /Savol 2: ishlanmagan, belgilangan/ }).count() === 1);
  // complaint
  await page.getByRole('button', { name: /Shikoyat bildirish/ }).click();
  await shot(page, 'd-06-complaint');
  await page.getByRole('radio', { name: 'To‘g‘ri javob mavjud emas' }).click();
  await page.getByRole('button', { name: 'Yuborish' }).click();
  await page.waitForTimeout(800);
  check('complaint accepted', await page.getByText(/Shikoyatingiz yuborildi/).isVisible());
  await page.getByRole('button', { name: 'Testga qaytish' }).click();
  // leave fullscreen -> warning with 5 s countdown
  await page.evaluate(() => document.exitFullscreen());
  await page.waitForTimeout(1200);
  const warnBtn = page.getByRole('button', { name: /Tushundim/ });
  check('warning modal appears', await warnBtn.isVisible());
  check('Tushundim disabled at first', await warnBtn.isDisabled());
  check('modal uses the required wording', await page.getByText(/to‘liq ekran rejimidan chiqdingiz/).isVisible());
  await shot(page, 'd-07-warning');
  await page.waitForTimeout(5200);
  check('Tushundim enabled after 5 s', await page.getByRole('button', { name: 'Tushundim', exact: true }).isEnabled());
  await page.getByRole('button', { name: 'Tushundim', exact: true }).click();
  await page.waitForTimeout(800);
  check('fullscreen re-entered after Tushundim', await page.evaluate(() => !!document.fullscreenElement));
  // finish summary
  await page.getByRole('button', { name: 'Yakunlash' }).first().click();
  await page.waitForTimeout(400);
  check('summary lists unanswered', await page.getByText('Ishlanmagan savollar:').isVisible());
  await shot(page, 'd-08-summary');
  await page.getByRole('dialog', { name: 'Testni yakunlash' }).getByRole('button', { name: 'Yakunlash' }).click();
  await page.waitForTimeout(1500);
  check('result page shown', await page.getByText('Test yakunlandi').isVisible());
  await shot(page, 'd-09-result');
  // ===== Mobile =====
  const m = await browser.newContext({ ignoreHTTPSErrors: new URL(BASE).protocol === 'https:', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await login(m);
  const mp = await m.newPage();
  mp.on('pageerror', (e) => { console.log('MOBILE PAGEERROR', e.message); fails++; });
  await openExam(mp, 'm');
  await shot(mp, 'm-04-exam');
  const overflow = await mp.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check('no horizontal overflow at 390px', overflow <= 0, `(${overflow})`);
  await mp.locator('footer button', { hasText: 'Savollar' }).click();
  await mp.waitForTimeout(500);
  await shot(mp, 'm-05-drawer');
  check('mobile drawer opens', await mp.getByRole('dialog', { name: 'Savollar' }).isVisible());
  await browser.close();
  console.log(fails ? `FAILED ${fails}` : 'ALL PASSED');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.log('FAIL', e.message.slice(0, 400)); process.exit(1); });
