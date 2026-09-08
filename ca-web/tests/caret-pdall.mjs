import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new', args: ['--no-sandbox']
});
const page = await browser.newPage();
await page.setViewport({ width: 900, height: 700 });
// 在页面加载前注入：记录所有 pointerdown/mousedown preventDefault 调用（任何 target）
await page.evaluateOnNewDocument(() => {
  window.__pdAll = [];
  const origPD = Event.prototype.preventDefault;
  Event.prototype.preventDefault = function () {
    if (this.type === 'pointerdown' || this.type === 'mousedown' || this.type === 'mouseup') {
      window.__pdAll.push({
        type: this.type,
        target: this.target ? this.target.tagName + (this.target.id ? '#' + this.target.id : '') : '?',
        stack: (new Error().stack || '').split('\n').slice(1, 4).map(s => s.trim()).join(' << ')
      });
    }
    return origPD.call(this);
  };
});
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
await new Promise(r => setTimeout(r, 11000));
const info = await page.evaluate(() => {
  const el = globalThis.CA.cmd.el;
  el.focus();
  el.value = '/say 一二三四五六七八九十一二三四五六七八九十abcdefghij';
  el.setSelectionRange(0, 0);
  const rc = el.getBoundingClientRect();
  return { x0: rc.x, y0: rc.y, w: rc.width, h: rc.height };
});
await page.mouse.click(info.x0 + info.w * 0.5, info.y0 + info.h / 2);
await new Promise(r => setTimeout(r, 400));
const pd = await page.evaluate(() => window.__pdAll);
console.log('all preventDefault calls:', JSON.stringify(pd, null, 1));
const s = await page.evaluate(() => { const el = globalThis.CA.cmd.el; return el.selectionStart + '/' + el.selectionEnd; });
console.log('sel:', s);
await browser.close();
