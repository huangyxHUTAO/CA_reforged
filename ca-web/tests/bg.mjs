import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new', args: ['--no-sandbox']
});
const page = await browser.newPage();
await page.setViewport({ width: 900, height: 700 });
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
await new Promise(r => setTimeout(r, 11000));
const r = await page.evaluate(() => {
  const ov = document.getElementById('ca-overlay');
  const root = ov?.firstElementChild;
  const cs = root ? getComputedStyle(root) : null;
  return {
    rootTitle: root?.title,
    bg: cs?.backgroundColor,
    rect: root ? (() => { const r = root.getBoundingClientRect(); return {x:r.x,y:r.y,w:r.width,h:r.height}; })() : null,
    bodyBg: getComputedStyle(document.body).backgroundColor
  };
});
console.log(JSON.stringify(r, null, 2));
await page.screenshot({ path: 'tests/bg.png' });
await browser.close();
