import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--no-sandbox']
});
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message.split('\n')[0]));
page.on('console', m => {
  if (m.type() === 'error' || m.text().includes('[ca Error]')) errors.push(`[${m.type()}] ${m.text().slice(0, 200)}`);
});
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 5500));
// 手动 initLibrary
const r = await page.evaluate(() => {
  return new Promise(resolve => {
    globalThis.CA.Library.initLibrary(function(flag) {
      resolve({
        flag,
        isLibSet: !!globalThis.CA.IntelliSense.library,
        libKeys: globalThis.CA.IntelliSense.library ? Object.keys(globalThis.CA.IntelliSense.library) : null,
        commandsCount: globalThis.CA.IntelliSense.library?.commands ? Object.keys(globalThis.CA.IntelliSense.library.commands).length : null
      });
    });
  });
});
console.log('INIT:', JSON.stringify(r, null, 2));
console.log('ERRORS:', errors.length);
errors.slice(0, 5).forEach(e => console.log(' -', e));
await browser.close();
