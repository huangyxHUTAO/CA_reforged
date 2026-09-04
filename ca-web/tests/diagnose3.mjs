import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox']
});
const page = await browser.newPage();
page.on('pageerror', e => console.log('[PAGEERROR]', e.message.split('\n')[0]));
page.on('console', m => {
  const t = m.text();
  if (t.includes('[ca') || t.includes('Intl') || t.includes('CA') || t.includes('preload')) {
    console.log(`[${m.type()}] ${t.slice(0, 200)}`);
  }
});
try {
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0', timeout: 15000 });
  await new Promise(r => setTimeout(r, 1500));
  const status = await page.evaluate(() => ({
    intl: typeof globalThis.Intl,
    intlGet: typeof (globalThis.Intl && globalThis.Intl.get),
    intlKeys: globalThis.Intl ? Object.keys(globalThis.Intl) : null,
    ca: typeof globalThis.CA,
    intlFromCA: typeof (globalThis.CA && globalThis.CA.Intl)
  }));
  console.log('STATUS:', JSON.stringify(status, null, 2));
} catch (e) { console.log('GOTO ERROR:', e.message); }
await browser.close();
