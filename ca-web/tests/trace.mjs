import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--no-sandbox']
});
const page = await browser.newPage();
page.on('console', m => {
  const t = m.text();
  if (!t.includes('vite')) console.log(`[${m.type()}] ${t.slice(0, 200)}`);
});
page.on('pageerror', e => console.log('[ERR]', e.message, e.stack?.split('\n').slice(0, 3).join(' | ')));
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 4000));
const r = await page.evaluate(() => ({
  Loader: typeof globalThis.Loader,
  LoaderLoad: globalThis.Loader && typeof globalThis.Loader.load,
  LoaderLoading: globalThis.Loader && globalThis.Loader.loading,
  CA: typeof globalThis.CA,
  ctx: typeof globalThis.ctx
}));
console.log('STATE:', JSON.stringify(r));
await browser.close();
