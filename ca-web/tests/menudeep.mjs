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

const r = await page.evaluate(() => {
  const out = {};
  const rows = [...document.querySelectorAll('[data-idx]')].filter(x => x.textContent.includes('设置') && x.textContent.length < 20);
  if (!rows.length) return { err: 'no 设置 row' };
  const row = rows[0];
  const lv = row.parentElement;
  // 1) hit chain at 设置 row center
  const rc = row.getBoundingClientRect();
  const x = rc.x + 100, y = rc.y + rc.height / 2;
  const hit = document.elementFromPoint(x, y);
  out.hit = hit ? { tag: hit.tagName, txt: (hit.textContent || '').trim().slice(0, 16), idx: hit.closest && hit.closest('[data-idx]') ? hit.closest('[data-idx]').getAttribute('data-idx') : null, pe: getComputedStyle(hit).pointerEvents, hasOnclick: !!hit.onclick } : null;
  // 2) 手动触发 row 的 click 冒泡到 lv.onclick
  errArr = [];
  try { row.click(); } catch (e) { errArr.push(String(e)); }
  out.rowClickThrow = errArr;
  out.lvOnclickType = typeof lv.onclick;
  // 3) lv 的父链 pe
  const chain = [];
  let n = lv;
  while (n && chain.length < 8) {
    const cs = getComputedStyle(n);
    chain.push({ tag: n.tagName, id: n.id || '', pe: cs.pointerEvents, ownPe: n.style.pointerEvents || '(inherit)', z: cs.zIndex, pos: cs.position });
    n = n.parentElement;
  }
  out.chain = chain;
  return out;
});
console.log(JSON.stringify(r, null, 1));
await new Promise(t => setTimeout(t, 600));
const after = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').slice(-120));
console.log('bodyTail after row.click():', after);
console.log('errs:', JSON.stringify(errs.slice(0, 6), null, 1));
await browser.close();
