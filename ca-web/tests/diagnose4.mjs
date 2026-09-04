import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox']
});
const page = await browser.newPage();
page.on('pageerror', e => console.log('[PAGEERROR]', e.message.split('\n')[0]));
page.on('console', m => {
  const t = m.text();
  if (t.includes('Intl') || t.includes('CA') || t.includes('preload') || t.includes('globalThis') || t.includes('loadModule')) {
    console.log(`[${m.type()}] ${t.slice(0, 250)}`);
  }
});
try {
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0', timeout: 15000 });
  await new Promise(r => setTimeout(r, 2000));
  // 手动 import Intl.js 看是否成功
  const result = await page.evaluate(async () => {
    try {
      await import('/@fs/F:/CA-Project/ca/modules/Intl.js');
      return { ok: true, intl: typeof globalThis.Intl, get: typeof globalThis.Intl?.get };
    } catch (e) { return { ok: false, err: e.message }; }
  });
  console.log('MANUAL IMPORT:', JSON.stringify(result));
} catch (e) { console.log('GOTO ERROR:', e.message); }
await browser.close();
