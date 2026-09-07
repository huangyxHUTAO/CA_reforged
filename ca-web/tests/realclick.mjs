import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new', args: ['--no-sandbox']
});
const page = await browser.newPage();
await page.setViewport({ width: 900, height: 700 });
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
await new Promise(r => setTimeout(r, 11000));
const info = await page.evaluate(() => {
  const el = globalThis.CA.cmd.el;
  const rc = el.getBoundingClientRect();
  return { x: rc.x + rc.width/2, y: rc.y + rc.height/2, id: 'cmd-ta' };
});
// 真鼠标点击
await page.mouse.click(info.x, info.y);
await new Promise(r => setTimeout(r, 600));
const focus1 = await page.evaluate(() => document.activeElement?.tagName + '#' + document.activeElement?.id);
// 真键盘输入
await page.keyboard.type('/say hello', { delay: 25 });
await new Promise(r => setTimeout(r, 800));
const state = await page.evaluate(() => ({
  active: document.activeElement?.tagName + '#' + (document.activeElement?.id||''),
  value: globalThis.CA.cmd.el.value,
  body: document.body.innerText.slice(0, 120)
}));
console.log('focus after click:', focus1);
console.log('after typing:', JSON.stringify(state));
await browser.close();
