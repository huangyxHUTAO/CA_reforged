import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new', args: ['--no-sandbox']
});
const page = await browser.newPage();
await page.setViewport({ width: 900, height: 700 });
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
await new Promise(r => setTimeout(r, 11000));
const pos = await page.evaluate(() => { const e = globalThis.CA.cmd.el; const r = e.getBoundingClientRect(); return {x: r.x+r.width/2, y: r.y+r.height/2}; });
// 尝试 keyboard 事件统计
await page.evaluate(() => {
  window.__ev = [];
  ['mousedown','pointerdown','mouseup','click'].forEach(t =>
    document.addEventListener(t, e => window.__ev.push(t+':'+(e.target===globalThis.CA.cmd.el?'TA':e.target.tagName)), true));
});
// 分开 down/up/click
await page.mouse.move(pos.x, pos.y);
await page.mouse.down();
await new Promise(r => setTimeout(r, 100));
await page.mouse.up();
await new Promise(r => setTimeout(r, 100));
await page.keyboard.press('Tab'); // 若 textarea 可 tab 会聚焦
const s1 = await page.evaluate(() => ({ ev: window.__ev, active: document.activeElement?.tagName + (document.activeElement?.id?'#'+document.activeElement.id:'') }));
await page.keyboard.type('abc');
const s2 = await page.evaluate(() => ({ value: globalThis.CA.cmd.el.value, active: document.activeElement?.tagName }));
console.log('down/up:', JSON.stringify(s1, null, 2));
console.log('after type:', JSON.stringify(s2));
await browser.close();
