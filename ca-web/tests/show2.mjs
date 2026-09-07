import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--no-sandbox']
});
const page = await browser.newPage();
page.on('console', m => { if (m.type() === 'error') console.log('[err]', m.text().slice(0, 400)); });
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 10000));
await page.evaluate(() => { globalThis.CA.IntelliSense.show(); });
await new Promise(r2 => setTimeout(r2, 800));
await browser.close();
