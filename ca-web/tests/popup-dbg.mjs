import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new', args: ['--no-sandbox']
});
const page = await browser.newPage();
await page.setViewport({ width: 900, height: 700 });
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
await new Promise(r => setTimeout(r, 11000));
const caPos = await page.evaluate(() => {
  const s = [...document.querySelectorAll('#ca-overlay span')].find(x => x.textContent.trim() === 'CA' && x.getBoundingClientRect().width > 0);
  const rc = s.getBoundingClientRect();
  return { x: rc.x + rc.width / 2, y: rc.y + rc.height / 2 };
});
await page.mouse.click(caPos.x, caPos.y);
await new Promise(r => setTimeout(r, 900));

const out = await page.evaluate(() => {
  const r = {};
  const PP = globalThis.PopupPage;
  r.PPkeys = PP ? Object.keys(PP).slice(0, 30) : null;
  try { r.debug = PP.debug ? PP.debug() : null; } catch (e) { r.debugErr = String(e); }
  // 探 defaultStack / floatStack 结构
  for (const k of ['defaultStack', 'floatStack', 'stack']) {
    if (PP && PP[k]) {
      r[k] = PP[k].map(e => ({ name: e.name, hasPage: !!e.page, pageMV: e.page && e.page.mainView ? e.page.mainView.tagNameForView : null }));
    }
  }
  // 也许弹窗挂在 CA.showGen.main 或 PWM 相关容器下：找 overlay 下所有 z=100000 fixed 树的 AndroidView 根
  const ov = document.getElementById('ca-overlay');
  const fixedKids = [...ov.children].filter(c => getComputedStyle(c).position === 'fixed').map(c => {
    const rc = c.getBoundingClientRect();
    return { tag: c.tagName, rect: [Math.round(rc.x), Math.round(rc.y), Math.round(rc.width), Math.round(rc.height)], txt: (c.textContent || '').slice(0, 24).replace(/\s+/g, ' ') };
  });
  r.overlayFixedKids = fixedKids;
  return r;
});
console.log(JSON.stringify(out, null, 1));
await browser.close();
