import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--no-sandbox']
});
const page = await browser.newPage();
await page.setViewport({ width: 900, height: 700 });
page.on('console', m => { const t = m.text(); if (t.includes('[ca-web]')) console.log(t); });
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 10000));
const r = await page.evaluate(() => {
  const ov = document.getElementById('ca-overlay');
  return {
    mounted: ov?.childElementCount ?? -1,
    bodyText: document.body.innerText.slice(0, 120),
    hasCmd: !!globalThis.CA?.cmd?.el?.isConnected
  };
});
console.log('FINAL:', JSON.stringify(r, null, 2));
await page.screenshot({ path: 'tests/shot-final.png' });
await browser.close();
