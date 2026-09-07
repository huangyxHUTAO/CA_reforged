import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--no-sandbox']
});
const page = await browser.newPage();
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 10000));
const r = await page.evaluate(async () => {
  const out = {};
  try {
    globalThis.CA.IntelliSense.show();
    out.show = 'ok';
  } catch (e) { out.show = e.message + ' @' + (e.stack || '').split('\n').slice(1, 3).join(' | '); }
  await new Promise(r2 => setTimeout(r2, 300));
  const IS = globalThis.CA.IntelliSense;
  out.uiType = IS.ui ? IS.ui.constructor?.name : null;
  out.hasListEl = !!(IS.list && IS.list.el);
  out.listChildren = IS.list?.el?.childElementCount ?? -1;
  out.listText = IS.list?.el?.innerText?.slice(0, 100) ?? '';
  return out;
});
console.log(JSON.stringify(r, null, 2));
await browser.close();
