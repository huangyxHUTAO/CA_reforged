import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new', args: ['--no-sandbox']
});
const page = await browser.newPage();
await page.setViewport({ width: 900, height: 700 });
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
await new Promise(r => setTimeout(r, 11000));
// 打开 CA 菜单
const caPos = await page.evaluate(() => {
  const s = [...document.querySelectorAll('#ca-overlay span')].find(x => x.textContent.trim() === 'CA' && x.getBoundingClientRect().width > 0);
  const rc = s.getBoundingClientRect();
  return { x: rc.x + rc.width / 2, y: rc.y + rc.height / 2 };
});
await page.mouse.click(caPos.x, caPos.y);
await new Promise(r => setTimeout(r, 900));

const out = await page.evaluate(() => {
  // 找到"退出命令助手"叶子，向上完整 dump 每层
  const leafs = [];
  const walk = (el) => {
    if (!el || el.nodeType !== 1) return;
    if ((el.textContent || '').includes('退出命令助手') && el.childElementCount === 0) leafs.push(el);
    for (const c of el.children) walk(c);
  };
  walk(document.body);
  if (!leafs.length) return { err: 'no menu leaf in DOM' };
  const chain = [];
  let n = leafs[0];
  let depth = 0;
  while (n && depth < 18) {
    const cs = getComputedStyle(n);
    const rc = n.getBoundingClientRect();
    const myRect = n.getBoundingClientRect();
    chain.push({
      d: depth, tag: n.tagName, id: n.id || '',
      idx: n.getAttribute ? n.getAttribute('data-idx') : null,
      pos: cs.position, disp: cs.display, vis: cs.visibility,
      opacity: cs.opacity, z: cs.zIndex, transform: cs.transform,
      rect: [Math.round(myRect.x), Math.round(myRect.y), Math.round(myRect.width), Math.round(myRect.height)],
      pe: cs.pointerEvents, overflow: cs.overflow,
      cls: (typeof n.className === 'string' ? n.className : '').slice(0, 20),
      txt: (n.childElementCount ? '' : (n.textContent || '').trim().slice(0, 12))
    });
    n = n.parentElement; depth++;
  }
  // 检查是否有一个全屏覆盖的兄弟层/盖层
  const overlays = [];
  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el);
    if (cs.position === 'fixed' || cs.position === 'absolute') {
      const rc = el.getBoundingClientRect();
      if (rc.width > 500 && rc.height > 500) {
        overlays.push({ tag: el.tagName, id: el.id || '', z: cs.zIndex, pe: cs.pointerEvents,
          rect: [Math.round(rc.x), Math.round(rc.y), Math.round(rc.width), Math.round(rc.height)],
          txt: (el.textContent || '').slice(0, 20).replace(/\s+/g, ' ') });
      }
    }
  }
  // elementFromPoint 测试各 y
  const hits = [];
  for (const y of [100, 200, 300, 400, 500, 660]) {
    const el = document.elementFromPoint(450, y);
    hits.push({ y, tag: el ? el.tagName : null, id: el ? el.id : null,
      txt: el ? (el.textContent || '').trim().slice(0, 16) : null,
      inMenu: !!(el && (el.textContent || '').includes('退出命令助手')) });
  }
  return { chain, overlays, hits };
});
console.log(JSON.stringify(out, null, 1));
await browser.close();
