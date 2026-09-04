import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox']
});
const page = await browser.newPage();
page.on('pageerror', e => console.log('[PAGEERROR]', e.message.split('\n')[0]));
try {
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0', timeout: 15000 });
  await new Promise(r => setTimeout(r, 1500));
  // 立即在 Intl.js 加载后查看
  await page.evaluate(async () => {
    // 重新手动 import Intl.js 看是否能恢复
    try {
      await import('/@fs/F:/CA-Project/ca/modules/Intl.js');
    } catch (e) { console.log('manual import error:', e.message); }
    return null;
  });
  await new Promise(r => setTimeout(r, 500));
  const r = await page.evaluate(() => {
    const I = globalThis.Intl;
    return {
      hasGet: typeof I.get,
      hasDateTimeFormat: typeof I.DateTimeFormat,
      hasNamespace: typeof I.Namespace,
      hasRecache: 'rescache' in I
    };
  });
  console.log('FINAL:', JSON.stringify(r));
} catch (e) { console.log('GOTO:', e.message); }
await browser.close();
