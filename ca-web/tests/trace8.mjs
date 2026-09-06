import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--no-sandbox']
});
const page = await browser.newPage();
page.on('pageerror', e => console.log('[ERR]', e.message, e.stack?.split('\n').slice(0, 3).join(' | ')));
page.on('console', m => {
  const t = m.text();
  if (m.type() === 'error') console.log(`[err] ${t.slice(0, 200)}`);
});
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 2500));
// 看 main.js 跑到了哪 —— 数 modules
const r = await page.evaluate(() => ({
  LoaderLoading: globalThis.Loader?.loading,
  LoaderHasRun: globalThis.Loader?.cache != null,
  modules: globalThis.MapScript?.modules || [],
  Internal: typeof globalThis.Internal,
  G: typeof globalThis.G,
  L: typeof globalThis.L
}));
console.log('STATE:', JSON.stringify(r, null, 2));
await browser.close();
