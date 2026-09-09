import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new', args: ['--no-sandbox']
});
const page = await browser.newPage();
const errs = [];
page.on('console', m => { const t = m.text(); if (m.type() === 'error' && /ca erp/.test(t)) errs.push(t.slice(0, 140)); });
await page.setViewport({ width: 900, height: 700 });
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
await new Promise(r => setTimeout(r, 11000));
// 打开设置
const caPos = await page.evaluate(() => {
  const s = [...document.querySelectorAll('#ca-overlay span')].find(x => x.textContent.trim() === 'CA' && x.getBoundingClientRect().width > 0);
  const rc = s.getBoundingClientRect();
  return { x: rc.x + rc.width / 2, y: rc.y + rc.height / 2 };
});
await page.mouse.click(caPos.x, caPos.y);
await new Promise(r => setTimeout(r, 900));
const pt = await page.evaluate(() => {
  const row = [...document.querySelectorAll('[data-idx]')].find(r => r.textContent.trim() === '设置' && r.getBoundingClientRect().width > 0);
  const rc = row.getBoundingClientRect();
  return { x: rc.x + 100, y: rc.y + rc.height / 2 };
});
await page.mouse.click(pt.x, pt.y);
await new Promise(r => setTimeout(r, 900));
// 找"关于命令助手"行并点击
const abt = await page.evaluate(() => {
  const row = [...document.querySelectorAll('[data-idx]')].find(r => r.textContent.trim() === '关于命令助手' && r.getBoundingClientRect().width > 0);
  if (!row) return { err: 'no 关于命令助手' };
  const rc = row.getBoundingClientRect();
  const cs = getComputedStyle(row);
  const lv = row.parentElement;
  const lvCs = getComputedStyle(lv);
  const lvOnclick = !!lv.onclick;
  const rowOnclick = !!row.onclick;
  return {
    rowRect: [Math.round(rc.x), Math.round(rc.y), Math.round(rc.width), Math.round(rc.height)],
    rowClickable: cs.cursor,
    rowPe: cs.pointerEvents,
    lvHasOnclick: lvOnclick,
    lvOnclickType: lvOnclick ? typeof lv.onclick : null,
    lvChildren: lv.children.length
  };
});
console.log('about row:', JSON.stringify(abt, null, 1));
// 真点击
if (abt && !abt.err) {
  await page.mouse.click(abt.rowRect[0] + 50, abt.rowRect[1] + abt.rowRect[3] / 2);
  await new Promise(r => setTimeout(r, 900));
  const after = await page.evaluate(() => {
    return { text: document.body.innerText.replace(/\s+/g, ' ').slice(0, 200) };
  });
  console.log('after click:', after.text);
  console.log('errs:', errs.slice(0, 5));
}
await browser.close();