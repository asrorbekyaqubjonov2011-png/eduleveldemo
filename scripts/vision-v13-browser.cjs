// Runs against the same isolated HTTPS fixture as vision-browser-smoke.cjs.
const assert = require('node:assert/strict');
const { createHmac, randomUUID } = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');

const base = new URL(process.env.BASE || 'https://127.0.0.1:3443');
if (base.hostname !== '127.0.0.1' || base.protocol !== 'https:') throw new Error('Isolated HTTPS fixture only');
const output = process.env.VISION_SHOTS || 'vision-smoke-results';
const shot = (page, name) => page.screenshot({ path: path.join(output, name + '.png') });

async function voice(browser) {
  const context = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  try {
    const email = 'v13-voice-' + Date.now() + '@test.local';
    const registered = await context.request.post(new URL('/api/auth/register', base).href, {
      data: { name: 'Voice', surname: 'Fixture', identifier: email, email, password: 'VoiceFixture-123!' },
    });
    assert.equal(registered.status(), 200);
    await context.addInitScript(() => {
      window.SpeechRecognition = class {
        start() {
          this.timer = setTimeout(() => {
            this.onspeechend?.();
            this.onresult?.({ resultIndex: 0, results: [{ 0: { transcript: 'How are you?' }, isFinal: true }] });
          }, 100);
        }
        stop() { clearTimeout(this.timer); }
        abort() { this.stop(); }
      };
      speechSynthesis.getVoices = () => [];
      speechSynthesis.speak = (utterance) => {
        window.fixtureUtterance = utterance;
        setTimeout(() => utterance.onstart?.(), 100);
      };
      speechSynthesis.cancel = () => {};
      const request = window.fetch.bind(window);
      window.fetch = (url, options) => {
        if (url !== '/api/ai-stream') return request(url, options);
        if (window.fixtureChatResponse) {
          return Promise.resolve(new Response('Listen to this example. Try the next exercise.', {
            headers: { 'Content-Type': 'text/plain' },
          }));
        }
        return Promise.resolve(new Response(new ReadableStream({
          start(controller) {
            window.fixtureStreamStarted = true;
            controller.enqueue(new TextEncoder().encode('This is a fixture answer. '.repeat(4)));
            options.signal.addEventListener('abort', () => {
              window.fixtureVoiceAborted = true;
              controller.error(new DOMException('Cancelled', 'AbortError'));
            }, { once: true });
          },
        }), { headers: { 'Content-Type': 'text/plain' } }));
      };
    });
    const page = await context.newPage();
    await page.goto(new URL('/#/student', base).href, { waitUntil: 'domcontentloaded' });
    await page.locator('main > div.lg\\:hidden > button').click();
    await page.getByRole('button', { name: 'AI', exact: true }).click();
    await page.getByRole('button', { name: /^Edubek\b/i }).click();
    await page.getByRole('button', { name: 'Suhbat', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Edubek bilan suhbat' });
    const avatar = dialog.locator('[data-audio-playing]');
    await avatar.locator('.edubek-articulated-head').waitFor();
    assert.equal(await avatar.getAttribute('data-audio-playing'), 'false');
    await shot(page, 'v13-voice-idle-390');
    await dialog.getByRole('button', { name: 'Suhbatni boshlash' }).click();
    await dialog.locator('[data-audio-playing="true"] .edubek-audible-mouth').waitFor();
    await page.evaluate(() => window.fixtureUtterance.onboundary({ name: 'word', charIndex: 0, charLength: 4 }));
    assert.equal(await avatar.locator('.edubek-audible-mouth').evaluate(el => el.getAnimations().some(a => a.constructor.name === 'Animation')), true);
    const marks = await page.evaluate(() => window.__edubekMarks.map(({name, t}) => ({name, t})));
    await fs.writeFile(path.join(output, 'synthetic-voice-timing.json'), JSON.stringify(marks));
    await shot(page, 'v13-voice-playing-390');
    await dialog.getByRole('button', { name: 'Suhbatni to‘xtatish' }).click();
    await page.waitForFunction(() => window.fixtureVoiceAborted === true);
    assert.equal(await avatar.getAttribute('data-audio-playing'), 'false');
    await dialog.getByRole('button', { name: 'Suhbatni yopish' }).click();
    await dialog.waitFor({ state: 'hidden' });
    await page.evaluate(() => { window.fixtureChatResponse = true; });
    await page.getByPlaceholder(/Savol yoki matnni yozing/).fill('Please give an example');
    await page.getByRole('button', { name: 'Yuborish', exact: true }).click();
    const listen = page.getByRole('button', { name: 'Tinglash', exact: true }).last();
    await listen.click();
    await page.locator('[data-audio-playing="true"] .edubek-audible-mouth').first().waitFor();
    await shot(page, 'v13-chat-reading-390');
    await page.getByRole('button', { name: 'Suhbat', exact: true }).click();
    await dialog.waitFor();
    assert.equal(await avatar.getAttribute('data-audio-playing'), 'false');
    await dialog.getByRole('button', { name: 'Suhbatni yopish' }).click();
    await page.evaluate(() => {
      window.fixtureChatResponse = false;
      window.fixtureVoiceAborted = false;
      window.fixtureStreamStarted = false;
    });
    await page.getByPlaceholder(/Savol yoki matnni yozing/).fill('A reply to cancel on navigation');
    await page.getByRole('button', { name: 'Yuborish', exact: true }).click();
    await page.waitForFunction(() => window.fixtureStreamStarted === true);
    await page.locator('main > div.lg\\:hidden > button').click();
    await page.getByRole('button', { name: 'Boshqaruv paneli', exact: true }).click();
    await page.waitForFunction(() => window.fixtureVoiceAborted === true);
    console.log('PASS leaving EduBek chat cancels a pending AI request');
    console.log('PASS manual chat playback without automatic voice and cancellation on conversation open');
    console.log('PASS mock STT/AI/TTS: idle, active playback, abort, motion cleanup');
  } finally { await context.close(); }
}

async function miniApp(browser) {
  const context = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 768, height: 1024 } });
  try {
    const api = new URL('/api/telegram/miniapp', base).href;
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) throw new Error('Set the fixture Telegram token');
    const signed = (timestamp) => {
      const params = new URLSearchParams({ auth_date: String(timestamp), user: '{"id":42}' });
      const fields = [...params].map(([key, value]) => key + '=' + value).sort().join('\n');
      const secret = createHmac('sha256', 'WebAppData').update(token).digest();
      params.set('hash', createHmac('sha256', secret).update(fields).digest('hex'));
      return params.toString();
    };
    const now = Math.floor(Date.now() / 1000);
    const good = signed(now);
    for (const [initData, expected] of [[good, 204], [good.replace('42', '43'), 401], [signed(now - 90000), 401], ['', 401]]) {
      const response = await context.request.post(api, { headers: { 'x-telegram-init-data': initData } });
      assert.equal(response.status(), expected);
      assert.equal(response.headers()['set-cookie'], undefined);
    }
    const page = await context.newPage();
    // The signed payload fixture exercises the app without contacting Telegram.
    await page.route('https://telegram.org/js/telegram-web-app.js', (route) => route.fulfill({
      contentType: 'application/javascript',
      body: 'window.Telegram={WebApp:{colorScheme:"dark",initData:' + JSON.stringify(good) + '}};',
    }));
    await page.goto(new URL('/miniapp', base).href);
    await page.getByRole('status').filter({ hasText: 'Telegram ochilishi tasdiqlandi.' }).waitFor();
    const links = await page.getByRole('navigation', { name: 'Ta’lim yo‘nalishlari' }).getByRole('link').evaluateAll((items) => items.map((item) => item.href));
    assert.equal(links.length, 6);
    for (const target of links) assert.equal((await context.request.get(target)).status(), 200);
    await shot(page, 'v13-mini-app-verified-768');
    console.log('PASS Mini App: fresh signature, altered data, expiry, six shortcuts');
  } finally { await context.close(); }
}

