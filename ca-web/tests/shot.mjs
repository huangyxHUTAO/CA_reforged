import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--no-sandbox']
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 });
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 2500));
const desc = await page.evaluate(() => {
  const ca = document.querySelector('ca-app');
  const sr = ca && ca.shadowRoot;
  if (!sr) return { noShadow: true };
  return {
    shadowHTML: sr.innerHTML.slice(0, 2000),
    text: sr.textContent.slice(0, 500)
  };
});
console.log(JSON.stringify(desc, null, 2));
await page.screenshot({ path: 'tests/screenshot-ca-app.png' });
console.log('\nScreenshot: tests/screenshot-ca-app.png');
await browser.close();
