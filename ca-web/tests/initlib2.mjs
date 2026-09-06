import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--no-sandbox']
});
const page = await browser.newPage();
const errs = [];
page.on('pageerror', e => errs.push(e.message.split('\n')[0]));
page.on('console', m => {
  if (m.text().includes('[ca-web]') || m.text().includes('[ca')) console.log(m.text().slice(0, 200));
});
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 6000));
const r = await page.evaluate(() => {
  return {
    coreLibs: globalThis.CA?.settings?.coreLibrarys,
    enabledLibs: globalThis.CA?.settings?.enabledLibrarys,
    isLib: !!globalThis.CA?.IntelliSense?.library,
    libKeys: globalThis.CA?.IntelliSense?.library ? Object.keys(globalThis.CA.IntelliSense.library) : null,
    commandsCount: globalThis.CA?.IntelliSense?.library?.commands ? Object.keys(globalThis.CA.IntelliSense.library.commands).length : null
  };
});
console.log('STATE:', JSON.stringify(r, null, 2));
console.log('ERRORS:', errs.length);
errs.slice(0, 5).forEach(e => console.log(' -', e));
await browser.close();
