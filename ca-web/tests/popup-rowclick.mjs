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
const out = await page.evaluate(async () => {
  const r = {};
  const row = [...document.querySelectorAll('[data-idx]')].find(x => x.textContent.trim() === '设置' && x.getBoundingClientRect().width > 0);
  if (!row) return { err: 'no row' };
  // ListView 与祖先们
  let lv = row.parentElement;
  r.lvHasOnclickAttr = !!lv.onclick;
  r.lvTag = lv.tagName;
  // 撑容器
  const container = lv.parentElement;
  r.containerBefore = (() => { const x = container.getBoundingClientRect(); return [Math.round(x.height)]; })();
  container.style.height = '420px';
  container.style.overflow = 'visible';
  // 绑定一个捕获探针在 ListView 上
  window.__lvCalls = [];
  lv.addEventListener('click', (e) => window.__lvCalls.push('lv-click target=' + e.target.tagName + ' hasIdx=' + (e.target.closest && !!e.target.closest('[data-idx]'))), true);
  // row.click() 会冒泡到 lv.onclick
  row.click();
  await new Promise(res => setTimeout(res, 700));
  r.lvCalls = window.__lvCalls;
  r.tail = document.body.innerText.replace(/\s+/g, ' ').slice(-90);
  // 手动检查 lv.onclick 是否被调用 —— 包一层
  const origOnclick = lv.onclick;
  lv.onclick = function (e) { window.__lvCalls.push('lv.onclick CALLED'); return origOnclick ? origOnclick.call(this, e) : null; };
  const row2 = [...document.querySelectorAll('[data-idx]')].find(x => x.textContent.trim() === '设置' && x.getBoundingClientRect().width > 0);
  if (row2) row2.click();
  await new Promise(res => setTimeout(res, 700));
  r.lvCalls2 = window.__lvCalls;
  r.tail2 = document.body.innerText.replace(/\s+/g, ' ').slice(-90);
  return r;
});
console.log(JSON.stringify(out, null, 1));
console.log('errs:', JSON.stringify(errs.slice(0, 8)));
await browser.close();
