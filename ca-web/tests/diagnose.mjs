// 抓浏览器 console error
import puppeteer from 'puppeteer-core';

const URL = process.argv[2] || 'http://127.0.0.1:5173/';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
});
const page = await browser.newPage();
const messages = [];
page.on('console', m => messages.push({ type: m.type(), text: m.text() }));
page.on('pageerror', e => messages.push({ type: 'PAGEERROR', text: e.message + '\n' + (e.stack || '') }));
page.on('requestfailed', r => messages.push({ type: 'REQFAIL', text: r.url() + ' ' + r.failure()?.errorText }));

try {
  await page.goto(URL, { waitUntil: 'networkidle0', timeout: 15000 });
  await new Promise(r => setTimeout(r, 1500));
  const status = await page.evaluate(() => {
    return {
      ca: typeof globalThis.CA,
      common: typeof globalThis.Common,
      intl: typeof globalThis.Intl,
      g: typeof globalThis.G,
      l: typeof globalThis.L,
      pwm: typeof globalThis.PWM,
      buildConfig: typeof globalThis.BuildConfig,
      hasMapScript: typeof globalThis.MapScript,
      hasLoader: typeof globalThis.Loader
    };
  });
  console.log('--- Globals ---');
  console.log(JSON.stringify(status, null, 2));
} catch (e) {
  console.log('GOTO ERROR:', e.message);
}
console.log('\n--- Console messages ---');
for (const m of messages) {
  console.log(`[${m.type}] ${m.text.slice(0, 500)}`);
}
await browser.close();
