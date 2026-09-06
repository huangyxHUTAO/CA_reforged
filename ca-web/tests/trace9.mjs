import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--no-sandbox']
});
const page = await browser.newPage();
page.on('pageerror', e => console.log('[ERR]', e.message, e.stack?.split('\n').slice(0, 5).join(' | ')));
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 2500));
// 直接同步跑 MapScript.initialize 测试
const r = await page.evaluate(() => {
  try {
    globalThis.MapScript.initialize();
    return { ok: true };
  } catch (e) { return { err: e.message, stack: e.stack?.slice(0, 400) }; }
});
console.log('INIT:', JSON.stringify(r, null, 2));
await browser.close();
