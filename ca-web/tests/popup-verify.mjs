import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new', args: ['--no-sandbox']
});
const page = await browser.newPage();
const errs = [];
page.on('console', m => { const t = m.text(); if (m.type() === 'error' && /ca erp|ca Error/.test(t)) errs.push(t.slice(0, 160)); });
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
// 菜单几何
const geo = await page.evaluate(() => {
  const row = [...document.querySelectorAll('[data-idx]')].find(r => r.textContent.trim() === '设置' && r.getBoundingClientRect().width > 0);
  if (!row) return { err: 'no menu rows' };
  const rc = row.getBoundingClientRect();
  const lv = row.parentElement;
  const lvRc = lv.getBoundingClientRect();
  const contentC = lv.parentElement;
  const cRc = contentC.getBoundingClientRect();
  return {
    rowRect: [Math.round(rc.x), Math.round(rc.y), Math.round(rc.width), Math.round(rc.height)],
    lvRect: [Math.round(lvRc.x), Math.round(lvRc.y), Math.round(lvRc.width), Math.round(lvRc.height)],
    containerRect: [Math.round(cRc.x), Math.round(cRc.y), Math.round(cRc.width), Math.round(cRc.height)],
    containerOverflow: getComputedStyle(contentC).overflow,
    containerH: contentC.style.height
  };
});
console.log('menu geo:', JSON.stringify(geo));
// 点设置
if (!geo.err) {
  const lenBefore = await page.evaluate(() => document.body.innerText.length);
  await page.mouse.click(geo.rowRect[0] + 100, geo.rowRect[1] + geo.rowRect[3] / 2);
  await new Promise(r => setTimeout(r, 900));
  const lenAfter = await page.evaluate(() => document.body.innerText.length);
  const tail = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').slice(-140));
  console.log('click 设置 changed:', lenBefore !== lenAfter);
  console.log('tail:', tail);
  // 设置页是否出现（找设置特征文本）
  const hasSettings = await page.evaluate(() => /显示|动画|主题|关于/.test(document.body.innerText));
  console.log('settings-like text:', hasSettings);
}
console.log('errs:', JSON.stringify(errs.slice(0, 8), null, 1));
await browser.close();
