import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--no-sandbox']
});
const page = await browser.newPage();
page.on('pageerror', e => console.log('[ERR]', e.message.split('\n')[0]));
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 1500));
const r = await page.evaluate(() => {
  const IC = globalThis.IntColor;
  if (!IC) return { has: false };
  return {
    has: true,
    keys: Object.keys(IC),
    colorKeys: IC.Color ? Object.keys(IC.Color) : null,
    paintKeys: IC.Paint ? Object.keys(IC.Paint) : null,
    paintSetColor: typeof (IC.Paint && IC.Paint.setColor),
    bitmapKeys: IC.Bitmap ? Object.keys(IC.Bitmap) : null
  };
});
console.log('IntColor:', JSON.stringify(r, null, 2));
await browser.close();
