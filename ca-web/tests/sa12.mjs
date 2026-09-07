import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new', args: ['--no-sandbox']
});
const page = await browser.newPage();
page.on('pageerror', e => console.log('[ERR]', e.message));
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
await new Promise(r => setTimeout(r, 10000));
const r = await page.evaluate(async () => {
  const out = {};
  // 直接 new G.TextView
  try {
    const tv = new globalThis.android.widget.TextView(globalThis.ctx);
    out.tvCreated = !!tv.el;
    out.tvTag = tv.el?.tagName;
  } catch (e) { out.tvErr = e.message; }
  // 直接 new G.ListView
  try {
    const lv = new globalThis.android.widget.ListView(globalThis.ctx);
    out.lvCreated = !!lv.el;
    out.lvTag = lv.el?.tagName;
  } catch (e) { out.lvErr = e.message; }
  return out;
});
console.log(JSON.stringify(r, null, 2));
await browser.close();
