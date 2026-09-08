import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new', args: ['--no-sandbox']
});
const page = await browser.newPage();
await page.setViewport({ width: 900, height: 700 });
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
await new Promise(r => setTimeout(r, 11000));

// 先埋监听：非捕获 mousedown/click 记录 defaultPrevented 最终值 & selection 变化
await page.evaluate(() => {
  window.__evRec = [];
  const el = globalThis.CA.cmd.el;
  document.addEventListener('mousedown', (e) => {
    window.__evRec.push({ ev: 'mousedown(bubble)', pd: e.defaultPrevented, target: e.target === el ? 'cmd' : e.target.tagName });
  });
  document.addEventListener('mouseup', (e) => {
    window.__evRec.push({ ev: 'mouseup(bubble)', pd: e.defaultPrevented });
  });
  document.addEventListener('click', (e) => {
    window.__evRec.push({ ev: 'click(bubble)', pd: e.defaultPrevented, sel: el.selectionStart + '/' + el.selectionEnd });
  }, true); // capture 先看
  document.addEventListener('click', (e) => {
    window.__evRec.push({ ev: 'click(bubble2)', pd: e.defaultPrevented, sel: el.selectionStart + '/' + el.selectionEnd });
  });
  // 拦截 el 的 setSelectionRange 看谁调
  const orig = el.setSelectionRange.bind(el);
  el.setSelectionRange = function (a, b) {
    window.__evRec.push({ ev: 'setSelectionRange', a, b, stack: new Error().stack.split('\n')[1] || '' });
    return orig(a, b);
  };
});
const info = await page.evaluate(() => {
  const el = globalThis.CA.cmd.el;
  el.value = '/say 一二三四五六七八九十一二三四五六七八九十abcdefghij';
  const rc = el.getBoundingClientRect();
  return { x0: rc.x, y0: rc.y, w: rc.width, h: rc.height };
});
// 真实点击中间
await page.mouse.click(info.x0 + info.w / 2, info.y0 + info.h / 2);
await new Promise(r => setTimeout(r, 500));
const rec = await page.evaluate(() => window.__evRec);
console.log(JSON.stringify(rec, null, 1));
const sel = await page.evaluate(() => { const el = globalThis.CA.cmd.el; return { s: el.selectionStart, e: el.selectionEnd, len: el.value.length }; });
console.log('sel:', JSON.stringify(sel));
await browser.close();
