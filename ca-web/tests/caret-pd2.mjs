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
  // 捕获阶段：给将到达 el 的 pointerdown/mousedown 实例包 preventDefault
  document.addEventListener('pointerdown', (e) => {
    const t = e.target;
    if (t !== el && !el.contains(t)) return;
    if (!e.__patched) {
      e.__patched = true;
      const orig = e.preventDefault.bind(e);
      e.preventDefault = function () {
        window.__pd.push({ type: e.type, phase: e.eventPhase,
          stack: (new Error().stack || '').split('\n').slice(1, 6).map(s => s.trim()).join(' << ') });
        return orig();
      };
    }
  }, true);
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
console.log('preventDefault calls:', JSON.stringify(pd, null, 1));
const sel = await page.evaluate(() => { const el = globalThis.CA.cmd.el; return { s: el.selectionStart, e: el.selectionEnd }; });
console.log('sel:', JSON.stringify(sel));
await browser.close();
