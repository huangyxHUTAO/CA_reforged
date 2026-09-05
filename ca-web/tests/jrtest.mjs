import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--no-sandbox']
});
const page = await browser.newPage();
page.on('pageerror', e => console.log('[ERR]', e.message.split('\n')[0]));
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 1500));
const r = await page.evaluate(() => {
  const J = globalThis.JavaReflect;
  return {
    hasStaticMethod: typeof J.staticMethod,
    hasMethod: typeof J.method,
    hasParseClass: typeof J.parseClass,
    keyCount: Object.keys(J).length,
    hasOurShimMarker: !!J.__isJavaReflectShim
  };
});
console.log('JR:', JSON.stringify(r));
await browser.close();
