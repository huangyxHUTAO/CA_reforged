import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--no-sandbox']
});
const page = await browser.newPage();
page.on('console', m => console.log(`[${m.type()}] ${m.text()}`));
page.on('pageerror', e => console.log('[ERR]', e.message));
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 2000));
// 简单测：queueMicrotask 跑不跑
const r = await page.evaluate(async () => {
  globalThis.__test = [];
  globalThis.__test.push('before');
  queueMicrotask(() => globalThis.__test.push('microtask'));
  await new Promise(r => setTimeout(r, 500));
  return globalThis.__test;
});
console.log('TEST:', JSON.stringify(r));
await browser.close();
