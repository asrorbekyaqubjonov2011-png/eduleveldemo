// Browser E2E of EduBek chat error handling against a LOCAL server without AI keys: a clear message and a retry button, never endless loading.
const { chromium } = require('playwright');
const { appReady } = require('./app-ready.cjs');
const BASE = process.env.BASE || 'http://localhost:3100';
if (!/localhost|127\.0\.0\.1/.test(BASE)) { console.error('Refusing to run: local server only.'); process.exit(2); }
let fails = 0;
const check = (n, ok, x = '') => { console.log(`${ok ? 'PASS' : 'FAIL'} ${n} ${x}`); if (!ok) fails++; };
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const email = `eb-${Date.now()}@test.local`;
  await ctx.request.post(BASE + '/api/auth/register', { data: { name: 'Eb', surname: 'Test', identifier: email, email, password: 'Str0ng-Pass-123!', region: 'Toshkent' } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => { console.log('PAGEERROR', e.message); fails++; });
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2200);
  await page.mouse.click(640, 700);
  await page.waitForTimeout(2500);
  await page.getByText(/Kabinetga o.tish/).first().click();
  await page.waitForTimeout(2000);
  await page.getByText('AI', { exact: true }).first().click({ timeout: 8000 });
  await page.waitForTimeout(1500);
  await page.getByText('Edubek', { exact: true }).first().click({ timeout: 8000 });
  await page.waitForTimeout(1800);
  await page.screenshot({ path: '/tmp/claude-0/shots/e-01-ai.png' });
  const box = page.getByPlaceholder(/Savol yoki matnni yozing|Savolingizni yozing/).first();
  check('chat input present', await box.isVisible().catch(() => false));
  await box.fill('What is the past tense of go?');
  await box.press('Enter');
  const t0 = Date.now();
  await page.waitForSelector('p[role=alert]', { timeout: 20000 }).catch(() => {});
  const alertText = await page.locator('p[role=alert]').first().innerText().catch(() => '');
  check('an error is shown quickly instead of endless loading', Date.now() - t0 < 15000 && alertText.length > 5, JSON.stringify(alertText.slice(0, 100)));
  check('retry button is offered', await page.getByRole('button', { name: 'Qayta urinish' }).isVisible().catch(() => false));
  check('input is usable again', await box.isEnabled());
  await page.screenshot({ path: '/tmp/claude-0/shots/e-02-error.png' });
  await browser.close();
  console.log(fails ? `FAILED ${fails}` : 'ALL PASSED');
})().catch((e) => { console.log('FAIL', e.message.slice(0, 300)); process.exit(1); });
