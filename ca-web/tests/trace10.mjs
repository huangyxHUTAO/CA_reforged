import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--no-sandbox']
});
const page = await browser.newPage();
const events = [];
page.on('pageerror', e => events.push(`[ERR] ${e.message}`));
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' });
// 每 100ms 检查一次 modules 长度
for (let i = 0; i < 50; i++) {
  const m = await page.evaluate(() => globalThis.MapScript?.modules?.length || 0);
  if (m !== (events[events.length - 1] || '')) {
    events.push(`${Date.now()}: modules=${m}`);
  }
  await new Promise(r => setTimeout(r, 100));
  if (m >= 5) break;
}
console.log('EVENTS:');
events.forEach(e => console.log(' ', e));
const final = await page.evaluate(() => ({
  modules: globalThis.MapScript?.modules,
  LoaderLoading: globalThis.Loader?.loading,
  Common: typeof globalThis.Common,
  CA: typeof globalThis.CA
}));
console.log('FINAL:', JSON.stringify(final, null, 2));
await browser.close();
