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
  // 记录 cmd 元素上注册的所有事件类型
  const origSetPD = el.addEventListener.bind(el);
  // 包 onpointerdown 属性
  const origPD = el.onpointerdown;
  if (origPD) {
    el.onpointerdown = function (e) {
      window.__tr.push({ who: 'onpointerdown-wrapper', pdBefore: e.defaultPrevented });
      try {
        const r = origPD.call(this, e);
        window.__tr.push({ who: 'onpointerdown-wrapper', pdAfter: e.defaultPrevented, ret: r });
        return r;
      } catch (err) {
        window.__tr.push({ who: 'onpointerdown-wrapper', threw: String(err) });
      }
    };
  } else {
    window.__tr.push({ who: 'no-onpointerdown' });
  }
  // 也监听 textarea 上所有 pointerdown listener 数量（不可枚举，跳过）
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
