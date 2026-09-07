import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new', args: ['--no-sandbox']
});
const page = await browser.newPage();
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
await new Promise(r => setTimeout(r, 10000));
// 删 ui 检查 → 强制重跑 show
const r = await page.evaluate(async () => {
  const out = { init: { ui: !!globalThis.CA.IntelliSense.ui, list: !!globalThis.CA.IntelliSense.list } };
  // 强制重新走 show 闭包：删 ui 并调 show
  globalThis.CA.IntelliSense.ui = null;
  // show 内部 init 检查已设过，绕过：直接调 apply
  globalThis.CA.IntelliSense.show();
  await new Promise(r2 => setTimeout(r2, 1500));
  out.afterShow = { ui: !!globalThis.CA.IntelliSense.ui, list: !!globalThis.CA.IntelliSense.list, listChildren: globalThis.CA.IntelliSense.list?.el?.childElementCount };
  return out;
});
console.log(JSON.stringify(r, null, 2));
await browser.close();
