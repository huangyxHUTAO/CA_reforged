import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
});
const page = await browser.newPage();
page.on('pageerror', e => console.log('[PAGEERROR]', e.message));
page.on('console', m => {
  const t = m.text();
  if (t.includes('[ca') || t.includes('ca-web')) console.log(`[${m.type()}] ${t.slice(0, 300)}`);
});
try {
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0', timeout: 15000 });
  await new Promise(r => setTimeout(r, 1000));
  const status = await page.evaluate(() => ({
    preKeys: globalThis.__caPreloadedModules ? Object.keys(globalThis.__caPreloadedModules) : null,
    CA: typeof globalThis.CA,
    hasCA: !!globalThis.CA
  }));
  console.log('STATUS:', JSON.stringify(status));
} catch (e) { console.log('GOTO ERROR:', e.message); }
await browser.close();
