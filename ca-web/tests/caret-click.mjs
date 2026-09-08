import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new', args: ['--no-sandbox']
});
const page = await browser.newPage();
page.on('console', m => { const t = m.text(); if (m.type() === 'error' && /ca erp|ca Error|Uncaught/.test(t)) console.log('[err]', t.slice(0, 180)); });
await page.setViewport({ width: 900, height: 700 });
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
await new Promise(r => setTimeout(r, 11000));

const info = await page.evaluate(() => {
  const el = globalThis.CA.cmd.el;
  // 填充一段长文本用于测试光标定位
  el.value = '/say 一二三四五六七八九十一二三四五六七八九十abcdefghij';
  const rc = el.getBoundingClientRect();
  return { x0: rc.x, y0: rc.y, w: rc.width, h: rc.height,
    font: getComputedStyle(el).font, fs: getComputedStyle(el).fontSize,
    padding: getComputedStyle(el).padding, lineHeight: getComputedStyle(el).lineHeight,
    tag: el.tagName };
});
console.log('box:', JSON.stringify(info));

// 聚焦
await page.mouse.click(info.x0 + 10, info.y0 + info.h / 2);
await new Promise(r => setTimeout(r, 500));
let sel = await page.evaluate(() => { const el = globalThis.CA.cmd.el; return { s: el.selectionStart, e: el.selectionEnd, v: el.value.length, active: document.activeElement === el }; });
console.log('after click left edge:', JSON.stringify(sel));

// 点击文本中间
await page.mouse.click(info.x0 + info.w / 2, info.y0 + info.h / 2);
await new Promise(r => setTimeout(r, 400));
sel = await page.evaluate(() => { const el = globalThis.CA.cmd.el; return { s: el.selectionStart, e: el.selectionEnd, v: el.value.length }; });
console.log('after click middle:', JSON.stringify(sel));

// 再点右侧
await page.mouse.click(info.x0 + info.w - 10, info.y0 + info.h / 2);
await new Promise(r => setTimeout(r, 400));
sel = await page.evaluate(() => { const el = globalThis.CA.cmd.el; return { s: el.selectionStart, e: el.selectionEnd, v: el.value.length }; });
console.log('after click right:', JSON.stringify(sel));
await browser.close();
