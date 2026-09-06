import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--no-sandbox']
});
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e => errors.push('[ERR] ' + e.message));
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 2000));
// 在浏览器里手动跑 Loader.load 的内容
const r = await page.evaluate(() => {
  // hook console 收集 erp 错误
  const origErr = globalThis.erp;
  globalThis.__erpLog = [];
  globalThis.erp = (e, silent, extra) => {
    globalThis.__erpLog.push({ msg: String(e), stack: e?.stack?.slice(0, 500), silent });
    origErr(e, silent, extra);
  };
  // 触发初始化
  try {
    if (globalThis.Loader && !globalThis.Loader.loading) {
      globalThis.Loader.load(function() {});
    }
  } catch (e) { return { err: e.message }; }
  return { log: globalThis.__erpLog };
});
console.log('ERP LOGS:', JSON.stringify(r, null, 2));
await browser.close();
