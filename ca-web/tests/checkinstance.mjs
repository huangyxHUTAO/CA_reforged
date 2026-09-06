import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--no-sandbox']
});
const page = await browser.newPage();
page.on('pageerror', e => console.log('[ERR]', e.message.split('\n')[0]));
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 5500));
const r = await page.evaluate(() => {
  const d = globalThis.CA?.Library?.inner?.default;
  return {
    hasDefault: !!d,
    keysCount: d ? Object.keys(d).length : null,
    isObj: d instanceof Object,
    isArr: d instanceof Array,
    ctorName: d?.constructor?.name,
    // 直接调 loadLibrary
    loadLib: (() => {
      try {
        const r = globalThis.CA.Library.loadLibrary('default', null);
        return { hasError: r.hasError, error: r.error?.toString()?.slice(0, 200), dataName: r.name };
      } catch (e) { return { err: e.message }; }
    })()
  };
});
console.log(JSON.stringify(r, null, 2));
await browser.close();
