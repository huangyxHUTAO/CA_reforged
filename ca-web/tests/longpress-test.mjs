import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new', args: ['--no-sandbox'], protocolTimeout: 25000
});
const page = await browser.newPage();
await page.setViewport({ width: 900, height: 700 });
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
await new Promise(r => setTimeout(r, 11000));

// 历史行位置
const pos = await page.evaluate(() => {
  const rows = [...document.querySelectorAll('[data-idx]')];
  const hist = rows.find(r => r.textContent.includes('你好呀喵'));
  if (!hist) return null;
  const rc = hist.getBoundingClientRect();
  return { x: Math.round(rc.x + 60), y: Math.round(rc.y + rc.height / 2) };
});
if (!pos) { console.log('no hist row'); await browser.close(); process.exit(0); }

// 快速点击（< 500ms 按下即放）→ 应触发普通点击（回填命令），不弹长按菜单
await page.mouse.move(pos.x, pos.y);
await page.mouse.down();
await new Promise(r => setTimeout(r, 80));
await page.mouse.up();
await new Promise(r => setTimeout(r, 700));
const afterQuick = await page.evaluate(() => ({
  cmd: globalThis.CA.cmd.el.value.slice(0, 25),
  stack: globalThis.PopupPage.defaultStack.map(e => e.name),
  hasLongMenu: document.body.innerText.includes('复制') && document.body.innerText.includes('删除到剪贴板')
}));
console.log('quick click:', JSON.stringify(afterQuick));

// 再次快速点击（验证长按状态没有"粘住"）
await page.mouse.move(pos.x, pos.y);
await page.mouse.down();
await new Promise(r => setTimeout(r, 80));
await page.mouse.up();
await new Promise(r => setTimeout(r, 700));
const afterSecond = await page.evaluate(() => ({
  cmd: globalThis.CA.cmd.el.value.slice(0, 25),
  stack: globalThis.PopupPage.defaultStack.map(e => e.name)
}));
console.log('2nd quick click:', JSON.stringify(afterSecond));

// 长按（按住 700ms > 500ms）→ 应触发长按菜单
await page.mouse.move(pos.x, pos.y);
await page.mouse.down();
await new Promise(r => setTimeout(r, 700));
await page.mouse.up();
await new Promise(r => setTimeout(r, 800));
const afterLong = await page.evaluate(() => ({
  cmd: globalThis.CA.cmd.el.value.slice(0, 25),
  stack: globalThis.PopupPage.defaultStack.map(e => e.name),
  bodyHasLongMenu: document.body.innerText.includes('复制') || document.body.innerText.includes('删除')
}));
console.log('long press (700ms):', JSON.stringify(afterLong));
await browser.close();