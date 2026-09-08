import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new', args: ['--no-sandbox']
});
const page = await browser.newPage();
await page.setViewport({ width: 900, height: 700 });
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
await new Promise(r => setTimeout(r, 11000));
const out = await page.evaluate(async () => {
  const r = {};
  const orig = globalThis.CA.cmd.el;
  const parent = orig.parentElement;
  const rc = orig.getBoundingClientRect();
  r.origRect = [Math.round(rc.x), Math.round(rc.y), Math.round(rc.width), Math.round(rc.height)];
  r.origOnPointer = !!orig.onpointerdown;
  r.origOnClick = !!orig.onclick;
  // 克隆（无任何 listener），保留样式与 value
  const clone = orig.cloneNode(false);
  clone.value = '/say 一二三四五六七八九十一二三四五六七八九十abcdefghij';
  clone.style.cssText = orig.style.cssText;
  parent.replaceChild(clone, orig);
  r.cloneInDoc = clone.isConnected;
  // 存到 window 供点击后对比
  window.__clone = clone;
  return r;
});
console.log(JSON.stringify(out, null, 1));
// 点击克隆中间
await page.mouse.click(out.origRect[0] + out.origRect[2] * 0.6, out.origRect[1] + out.origRect[3] / 2);
await new Promise(r => setTimeout(r, 400));
const res = await page.evaluate(() => {
  const c = window.__clone;
  return { cloneSel: c.selectionStart + '/' + c.selectionEnd, cloneFocused: document.activeElement === c,
    cloneEvents: (() => { const a = []; for (const ev of ['pointerdown', 'mousedown', 'click']) c.addEventListener(ev, (e) => a.push(ev + ':' + e.defaultPrevented)); return a; })() };
});
console.log('clone after click:', JSON.stringify(res));
// 再在原位置放回真实 cmd？不影响测试，探针结束即可
await browser.close();
