import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new', args: ['--no-sandbox']
});
const page = await browser.newPage();
page.on('console', m => { const t = m.text(); if (m.type() === 'error' && /ca erp|ca Error/.test(t)) console.log('[err]', t.slice(0, 120)); });
await page.setViewport({ width: 900, height: 700 });
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
await new Promise(r => setTimeout(r, 11000));

// 先打开设置
const caPos = await page.evaluate(() => {
  const s = [...document.querySelectorAll('#ca-overlay span')].find(x => x.textContent.trim() === 'CA' && x.getBoundingClientRect().width > 0);
  if (!s) return null;
  const rc = s.getBoundingClientRect();
  return { x: rc.x + rc.width / 2, y: rc.y + rc.height / 2 };
});
if (!caPos) { console.log('CA button not found'); await browser.close(); process.exit(1); }
await page.mouse.click(caPos.x, caPos.y);
await new Promise(r => setTimeout(r, 900));

const setPos = await page.evaluate(() => {
  const row = [...document.querySelectorAll('[data-idx]')].find(r => r.textContent.trim() === '设置' && r.getBoundingClientRect().width > 0);
  if (!row) return null;
  const rc = row.getBoundingClientRect();
  return { x: rc.x + 100, y: rc.y + rc.height / 2 };
});
if (!setPos) { console.log('设置 row not found'); await browser.close(); process.exit(1); }
await page.mouse.click(setPos.x, setPos.y);
await new Promise(r => setTimeout(r, 900));

// 找"关于命令助手"行
const abtPos = await page.evaluate(() => {
  const row = [...document.querySelectorAll('[data-idx]')].find(r => r.textContent.trim() === '关于命令助手' && r.getBoundingClientRect().width > 0);
  if (!row) return null;
  const rc = row.getBoundingClientRect();
  return { x: rc.x + 50, y: rc.y + rc.height / 2 };
});
if (!abtPos) { console.log('关于命令助手 row not found'); await browser.close(); process.exit(1); }
await page.mouse.click(abtPos.x, abtPos.y);
await new Promise(r => setTimeout(r, 900));

// 检查 about 页面结构
const result = await page.evaluate(() => {
  // 找 ImageView
  const img = document.querySelector('img');
  // 找包含版本文本的元素
  const versionText = [...document.querySelectorAll('span,div')].find(e => e.textContent && e.textContent.includes('Reforged'));
  return {
    hasImg: !!img,
    imgSrc: img ? img.src : null,
    imgRect: img ? img.getBoundingClientRect() : null,
    versionText: versionText ? versionText.textContent : null
  };
});
console.log('About page check:', JSON.stringify(result, null, 1));
await page.screenshot({ path: 'tests/about-page.png' });
await browser.close();