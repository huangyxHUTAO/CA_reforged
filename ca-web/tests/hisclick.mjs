import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new', args: ['--no-sandbox']
});
const page = await browser.newPage();
const errs = [];
page.on('console', m => { const t = m.text(); if (m.type() === 'error') errs.push(t.slice(0, 200)); });
page.on('pageerror', e => errs.push('PAGEERR: ' + String(e).slice(0, 200)));
await page.setViewport({ width: 900, height: 700 });
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
await new Promise(r => setTimeout(r, 11000));

// 列出历史 ListView 的所有 data-idx 行及其几何
const rows = await page.evaluate(() => {
  // CA.history 引擎视图
  const H = globalThis.CA.history;
  const out = { hasHistoryView: !!H, hisLen: (globalThis.CA.his || []).length };
  if (H && H.el) {
    out.rows = [...H.el.querySelectorAll('[data-idx]')].map(r => {
      const rc = r.getBoundingClientRect();
      return { idx: r.getAttribute('data-idx'), txt: (r.textContent || '').trim().replace(/\n/g, '\\n').slice(0, 30),
        x: Math.round(rc.x), y: Math.round(rc.y), w: Math.round(rc.width), h: Math.round(rc.height) };
    });
  }
  return out;
});
console.log('history rows:', JSON.stringify(rows, null, 1));

// 点第一个非 header 行
const target = rows.rows && rows.rows.find(r => r.idx !== '0');
if (target) {
  await page.mouse.click(target.x + 50, target.y + target.h / 2);
  await new Promise(r => setTimeout(r, 600));
  const after = await page.evaluate(() => ({ v: globalThis.CA.cmd.el.value }));
  console.log('after click row idx=' + target.idx + ':', JSON.stringify(after));
  console.log('expected history[0]=', JSON.stringify(rows.hisLen > 0 ? '?' : null));
  const his0 = await page.evaluate(() => globalThis.CA.his[0]);
  console.log('his[0] =', JSON.stringify(his0));
}
console.log('errs:', JSON.stringify(errs.slice(0, 6), null, 1));
await browser.close();
