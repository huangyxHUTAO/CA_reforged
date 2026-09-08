import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new', args: ['--no-sandbox']
});
const page = await browser.newPage();
const errs = [];
page.on('console', m => { const t = m.text(); if (m.type() === 'error') errs.push(t.slice(0, 160)); });
page.on('pageerror', e => errs.push('PAGEERR: ' + String(e).slice(0, 160)));
await page.setViewport({ width: 900, height: 700 });
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
await new Promise(r => setTimeout(r, 11000));

const targets = await page.evaluate(() => {
  const found = [];
  const scan = (el, path) => {
    if (!el || el.nodeType !== 1) return;
    const cs = getComputedStyle(el);
    const hasHandler = !!(el.onclick || el.onmousedown || el.onpointerdown);
    const rc = el.getBoundingClientRect();
    const visible = cs.display !== 'none' && cs.visibility !== 'hidden' && rc.width > 2 && rc.height > 2 && rc.y < 700;
    if (hasHandler && visible) {
      found.push({ tag: el.tagName, path: path.slice(0, 120),
        txt: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 16),
        cx: Math.round(rc.x + rc.width / 2), cy: Math.round(rc.y + rc.height / 2),
        w: Math.round(rc.width), h: Math.round(rc.height),
        cursor: cs.cursor, z: cs.zIndex, pe: cs.pointerEvents });
    }
    for (const c of el.children) scan(c, path + '/' + c.tagName + (c.id ? '#' + c.id : ''));
  };
  scan(document.body, 'BODY');
  return found;
});
console.log('=== DOM onclick 节点(' + targets.length + ') ===');
for (const t of targets) console.log(JSON.stringify(t));

// 点击每个，观察变化
const results = [];
for (const t of targets.slice(0, 20)) {
  const before = await page.evaluate(() => ({
    v: CA.cmd ? CA.cmd.el.value : null,
    overlayKids: document.getElementById('ca-overlay') ? document.getElementById('ca-overlay').childElementCount : -1,
    bodyLen: document.body.innerText.length
  }));
  errs.length = 0;
  try { await page.mouse.click(t.cx, t.cy); } catch (e) {}
  await new Promise(r => setTimeout(r, 500));
  const after = await page.evaluate(() => ({
    v: CA.cmd ? CA.cmd.el.value : null,
    overlayKids: document.getElementById('ca-overlay') ? document.getElementById('ca-overlay').childElementCount : -1,
    bodyLen: document.body.innerText.length
  }));
  results.push({
    target: (t.txt || t.tag) + ' @' + t.path.split('/').slice(-3).join('/'),
    changed: JSON.stringify(before) !== JSON.stringify(after),
    errs: errs.slice(0, 2)
  });
}
console.log('=== 点击结果 ===');
console.log(JSON.stringify(results, null, 1));
await browser.close();
