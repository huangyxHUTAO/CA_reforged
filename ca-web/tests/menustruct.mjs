import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new', args: ['--no-sandbox']
});
const page = await browser.newPage();
const errs = [];
page.on('console', m => { const t = m.text(); if (m.type() === 'error') errs.push(t.slice(0, 200)); });
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

const dump = await page.evaluate(() => {
  const out = { dialogs: [] };
  // 找菜单文字"退出命令助手"的祖先 listview
  const nodes = [];
  const walk = (el, d) => {
    if (!el || d > 14) return;
    if (el.textContent && el.textContent.includes('退出命令助手') && el.children.length < 6) nodes.push(el);
    for (const c of el.children) walk(c, d + 1);
  };
  walk(document.body, 0);
  const menuText = nodes.find(n => n.textContent.trim().startsWith('插入'));
  if (!menuText) { out.missing = 'menu not found'; return out; }
  // 向上找 data-idx 与 ListView
  let row = menuText;
  while (row && !row.hasAttribute('data-idx')) row = row.parentElement;
  out.row = row ? { tag: row.tagName, idx: row.getAttribute('data-idx'), cls: row.className } : null;
  // 向上找 ListView el (有 onclick 的祖先)
  let lv = menuText;
  while (lv && !lv.onclick) lv = lv.parentElement;
  out.listView = lv ? { tag: lv.tagName, hasOnclick: !!lv.onclick, dataIdxs: lv.querySelectorAll('[data-idx]').length,
    isInOverlay: !!(lv.closest && lv.closest('#ca-overlay')) } : null;
  // elementFromPoint at 教程
  const ov = document.getElementById('ca-overlay');
  const eps = [];
  for (const y of [180, 240, 290, 660]) {
    const el = document.elementFromPoint(450, y);
    eps.push({ y, tag: el ? el.tagName : null, id: el ? el.id : null,
      txt: el ? (el.textContent || '').trim().slice(0, 14) : null,
      inOverlay: !!(el && el.closest && el.closest('#ca-overlay')),
      idx: el && el.closest ? (el.closest('[data-idx]') ? el.closest('[data-idx]').getAttribute('data-idx') : null) : null });
  }
  out.eps = eps;
  // body fixed layers
  out.layers = [...document.querySelectorAll('body>div')].map(d => {
    const cs = getComputedStyle(d); const rc = d.getBoundingClientRect();
    return { tag: d.tagName, id: d.id || '', pos: cs.position, z: cs.zIndex, pe: cs.pointerEvents,
      rect: [Math.round(rc.x), Math.round(rc.y), Math.round(rc.width), Math.round(rc.height)],
      kids: d.childElementCount, txt: (d.textContent || '').slice(0, 12) };
  });
  return out;
});
console.log(JSON.stringify(dump, null, 1));
console.log('errs:', JSON.stringify(errs.slice(0, 4), null, 1));
await browser.close();
