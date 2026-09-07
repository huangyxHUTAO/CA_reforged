import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new', args: ['--no-sandbox']
});
const page = await browser.newPage();
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 12000));
// 强制 show
await page.evaluate(() => {
  globalThis.CA.showGen(true);
  globalThis.CA.IntelliSense.show();
  globalThis.CA.showAssist();
});
await new Promise(r => setTimeout(r => 1500));
const r = await page.evaluate(() => {
  const ov = document.getElementById('ca-overlay');
  const list = globalThis.CA.IntelliSense.list?.el;
  const path = [];
  let v = list; let i = 0;
  while (v && i < 12) { path.push((v.tagName||'?') + (v.classList?.contains('ca-view') ? '.ca-view' : '') + (v.id ? '#'+v.id : '')); v = v.parentElement; i++; }
  return {
    overlayChildren: ov?.childElementCount,
    inOverlay: list ? ov?.contains(list) : null,
    listChildren: list?.childElementCount,
    path,
    mainViewChildren: globalThis.CA.gen?.mainView?.el?.childElementCount,
    mainViewParent: globalThis.CA.gen?.mainView?.el?.parentElement?.tagName
  };
});
console.log(JSON.stringify(r, null, 2));
await page.screenshot({ path: 'tests/sa6.png' });
await browser.close();
