import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--no-sandbox']
});
const page = await browser.newPage();
const reqs = [];
page.on('response', r => {
  if (r.url().includes('JavaReflect') || r.url().includes('IntColor') || r.url().includes('main.js')) {
    reqs.push(`${r.status()} ${r.url().split('/').slice(-2).join('/')}`);
  }
});
page.on('pageerror', e => console.log('[ERR]', e.message.split('\n')[0]));
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 1500));
console.log('REQS:');
reqs.forEach(r => console.log(' ', r));
const final = await page.evaluate(() => ({
  JRmethod: typeof globalThis.JavaReflect.method,
  JRstaticMethod: typeof globalThis.JavaReflect.staticMethod
}));
console.log('FINAL:', JSON.stringify(final));
await browser.close();
