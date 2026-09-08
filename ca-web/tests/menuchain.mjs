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

const dump = await page.evaluate(() => {
  // 找到包含"退出命令助手"的叶子节点（最深）
  const leaves = [];
  const walk = (el) => {
    if (!el || el.nodeType !== 1) return;
    const t = (el.textContent || '');
    if (t.includes('退出命令助手') && el.childElementCount === 0) leaves.push(el);
    for (const c of el.children) walk(c);
  };
  walk(document.body);
  if (!leaves.length) return { err: 'leaf not found' };
  const leaf = leaves[0];
  const chain = [];
  let n = leaf, d = 0;
  while (n && d < 16) {
    const cs = getComputedStyle(n);
    const rc = n.getBoundingClientRect();
    chain.push({
      d, tag: n.tagName,
      id: n.id || '', idx: n.getAttribute ? n.getAttribute('data-idx') : null,
      hasOnclick: !!n.onclick,
      rect: [Math.round(rc.x), Math.round(rc.y), Math.round(rc.width), Math.round(rc.height)],
      disp: cs.display, pos: cs.position, z: cs.zIndex,
      cls: (typeof n.className === 'string' ? n.className : '').slice(0, 25),
      txt: (n.childElementCount ? '' : (n.textContent || '').trim().slice(0, 12))
    });
    n = n.parentElement; d++;
  }
  return { leafCount: leaves.length, chain };
});
console.log(JSON.stringify(dump, null, 1));
await browser.close();
