import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--no-sandbox']
});
const page = await browser.newPage();
page.on('console', m => {
  const t = m.text();
  if (!t.includes('vite') && !t.includes('Lit is')) console.log(`[${m.type()}] ${t.slice(0, 250)}`);
});
page.on('pageerror', e => console.log('[ERR]', e.message, e.stack?.split('\n').slice(0, 3).join(' | ')));
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 4000));
const r = await page.evaluate(() => ({
  LoaderLoading: globalThis.Loader?.loading,
  Common: typeof globalThis.Common,
  CA: typeof globalThis.CA,
  IntelliSense: typeof globalThis.CA?.IntelliSense
}));
console.log('STATE:', JSON.stringify(r));
await browser.close();
