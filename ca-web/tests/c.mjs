import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--no-sandbox']
});
const page = await browser.newPage();
page.on('pageerror', e => console.log('[ERR]', e.message.split('\n')[0]));
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 1500));
const r = await page.evaluate(() => ({
  Common: typeof globalThis.Common,
  CA: typeof globalThis.CA,
  PWM: typeof globalThis.PWM,
  PopupPage: typeof globalThis.PopupPage,
  showGen: typeof (globalThis.CA && globalThis.CA.showGen),
  hasShowLibrary: globalThis.CA && typeof globalThis.CA.showLibrary
}));
console.log('STATE:', JSON.stringify(r, null, 2));
await browser.close();
