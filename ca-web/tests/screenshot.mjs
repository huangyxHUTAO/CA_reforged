import puppeteer from 'puppeteer-core';

const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 });

const errors = [];
page.on('pageerror', e => errors.push(e.message.split('\n')[0]));
page.on('console', m => {
  if (m.type() === 'error' || m.type() === 'warning') {
    errors.push(`[${m.type()}] ${m.text().slice(0, 150)}`);
  }
});

await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0', timeout: 15000 });
await new Promise(r => setTimeout(r, 2000));

// 抓页面整体状态
const status = await page.evaluate(() => {
  const ca = globalThis.CA;
  return {
    hasMapScript: !!globalThis.MapScript,
    hasLoader: !!globalThis.Loader,
    hasBuildConfig: !!globalThis.BuildConfig,
    hasG: !!globalThis.G,
    hasL: !!globalThis.L,
    hasPWM: !!globalThis.PWM,
    hasIntl: !!globalThis.Intl,
    hasCA: !!ca,
    hasCommon: !!globalThis.Common,
    caKeys: ca ? Object.keys(ca).slice(0, 15) : null,
    hasShowGen: ca && typeof ca.showGen,
    hasIntelliSense: ca && typeof ca.IntelliSense,
    dom: document.querySelector('ca-app')?.shadowRoot ? 'has-shadow' : 'no-shadow',
    renderedText: document.querySelector('ca-app')?.shadowRoot?.textContent?.slice(0, 200) || '(empty)'
  };
});
console.log('STATUS:', JSON.stringify(status, null, 2));
console.log('ERRORS:', errors.length);
errors.forEach(e => console.log('  -', e));

// 截屏
await page.screenshot({ path: 'tests/screenshot-full.png', fullPage: true });
await page.screenshot({ path: 'tests/screenshot-viewport.png' });
console.log('Screenshots saved');

await browser.close();
