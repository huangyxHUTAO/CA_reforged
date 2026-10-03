import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new', args: ['--no-sandbox'], protocolTimeout: 25000
});
const page = await browser.newPage();
await page.setViewport({ width: 900, height: 700 });
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
await new Promise(r => setTimeout(r, 11000));

// CA 按钮位置（它有 OnClickListener；openMenuByLongClick 时用长按）
const pos = await page.evaluate(() => {
  const s = [...document.querySelectorAll('#ca-overlay span')].find(x => x.textContent.trim() === 'CA' && x.getBoundingClientRect().width > 0);
  if (!s) return null;
  const rc = s.getBoundingClientRect();
  return { x: Math.round(rc.x + rc.width / 2), y: Math.round(rc.y + rc.height / 2) };
});
if (!pos) { console.log('no CA btn'); await browser.close(); process.exit(0); }

// 快速点击 → 应打开菜单（普通点击）
await page.mouse.move(pos.x, pos.y);
await page.mouse.down();
await new Promise(r => setTimeout(r, 60));
await page.mouse.up();
await new Promise(r => setTimeout(r, 800));
const quick = await page.evaluate(() => ({
  stack: globalThis.PopupPage.defaultStack.map(e => e.name),
  menuShown: [...document.querySelectorAll('[data-idx]')].some(r => r.textContent.trim() === '退出命令助手')
}));
console.log('quick click CA:', JSON.stringify(quick));

// 关闭菜单（点空白），再快速点击第二次（验证不粘住）
await page.mouse.click(450, 60);
await new Promise(r => setTimeout(r, 700));
await page.mouse.move(pos.x, pos.y);
await page.mouse.down();
await new Promise(r => setTimeout(r, 60));
await page.mouse.up();
await new Promise(r => setTimeout(r, 800));
const second = await page.evaluate(() => ({
  stack: globalThis.PopupPage.defaultStack.map(e => e.name),
  menuShown: [...document.querySelectorAll('[data-idx]')].some(r => r.textContent.trim() === '退出命令助手')
}));
console.log('2nd quick click CA:', JSON.stringify(second));
await browser.close();