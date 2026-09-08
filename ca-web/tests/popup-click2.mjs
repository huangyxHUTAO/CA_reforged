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
// 撑开容器 + 包 ListView.onclick 观察
const info = await page.evaluate(() => {
  const row = [...document.querySelectorAll('[data-idx]')].find(r => /设置/.test(r.textContent) && r.getBoundingClientRect().width > 0);
  let lv = row;
  while (lv && !lv.onclick) lv = lv.parentElement;
  // 撑开
  let c = row;
  while (c && !(getComputedStyle(c).overflow === 'auto' && c.querySelectorAll('[data-idx]').length > 3)) c = c.parentElement;
  const container = c ? c.parentElement : null;
  if (container) { container.style.height = '420px'; container.style.overflow = 'visible'; }
  // 包 lv.onclick
  window.__calls = [];
  if (lv && lv.onclick) {
    const orig = lv.onclick;
    lv.onclick = function (e) {
      window.__calls.push('onclick fired, target=' + (e && e.target && e.target.tagName) + ' idx=' + (e && e.target.closest ? (e.target.closest('[data-idx]') || {}).getAttribute ? e.target.closest('[data-idx]').getAttribute('data-idx') : null : null));
      return orig.call(this, e);
    };
  }
  return { lvFound: !!lv, hasOnclick: !!(lv && lv.onclick), containerFixed: !!container };
});
console.log(JSON.stringify(info));
await new Promise(r => setTimeout(r, 200));
// 真点击"设置"行
const pt = await page.evaluate(() => {
  const row = [...document.querySelectorAll('[data-idx]')].find(r => /设置/.test(r.textContent) && r.getBoundingClientRect().width > 0);
  const rc = row.getBoundingClientRect();
  return { x: rc.x + 80, y: rc.y + rc.height / 2 };
});
await page.mouse.click(pt.x, pt.y);
await new Promise(r => setTimeout(r, 700));
const res = await page.evaluate(() => ({ calls: window.__calls, tail: document.body.innerText.replace(/\s+/g, ' ').slice(-100) }));
console.log('calls:', JSON.stringify(res.calls));
console.log('tail:', res.tail);
console.log('errs:', JSON.stringify(errs.slice(0, 6)));
await browser.close();
