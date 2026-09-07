export default async function run(page) {
  const pageErrors = [];
  const consoleErrors = [];
  const failedRequests = [];
  const navigations = [];
  const badResponses = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('requestfailed', (request) => failedRequests.push(`${request.method()} ${request.url()} ${request.failure()?.errorText || ''}`));
  page.on('framenavigated', (frame) => { if (frame === page.mainFrame()) navigations.push(frame.url()); });
  page.on('response', (response) => { if (response.status() >= 400) badResponses.push(`${response.status()} ${response.url()}`); });
  await page.locator('input:not([type="password"])').first().fill('websathish52@gmail.com');
  await page.locator('input[type="password"]').fill('Sathish@0922');
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL('**/master**', { timeout: 15000 });
  const dashboardUrl = page.url();
  const dashboardText = await page.locator('body').innerText();
  await page.getByRole('link', { name: 'Module Access' }).click();
  await page.waitForTimeout(5000);
  return {
    url: page.url(),
    dashboardUrl,
    dashboardChars: dashboardText.length,
    dashboardText: dashboardText.slice(0, 500),
    bodyText: (await page.locator('body').innerText()).slice(0, 3000),
    bodyHtml: (await page.locator('body').innerHTML()).slice(0, 3000),
    headings: await page.locator('h1, h2, h3').allTextContents(),
    bodyChars: await page.locator('body').innerText().then((text) => text.length),
    pageErrors,
    consoleErrors,
    failedRequests,
    navigations,
    performance: await page.evaluate(() => performance.getEntriesByType('resource').map((entry) => entry.name).filter((name) => name.includes('module-access') || name.includes('App'))),
    badResponses,
  };
}
