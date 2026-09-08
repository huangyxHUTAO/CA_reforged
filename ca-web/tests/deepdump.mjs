import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();
page.on('console', m => { const t = m.text(); if (m.type() === 'error' && /ca erp|ca Error|Uncaught/.test(t)) console.log('[err]', t.slice(0, 200)); });
await page.setViewport({ width: 900, height: 700 });
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
await new Promise(r => setTimeout(r, 11000));
await page.evaluate(() => {
  const cmd = globalThis.CA.cmd;
  cmd.el.value = '/aaaaaa';
  cmd.el.dispatchEvent(new Event('input', { bubbles: true }));
});
await new Promise(r => setTimeout(r, 1500));
const out = await page.evaluate(() => {
  try {
    const IS = globalThis.CA.IntelliSense;
    const st = {
      cmdname: IS.cmdname, mode: IS.mode, hasSlash: IS.hasSlash,
      inputLen: (IS.input || []).length,
      promptLen: (IS.prompt || []).length,
      prompt0: IS.prompt && IS.prompt[0] ? String(IS.prompt[0]).slice(0, 60) : '',
      ui: !!IS.ui, uiEl: !!IS.ui?.el,
      listParent: IS.ui?.el?.parentElement ? (IS.ui.el.parentElement === globalThis.CA.showAssist?.con?.el ? 'assist.con' : IS.ui.el.parentElement.tagName) : 'none',
      headerCount: IS.ui?.getHeaderViewsCount ? IS.ui.getHeaderViewsCount() : null
    };
    const rows = [];
    const walk = (el, d) => {
      if (!el || d > 10) return;
      const cs = getComputedStyle(el); const rc = el.getBoundingClientRect();
      const kids = el.children.length;
      rows.push({ d, tag: el.tagName.toLowerCase(), kids,
        disp: cs.display, vis: cs.visibility, pos: cs.position,
        rect: [rc.x | 0, rc.y | 0, rc.width | 0, rc.height | 0],
        txt: !kids ? (el.textContent || '').trim().replace(/\n/g, '\\n').slice(0, 40) : '' });
      for (const c of el.children) walk(c, d + 1);
    };
    // IntelliSense 列表本体
    if (IS.ui?.el) walk(IS.ui.el, 0);
    return { st, rows: rows.slice(0, 60) };
  } catch (e) { return { err: String(e), stack: String(e.stack).slice(0, 400) }; }
});
console.log(JSON.stringify(out, null, 1));
await page.screenshot({ path: 'tests/deepdump.png' });
// 继续：输入 /say 看候选列表
await page.evaluate(async () => {
  const cmd = globalThis.CA.cmd;
  cmd.el.value = '/say '; cmd.el.dispatchEvent(new Event('input', { bubbles: true }));
  await new Promise(r2 => setTimeout(r2, 800));
});
const out2 = await page.evaluate(() => {
  const IS = globalThis.CA.IntelliSense;
  const st = { cmdname: IS.cmdname, mode: IS.mode, inputLen: (IS.input || []).length, promptLen: (IS.prompt || []).length,
    ui: !!IS.ui?.el, headerCount: IS.ui?.getHeaderViewsCount ? IS.ui.getHeaderViewsCount() : null };
  const texts = [];
  const walk = (el, d) => {
    if (!el || d > 8) return;
    if (!el.children.length) { const t = (el.textContent || '').trim(); if (t) texts.push(t.replace(/\n/g, '\\n').slice(0, 46)); }
    for (const c of el.children) walk(c, d + 1);
  };
  if (IS.ui?.el) walk(IS.ui.el, 0);
  return { st, texts: texts.slice(0, 30) };
});
console.log('--- /say ---');
console.log(JSON.stringify(out2, null, 1));
await page.screenshot({ path: 'tests/deepdump-say.png' });
await browser.close();
