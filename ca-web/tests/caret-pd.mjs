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
  window.__pd = [];
  const el = globalThis.CA.cmd.el;
  // 打桩：仅当事件目标是 cmd textarea 的 pointerdown/mousedown 时记录
  const origPD = Event.prototype.preventDefault;
  Event.prototype.preventDefault = function () {
    const t = this.target;
    const isCmd = t === el;
    if ((this.type === 'pointerdown' || this.type === 'mousedown' || this.type === 'touchstart') && isCmd) {
      window.__pd.push({ type: this.type, phase: this.eventPhase,
        stack: (new Error().stack || '').split('\n').slice(1, 5).map(s => s.trim()).join(' | ') });
    }
    return origPD.call(this);
  };
});
const info = await page.evaluate(() => {
  const el = globalThis.CA.cmd.el;
  el.value = '/say 一二三四五六七八九十一二三四五六七八九十abcdefghij';
  const rc = el.getBoundingClientRect();
  return { x0: rc.x, y0: rc.y, w: rc.width, h: rc.height };
});
await page.mouse.click(info.x0 + info.w / 2, info.y0 + info.h / 2);
await new Promise(r => setTimeout(r, 500));
const pd = await page.evaluate(() => window.__pd);
console.log('preventDefault calls on cmd:', JSON.stringify(pd, null, 1));
const sel = await page.evaluate(() => { const el = globalThis.CA.cmd.el; return { s: el.selectionStart, e: el.selectionEnd }; });
console.log('sel:', JSON.stringify(sel));
await browser.close();
