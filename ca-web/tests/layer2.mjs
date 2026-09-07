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
  const ov = document.getElementById('ca-overlay');
  const root = ov?.firstElementChild;
  if (!root) return null;
  // 深度遍历
  const walk = (el, depth) => {
    if (depth > 4) return { tag: el.tagName, text: '...' };
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return {
      tag: el.tagName,
      display: cs.display,
      visibility: cs.visibility,
      pos: cs.position,
      text: el.children.length === 0 ? el.textContent?.trim().slice(0, 30) : undefined,
      rect: { x: r.x|0, y: r.y|0, w: r.width|0, h: r.height|0 },
      z: cs.zIndex,
      children: el.children.length ? [...el.children].slice(0, 5).map(c => walk(c, depth+1)) : undefined
    };
  };
  return walk(root, 0);
});
console.log(JSON.stringify(r, null, 2));
await page.screenshot({ path: 'tests/layer2.png' });
await browser.close();
