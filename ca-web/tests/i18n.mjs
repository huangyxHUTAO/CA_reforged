import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/chrome.exe'.replace('chrome.exe','chrome.exe'), executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new', args: ['--no-sandbox']
});
const page = await browser.newPage();
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 10000));
const r = await page.evaluate(() => {
  const I = globalThis.Intl;
  return {
    hasLookup: typeof I?.lookupLang,
    hasMapNS: typeof I?.mapNamespace,
    hasGet: typeof I?.get,
    sampleGet: I?.get ? String(I.get('common.ok')) : null,
    hasDateTimeFormat: typeof I?.DateTimeFormat, // 原生痕迹
    isEngine: typeof I?.lookupLang === 'function'
  };
});
console.log(JSON.stringify(r, null, 2));
await browser.close();
