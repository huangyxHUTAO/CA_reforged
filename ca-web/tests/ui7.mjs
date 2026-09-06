import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--no-sandbox']
});
const page = await browser.newPage();
await page.setViewport({ width: 900, height: 700 });
page.on('pageerror', e => console.log('[PAGEERROR]', e.message.split('\n')[0]));
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 9000));
const r = await page.evaluate(() => {
  globalThis.CA.settings.iiMode = 3;
  globalThis.CA.showGen(true);
  return { hasGen: !!globalThis.CA.gen };
});
await new Promise(r => setTimeout(r, 1500));
const dom = await page.evaluate(() => {
  const ov = document.getElementById('ca-overlay');
  return {
    overlayChildren: ov ? ov.childElementCount : -1,
    // 全 body 找 ca-view
    caViews: document.querySelectorAll('.ca-view').length,
    bodyText: document.body.innerText.slice(0, 200),
    overlayHTML: ov && ov.childElementCount ? ov.innerHTML.slice(0, 800) : '(empty)'
  };
});
console.log('RESULT:', JSON.stringify(r));
console.log('DOM:', JSON.stringify(dom, null, 2));
await browser.close();
