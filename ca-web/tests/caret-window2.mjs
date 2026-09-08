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
  // window capture 最前：只给到达 cmd 的 pointerdown/mousedown 覆写 preventDefault（保留原生 defaultPrevented）
  for (const type of ['pointerdown', 'mousedown']) {
    window.addEventListener(type, (e) => {
      if (e.target !== el) return;
      if (!e.__hooked) {
        e.__hooked = true;
        const orig = e.preventDefault.bind(e);
        e.preventDefault = function () {
          window.__tr.push({ ev: e.type, who: 'preventDefault-call',
            stack: (new Error().stack || '').split('\n').slice(1, 6).map(s => s.trim()).join(' << ') });
          return orig();
        };
      }
    }, true);
  }
  // 每层 cap/bub 打 pd（IIFE 固定 tag，不碰 defaultPrevented）
  let n = el, guard = 0;
  while (n && guard++ < 12) {
    const tag = n.tagName + (n.id ? '#' + n.id : '');
    n.addEventListener('pointerdown', (e) => { window.__tr.push({ ev: 'pd', who: 'cap@' + tag, pd: e.defaultPrevented }); }, true);
    n.addEventListener('pointerdown', (e) => { window.__tr.push({ ev: 'pd', who: 'bub@' + tag, pd: e.defaultPrevented }); });
    n = n.parentElement;
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
const tr = await page.evaluate(() => window.__tr);
console.log(JSON.stringify(tr, null, 1));
const s = await page.evaluate(() => { const el = globalThis.CA.cmd.el; return el.selectionStart + '/' + el.selectionEnd; });
console.log('sel:', s);
await browser.close();
