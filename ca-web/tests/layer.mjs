import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new', args: ['--no-sandbox']
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 800 });
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
await new Promise(r => setTimeout(r, 10000));
const r = await page.evaluate(() => {
  const caApp = document.querySelector('ca-app');
  const ov = document.getElementById('ca-overlay');
  // 找最顶层那个子（应该 visible）
  return {
    caAppRect: caApp?.getBoundingClientRect(),
    caAppZ: caApp ? getComputedStyle(caApp).zIndex : null,
    ovZ: ov ? getComputedStyle(ov).zIndex : null,
    ovRect: ov?.getBoundingClientRect(),
    // overlay 内每个子元素的 visibility/display/rect
    ovChildren: ov ? [...ov.children].map(c => {
      const r = c.getBoundingClientRect();
      return { tag: c.tagName, display: getComputedStyle(c).display, visibility: getComputedStyle(c).visibility, rect: { x: r.x, y: r.y, w: r.width, h: r.height }, zIndex: getComputedStyle(c).zIndex };
    }) : null
  };
});
console.log(JSON.stringify(r, null, 2));
await browser.close();
