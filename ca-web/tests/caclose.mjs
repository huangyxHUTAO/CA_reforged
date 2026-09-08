import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new', args: ['--no-sandbox']
});
const page = await browser.newPage();
const errs = [];
page.on('console', m => { const t = m.text(); if (m.type() === 'error') errs.push(t.slice(0, 200)); });
await page.setViewport({ width: 900, height: 700 });
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
await new Promise(r => setTimeout(r, 11000));

const pos = await page.evaluate(() => {
  const s = [...document.querySelectorAll('#ca-overlay span')].find(x => x.textContent.trim() === 'CA' && x.getBoundingClientRect().width > 0);
  const rc = s.getBoundingClientRect();
  return { x: rc.x + rc.width / 2, y: rc.y + rc.height / 2 };
});
const textBefore = await page.evaluate(() => document.body.innerText.length);
await page.mouse.click(pos.x, pos.y);
await new Promise(r => setTimeout(r, 800));
const after = await page.evaluate(() => {
  const t = document.body.innerText.replace(/\s+/g, ' ');
  return { len: t.length, hasMenu: t.includes('退出命令助手'), tail: t.slice(-120) };
});
console.log('textBefore:', textBefore);
console.log('after click:', JSON.stringify(after, null, 1));
console.log('errs:', JSON.stringify(errs.slice(0, 8), null, 1));
await browser.close();
