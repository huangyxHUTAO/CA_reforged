import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new', args: ['--no-sandbox']
});
const page = await browser.newPage();
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
await new Promise(r => setTimeout(r, 10000));
const r = await page.evaluate(() => {
  const G = globalThis.G;
  return {
    gone: G?.View?.GONE,
    visible: G?.View?.VISIBLE,
    invisible: G?.View?.INVISIBLE,
    gravityCenter: G?.Gravity?.CENTER,
    sp: G?.Spanned
  };
});
console.log(JSON.stringify(r, null, 2));
await browser.close();
