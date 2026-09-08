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
await page.screenshot({ path: 'tests/menu-now.png' });
// 再截一个放大的列表区域
const listArea = await page.evaluate(() => {
  const rows = [...document.querySelectorAll('[data-idx]')].filter(r => r.textContent.includes('插入'));
  if (!rows.length) return null;
  const r = rows[0].getBoundingClientRect();
  return { x: 0, y: Math.max(0, r.y - 10), w: 900, h: 420 };
});
console.log('listArea:', JSON.stringify(listArea));
await browser.close();
