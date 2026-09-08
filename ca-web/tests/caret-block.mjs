import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new', args: ['--no-sandbox']
});
const page = await browser.newPage();
await page.setViewport({ width: 900, height: 700 });
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
await new Promise(r => setTimeout(r, 11000));
// 情况1：正常点击（有引擎 listener）
const info = await page.evaluate(() => {
  const el = globalThis.CA.cmd.el;
  el.focus();
  el.value = '/say 一二三四五六七八九十一二三四五六七八九十abcdefghij';
  // 手动放到文首，便于观察是否被移动
  el.setSelectionRange(0, 0);
  const rc = el.getBoundingClientRect();
  return { x0: rc.x, y0: rc.y, w: rc.width, h: rc.height };
});
await page.mouse.click(info.x0 + info.w * 0.7, info.y0 + info.h / 2);
await new Promise(r => setTimeout(r, 400));
const normal = await page.evaluate(() => { const el = globalThis.CA.cmd.el; return { s: el.selectionStart, e: el.selectionEnd }; });
console.log('normal click (engine listeners):', JSON.stringify(normal));

// 情况2：新页面，document 捕获 stopImmediatePropagation
const page2 = await browser.newPage();
await page2.setViewport({ width: 900, height: 700 });
await page2.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
await new Promise(r => setTimeout(r, 11000));
await page2.evaluate(() => {
  // document 捕获阶段直接掐断，阻止所有后续 listener（含 cmd 的）
  window.__count = 0;
  document.addEventListener('pointerdown', (e) => {
    if (e.target === globalThis.CA.cmd.el) { window.__count++; e.stopImmediatePropagation(); }
  }, true);
  document.addEventListener('mousedown', (e) => {
    if (e.target === globalThis.CA.cmd.el) { window.__count++; e.stopImmediatePropagation(); }
  }, true);
});
const info2 = await page2.evaluate(() => {
  const el = globalThis.CA.cmd.el;
  el.focus();
  el.value = '/say 一二三四五六七八九十一二三四五六七八九十abcdefghij';
  el.setSelectionRange(0, 0);
  const rc = el.getBoundingClientRect();
  return { x0: rc.x, y0: rc.y, w: rc.width, h: rc.height };
});
await page2.mouse.click(info2.x0 + info2.w * 0.7, info2.y0 + info2.h / 2);
await new Promise(r => setTimeout(r, 400));
const blocked = await page2.evaluate(() => ({ s: (() => { const el = globalThis.CA.cmd.el; return el.selectionStart + '/' + el.selectionEnd; })(), count: window.__count }));
console.log('click with all listeners blocked:', JSON.stringify(blocked));
await browser.close();
