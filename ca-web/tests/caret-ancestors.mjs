import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new', args: ['--no-sandbox']
});
const page = await browser.newPage();
await page.setViewport({ width: 900, height: 700 });
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
await new Promise(r => setTimeout(r, 11000));
await page.evaluate(() => {
  window.__tr = [];
  const el = globalThis.CA.cmd.el;
  const rec = (phase, ev, e) => {
    const path = e.composedPath();
    window.__tr.push({ phase, ev, pd: e.defaultPrevented,
      target: e.target.tagName + (e.target.id ? '#' + e.target.id : ''),
      atIdx: path.indexOf(e.target) });
  };
  for (const ev of ['pointerdown', 'mousedown', 'mouseup', 'click']) {
    // 每个祖先 + el 上都挂 capture & bubble
    let n = el;
    while (n && n !== document.documentElement) {
      n.addEventListener(ev, (e) => rec('cap@' + n.tagName + (n.id ? '#' + n.id : ''), ev, e), true);
      n.addEventListener(ev, (e) => rec('bub@' + n.tagName + (n.id ? '#' + n.id : ''), ev, e));
      n = n.parentElement;
    }
  }
});
const info = await page.evaluate(() => {
  const el = globalThis.CA.cmd.el;
  el.focus();
  el.value = '/say 一二三四五六七八九十一二三四五六七八九十abcdefghij';
  el.setSelectionRange(0, 0);
  const rc = el.getBoundingClientRect();
  return { x0: rc.x, y0: rc.y, w: rc.width, h: rc.height };
});
await page.mouse.click(info.x0 + info.w * 0.6, info.y0 + info.h / 2);
await new Promise(r => setTimeout(r, 400));
const rec = await page.evaluate(() => window.__tr);
// 只打印 pointerdown 相关的关键变化
for (const x of rec) {
  if (x.ev === 'pointerdown') console.log(x.phase, 'pd=' + x.pd, 'target=' + x.target);
}
const s = await page.evaluate(() => { const el = globalThis.CA.cmd.el; return el.selectionStart + '/' + el.selectionEnd; });
console.log('sel:', s);
await browser.close();
