import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--no-sandbox']
});
const page = await browser.newPage();
page.on('console', m => {
  if (m.text().includes('JR') || m.text().includes('MapScript.loadModule')) console.log(m.text().slice(0, 200));
});
page.on('pageerror', e => console.log('[ERR]', e.message.split('\n')[0]));
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 1500));
const f = await page.evaluate(() => ({
  hasJavaReflect: typeof globalThis.JavaReflect,
  jrKeys: Object.keys(globalThis.JavaReflect || {}),
  ca: typeof globalThis.CA
}));
console.log('FINAL:', JSON.stringify(f));
await browser.close();
