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
  window.__seq = [];
  const el = globalThis.CA.cmd.el;
  // 1) 包 onpointerdown 属性 handler
  const origPD = el.onpointerdown;
  if (origPD) {
    el.onpointerdown = function (e) {
      window.__seq.push({ s: 'A:onpointerdown(引擎touch) ENTER', pd: e.defaultPrevented });
      const r = origPD.call(this, e);
      window.__seq.push({ s: 'A:onpointerdown EXIT', pd: e.defaultPrevented, ret: r });
      return r;
    };
  }
  // 2) 在 el 挂 cap + bub（IIFE 记录）
  el.addEventListener('pointerdown', (e) => window.__seq.push({ s: 'B:el-cap(探针)', pd: e.defaultPrevented }), true);
  el.addEventListener('pointerdown', (e) => window.__seq.push({ s: 'C:el-bub(探针)', pd: e.defaultPrevented }));
  // 3) 祖先挂 cap/bub
  let n = el.parentElement, g = 0;
  while (n && g++ < 6) {
    const tag = n.tagName + (n.id ? '#' + n.id : '');
    n.addEventListener('pointerdown', (e) => window.__seq.push({ s: 'cap@' + tag, pd: e.defaultPrevented }), true);
    n.addEventListener('pointerdown', (e) => window.__seq.push({ s: 'bub@' + tag, pd: e.defaultPrevented }));
    n = n.parentElement;
  }
  // 4) document + window 层最后
  document.addEventListener('pointerdown', (e) => window.__seq.push({ s: 'doc-cap', pd: e.defaultPrevented }), true);
  document.addEventListener('pointerdown', (e) => window.__seq.push({ s: 'doc-bub', pd: e.defaultPrevented }));
  window.addEventListener('pointerdown', (e) => window.__seq.push({ s: 'win-cap', pd: e.defaultPrevented }), true);
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
const seq = await page.evaluate(() => window.__seq);
console.log(JSON.stringify(seq, null, 1));
const s = await page.evaluate(() => { const el = globalThis.CA.cmd.el; return el.selectionStart + '/' + el.selectionEnd; });
console.log('sel:', s);
await browser.close();
