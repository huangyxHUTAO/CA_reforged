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
    hasJR: !!J,
    type: typeof J,
    keys: J ? Object.keys(J).slice(0, 20) : null,
    hasStaticMethod: J && typeof J.staticMethod,
    hasMethod: J && typeof J.method,
    hasForName: J && typeof J.forName
  };
});
console.log('JR:', JSON.stringify(r, null, 2));
await browser.close();
