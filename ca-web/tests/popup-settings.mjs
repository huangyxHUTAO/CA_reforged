import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new', args: ['--no-sandbox']
});
const page = await browser.newPage();
const errs = [];
page.on('console', m => { const t = m.text(); if (m.type() === 'error' && /ca erp/.test(t)) errs.push(t); });
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
errs.length = 0;
const pt = await page.evaluate(() => {
  const row = [...document.querySelectorAll('[data-idx]')].find(r => r.textContent.trim() === '设置' && r.getBoundingClientRect().width > 0);
  if (!row) return null;
  const rc = row.getBoundingClientRect();
  return { x: rc.x + 100, y: rc.y + rc.height / 2 };
});
if (pt) {
  await page.mouse.click(pt.x, pt.y);
  await new Promise(r => setTimeout(r, 900));
}
// 设置页状态
const state = await page.evaluate(() => {
  const PP = globalThis.PopupPage;
  const stack = PP && PP.defaultStack ? PP.defaultStack.map(e => e.name + (e.page && e.page.mainView && e.page.mainView.getVisibility ? ' v=' + e.page.mainView.getVisibility() : '')) : [];
  return { stack, bodyLen: document.body.innerText.length };
});
console.log('stack:', JSON.stringify(state, null, 1));
console.log('errs(' + errs.length + '):');
for (const e of errs.slice(0, 6)) console.log(e.slice(0, 400));
await browser.close();
