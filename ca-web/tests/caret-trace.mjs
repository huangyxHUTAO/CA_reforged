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
  const rec = (phase, ev, e) => {
    const t = e.target;
    const path = e.composedPath().slice(0, 5).map(n => n.tagName ? n.tagName + (n.id ? '#' + n.id : '') + (n.className && typeof n.className === 'string' ? '.' + n.className.slice(0, 10) : '') : n.constructor.name).join('<');
    window.__tr.push({ phase, ev, pd: e.defaultPrevented, target: t.tagName + (t.id ? '#' + t.id : ''), path });
  };
  for (const ev of ['pointerdown', 'mousedown', 'mouseup', 'click']) {
    document.addEventListener(ev, (e) => rec('cap', ev, e), true);
    document.addEventListener(ev, (e) => rec('bub', ev, e));
  }
  // 在 textarea 目标自身上也记录（capture + bubble）
  const el = globalThis.CA.cmd.el;
  for (const ev of ['pointerdown', 'mousedown', 'mouseup', 'click']) {
    el.addEventListener(ev, (e) => rec('el-cap', ev, e), true);
    el.addEventListener(ev, (e) => rec('el-bub', ev, e));
  }
});
const info = await page.evaluate(() => {
  const el = globalThis.CA.cmd.el;
  el.value = '/say 一二三四五六七八九十一二三四五六七八九十abcdefghij';
  const rc = el.getBoundingClientRect();
  return { x0: rc.x, y0: rc.y, w: rc.width, h: rc.height };
});
await page.mouse.click(info.x0 + info.w / 2, info.y0 + info.h / 2);
await new Promise(r => setTimeout(r, 500));
const rec = await page.evaluate(() => window.__tr);
console.log(JSON.stringify(rec, null, 1));
const sel = await page.evaluate(() => { const el = globalThis.CA.cmd.el; return { s: el.selectionStart, e: el.selectionEnd, len: el.value.length, active: document.activeElement === el }; });
console.log('sel:', JSON.stringify(sel));
await browser.close();
