import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--no-sandbox']
});
const page = await browser.newPage();
page.on('console', m => {
  if (m.text().includes('JR assign')) console.log(m.text());
});
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 1500));
const r = await page.evaluate(() => ({
  JRmethod: typeof globalThis.JavaReflect.method,
  JRstaticMethod: typeof globalThis.JavaReflect.staticMethod
}));
console.log('FINAL:', JSON.stringify(r));
await browser.close();
