import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--no-sandbox']
});
const page = await browser.newPage();
page.on('pageerror', e => console.log('[ERR]', e.message.split('\n')[0]));
page.on('console', m => {
  if (m.text().includes('staticMethod') || m.text().includes('JR')) console.log(m.text());
});
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 1500));
// 直接测 JavaReflect.staticMethod
const r = await page.evaluate(() => {
  try {
    const r = globalThis.JavaReflect.staticMethod("android.graphics.Color", "alpha", ["int"]);
    return { ok: true, type: typeof r };
  } catch (e) { return { err: e.message }; }
});
console.log('TEST:', JSON.stringify(r));
await browser.close();
