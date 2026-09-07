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
  // root → ... → main 逐层 + 兄弟
  const mv = globalThis.CA?.gen?.mainView;
  const out = [];
  let cur = mv;
  const path = [];
  while (cur) { path.unshift(cur); cur = cur.getParent ? cur.getParent() : null; }
  for (const v of path) {
    const e = v.el; if (!e) continue;
    const cs = getComputedStyle(e); const rc = e.getBoundingClientRect();
    const item = { tag: v.tagNameForView, display: cs.display, flexDir: cs.flexDirection, rect: `${rc.x|0},${rc.y|0} ${rc.width|0}x${rc.height|0}`, flex: cs.flex, hStyle: e.style.height };
    if (v === mv) item.MARK = 'main';
    out.push(item);
  }
  return out;
});
console.log(JSON.stringify(r, null, 2));
await browser.close();
