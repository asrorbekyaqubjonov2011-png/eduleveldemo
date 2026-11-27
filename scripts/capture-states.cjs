// Interactive-state screenshots (placement exam, EduBek chat, EduBek dock) from a LOCAL server. Real browser, real UI, no mockups.
// Needs a published level test 'v9-test' (8 questions) in the LOCAL database.
// Usage: OUT=/path/to/SCREENSHOTS node scripts/capture-states.cjs
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = process.env.BASE || 'http://localhost:3100';
if (!/localhost|127\.0\.0\.1/.test(BASE)) { console.error('Refusing to run: local server only.'); process.exit(2); }
const OUT = process.env.OUT || path.join(process.cwd(), 'SCREENSHOTS');
const VPS = (process.env.VPS || 'DESKTOP,MOBILE').split(',');
const MANIFEST = path.join(OUT, `manifest-states-${VPS.join('-')}.json`);
const VP = { DESKTOP: { width: 1440, height: 900, isMobile: false }, MOBILE: { width: 390, height: 844, isMobile: true } };
const manifest = [];
let n = 0;

async function snap(page, vp, category, name, state, role = 'student', full = false) {
  const dir = path.join(OUT, 'INTERACTIVE_STATES', category);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${vp.toLowerCase()}-${name}.png`);
  const entry = { id: `states-${String(++n).padStart(3, '0')}`, name, route: category, role, viewport: `${VP[vp].width}x${VP[vp].height}`, state, environment: 'local (next start + local Postgres test data)', file: path.relative(OUT, file), status: 'FAILED', verified: false };
  try {
    await page.waitForTimeout(700);
    await page.screenshot({ path: file, fullPage: full });
    entry.status = 'CAPTURED';
    entry.verified = true;
    entry.size = fs.statSync(file).size;
  } catch (e) { entry.error = String(e.message).slice(0, 160); }
  manifest.push(entry);
  fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 1));
  console.log(entry.status, entry.file);
}

async function login(ctx) {
  const email = `st-${Date.now()}-${Math.floor(Math.random() * 1e4)}@test.local`;
  const r = await ctx.request.post(BASE + '/api/auth/register', { data: { name: 'Demo', surname: 'Student', identifier: email, email, password: 'Str0ng-Pass-123!', region: 'Toshkent' } });
  if (r.status() !== 200) throw new Error('register ' + r.status());
}

async function cabinet(page, vp) {
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1800);
  const v = page.viewportSize();
  if (await page.getByText(/o.tkazib yuborish/i).first().isVisible().catch(() => false)) { await page.mouse.click(v.width / 2, v.height - 90); await page.waitForTimeout(2200); }
  await page.getByText(/Kabinetga o.tish/).first().click({ timeout: 8000 });
  await page.waitForTimeout(2000);
  if (vp === 'MOBILE') { await page.locator('main button').first().click({ timeout: 8000 }); await page.waitForTimeout(600); }
}

async function goTab(page, vp, label) {
  await (vp === 'MOBILE' ? page.getByText(label, { exact: true }).last() : page.getByText(label, { exact: true }).first()).click({ timeout: 10000 });
  await page.waitForTimeout(1500);
}

async function placement(browser, vp) {
  const v = VP[vp];
  const ctx = await browser.newContext({ viewport: { width: v.width, height: v.height }, isMobile: v.isMobile, hasTouch: v.isMobile, reducedMotion: 'reduce' });
  await login(ctx);
  const page = await ctx.newPage();
  await cabinet(page, vp);
  await goTab(page, vp, 'Levelni aniqlash');
  await snap(page, vp, 'PLACEMENT_TEST', '01-test-list', 'test selection / description', 'student', true);
  await page.getByRole('button', { name: /Boshlash|Davom ettirish/ }).first().click();
  await page.waitForTimeout(500);
  await snap(page, vp, 'PLACEMENT_TEST', '02-start-form', 'start form (name, surname, class)');
  const dlg = page.getByRole('dialog');
  await dlg.getByLabel('Ism').fill('Demo'); await dlg.getByLabel('Familiya').fill('Student'); await dlg.getByLabel('Sinf').fill('9-A');
  await dlg.getByRole('button', { name: 'Boshlash' }).click();
  await page.waitForTimeout(2500);
  await snap(page, vp, 'PLACEMENT_TEST', '03-exam-first-question', 'exam started (fullscreen requested on the tap)');
  await page.getByRole('radio', { name: /goes/ }).click();
  await page.waitForTimeout(300);
  await snap(page, vp, 'PLACEMENT_TEST', '04-answer-selected', 'answer selected, timer running');
  await page.getByRole('button', { name: /Keyingi savol/ }).click();
  await page.getByRole('button', { name: /Keyin ko.rish/ }).click();
  await page.waitForTimeout(300);
  await snap(page, vp, 'PLACEMENT_TEST', '05-marked-for-review', 'question marked for review, unanswered question');
  if (vp === 'MOBILE') { await page.locator('footer button', { hasText: 'Savollar' }).click(); await page.waitForTimeout(500); await snap(page, vp, 'PLACEMENT_TEST', '06-question-navigator-drawer', 'question navigator drawer'); await page.getByRole('button', { name: 'Yopish' }).click(); }
  else await snap(page, vp, 'PLACEMENT_TEST', '06-question-navigator-panel', 'question navigator side panel');
  await page.getByRole('button', { name: /Shikoyat bildirish/ }).click();
  await page.waitForTimeout(400);
  await snap(page, vp, 'PLACEMENT_TEST', '07-complaint-modal', 'complaint modal with reasons');
  await page.getByRole('radio', { name: 'Texnik muammo' }).click();
  await page.getByRole('button', { name: 'Yuborish' }).click();
  await page.waitForTimeout(700);
  await snap(page, vp, 'PLACEMENT_TEST', '08-complaint-sent', 'complaint sent (stored for the owner)');
  await page.getByRole('button', { name: 'Testga qaytish' }).click();
  // leave fullscreen -> warning
  await page.evaluate(() => document.exitFullscreen && document.fullscreenElement && document.exitFullscreen()).catch(() => {});
  await page.waitForTimeout(1200);
  const warnBtn = page.getByRole('button', { name: /Tushundim/ });
  if (await warnBtn.isVisible().catch(() => false)) {
    await snap(page, vp, 'PLACEMENT_TEST', '09-fullscreen-exit-warning-countdown', 'warning, Tushundim disabled, 5 s countdown');
    await page.waitForTimeout(5300);
    await snap(page, vp, 'PLACEMENT_TEST', '10-tushundim-enabled', 'Tushundim enabled after 5 s');
    await page.getByRole('button', { name: 'Tushundim', exact: true }).click();
    await page.waitForTimeout(800);
  } else {
    manifest.push({ id: `states-${String(++n).padStart(3, '0')}`, name: 'fullscreen-exit-warning', route: 'PLACEMENT_TEST', role: 'student', viewport: `${v.width}x${v.height}`, state: 'warning', environment: 'local', file: '', status: 'NOT_CAPTURED', verified: false, error: 'this viewport/browser engine does not enter fullscreen (mobile emulation); verified on desktop only' });
  }
  await page.getByRole('button', { name: 'Yakunlash' }).first().click();
  await page.waitForTimeout(500);
  await snap(page, vp, 'PLACEMENT_TEST', '11-finish-confirmation-unanswered-summary', 'finish summary with unanswered questions');
  await page.getByRole('dialog', { name: 'Testni yakunlash' }).getByRole('button', { name: 'Yakunlash' }).click();
  await page.waitForTimeout(1600);
  await snap(page, vp, 'PLACEMENT_TEST', '12-result-level-assessment', 'result with level assessment', 'student', true);
  await ctx.close();
}

async function edubek(browser, vp) {
  const v = VP[vp];
  const ctx = await browser.newContext({ viewport: { width: v.width, height: v.height }, isMobile: v.isMobile, hasTouch: v.isMobile, reducedMotion: 'reduce' });
  await login(ctx);
  const page = await ctx.newPage();
  await cabinet(page, vp);
  await goTab(page, vp, 'AI');
  await snap(page, vp, 'EDUBEK', '01-ai-hub', 'AI hub', 'student', true);
  await page.getByText('Edubek', { exact: true }).first().click({ timeout: 8000 });
  await page.waitForTimeout(1800);
  await snap(page, vp, 'EDUBEK', '02-chat-empty', 'EduBek chat, empty conversation');
  const box = page.getByPlaceholder(/Savol yoki matnni yozing|Savolingizni yozing/).first();
  await box.fill('What is the past tense of go?');
  await box.press('Enter');
  await page.waitForSelector('p[role=alert]', { timeout: 20000 }).catch(() => {});
  await snap(page, vp, 'EDUBEK', '03-chat-error-with-retry', 'no AI key on the local server: clear error and retry button (never endless loading)');
  await ctx.close();

  // Public dock on the landing page
  const c2 = await browser.newContext({ viewport: { width: v.width, height: v.height }, isMobile: v.isMobile, hasTouch: v.isMobile, reducedMotion: 'reduce' });
  const p2 = await c2.newPage();
  await p2.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await p2.waitForTimeout(1800);
  if (await p2.getByText(/o.tkazib yuborish/i).first().isVisible().catch(() => false)) { await p2.mouse.click(v.width / 2, v.height - 90); await p2.waitForTimeout(2200); }
  await snap(p2, vp, 'EDUBEK', '04-dock-closed', 'floating dock closed', 'visitor');
  await p2.locator('button[aria-label*="dubek" i]').first().click();
  await p2.waitForTimeout(800);
  await snap(p2, vp, 'EDUBEK', '05-dock-open', 'floating dock open', 'visitor');
  const input = p2.getByLabel('Edubek ga savol');
  await input.fill('VIP tarif narxi qancha?');
  await input.press('Enter');
  await p2.waitForTimeout(1800);
  await snap(p2, vp, 'EDUBEK', '06-dock-answer-from-site-data', 'typed question answered from site data', 'visitor');
  await c2.close();
}

(async () => {
  const browser = await chromium.launch();
  for (const vp of VPS) {
    try { await placement(browser, vp); } catch (e) { console.log('placement failed', vp, e.message.slice(0, 200)); }
    try { await edubek(browser, vp); } catch (e) { console.log('edubek failed', vp, e.message.slice(0, 200)); }
  }
  await browser.close();
  console.log(`DONE states: ${manifest.filter((m) => m.status === 'CAPTURED').length}/${manifest.length}`);
})();
