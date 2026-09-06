import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--no-sandbox']
});
const page = await browser.newPage();
page.on('pageerror', e => console.log('[ERR]', e.message));
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 2000));
// 看 Loader 对象
const r = await page.evaluate(() => {
  return {
    LoaderType: typeof globalThis.Loader,
    LoaderKeys: globalThis.Loader ? Object.keys(globalThis.Loader).slice(0, 10) : null,
    LoaderLoading: globalThis.Loader?.loading,
    LoaderCache: globalThis.Loader?.cache ? Object.keys(globalThis.Loader.cache) : null,
    MapScriptType: typeof globalThis.MapScript,
    MapScriptModules: globalThis.MapScript?.modules
  };
});
console.log(JSON.stringify(r, null, 2));
await browser.close();
