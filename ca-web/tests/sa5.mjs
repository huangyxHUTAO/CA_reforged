import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new', args: ['--no-sandbox']
});
const page = await browser.newPage();
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 12000));
const r = await page.evaluate(() => {
  const list = globalThis.CA.IntelliSense.list?.el;
  const path = [];
  let v = list;
  while (v) { path.push(v.tagName + (v.classList?.contains('ca-view') ? '.ca-view' : '') + (v.id ? '#'+v.id : '')); v = v.parentElement; }
  return { path, len: path.length };
});
console.log(JSON.stringify(r, null, 2));
await browser.close();
