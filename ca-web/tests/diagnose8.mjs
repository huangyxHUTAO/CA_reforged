import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox']
});
const page = await browser.newPage();
const logs = [];
page.on('console', m => {
  const t = m.text();
  if (t.includes('loadModule') || t.includes('Intl') || t.includes('preload')) {
    logs.push(`[${m.type()}] ${t.slice(0, 200)}`);
  }
});
page.on('pageerror', e => logs.push('[PAGEERROR] ' + e.message.split('\n')[0]));
try {
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0', timeout: 15000 });
  await new Promise(r => setTimeout(r, 1500));
  const r = await page.evaluate(() => ({
    Intl: typeof globalThis.Intl,
    hasGet: globalThis.Intl && typeof globalThis.Intl.get,
    modules: globalThis.MapScript && globalThis.MapScript.modules
  }));
  console.log('FINAL:', JSON.stringify(r));
  console.log('LOGS:');
  logs.forEach(l => console.log(' ', l));
} catch (e) { console.log('GOTO:', e.message); }
await browser.close();
