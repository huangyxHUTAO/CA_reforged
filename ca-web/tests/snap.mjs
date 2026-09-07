import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new', args: ['--no-sandbox']
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 800 });
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
await new Promise(r => setTimeout(r, 10000));
await page.screenshot({ path: 'tests/full.png', fullPage: true });
// 也取 overlay 那个 DefaultWindow 的截图
const dh = await page.evaluate(() => {
  const ov = document.getElementById('ca-overlay');
  const root = ov?.firstElementChild;
  if (!root) return null;
  const r = root.getBoundingClientRect();
  return { x: r.x, y: r.y, w: r.width, h: r.height };
});
console.log('DefaultWindow rect:', JSON.stringify(dh));
await browser.close();
