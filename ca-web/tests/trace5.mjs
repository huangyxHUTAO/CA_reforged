import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--no-sandbox']
});
const page = await browser.newPage();
const allLogs = [];
page.on('console', m => allLogs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', e => allLogs.push(`[ERR] ${e.message}`));
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 5000));
// 打印 erp 捕获的错误
const erp = await page.evaluate(() => globalThis.__erpLog || []);
console.log('=== ERP LOGS ===');
erp.forEach(e => console.log(JSON.stringify(e)));
console.log('=== ALL LOGS (last 30) ===');
allLogs.slice(-30).forEach(l => console.log(l));
const r = await page.evaluate(() => ({
  LoaderLoading: globalThis.Loader?.loading,
  Common: typeof globalThis.Common,
  CA: typeof globalThis.CA,
  Internal: typeof globalThis.Internal
}));
console.log('STATE:', JSON.stringify(r));
await browser.close();
