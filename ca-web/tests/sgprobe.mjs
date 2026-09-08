import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new', args: ['--no-sandbox']
});
const page = await browser.newPage();
const errs = [];
page.on('console', m => { const t = m.text(); if (m.type() === 'error') errs.push(t.slice(0, 220)); });
await page.setViewport({ width: 900, height: 700 });
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
await new Promise(r => setTimeout(r, 11000));

const out = await page.evaluate(async () => {
  const r = { keys: [], btns: {}, settings: {} };
  const SG = globalThis.CA.showGen;
  if (!SG) return { err: 'no showGen' };
  r.keys = Object.keys(SG).filter(k => typeof SG[k] !== 'function').slice(0, 40);
  try {
    r.settings = {
      iiMode: CA.settings.iiMode,
      openMenuByLongClick: CA.settings.openMenuByLongClick,
      noAnimation: CA.settings.noAnimation,
      keepWhenIME: CA.settings.keepWhenIME
    };
  } catch (e) { r.settings.err = String(e); }
  // 找 menu/add/copy 视图对象
  for (const name of ['menu', 'add', 'copy', 'clear', 'bar', 'main', 'cmd']) {
    const v = SG[name];
    if (v && v.el) {
      r.btns[name] = {
        tag: v.tagNameForView,
        hasClick: !!(v._listeners && v._listeners.click),
        vis: v.visibility,
        disp: getComputedStyle(v.el).display,
        rect: (() => { const rc = v.el.getBoundingClientRect(); return [Math.round(rc.x), Math.round(rc.y), Math.round(rc.width), Math.round(rc.height)]; })(),
        inDoc: v.el.isConnected,
        text: (v.el.textContent || '').trim().slice(0, 10)
      };
    } else if (v !== undefined) {
      r.btns[name] = { kind: typeof v, isView: !!(v && v.el) };
    }
  }
  // 手动触发 menu 的 click listener
  try {
    if (SG.menu && SG.menu._listeners && SG.menu._listeners.click) {
      r.menuListenerType = typeof SG.menu._listeners.click.onClick;
      // 包装捕获 showMenu 调用？直接执行
      await new Promise(res => setTimeout(res, 50));
      try { SG.menu._listeners.click.onClick(SG.menu); } catch (e) { r.menuThrow = String(e); }
      await new Promise(res => setTimeout(res, 700));
      r.afterMenuClick = {
        overlayKids: document.getElementById('ca-overlay').childElementCount,
        menuVisible: SG.menu ? getComputedStyle(SG.menu.el).display : null
      };
    }
  } catch (e) { r.menuErr = String(e); }
  return r;
});
console.log(JSON.stringify(out, null, 1));
console.log('--- console errs ---');
console.log(JSON.stringify(errs, null, 1));
await browser.close();
