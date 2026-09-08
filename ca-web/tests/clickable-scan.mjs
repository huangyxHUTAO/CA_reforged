import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new', args: ['--no-sandbox']
});
const page = await browser.newPage();
await page.setViewport({ width: 900, height: 700 });
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
await new Promise(r => setTimeout(r, 11000));
const out = await page.evaluate(() => {
  // 枚举所有带引擎 listener 的 view 及其 DOM 状态
  const found = [];
  const seen = new Set();
  const walk = (view, depth) => {
    if (!view || seen.has(view)) return;
    seen.add(view);
    if (depth > 40) return;
    const v = view;
    const hasClick = v._listeners && (v._listeners.click || v._listeners.longClick || v._itemClick);
    const isAdapter = v.tagNameForView && /ListView|GridView/.test(v.tagNameForView);
    if (hasClick || isAdapter) {
      const el = v.el;
      if (el && el.isConnected) {
        const cs = getComputedStyle(el);
        const rc = el.getBoundingClientRect();
        found.push({
          tag: v.tagNameForView || '?',
          click: !!(v._listeners && v._listeners.click),
          longClick: !!(v._listeners && v._listeners.longClick),
          itemClick: !!v._itemClick,
          cursor: cs.cursor,
          pe: cs.pointerEvents,
          rect: [Math.round(rc.x), Math.round(rc.y), Math.round(rc.width), Math.round(rc.height)],
          disp: cs.display, vis: cs.visibility,
          z: cs.zIndex, pos: cs.position,
          text: (el.textContent || '').trim().replace(/\n/g, '\\n').slice(0, 40),
          cls: (el.className || '').toString().slice(0, 30)
        });
      }
    }
    if (v.children) for (const c of v.children) walk(c, depth + 1);
  };
  // 从几个 root 找：con / showAssist
  const roots = [];
  for (const name of ['con', 'showAssist', 'cmd']) {
    const r = globalThis.CA && globalThis.CA[name];
    if (r) roots.push(r);
  }
  if (globalThis.CA && CA.showAssist) {
    for (const k of ['linear', 'con', 'help']) {
      if (CA.showAssist[k]) roots.push(CA.showAssist[k]);
    }
  }
  for (const r of roots) walk(r, 0);
  return found;
});
console.log(JSON.stringify(out, null, 1));
await browser.close();
