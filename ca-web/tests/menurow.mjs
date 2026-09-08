import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new', args: ['--no-sandbox']
});
const page = await browser.newPage();
const errs = [];
page.on('console', m => { const t = m.text(); if (m.type() === 'error') errs.push(t.slice(0, 180)); });
page.on('pageerror', e => errs.push('PAGEERR: ' + String(e).slice(0, 180)));
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

const menu = await page.evaluate(() => {
  // 找到有 data-idx 且文字含"退出命令助手"的行，向上找到 ListView 容器
  const rows = [...document.querySelectorAll('[data-idx]')].filter(r => r.textContent.includes('退出命令助手'));
  if (!rows.length) return { err: 'no menu rows' };
  const lv = rows[0].parentElement;
  const lvrc = lv.getBoundingClientRect();
  const rowInfo = [...lv.querySelectorAll(':scope > [data-idx]')].map(r => {
    const rc = r.getBoundingClientRect();
    const cs = getComputedStyle(r);
    return { idx: r.getAttribute('data-idx'),
      rect: [Math.round(rc.x), Math.round(rc.y), Math.round(rc.width), Math.round(rc.height)],
      disp: cs.display, txt: (r.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 18) };
  });
  return {
    lvTag: lv.tagName, lvRect: [Math.round(lvrc.x), Math.round(lvrc.y), Math.round(lvrc.width), Math.round(lvrc.height)],
    lvHasOnclick: !!lv.onclick, lvId: lv.id || '',
    lvChildCount: lv.childElementCount,
    rows: rowInfo,
    lvText: (lv.textContent || '').replace(/\s+/g, ' ').slice(0, 60)
  };
});
console.log('menu listview:', JSON.stringify(menu, null, 1));

// 点击 idx=4(设置?) 之前先看点击委托是否工作: 手动触发 row 点击事件
if (menu.rows) {
  const setRow = menu.rows.find(r => /设置/.test(r.txt));
  const tgt = setRow || menu.rows[menu.rows.length - 1];
  errs.length = 0;
  const lenBefore = await page.evaluate(() => document.body.innerText.length);
  await page.mouse.click(tgt.rect[0] + 100, tgt.rect[1] + tgt.rect[3] / 2);
  await new Promise(r => setTimeout(r, 700));
  const lenAfter = await page.evaluate(() => document.body.innerText.length);
  console.log('clicked row:', JSON.stringify(tgt), 'changed:', lenBefore !== lenAfter, 'errs:', JSON.stringify(errs.slice(0, 5)));
  const bodyTail = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').slice(-100));
  console.log('bodyTail:', bodyTail);
}
await browser.close();
