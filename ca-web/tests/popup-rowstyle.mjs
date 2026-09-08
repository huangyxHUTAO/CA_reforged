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
const out = await page.evaluate(() => {
  // 撑开容器
  const anyRow = [...document.querySelectorAll('[data-idx]')].find(r => r.textContent.includes('插入'));
  let c = anyRow;
  while (c && !(getComputedStyle(c).overflow === 'auto' && c.querySelectorAll('[data-idx]').length > 3)) c = c.parentElement;
  const container = c ? c.parentElement : null;
  if (container) { container.style.height = '420px'; container.style.overflow = 'visible'; }
  const row = [...document.querySelectorAll('[data-idx]')].find(r => r.textContent.trim() === '设置' && r.getBoundingClientRect().width > 0);
  if (!row) return { err: 'no row' };
  const rc = row.getBoundingClientRect();
  const cs = getComputedStyle(row);
  const lv = row.parentElement;
  const lvCs = getComputedStyle(lv);
  const lvRc = lv.getBoundingClientRect();
  const rowChildren = [...row.children].map(ch => {
    const r2 = ch.getBoundingClientRect();
    return { tag: ch.tagName, txt: (ch.textContent || '').trim().slice(0, 12),
      rect: [Math.round(r2.x), Math.round(r2.y), Math.round(r2.width), Math.round(r2.height)],
      pe: getComputedStyle(ch).pointerEvents, disp: getComputedStyle(ch).display };
  });
  // 命中测试沿行多点
  const hits = [];
  for (const x of [20, 80, 150, 300, 450, 700]) {
    const el = document.elementFromPoint(x, rc.y + rc.height / 2);
    hits.push({ x, tag: el ? el.tagName : null,
      txt: el ? (el.textContent || '').trim().slice(0, 12) : null,
      hasIdx: el && el.closest ? !!(el.closest('[data-idx]')) : false,
      self: el === row });
  }
  return { rowRect: [Math.round(rc.x), Math.round(rc.y), Math.round(rc.width), Math.round(rc.height)],
    rowStyle: { pe: cs.pointerEvents, disp: cs.display, pos: cs.position, vis: cs.visibility, z: cs.zIndex },
    lvRect: [Math.round(lvRc.x), Math.round(lvRc.y), Math.round(lvRc.width), Math.round(lvRc.height)],
    lvStyle: { pe: lvCs.pointerEvents, disp: lvCs.display, pos: lvCs.position, overflow: lvCs.overflow },
    lvChildren: [...lv.children].map(ch => { const r2 = ch.getBoundingClientRect(); return { tag: ch.tagName, idx: ch.getAttribute('data-idx'), rect: [Math.round(r2.x), Math.round(r2.y), Math.round(r2.width), Math.round(r2.height)], pe: getComputedStyle(ch).pointerEvents }; }),
    rowChildren, hits };
});
console.log(JSON.stringify(out, null, 1));
await browser.close();
