import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--no-sandbox']
});
const page = await browser.newPage();
await page.setViewport({ width: 900, height: 700 });
page.on('console', m => {
  const t = m.text();
  if (t.includes('[ca-web') || (m.type() === 'error')) console.log(t.slice(0, 250));
});
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 9000));
await page.evaluate(() => { globalThis.__caDebugWM = true; globalThis.CA.settings.iiMode = 3; globalThis.CA.showGen(true); });
await new Promise(r => setTimeout(r, 1500));
const dom = await page.evaluate(() => ({
  overlayChildren: document.getElementById('ca-overlay')?.childElementCount ?? -1,
  caViews: document.querySelectorAll('.ca-view').length
}));
console.log('DOM:', JSON.stringify(dom));
await browser.close();
