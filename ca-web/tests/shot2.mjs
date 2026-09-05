import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--no-sandbox']
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 });
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 2500));
// 抓各元素的精确位置/大小
const info = await page.evaluate(() => {
  const ca = document.querySelector('ca-app');
  const sr = ca.shadowRoot;
  const elements = [...sr.querySelectorAll('*')].slice(0, 10).map(el => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {
      tag: el.tagName,
      text: el.textContent.slice(0, 40),
      x: r.x.toFixed(0), y: r.y.toFixed(0),
      w: r.width.toFixed(0), h: r.height.toFixed(0),
      color: cs.color, bg: cs.backgroundColor,
      font: cs.fontSize + ' ' + cs.fontFamily.slice(0, 20)
    };
  });
  return { elements };
});
console.log(JSON.stringify(info, null, 2));
await page.screenshot({ path: 'tests/screenshot-final.png' });
await browser.close();
