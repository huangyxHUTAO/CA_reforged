import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new', args: ['--no-sandbox'], protocolTimeout: 25000
});
const page = await browser.newPage();
await page.setViewport({ width: 900, height: 700 });
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
await new Promise(r => setTimeout(r, 11000));

// removeCallbacks 单测：postDelayed 300ms，200ms 后 removeCallbacks
const unit = await page.evaluate(async () => {
  const v = globalThis.CA.showGen.main;
  let fired = false;
  v.postDelayed(() => { fired = true; }, 300);
  await new Promise(r => setTimeout(r, 150));
  v.removeCallbacks();
  await new Promise(r => setTimeout(r, 400));
  return { firedShouldBeFalse: !fired, fired };
});
console.log('removeCallbacks unit:', JSON.stringify(unit));

// 真实路径：点击 CA 后等 1.5s（>300ms），若长按定时器没被取消会重复弹菜单
const pos = await page.evaluate(() => {
  const s = [...document.querySelectorAll('#ca-overlay span')].find(x => x.textContent.trim() === 'CA' && x.getBoundingClientRect().width > 0);
  const rc = s.getBoundingClientRect();
  return { x: Math.round(rc.x + rc.width / 2), y: Math.round(rc.y + rc.height / 2) };
});
await page.mouse.move(pos.x, pos.y);
await page.mouse.down();
await new Promise(r => setTimeout(r, 50));
await page.mouse.up();
await new Promise(r => setTimeout(r, 1500));
const after = await page.evaluate(() => ({
  stack: globalThis.PopupPage.defaultStack.map(e => e.name),
  menuCount: [...document.querySelectorAll('[data-idx]')].filter(r => r.textContent.trim() === '退出命令助手').length
}));
console.log('1.5s after click (no stuck long-press):', JSON.stringify(after));
await browser.close();