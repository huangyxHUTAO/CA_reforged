import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
    args: ['--no-sandbox']
});
const page = await browser.newPage();
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 10000));
const r = await page.evaluate(() => {
  const C = globalThis.Common;
  return {
    hasIntl: !!C?.intl,
    intlResolve: typeof C?.intl?.resolve,
    hasTheme: !!C?.theme,
    hasCreateWebView: typeof C?.createWebView,
    hasToast: typeof C?.toast,
    keyCount: C ? Object.keys(C).length : 0
  };
});
console.log(JSON.stringify(r, null, 2));
await browser.close();
