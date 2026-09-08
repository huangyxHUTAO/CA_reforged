import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new', args: ['--no-sandbox']
});
const page = await browser.newPage();
const errs = [];
page.on('console', m => { const t = m.text(); if (m.type() === 'error' && /ca erp/.test(t)) errs.push(t.slice(0, 120)); });
await page.setViewport({ width: 900, height: 700 });
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
await new Promise(r => setTimeout(r, 11000));
// 打开设置
const caPos = await page.evaluate(() => {
  const s = [...document.querySelectorAll('#ca-overlay span')].find(x => x.textContent.trim() === 'CA' && x.getBoundingClientRect().width > 0);
  const rc = s.getBoundingClientRect();
  return { x: rc.x + rc.width / 2, y: rc.y + rc.height / 2 };
});
await page.mouse.click(caPos.x, caPos.y);
await new Promise(r => setTimeout(r, 900));
const pt = await page.evaluate(() => {
  const row = [...document.querySelectorAll('[data-idx]')].find(r => r.textContent.trim() === '设置' && r.getBoundingClientRect().width > 0);
  const rc = row.getBoundingClientRect();
  return { x: rc.x + 100, y: rc.y + rc.height / 2 };
});
await page.mouse.click(pt.x, pt.y);
await new Promise(r => setTimeout(r, 900));
const out = await page.evaluate(() => {
  // 找"返回"（exit 按钮）→ 向上找 titlebar → linear
  const exit = [...document.querySelectorAll('span,div')].find(e => e.textContent.trim() === '返回' && e.getBoundingClientRect().width > 0);
  if (!exit) return { err: 'no 返回' };
  const info = (el, label) => {
    const rc = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return { label, tag: el.tagName, rect: [Math.round(rc.x), Math.round(rc.y), Math.round(rc.width), Math.round(rc.height)],
      disp: cs.display, flexDir: cs.flexDirection, pos: cs.position,
      lp: el.__caView && el.__caView.layoutParams ? [el.__caView.layoutParams.width, el.__caView.layoutParams.height, el.__caView.layoutParams.weight] : null,
      txt: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 20) };
  };
  const titlebar = exit.__caView ? exit.__caView.getParent() : null;
  const linear = titlebar ? titlebar.getParent() : null;
  const r = { exit: info(exit, 'exit按钮'), titlebar: titlebar ? info(titlebar.el, 'titlebar') : null, linear: linear ? info(linear.el, 'linear(mainView)') : null };
  // titlebar 的子
  if (titlebar) {
    r.titlebarKids = titlebar.children.map(c => info(c.el, c.tagNameForView));
  }
  // list（linear 里另一个子）
  if (linear) {
    const list = linear.children.find(c => c.tagNameForView === 'ListView');
    if (list) {
      const rc = list.el.getBoundingClientRect();
      r.list = { rect: [Math.round(rc.x), Math.round(rc.y), Math.round(rc.width), Math.round(rc.height)], kids: list.children.length };
      // 前 5 行
      r.listRows = [...list.el.children].slice(0, 6).map(row => {
        const rr = row.getBoundingClientRect();
        return { idx: row.getAttribute('data-idx'), rect: [Math.round(rr.x), Math.round(rr.y), Math.round(rr.width), Math.round(rr.height)], txt: (row.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 24) };
      });
    }
  }
  return r;
});
console.log(JSON.stringify(out, null, 1));
console.log('errs:', JSON.stringify(errs.slice(0, 4)));
await browser.close();
