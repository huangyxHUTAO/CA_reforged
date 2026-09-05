import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--no-sandbox']
});
const page = await browser.newPage();
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 1500));
const r = await page.evaluate(() => {
  const J = globalThis.JavaReflect;
  return {
    type: typeof J,
    isShim: J && J.__isJavaReflectShim,
    forNameType: J && typeof J.forName,
    methodType: J && typeof J.method,
    staticMethodType: J && typeof J.staticMethod,
    // 看 J 是不是我们 shim 的对象
    forNameImpl: J && J.forName && J.forName.constructor && J.forName.constructor.name
  };
});
console.log('JR:', JSON.stringify(r, null, 2));
await browser.close();