async function motion(browser) {
  const context = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 390, height: 844 } });
  try {
    const data = await (await context.request.get(new URL('/api/db/all', base).href)).json();
    const experience = data.data.teacherProfile.experienceYears;
    assert.ok(experience > 0, 'Fixture teacher has an experience counter');
    const page = await context.newPage();
    await page.goto(base.href);
    const counter = page.locator('#teacher-bio span').filter({ hasText: /\+ yil$/ });
    await counter.waitFor({ state: 'attached' });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.getByText(experience + '+ yil', { exact: true }).waitFor({ state: 'visible' });
    assert.equal(await counter.textContent(), experience + '+ yil');
    console.log('PASS changing reduced motion renders the final count');
  } finally { await context.close(); }
}

async function navigation(browser) {
  const context = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  try {
    const page = await context.newPage();
    await page.goto(base.href);
    const menu = page.getByRole('button', { name: 'Menyu' });
    await menu.click();
    assert.equal(await menu.getAttribute('aria-expanded'), 'true');
    await shot(page, 'v13-mobile-navigation-390');
    await page.keyboard.press('Escape');
    assert.equal(await menu.getAttribute('aria-expanded'), 'false');
    assert.equal(await menu.evaluate((el) => el === document.activeElement), true);

    const faqPage = await context.newPage();
    try {
      const endpoint = new URL('/api/db/all', base).href;
      await faqPage.route(endpoint, async (route) => {
        const response = await route.fetch();
        const body = await response.json();
        body.data.faqs = [];
        await route.fulfill({ response, json: body });
      });
      await faqPage.goto(base.href);
      await faqPage.getByRole('button', { name: 'Menyu' }).click();
      assert.equal(await faqPage.locator('#faq').count(), 0);
      assert.equal(await faqPage.getByRole('button', { name: 'Savollar', exact: true }).count(), 0);
    } finally { await faqPage.close(); }

    const email = 'finance-' + randomUUID() + '@test.local';
    const signup = await context.request.post(new URL('/api/auth/register', base).href, {
      data: { name: 'Finance', surname: 'Fixture', email, identifier: email, password: 'FinanceFixture-123!' },
    });
    assert.equal(signup.status(), 200);
    const { user: financeUser } = await (await context.request.get(new URL('/api/auth/me', base).href)).json();
    const login = await context.request.post(new URL('/api/auth/login', base).href, {
      data: { loginInput: process.env.OWNER_USERNAME, password: process.env.OWNER_PASSWORD },
    });
    assert.equal(login.status(), 200);
    const ownerPage = await context.newPage();
    await ownerPage.setViewportSize({ width: 1440, height: 900 });
    await ownerPage.goto(new URL('/#/admin', base).href);
    const filter = ownerPage.getByRole('searchbox', { name: 'Owner bo‘limlarini qidirish' });
    await filter.fill('SEO');
    await ownerPage.getByRole('button', { name: 'SEO sahifalar', exact: true }).click();
    await shot(ownerPage, 'v13-owner-seo-1440');
    await filter.fill('Levelni aniqlash');
    await ownerPage.getByRole('button', { name: 'Levelni aniqlash', exact: true }).click();
    const tests = await (await context.request.get(new URL('/api/levels/owner', base).href)).json();
    const placement = tests.tests.find(test => test.id === 'v9-test');
    assert.ok(placement, 'Published placement fixture exists in Owner Panel');
    await ownerPage.getByRole('listitem').filter({ hasText: placement.title }).getByRole('button').click();
    const exportMode = ownerPage.getByLabel('Eksport turi');
    assert.equal(await exportMode.inputValue(), 'all');
    await exportMode.selectOption('summary');
    const download = ownerPage.waitForEvent('download');
    await ownerPage.getByRole('button', { name: 'Excel', exact: true }).click();
    assert.match((await download).suggestedFilename(), /-saralangan\.xlsx$/);
    await exportMode.scrollIntoViewIfNeeded();
    await shot(ownerPage, 'v13-placement-export-1440');
    await ownerPage.setViewportSize({ width: 390, height: 844 });
    await exportMode.scrollIntoViewIfNeeded();
    assert.equal(await exportMode.evaluate(el => {
      const bounds = el.getBoundingClientRect();
      return bounds.left >= 0 && bounds.right <= window.innerWidth;
    }), true);
    await shot(ownerPage, 'v13-placement-export-390');
    await ownerPage.setViewportSize({ width: 1440, height: 900 });
    console.log('PASS Owner Placement export defaults to all, downloads summary, and fits mobile');
    await ownerPage.emulateMedia({ reducedMotion: 'reduce' });
    await filter.fill('Depozitlar');
    await ownerPage.getByRole('button', { name: 'Depozitlar & moliya', exact: true }).click();
    await ownerPage.getByRole('button', { name: 'Balansni Qo‘lda O‘zgartirish', exact: true }).click();
    const account = ownerPage.getByLabel('O‘quvchini tanlang');
    await account.selectOption(financeUser.id);
    await ownerPage.getByLabel('Summa (so‘m)', { exact: true }).fill('2000');
    await ownerPage.getByLabel('Izoh / Sabab', { exact: true }).fill('Finance fixture');
    const balanceUrl = new URL('/api/owner/students/update', base).href;
    await ownerPage.route(balanceUrl, async route => {
      const result = await context.request.post(balanceUrl, { data: { id: financeUser.id, balance: 3000 } });
      assert.equal(result.status(), 200);
      await route.continue();
    }, { times: 1 });
    const updateBalance = ownerPage.getByRole('button', { name: 'Balansni Yangilash', exact: true });
    await updateBalance.click();
    await ownerPage.getByRole('alert').filter({ hasText: 'Balans o‘zgargan' }).waitFor();
    await ownerPage.getByRole('alert').filter({ hasText: 'Balans o‘zgargan' }).scrollIntoViewIfNeeded();
    await shot(ownerPage, 'v13-finance-stale-balance-1440');
    await ownerPage.setViewportSize({ width: 390, height: 844 });
    await updateBalance.click();
    const confirmation = ownerPage.getByRole('status').filter({ hasText: /Finance balansida 5[^0-9]?000 so‘m bor/ });
    await confirmation.waitFor();
    await confirmation.scrollIntoViewIfNeeded();
    await shot(ownerPage, 'v13-finance-adjusted-balance-390');
    await ownerPage.setViewportSize({ width: 1440, height: 900 });
    console.log('PASS Owner stale balance is reported, refreshed, and retried successfully from mobile');
    const logOut = ownerPage.locator('aside').getByRole('button', { name: 'Chiqish', exact: true });
    const response = ownerPage.waitForResponse((r) => r.url().endsWith('/api/auth/logout'));
    await logOut.click();
    assert.equal((await response).status(), 200);
    const session = await context.request.get(new URL('/api/auth/me', base).href);
    assert.equal((await session.json()).authenticated, false);
    console.log('PASS accessible mobile navigation, empty FAQ link, owner tab search, server logout');
  } finally { await context.close(); }
}

(async () => {
  await fs.mkdir(output, { recursive: true });
  const browser = await chromium.launch();
  try {
    await navigation(browser);
    await motion(browser);
    await miniApp(browser);
    await voice(browser);
  } finally { await browser.close(); }
})().catch((error) => { console.error(error.message); process.exitCode = 1; });
