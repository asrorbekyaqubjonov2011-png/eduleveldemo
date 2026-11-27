// Waits for the interactive app to be ready on a page (the opening splash is skipped by a click, then the app appears).
// Replaces fixed sleeps: the app takes a different time on every machine.
async function appReady(page, timeoutMs = 45000) {
  const vp = page.viewportSize() || { width: 1280, height: 800 };
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    // Ready when the interactive app's own control (the EduBek dock on the landing page) is on screen and the intro is gone.
    const ready = await page.evaluate(() => {
      const dock = document.querySelector('button[aria-label*="dubek" i]');
      const intro = document.querySelector('[role="status"][aria-label="EduLevel yuklanmoqda"]');
      return !!dock && !intro;
    }).catch(() => false);
    if (ready) return true;
    // Click the splash (it skips the intro), then wait a moment.
    await page.mouse.click(vp.width / 2, vp.height - 90).catch(() => {});
    await page.waitForTimeout(700);
  }
  return false;
}
module.exports = { appReady };
