import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new', args: ['--no-sandbox']
});
const page = await browser.newPage();
await page.setViewport({ width: 900, height: 700 });
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
await new Promise(r => setTimeout(r, 12000));
// 点输入框并输入
await page.evaluate(() => {
  const cmd = globalThis.CA?.cmd;
  if (cmd && cmd.el) { cmd.el.focus(); cmd.el.value = '/give @p '; cmd.el.dispatchEvent(new Event('input', { bubbles: true })); }
});
await new Promise(r => setTimeout(r, 2000));
await page.screenshot({ path: 'tests/ui-shot.png' });
const t = await page.evaluate(() => document.body.innerText.slice(0, 400));
console.log('BODY:', JSON.stringify(t));
await browser.close();
