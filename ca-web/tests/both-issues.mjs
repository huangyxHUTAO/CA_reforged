import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new', args: ['--no-sandbox']
});
const page = await browser.newPage();
await page.setViewport({ width: 900, height: 700 });
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
await new Promise(r => setTimeout(r, 11000));

// 问题1：底部输入框/命令栏几何
const geo = await page.evaluate(() => {
  const out = {};
  const cmd = globalThis.CA.cmd;
  const rc = cmd.el.getBoundingClientRect();
  out.cmd = { rect: [Math.round(rc.x), Math.round(rc.y), Math.round(rc.width), Math.round(rc.height)],
    cs: { height: getComputedStyle(cmd.el).height, padding: getComputedStyle(cmd.el).padding, font: getComputedStyle(cmd.el).fontSize },
    lp: cmd.layoutParams };
  // bar（cmd 的父）
  const bar = cmd.getParent();
  if (bar) {
    const brc = bar.el.getBoundingClientRect();
    out.bar = { tag: bar.tagNameForView, rect: [Math.round(brc.x), Math.round(brc.y), Math.round(brc.width), Math.round(brc.height)],
      cs: { height: getComputedStyle(bar.el).height, padding: getComputedStyle(bar.el).padding, display: getComputedStyle(bar.el).display },
      lp: bar.layoutParams, kids: bar.children.length };
  }
  // bar 的父（main）
  const main = bar ? bar.getParent() : null;
  if (main) {
    const mrc = main.el.getBoundingClientRect();
    out.main = { tag: main.tagNameForView, rect: [Math.round(mrc.x), Math.round(mrc.y), Math.round(mrc.width), Math.round(mrc.height)],
      lp: main.layoutParams, kids: main.children.length };
  }
  // main 的父
  const root = main ? main.getParent() : null;
  if (root) {
    const rrc = root.el.getBoundingClientRect();
    out.root = { tag: root.tagNameForView, rect: [Math.round(rrc.x), Math.round(rrc.y), Math.round(rrc.width), Math.round(rrc.height)], lp: root.layoutParams };
  }
  return out;
});
console.log('geometry:', JSON.stringify(geo, null, 1));

// 问题2：长按行为 —— 点历史行（它有 itemLongClick），看是否立即触发长按菜单
const lp = await page.evaluate(() => {
  const rows = [...document.querySelectorAll('[data-idx]')];
  const hist = rows.find(r => r.textContent.includes('你好呀喵'));
  if (!hist) return { err: 'no history row' };
  const rc = hist.getBoundingClientRect();
  const lv = hist.parentElement;
  return { rowRect: [Math.round(rc.x), Math.round(rc.y), Math.round(rc.width), Math.round(rc.height)],
    lvHasOncontextmenu: !!lv.oncontextmenu, rowHasOncontextmenu: !!hist.oncontextmenu,
    hasItemLongClick: !!(lv.__caView && lv.__caView._itemLongClick) };
});
console.log('longpress setup:', JSON.stringify(lp));
if (!lp.err) {
  // 短按（快速点击 < 400ms），应该触发普通点击（回填命令），不是长按菜单
  await page.mouse.click(lp.rowRect[0] + 60, lp.rowRect[1] + lp.rowRect[3] / 2, { delay: 40 });
  await new Promise(r => setTimeout(r, 600));
  const afterClick = await page.evaluate(() => ({
    cmd: globalThis.CA.cmd.el.value.slice(0, 30),
    // 长按菜单会弹 OperateDialog（历史编辑）
    stack: globalThis.PopupPage.defaultStack.map(e => e.name),
    dialogs: [...document.querySelectorAll('div')].filter(d => {
      const t = d.textContent || ''; const rc = d.getBoundingClientRect();
      return rc.width > 400 && t.includes('复制') && t.includes('删除');
    }).length
  }));
  console.log('after SHORT click:', JSON.stringify(afterClick));
}
await browser.close();