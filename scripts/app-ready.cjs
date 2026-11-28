// Wait for the hydrated landing page without interacting with its links or controls.
async function appReady(page, timeoutMs = 45000) {
  await page.getByRole('button', { name: /edubek/i }).first().waitFor({
    state: 'visible',
    timeout: timeoutMs,
  });
}

module.exports = { appReady };
