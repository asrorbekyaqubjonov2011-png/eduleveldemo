// Browser E2E of the public EduBek helper (landing page): typed questions answered from site data, unknown ones redirected, outside tap closes, no overflow. LOCAL server only.
const { chromium } = require('playwright');
const { appReady } = require('./app-ready.cjs');
const BASE = process.env.BASE || 'http://localhost:3100';
if (!/localhost|127\.0\.0\.1/.test(BASE)) { console.error('Refusing to run: local server only.'); process.exit(2); }
let fails = 0;
const check = (n, ok, x = '') => { console.log(`${ok ? 'PASS' : 'FAIL'} ${n} ${x}`); if (!ok) fails++; };
(async () => {
  const browser = await chromium.launch();
  for (const [name, vp, mobile] of [['d', { width: 1280, height: 800 }, false], ['m', { width: 390, height: 844 }, true]]) {
    const ctx = await browser.newContext({ viewport: vp, isMobile: mobile, hasTouch: mobile });
    const page = await ctx.newPage();
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
    await appReady(page);
    await page.waitForTimeout(600);
    await page.locator('button[aria-label*="dubek" i]').first().click({ timeout: 5000 });
    await page.waitForTimeout(800);
    const input = page.getByLabel('Edubek ga savol');
    check(name + ' dock has a text input', await input.isVisible());
    await input.fill('VIP tarif narxi qancha?');
    await input.press('Enter');
    await page.waitForTimeout(1500);
    check(name + ' answers a typed question from site data', /Tariflar|tarif/i.test(await page.getByRole('dialog', { name: 'Edubek yordamchisi' }).innerText()));
    await input.fill('what is the capital of France');
    await input.press('Enter');
    await page.waitForTimeout(1000);
    check(name + ' unknown question is redirected, not invented', /EduBek AI chat/i.test(await page.getByRole('dialog', { name: 'Edubek yordamchisi' }).innerText()));
    await page.waitForTimeout(1500); await page.screenshot({ path: `/tmp/claude-0/shots/dock-${name}.png` });
    check(name + ' no horizontal overflow', (await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)) <= 0);
    await page.mouse.click(vp.width - 40, 200);
    await page.waitForTimeout(500);
    check(name + ' outside tap closes the panel', (await page.getByRole('dialog', { name: 'Edubek yordamchisi' }).count()) === 0);
    await ctx.close();
  }
  await browser.close();
  console.log(fails ? `FAILED ${fails}` : 'ALL PASSED');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.log('FAIL', e.message.slice(0, 300)); process.exit(1); });
