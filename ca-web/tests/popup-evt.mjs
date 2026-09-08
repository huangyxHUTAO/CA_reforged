import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new', args: ['--no-sandbox']
});
const page = await browser.newPage();
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
await page.evaluate(() => {
  const row = [...document.querySelectorAll('[data-idx]')].find(r => /设置/.test(r.textContent) && r.getBoundingClientRect().width > 0);
  let c = row;
  while (c && !(getComputedStyle(c).overflow === 'auto' && c.querySelectorAll('[data-idx]').length > 3)) c = c.parentElement;
  const container = c ? c.parentElement : null;
  if (container) { container.style.height = '420px'; container.style.overflow = 'visible'; }
  window.__ev = [];
  for (const ev of ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'click']) {
    document.addEventListener(ev, (e) => {
      const t = e.target;
      const rowEl = t.closest ? t.closest('[data-idx]') : null;
      window.__ev.push({ ev, pd: e.defaultPrevented,
        target: t.tagName + (t.id ? '#' + t.id : ''),
        inMenu: !!(t.textContent && t.textContent.includes('设置')),
        rowIdx: rowEl ? rowEl.getAttribute('data-idx') : null,
        stopped: e.defaultPrevented });
    }, true);
    document.addEventListener(ev, (e) => {
      const t = e.target;
      window.__ev.push({ ev: ev + '(bub)', target: t.tagName, txt: (t.textContent || '').slice(0, 10) });
    });
  }
});
await new Promise(r => setTimeout(r, 200));
const pt = await page.evaluate(() => {
  const row = [...document.querySelectorAll('[data-idx]')].find(r => r.textContent.trim() === '设置' && r.getBoundingClientRect().width > 0);
  if (!row) return null;
  const rc = row.getBoundingClientRect();
  return { x: rc.x + 80, y: rc.y + rc.height / 2, rect: [Math.round(rc.x), Math.round(rc.y), Math.round(rc.width), Math.round(rc.height)] };
});
console.log('row rect:', JSON.stringify(pt));
if (pt) {
  await page.mouse.click(pt.x, pt.y);
  await new Promise(r => setTimeout(r, 400));
  const evs = await page.evaluate(() => window.__ev);
  console.log(JSON.stringify(evs, null, 1));
}
await browser.close();
