import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new', args: ['--no-sandbox']
});
const page = await browser.newPage();
page.on('console', m => { const t = m.text(); if (m.type() === 'error' && /ca erp|ca Error|R\.drawable|setImageResource/.test(t)) console.log('[console]', t.slice(0, 160)); });
await page.setViewport({ width: 900, height: 700 });
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
await new Promise(r => setTimeout(r, 11000));

// 直接看 R.drawable.icon 的值
await page.evaluate(() => {
  console.log('R.drawable.icon =', globalThis.com?.huangyx?.ca?.R?.drawable?.icon);
  console.log('R.mipmap.icon_small =', globalThis.com?.huangyx?.ca?.R?.mipmap?.icon_small);
  console.log('__caResMap.drawables =', globalThis.__caResMap?.drawable?.size);
  if (globalThis.__caResMap?.getDrawableUrl) {
    const id = globalThis.com?.huangyx?.ca?.R?.drawable?.icon;
    console.log('getDrawableUrl(icon) =', globalThis.__caResMap.getDrawableUrl(id));
  }
});

// 点击进关于页面
const caPos = await page.evaluate(() => {
  const s = [...document.querySelectorAll('#ca-overlay span')].find(x => x.textContent.trim() === 'CA' && x.getBoundingClientRect().width > 0);
  if (!s) return null;
  const rc = s.getBoundingClientRect();
  return { x: rc.x + rc.width / 2, y: rc.y + rc.height / 2 };
});
await page.mouse.click(caPos.x, caPos.y);
await new Promise(r => setTimeout(r, 900));

const setPos = await page.evaluate(() => {
  const row = [...document.querySelectorAll('[data-idx]')].find(r => r.textContent.trim() === '设置' && r.getBoundingClientRect().width > 0);
  const rc = row.getBoundingClientRect();
  return { x: rc.x + 100, y: rc.y + rc.height / 2 };
});
await page.mouse.click(setPos.x, setPos.y);
await new Promise(r => setTimeout(r, 900));

const abtPos = await page.evaluate(() => {
  const row = [...document.querySelectorAll('[data-idx]')].find(r => r.textContent.trim() === '关于命令助手' && r.getBoundingClientRect().width > 0);
  if (!row) return null;
  const rc = row.getBoundingClientRect();
  return { x: rc.x + 50, y: rc.y + rc.height / 2 };
});
await page.mouse.click(abtPos.x, abtPos.y);
await new Promise(r => setTimeout(r, 900));

// 检查 ImageView
const result = await page.evaluate(() => {
  const img = document.querySelector('img[src*="data:image/svg"]');
  if (img) {
    return { src: img.src.slice(0, 80), rect: img.getBoundingClientRect() };
  }
  const allImg = document.querySelectorAll('img');
  return { count: allImg.length, sources: [...allImg].map(i => i.src.slice(0, 80)) };
});
console.log('Images:', JSON.stringify(result, null, 1));
await browser.close();