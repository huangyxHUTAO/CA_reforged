import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--no-sandbox']
});
const page = await browser.newPage();
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 6000));
const r = await page.evaluate(() => ({
  LoaderLoading: globalThis.Loader?.loading,
  modules: globalThis.MapScript?.modules?.length,
  CA: typeof globalThis.CA,
  Common: typeof globalThis.Common,
  IntelliSense: typeof globalThis.CA?.IntelliSense,
  showGen: typeof globalThis.CA?.showGen
}));
console.log('FINAL:', JSON.stringify(r, null, 2));
await browser.close();
