const { chromium } = require('playwright');

async function testApp() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  console.log('Navigating to http://localhost:3000...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 30000 });
  console.log('Title:', await page.title());

  // Click on Kirish (Auth)
  const authBtn = await page.$('text=Kirish');
  if (authBtn) {
    await authBtn.click();
    console.log('Navigated to Auth page');
    await page.waitForTimeout(1000);
    const hasMascot = await page.$('text=Oliver') || await page.$('text=Cleo');
    console.log('Mascot rendered on Auth page:', !!hasMascot);
  }

  // Fast demo login
  const demoBtn = await page.$('text=Jasurbek');
  if (demoBtn) {
    await demoBtn.click();
    console.log('Clicked Demo Login');
    await page.waitForTimeout(1500);
    console.log('URL after login:', page.url());
  }

  // Check navigation tabs
  const packsTab = await page.$('text=Testlar Bilimi');
  console.log('Found Thematic Packs tab:', !!packsTab);
  if (packsTab) {
    await packsTab.click();
    await page.waitForTimeout(800);
    const packHeading = await page.$('text=Testlar Bilimi & Mavzuli Mashqlar');
    console.log('Thematic Quiz Packs rendered:', !!packHeading);
  }

  const duelTab = await page.$('text=Klan Duellari');
  console.log('Found Clan Battles tab:', !!duelTab);
  if (duelTab) {
    await duelTab.click();
    await page.waitForTimeout(800);
    const duelHeading = await page.$('text=Klan Duellari');
    console.log('Clan Battles Arena rendered:', !!duelHeading);
  }

  // Check Community Chat dual tabs
  const chatTab = await page.$('text=Global Hamjamiyat');
  if (chatTab) {
    await chatTab.click();
    await page.waitForTimeout(800);
    const globalTab = await page.$('text=Global Hamjamiyat');
    const clanTab = await page.$('text=Klan Chati');
    const shopBtn = await page.$('text=Ramkalar');
    console.log('Chat tabs rendered:', { global: !!globalTab, clan: !!clanTab, shop: !!shopBtn });
  }

  await browser.close();
  console.log('All tests finished successfully!');
}

testApp().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
