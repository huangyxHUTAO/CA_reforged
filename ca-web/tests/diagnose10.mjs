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
  const r = await page.evaluate(() => {
    const I = globalThis.Intl;
    return {
      proto: Object.getPrototypeOf(I),
      ownEnum: Object.getOwnPropertyNames(I),
      val: I,
      // 看 obj 的真实内容
      protoCtor: I && I.constructor
    };
  });
  console.log('FINAL:', JSON.stringify(r, null, 2));
} catch (e) { console.log('GOTO:', e.message); }
await browser.close();
