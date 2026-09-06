import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--no-sandbox']
});
const page = await browser.newPage();
page.on('pageerror', e => console.log('[ERR]', e.message.split('\n')[0]));
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 5500));
const r = await page.evaluate(() => {
  const L = globalThis.CA?.Library;
  return {
    coreLibs: globalThis.CA?.settings?.coreLibrarys,
    enabledLibs: globalThis.CA?.settings?.enabledLibrarys,
    recommended: L?.recommended,
    recommendedFirst3: L?.recommended?.slice?.(0, 3)
  };
});
console.log(JSON.stringify(r, null, 2));
await browser.close();
