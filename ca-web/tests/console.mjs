import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--no-sandbox']
});
const page = await browser.newPage();
page.on('console', m => {
  if (m.text().includes('ca-web') || m.text().includes('JSON') || m.text().includes('builtin')) {
    console.log(`[${m.type()}]`, m.text().slice(0, 300));
  }
});
page.on('pageerror', e => console.log('[ERR]', e.message.split('\n')[0]));
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 1500));
const r = await page.evaluate(() => ({
  hasJsonFiles: !!globalThis.__caJsonFiles,
  jsonKeys: globalThis.__caJsonFiles ? Object.keys(globalThis.__caJsonFiles) : null,
  CA: typeof globalThis.CA,
  IntColor: typeof globalThis.IntColor,
  Intl: typeof globalThis.Intl,
  BuildConfig: typeof globalThis.BuildConfig
}));
console.log('STATE:', JSON.stringify(r, null, 2));
await browser.close();
