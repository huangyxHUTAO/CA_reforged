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
  function desc(el, depth) {
    if (!el || depth > 4) return null;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {
      tag: el.tagName, display: cs.display,
      text: el.children.length === 0 ? el.textContent?.trim().slice(0, 25) : undefined,
      rect: { x: r.x|0, y: r.y|0, w: r.width|0, h: r.height|0 },
      children: el.children.length ? [...el.children].slice(0, 6).map(c => desc(c, depth+1)) : undefined
    };
  }
  return {
    root: desc(root, 0),
    // CA 输入框是否可见
    cmdRect: (() => { const e = globalThis.CA?.cmd?.el; if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x|0, y: r.y|0, w: r.width|0, h: r.height|0, inDoc: !!e.isConnected }; })(),
    hasCmd: !!globalThis.CA?.cmd
  };
});
console.log(JSON.stringify(r, null, 2));
await page.screenshot({ path: 'tests/layout.png' });
await browser.close();
