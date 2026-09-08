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
  const rows = [];
  const seen = new Set();
  const dumpView = (v, depth, label) => {
    if (!v || seen.has(v) || depth > 16) return;
    seen.add(v);
    if (v.el) {
      const rc = v.el.getBoundingClientRect();
      const cs = getComputedStyle(v.el);
      const lp = v.layoutParams || {};
      rows.push({
        label: label || '', d: depth, tag: v.tagNameForView || (v.constructor && v.constructor.name),
        lp: [lp.width, lp.height] + (lp.weight ? ' w' + lp.weight : '') + (lp.gravity != null ? ' g' + lp.gravity : ''),
        rect: [Math.round(rc.x), Math.round(rc.y), Math.round(rc.width), Math.round(rc.height)],
        disp: cs.display, pos: cs.position, oh: cs.overflow,
        kidCount: v.children ? v.children.length : 0
      });
    }
    if (v.children) v.children.forEach(c => dumpView(c, depth + 1, ''));
  };
  // 找 Common.showOperateDialog / PopupPage 挂的树
  const roots = [];
  // PopupPage 栈 —— 引擎对象在哪？试试 PWM.popups / globalThis.PWM
  const PWM = globalThis.PWM;
  if (PWM) {
    for (const k of ['popups', 'floats']) {
      if (Array.isArray(PWM[k])) {
        PWM[k].forEach((p, i) => {
          rows.push({ note: k + '[' + i + ']', name: p && (p.name || p.constructor && p.constructor.name), hasMV: !!(p && (p.mainView || p.view)) });
          const mv = p && (p.mainView || p.view);
          if (mv) dumpView(mv, 1, k + '[' + i + '] ' + (p.name || ''));
        });
      }
    }
  }
  // 也找 PopupPage 模块（globalThis.PopupPage）
  const PP = globalThis.PopupPage;
  if (PP) rows.push({ note: 'PopupPage exists', type: typeof PP, keys: Object.keys(PP).slice(0, 10) });
  // Common.showOperateDialog 的 self.adapter 挂在 Common 上，dialog view 在 PWM.popups
  return rows;
});
console.log(JSON.stringify(out, null, 1));
await browser.close();
