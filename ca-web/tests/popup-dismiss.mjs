import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new', args: ['--no-sandbox']
});
const page = await browser.newPage();
const errs = [];
page.on('console', m => { const t = m.text(); if (m.type() === 'error' && /ca erp/.test(t)) errs.push(t.slice(0, 160)); });
await page.setViewport({ width: 900, height: 700 });
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
await new Promise(r => setTimeout(r, 11000));
const caPos = await page.evaluate(() => {
  const s = [...document.querySelectorAll('#ca-overlay span')].find(x => x.textContent.trim() === 'CA' && x.getBoundingClientRect().width > 0);
  const rc = s.getBoundingClientRect();
  return { x: rc.x + rc.width / 2, y: rc.y + rc.height / 2 };
});
await page.mouse.click(caPos.x, caPos.y);
await new Promise(r => setTimeout(r, 900));
const menuOpen = await page.evaluate(() => document.body.innerText.includes('退出命令助手') || [...document.querySelectorAll('[data-idx]')].some(r => r.textContent.trim() === '设置'));
console.log('menu open:', menuOpen);
// 点击空白（菜单上方 y=50 处，在遮罩上、内容容器外）
await page.mouse.click(450, 50);
await new Promise(r => setTimeout(r, 900));
const after = await page.evaluate(() => ({
  menuGone: ![...document.querySelectorAll('[data-idx]')].some(r => r.textContent.trim() === '设置' && r.getBoundingClientRect().width > 0),
  stack: (globalThis.PopupPage && PopupPage.defaultStack ? PopupPage.defaultStack.map(e => e.name) : [])
}));
console.log('after click blank:', JSON.stringify(after));
console.log('errs:', JSON.stringify(errs.slice(0, 5)));
await browser.close();
