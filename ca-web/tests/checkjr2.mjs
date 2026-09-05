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
    allKeys: J ? Object.getOwnPropertyNames(J) : null,
    desc: J ? Object.getOwnPropertyDescriptors(J) : null,
    isOurShim: J && J.__isJavaReflectShim
  };
});
console.log('JR:', JSON.stringify(r, null, 2));
await browser.close();
