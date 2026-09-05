import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--no-sandbox']
});
const page = await browser.newPage();
page.on('console', m => console.log(`[${m.type()}]`, m.text().slice(0, 200)));
page.on('pageerror', e => console.log('[ERR]', e.message.split('\n')[0]));
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 2000));
const r = await page.evaluate(() => {
  const ca = document.querySelector('ca-app');
  return {
    caApp: !!ca,
    caAppHasShadow: !!(ca && ca.shadowRoot),
    caAppCtor: ca ? ca.constructor.name : null,
    caAppHasShowGen: globalThis.CA && typeof globalThis.CA.showGen,
    customElements: !!customElements.get('ca-app'),
    initDone: !!(globalThis.CA && globalThis.CA.initialized)
  };
});
console.log('STATE:', JSON.stringify(r, null, 2));
await browser.close();
