import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new', args: ['--no-sandbox']
});
const page = await browser.newPage();
await page.setViewport({ width: 900, height: 700 });
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
await new Promise(r => setTimeout(r, 11000));
const r = await page.evaluate(() => {
  const e = globalThis.CA.cmd.el;
  const attrs = {};
  ['readonly','disabled','tabindex','inert','contenteditable'].forEach(a => attrs[a] = e.getAttribute(a));
  // 手动 focus 后 active
  e.focus();
  const afterFocus = document.activeElement === e;
  // 手动 click() DOM 后
  e.click();
  const afterClick = document.activeElement === e;
  return { attrs, afterFocus, afterClick, tabIndexProp: e.tabIndex, isContentEditable: e.isContentEditable };
});
console.log(JSON.stringify(r, null, 2));
await browser.close();
