import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new', args: ['--no-sandbox']
});
const page = await browser.newPage();
await page.setViewport({ width: 900, height: 700 });
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
await new Promise(r => setTimeout(r, 11000));
const r = await page.evaluate(() => {
  const P = globalThis.PopupPage;
  return {
    type: typeof P,
    keys: P ? Object.keys(P).slice(0, 40) : null,
    hasSetFull: typeof P?.setFullScreen,
    hasIsFull: typeof P?.isFullScreen,
    hasEnter: typeof P?.enter,
    fullscreen: P?.fullscreen,
    visible: P?.visible,
    defaultVisible: P?.defaultVisible,
    floatVisible: P?.floatVisible,
    genEnter: typeof globalThis.CA?.gen?.enter,
    genIsVisible: globalThis.CA?.gen?.isVisible
  };
});
console.log(JSON.stringify(r, null, 2));
await browser.close();
